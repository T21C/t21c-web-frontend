// tuf-search: #useNavDropdownClickModePreference #preferences #navbar
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'settings.preferences.navigation.dropdownClickMode';
const CHANGE_EVENT = 'tuf:nav-dropdown-click-mode-change';

export const NAV_DROPDOWN_CLICK_MODE_CYCLE = 'cycle';
export const NAV_DROPDOWN_CLICK_MODE_PIN = 'pin';

export const NAV_DROPDOWN_CLICK_MODES = Object.freeze([
  NAV_DROPDOWN_CLICK_MODE_CYCLE,
  NAV_DROPDOWN_CLICK_MODE_PIN,
]);

function isNavDropdownClickMode(value) {
  return value === NAV_DROPDOWN_CLICK_MODE_CYCLE
    || value === NAV_DROPDOWN_CLICK_MODE_PIN;
}

function readNavDropdownClickMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isNavDropdownClickMode(v)) return v;
  } catch {
    /* ignore quota / private mode */
  }
  return NAV_DROPDOWN_CLICK_MODE_CYCLE;
}

function writeNavDropdownClickMode(mode) {
  const resolved = isNavDropdownClickMode(mode)
    ? mode
    : NAV_DROPDOWN_CLICK_MODE_CYCLE;
  try {
    localStorage.setItem(STORAGE_KEY, resolved);
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
 * Persisted Preferences → Navigation → section-dropdown click mode (localStorage).
 * `cycle` (default): click walks internal links; `pin`: click pins the menu.
 */
export function useNavDropdownClickModePreference() {
  const clickMode = useSyncExternalStore(
    subscribe,
    readNavDropdownClickMode,
    () => NAV_DROPDOWN_CLICK_MODE_CYCLE,
  );

  const setClickMode = useCallback((next) => {
    const resolved = typeof next === 'function'
      ? next(readNavDropdownClickMode())
      : next;
    writeNavDropdownClickMode(resolved);
  }, []);

  return [clickMode, setClickMode];
}
