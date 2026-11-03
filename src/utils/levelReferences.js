// tuf-search: #levelReferences
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { OWN_URL_BASES } from '@/config/env';

/** Matches server LEVEL_REFERENCE_ID_LIMIT. */
const LEVEL_REFERENCE_ID_LIMIT = 40;

/** Public site hosts. Configured dev/staging origins are added on top. */
const PUBLIC_LEVEL_HOSTS = ['tuforums.com', 'tufstaging.online', 'staging.tuforums.com'];

const URL_TAIL = /[.,;:!?'")\]]/;

const cache = new Map();
/** @type {Map<number, Promise<void>>} */
const inflight = new Map();
let queued = new Set();
/** @type {Promise<void> | null} */
let flushPromise = null;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addLevelHost(hosts, hostname, port = '') {
  const name = String(hostname || '').trim().toLowerCase().replace(/\.+$/, '');
  if (!name) return;
  const suffix = port ? `:${port}` : '';
  hosts.add(`${name}${suffix}`);
  if (suffix) return;
  if (name.startsWith('www.')) {
    const bare = name.slice(4);
    if (bare) hosts.add(bare);
  } else {
    hosts.add(`www.${name}`);
  }
}

/** Hosts whose `/levels/:id` URLs are the same mention as `#id`. */
function knownLevelHostPattern() {
  const hosts = new Set();
  for (const host of PUBLIC_LEVEL_HOSTS) addLevelHost(hosts, host);
  for (const base of OWN_URL_BASES) {
    try {
      const url = new URL(base);
      addLevelHost(hosts, url.hostname, url.port);
    } catch {
      // Ignore malformed configured origins.
    }
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    addLevelHost(hosts, window.location.hostname, window.location.port || '');
  }
  const literals = [...hosts].sort((a, b) => b.length - a.length).map(escapeRegExp);
  literals.push('localhost(?::\\d+)?', '127\\.0\\.0\\.1(?::\\d+)?');
  return literals.join('|');
}

/** Include a level URL's query and hash, but leave sentence punctuation in the comment. */
function extendLevelUrlEnd(source, end) {
  if (source[end] !== '?' && source[end] !== '#') return end;
  let i = end + 1;
  while (i < source.length && !/\s/.test(source[i])) i += 1;
  while (i > end && URL_TAIL.test(source[i - 1])) i -= 1;
  return i;
}

function isUrlBoundary(source, index) {
  if (index <= 0) return true;
  return !/[A-Za-z0-9]/.test(source[index - 1]);
}

/**
 * Split comment text on `#123` (or another prefix) and site level URLs
 * (`https://tuforums.com/levels/123`) into plain strings and level mentions.
 * @returns {{ parts: Array<string | { levelId: number, key: number }>, ids: number[] }}
 */
export function splitCommentLevelRefs(text, prefix = '#') {
  const source = typeof text === 'string' ? text : '';
  const prefixRe = new RegExp(`${escapeRegExp(prefix)}(\\d+)`, 'gi');
  const urlRe = new RegExp(
    `https?:\\/\\/(?:${knownLevelHostPattern()})\\/levels\\/(\\d+)\\/?(?=$|[?#\\s]|[.,;:!?'")\\]])`,
    'gi',
  );
  const parts = [];
  const ids = [];
  const seen = new Set();
  let emitted = 0;
  let searchFrom = 0;

  while (searchFrom < source.length) {
    prefixRe.lastIndex = searchFrom;
    urlRe.lastIndex = searchFrom;
    const prefixMatch = prefixRe.exec(source);
    const urlMatch = urlRe.exec(source);
    const prefixAt = prefixMatch ? prefixMatch.index : Infinity;
    const urlAt = urlMatch ? urlMatch.index : Infinity;
    if (prefixAt === Infinity && urlAt === Infinity) break;

    const useUrl = urlAt <= prefixAt;
    const match = useUrl ? urlMatch : prefixMatch;
    const coreEnd = match.index + match[0].length;
    const end = useUrl ? extendLevelUrlEnd(source, coreEnd) : coreEnd;

    if (useUrl && !isUrlBoundary(source, match.index)) {
      searchFrom = Math.max(end, match.index + 1);
      continue;
    }

    if (match.index > emitted) parts.push(source.slice(emitted, match.index));

    const levelId = parseInt(match[1], 10);
    if (Number.isInteger(levelId) && levelId > 0) {
      parts.push({ levelId, key: match.index });
      if (!seen.has(levelId)) {
        seen.add(levelId);
        ids.push(levelId);
      }
    } else {
      parts.push(source.slice(match.index, end));
    }

    emitted = end;
    searchFrom = end;
    if (searchFrom === match.index) searchFrom += 1;
  }

  if (emitted < source.length) parts.push(source.slice(emitted));
  return { parts, ids };
}

export function collectLevelReferenceIds(text, prefix = '#') {
  return splitCommentLevelRefs(text, prefix).ids;
}

function normalizeIds(ids) {
  const out = [];
  const seen = new Set();
  for (const raw of ids || []) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function fetchChunk(ids) {
  const { data } = await api.get(routes.database.levels.references(), {
    params: { ids: ids.join(',') },
  });
  const found = new Set();
  const results = Array.isArray(data?.results) ? data.results : [];
  for (const level of results) {
    const id = Number(level?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    cache.set(id, level);
    found.add(id);
  }
  for (const id of ids) {
    if (!found.has(id)) cache.set(id, null);
  }
}

function scheduleFlush() {
  if (flushPromise) {
    return flushPromise.then(() => scheduleFlush());
  }

  const ids = [...queued].sort((a, b) => a - b);
  queued = new Set();
  if (ids.length === 0) return Promise.resolve();

  const run = (async () => {
    try {
      for (let i = 0; i < ids.length; i += LEVEL_REFERENCE_ID_LIMIT) {
        await fetchChunk(ids.slice(i, i + LEVEL_REFERENCE_ID_LIMIT));
      }
    } catch (error) {
      console.error('Failed to load level references', error);
    } finally {
      for (const id of ids) inflight.delete(id);
      flushPromise = null;
    }
  })();

  flushPromise = run;
  for (const id of ids) inflight.set(id, run);
  return run;
}

/** Synchronous read when every id is already cached. Returns null if any id is still missing. */
export function peekLevelReferences(ids) {
  const wanted = normalizeIds(ids);
  if (wanted.length === 0) return {};
  const map = {};
  for (const id of wanted) {
    if (!cache.has(id)) return null;
    map[id] = cache.get(id);
  }
  return map;
}

/**
 * Load slim level cards for comment mentions. Calls in the same turn share one request.
 * @returns {Promise<Record<number, object | null>>}
 */
export function getLevelReferences(ids) {
  const wanted = normalizeIds(ids);
  const waiters = [];
  let added = false;

  for (const id of wanted) {
    if (cache.has(id)) continue;
    const pending = inflight.get(id);
    if (pending) {
      waiters.push(pending);
      continue;
    }
    queued.add(id);
    added = true;
  }

  if (added) waiters.push(scheduleFlush());

  return Promise.all(waiters).then(() => {
    const map = {};
    for (const id of wanted) {
      if (cache.has(id)) map[id] = cache.get(id);
    }
    return map;
  });
}
