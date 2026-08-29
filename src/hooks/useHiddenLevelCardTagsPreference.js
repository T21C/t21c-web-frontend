// tuf-search: #useHiddenLevelCardTagsPreference #preferences #hiddenLevelCardTags
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'settings.preferences.display.hiddenLevelCardTagIds';
const CHANGE_EVENT = 'tuf:hidden-level-card-tags-change';
const EMPTY = [];

let cachedRaw = undefined;
let cachedValue = EMPTY;

function parseIds(raw) {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed
      .map((id) => (typeof id === 'number' ? id : Number(id)))
      .filter((id) => Number.isFinite(id));
    return ids.length ? ids : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readHiddenTagIds() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = parseIds(raw);
  return cachedValue;
}

function writeHiddenTagIds(ids) {
  const unique = [...new Set((ids || []).filter((id) => Number.isFinite(id)))];
  try {
    if (unique.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    }
  } catch {
    /* ignore quota / private mode */
  }
  cachedRaw = unique.length === 0 ? null : JSON.stringify(unique);
  cachedValue = unique.length === 0 ? EMPTY : unique;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange) {
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

/**
 * Persisted display preference: tag ids hidden on level cards (localStorage).
 */
export function useHiddenLevelCardTagsPreference() {
  const hiddenTagIds = useSyncExternalStore(subscribe, readHiddenTagIds, () => EMPTY);

  const setHiddenTagIds = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(readHiddenTagIds()) : next;
    writeHiddenTagIds(Array.isArray(resolved) ? resolved : []);
  }, []);

  return [hiddenTagIds, setHiddenTagIds];
}
