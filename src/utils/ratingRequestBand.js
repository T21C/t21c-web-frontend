// tuf-search: #ratingRequestBand #pgu #rating
/** Same buckets as server requestPguBand: Q labels, PGU tokens, highest range endpoint. */

export const REQUEST_BANDS = [
  ['P', 'includeP'],
  ['G', 'includeG'],
  ['U', 'includeU'],
];

const BAND_RANK = { P: 0, G: 1, U: 2 };
const UNIVERSAL_LEGACY_FLOOR = 21;

function parseQRangeLetter(name) {
  const n = String(name || '').trim().toUpperCase();
  if (!n) return null;
  if (/^GQ([0-4])(?:\s|\(|$)/.test(n)) return 'G';
  if (/^UQ([0-4])(?:\s|\(|$)/.test(n)) return 'U';
  if (/^Q([0-4])(?:\s|\(|$)/.test(n)) return 'U';
  return null;
}

function parseRatingRange(rating) {
  const match = rating.match(/([^-~\s]+|^-\d+)([-~\s])(.+)/);
  if (!match) return [rating.trim()];
  const firstPart = match[1];
  const lastPart = match[3];
  const firstMatch = firstPart.match(/([PGUpgu]*)(-?\d+)/);
  const lastMatch = lastPart.match(/([PGUpgu]*)(-?\d+)/);
  if (firstMatch && lastMatch && !lastMatch[1] && firstMatch[1]) {
    return [firstPart, `${firstMatch[1]}${lastMatch[2]}`];
  }
  return [firstPart, lastPart];
}

function bandFromRequestToken(token) {
  const t = String(token || '').trim().replace(/\+$/, '');
  if (!t) return null;
  const q = parseQRangeLetter(t);
  if (q) return q;
  const pgu = t.match(/^([PGU])([1-9]|1[0-9]|20)$/i);
  if (pgu?.[1]) return pgu[1].toUpperCase();
  if (/^(?:[1-9]|1[0-9]|20(?:\.\d)?|21(?:\.[0-4])?)$/.test(t)) {
    return Number(t) >= UNIVERSAL_LEGACY_FLOOR ? 'U' : 'P';
  }
  return null;
}

function highestRequestBand(bands) {
  let best = null;
  for (const band of bands) {
    if (best === null || BAND_RANK[band] > BAND_RANK[best]) best = band;
  }
  return best ?? 'G';
}

export function requestPguBand(card) {
  const rerateNum = card?.level?.rerateNum;
  const requesterFR = card?.requesterFR;
  const primary =
    rerateNum != null && String(rerateNum).trim() !== ''
      ? String(rerateNum).trim()
      : String(requesterFR || '').trim();
  if (!primary) return 'G';

  const wholeQ = parseQRangeLetter(primary);
  if (wholeQ) return wholeQ;

  const bands = [];
  for (const part of parseRatingRange(primary)) {
    const band = bandFromRequestToken(part);
    if (band) bands.push(band);
  }
  return highestRequestBand(bands);
}
