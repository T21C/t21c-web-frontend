// tuf-search: #passDifficultySubtype #passSubmissions #difficulty — pass difficulty hide filter

export const PASS_DIFFICULTY_SUBTYPES = ['P', 'G', 'U', 'GQ', 'UQ', 'QQ', 'Etc.'];

const SUBTYPE_SET = new Set(PASS_DIFFICULTY_SUBTYPES);
const HIDDEN_STORAGE_KEY = 'pass_submission_hide_subtypes';

function leadingToken(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const cut = raw.search(/[\s(]/);
  return (cut === -1 ? raw : raw.slice(0, cut)).toUpperCase();
}

/** P, G, U, GQ, UQ, QQ, or Etc. from a level difficulty name. */
export function passDifficultySubtype(name) {
  const token = leadingToken(name);
  if (!token) return 'Etc.';
  if (token.startsWith('GQ')) return 'GQ';
  if (token.startsWith('UQ')) return 'UQ';
  if (token === 'QQ' || /^Q[0-4]$/.test(token)) return 'QQ';
  if (/^P\d+$/.test(token)) return 'P';
  if (/^G\d+$/.test(token)) return 'G';
  if (/^U\d+$/.test(token)) return 'U';
  return 'Etc.';
}

export function readHiddenPassDifficultySubtypes() {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => SUBTYPE_SET.has(item));
  } catch {
    return [];
  }
}

export function writeHiddenPassDifficultySubtypes(hidden) {
  localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(hidden));
}
