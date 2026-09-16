// tuf-search: #ratingRequestBand #pgu #rating
/** Same buckets as server requestPguBand: U, then P, else G. */

export const REQUEST_BANDS = [
  ['P', 'includeP'],
  ['G', 'includeG'],
  ['U', 'includeU'],
];

export function requestPguBand(card) {
  const rerateNum = card?.level?.rerateNum;
  const requesterFR = card?.requesterFR;
  const primary =
    rerateNum != null && String(rerateNum).trim() !== ''
      ? String(rerateNum).trim()
      : String(requesterFR || '').trim();
  if (
    /\bU(?:[1-9]|1[0-9]|20)\b/i.test(primary) ||
    /\bUQ\d*\b/i.test(primary) ||
    /\bQ\d+\b/i.test(primary) ||
    /(?:^|[^0-9.])(21(?:\.[0-4])?\+?)(?:$|[^0-9])/.test(primary)
  ) {
    return 'U';
  }
  if (card?.lowDiff || /^[pP]\d/.test(primary)) return 'P';
  return 'G';
}
