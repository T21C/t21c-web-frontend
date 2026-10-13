// tuf-search: #levelReferences
import api from '@/utils/api';
import { routes } from '@/api/routes';

/** Matches server LEVEL_REFERENCE_ID_LIMIT. */
const LEVEL_REFERENCE_ID_LIMIT = 40;

const cache = new Map();
/** @type {Map<number, Promise<void>>} */
const inflight = new Map();
let queued = new Set();
/** @type {Promise<void> | null} */
let flushPromise = null;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split comment text on `#123` (or another prefix) into plain strings and level mentions.
 * @returns {{ parts: Array<string | { levelId: number, key: number }>, ids: number[] }}
 */
export function splitCommentLevelRefs(text, prefix = '#') {
  const source = typeof text === 'string' ? text : '';
  const pattern = new RegExp(`${escapeRegExp(prefix)}(\\d+)`, 'gi');
  const parts = [];
  const ids = [];
  const seen = new Set();
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push(source.slice(lastIndex, match.index));
    }
    const levelId = parseInt(match[1], 10);
    if (Number.isInteger(levelId) && levelId > 0) {
      parts.push({ levelId, key: match.index });
      if (!seen.has(levelId)) {
        seen.add(levelId);
        ids.push(levelId);
      }
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    parts.push(source.slice(lastIndex));
  }

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
