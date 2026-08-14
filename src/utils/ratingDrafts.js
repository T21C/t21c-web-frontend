// tuf-search: #ratingDrafts #rating #draft
const STORAGE_KEY = 'tuf.ratingDrafts';
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} RatingDraft
 * @property {string} rating
 * @property {string} comment
 * @property {number} viewDurationSeconds
 * @property {number} savedAt
 */

/** @returns {Record<string, Record<string, RatingDraft>>} */
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

/** @param {Record<string, Record<string, RatingDraft>>} store */
function writeAll(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Drop expired drafts across all users. Mutates and returns `store`.
 * @param {Record<string, Record<string, RatingDraft>>} store
 * @param {number} [now=Date.now()]
 */
function pruneExpired(store, now = Date.now()) {
  for (const userId of Object.keys(store)) {
    const userDrafts = store[userId];
    if (!userDrafts || typeof userDrafts !== 'object') {
      delete store[userId];
      continue;
    }
    for (const ratingId of Object.keys(userDrafts)) {
      const draft = userDrafts[ratingId];
      const savedAt = Number(draft?.savedAt);
      if (!draft || !Number.isFinite(savedAt) || now - savedAt > TTL_MS) {
        delete userDrafts[ratingId];
      }
    }
    if (Object.keys(userDrafts).length === 0) {
      delete store[userId];
    }
  }
  return store;
}

/**
 * @param {unknown} userId
 * @param {unknown} ratingId
 * @returns {RatingDraft | null}
 */
export function getRatingDraft(userId, ratingId) {
  if (userId == null || ratingId == null) return null;
  const store = pruneExpired(readAll());
  writeAll(store);
  const draft = store[String(userId)]?.[String(ratingId)];
  if (!draft || typeof draft !== 'object') return null;
  return {
    rating: typeof draft.rating === 'string' ? draft.rating : '',
    comment: typeof draft.comment === 'string' ? draft.comment : '',
    viewDurationSeconds: Math.max(0, Math.floor(Number(draft.viewDurationSeconds) || 0)),
    savedAt: Number(draft.savedAt) || 0,
  };
}

/**
 * @param {unknown} userId
 * @param {unknown} ratingId
 * @returns {boolean}
 */
export function hasRatingDraft(userId, ratingId) {
  return getRatingDraft(userId, ratingId) != null;
}

/**
 * @param {unknown} userId
 * @param {unknown} ratingId
 * @param {{ rating?: string, comment?: string, viewDurationSeconds?: number }} payload
 */
export function setRatingDraft(userId, ratingId, payload) {
  if (userId == null || ratingId == null) return;
  const store = pruneExpired(readAll());
  const uid = String(userId);
  const rid = String(ratingId);
  if (!store[uid]) store[uid] = {};
  store[uid][rid] = {
    rating: typeof payload?.rating === 'string' ? payload.rating : '',
    comment: typeof payload?.comment === 'string' ? payload.comment : '',
    viewDurationSeconds: Math.max(0, Math.floor(Number(payload?.viewDurationSeconds) || 0)),
    savedAt: Date.now(),
  };
  writeAll(store);
}

/**
 * @param {unknown} userId
 * @param {unknown} ratingId
 */
export function clearRatingDraft(userId, ratingId) {
  if (userId == null || ratingId == null) return;
  const store = pruneExpired(readAll());
  const uid = String(userId);
  const rid = String(ratingId);
  if (store[uid]) {
    delete store[uid][rid];
    if (Object.keys(store[uid]).length === 0) delete store[uid];
  }
  writeAll(store);
}
