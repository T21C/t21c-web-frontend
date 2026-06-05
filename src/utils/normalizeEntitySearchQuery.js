// tuf-search: #normalizeEntitySearchQuery #entitySearch
import { OWN_URL_BASES } from '@/config/env';

/**
 * Maps list-search entities to their public detail path and query alias.
 * Player profiles use `pid:` because `#` is reserved for Discord provider id search.
 */
const ENTITY_SEARCH_CONFIG = {
  level: { segment: 'levels', aliasPrefix: '#' },
  pass: { segment: 'passes', aliasPrefix: '#' },
  song: { segment: 'songs', aliasPrefix: '#' },
  artist: { segment: 'artists', aliasPrefix: '#' },
  pack: { segment: 'packs', aliasPrefix: '#' },
  creator: { segment: 'creator', aliasPrefix: '#' },
  player: { segment: 'profile', aliasPrefix: 'pid:' },
};

function buildPathPattern(segment) {
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^/${escaped}/([^/?#]+)(?:/.*)?$`);
}

function extractIdFromPathname(pathname, segment) {
  const match = buildPathPattern(segment).exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

function aliasFromAbsoluteUrl(input, { segment, aliasPrefix }) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (!OWN_URL_BASES.includes(parsed.origin)) {
    return null;
  }

  const id = extractIdFromPathname(parsed.pathname, segment);
  return id ? `${aliasPrefix}${id}` : null;
}

function aliasFromRelativePath(input, { segment, aliasPrefix }) {
  const pathOnly = input.split(/[?#]/, 1)[0];
  const prefix = `/${segment}/`;
  if (!pathOnly.startsWith(prefix)) {
    return null;
  }

  const id = extractIdFromPathname(pathOnly, segment);
  return id ? `${aliasPrefix}${id}` : null;
}

function aliasFromHostPath(input, { segment, aliasPrefix }) {
  if (/^https?:\/\//i.test(input)) {
    return null;
  }

  const hostPathPattern = new RegExp(
    `^[/\\w.-]*\\/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/([^/?#]+)`,
    'i',
  );
  if (!hostPathPattern.test(input)) {
    return null;
  }

  return aliasFromAbsoluteUrl(`https://${input}`, { segment, aliasPrefix });
}

/**
 * Rewrites pasted detail-page URLs to the shorthand used by that entity's search.
 */
export function normalizeEntitySearchQuery(raw, entity) {
  const value = String(raw ?? '');
  const config = ENTITY_SEARCH_CONFIG[entity];
  if (!config) {
    return value;
  }

  // Trim only for URL detection (e.g. pasted links); preserve spacing while typing.
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const relativeAlias = aliasFromRelativePath(trimmed, config);
  if (relativeAlias) {
    return relativeAlias;
  }

  const absoluteAlias = aliasFromAbsoluteUrl(trimmed, config);
  if (absoluteAlias) {
    return absoluteAlias;
  }

  const hostPathAlias = aliasFromHostPath(trimmed, config);
  if (hostPathAlias) {
    return hostPathAlias;
  }

  return value;
}

export const normalizeLevelSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'level');
export const normalizePassSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'pass');
export const normalizeSongSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'song');
export const normalizeArtistSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'artist');
export const normalizePackSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'pack');
export const normalizeCreatorSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'creator');
export const normalizePlayerSearchQuery = (raw) => normalizeEntitySearchQuery(raw, 'player');

/** Parses `#123` style id shortcuts (numeric ids only). */
export function parseHashtagIdQuery(query) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed.startsWith('#') || trimmed.length <= 1) {
    return null;
  }
  const id = trimmed.slice(1);
  return /^\d+$/.test(id) ? id : null;
}

/** Parses `#cool-pack` or other non-numeric pack link codes from search. */
export function parseHashtagPackQuery(query) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed.startsWith('#') || trimmed.length <= 1) {
    return null;
  }
  const id = trimmed.slice(1);
  return id.length > 0 ? id : null;
}

/** Parses `pid:123` player id shortcuts (from pasted profile URLs). */
export function parsePlayerIdQuery(query) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed.startsWith('pid:') || trimmed.length <= 4) {
    return null;
  }
  const id = trimmed.slice(4);
  return /^\d+$/.test(id) ? id : null;
}
