// tuf-search: #useDisableMascotsPreference #preferences #disableMascots
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'settings.preferences.submission.disableMascots';
const CHANGE_EVENT = 'tuf:disable-mascots-change';

function readDisableMascots() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

function writeDisableMascots(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
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
 * Persisted Preferences → Display → Disable mascots (localStorage).
 * Safe to use outside SettingsProvider (e.g. submission page).
 */
export function useDisableMascotsPreference() {
  const disableMascots = useSyncExternalStore(subscribe, readDisableMascots, () => false);

  const setDisableMascots = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(readDisableMascots()) : next;
    writeDisableMascots(Boolean(resolved));
  }, []);

  return [disableMascots, setDisableMascots];
}
