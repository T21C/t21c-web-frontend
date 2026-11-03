// tuf-search: #levelMentionToken #levelMention
const OPENING_PUNCT = new Set(['(', '[', '{', '<', '"', "'"]);

function isTokenBoundary(char) {
  if (!char) return true;
  if (/\s/.test(char)) return true;
  return OPENING_PUNCT.has(char);
}

function wordBefore(text, index) {
  let start = index;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  return text.slice(start, index);
}

function isHashInsideUrl(text, hashIndex) {
  const prefix = wordBefore(text, hashIndex);
  if (!prefix) return false;
  if (/^https?:\/\//i.test(prefix)) return true;
  if (/^www\./i.test(prefix)) return true;
  return /\.[a-z0-9][a-z0-9-]*\.[a-z]{2,}\//i.test(prefix);
}

export function isMentionHashStart(text, hashIndex) {
  const source = typeof text === 'string' ? text : '';
  if (source[hashIndex] !== '#') return false;
  if (!isTokenBoundary(source[hashIndex - 1])) return false;
  if (isHashInsideUrl(source, hashIndex)) return false;
  return true;
}

/** Empty `#` opens search; digits preview that level; anything else is not a mention. */
export function classifyMentionQuery(query) {
  if (query == null || query === '') return 'search';
  if (/^\d+$/.test(query)) return 'id';
  return 'other';
}

/**
 * Mention token whose `#` is at the start of the text or after whitespace /
 * opening punctuation. The query is only empty or digits — search text lives
 * in the popup, not in the composer.
 *
 * @param {string} text
 * @param {number} caret
 * @returns {{ start: number, end: number, query: string, kind: 'search' | 'id' } | null}
 */
export function findMentionToken(text, caret) {
  const source = typeof text === 'string' ? text : '';
  const pos = Math.max(0, Math.min(Number(caret) || 0, source.length));
  if (pos <= 0) return null;

  let hash = -1;
  for (let i = pos - 1; i >= 0; i -= 1) {
    const ch = source[i];
    if (ch === '#') {
      hash = i;
      break;
    }
    if (!/\d/.test(ch)) return null;
  }
  if (hash < 0) return null;
  if (!isMentionHashStart(source, hash)) return null;

  let end = pos;
  while (end < source.length && /\d/.test(source[end])) end += 1;
  if (pos < hash || pos > end) return null;

  const query = source.slice(hash + 1, end);
  const kind = classifyMentionQuery(query);
  if (kind === 'other') return null;

  return {
    start: hash,
    end,
    query,
    kind,
  };
}

export function insertLevelMention(text, token, levelId) {
  const source = typeof text === 'string' ? text : '';
  if (!token) return { value: source, caret: source.length };
  const followingSpace = /\s/.test(source[token.end] || '');
  const mention = followingSpace ? `#${levelId}` : `#${levelId} `;
  const value = `${source.slice(0, token.start)}${mention}${source.slice(token.end)}`;
  const caret = followingSpace
    ? token.start + mention.length + 1
    : token.start + mention.length;
  return { value, caret };
}
