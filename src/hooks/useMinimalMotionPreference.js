// tuf-search: #useMinimalMotionPreference #preferences #submissionMinimalMotion
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'settings.preferences.submission.minimalMotion';
const LEGACY_STORAGE_KEY = 'settings.accessibility.minimalMotion';
const CHANGE_EVENT = 'tuf:minimal-motion-change';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function readStoredFlag(key) {
  try {
    const v = localStorage.getItem(key);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

function readMinimalMotion() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== null) return current === '1' || current === 'true';
    // One-time migrate from the short-lived Accessibility key.
    if (readStoredFlag(LEGACY_STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, '1');
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function writeMinimalMotion(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribePreference(onStoreChange) {
  const onStorage = (e) => {
    if (
      e.key === STORAGE_KEY
      || e.key === LEGACY_STORAGE_KEY
      || e.key === null
    ) {
      onStoreChange();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function subscribeReducedMotion(onStoreChange) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function readReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Persisted Preferences → Motion → submission-page minimal motion (localStorage).
 * Safe to use outside SettingsProvider (e.g. settings toggle).
 */
export function useMinimalMotionPreference() {
  const minimalMotion = useSyncExternalStore(subscribePreference, readMinimalMotion, () => false);

  const setMinimalMotion = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(readMinimalMotion()) : next;
    writeMinimalMotion(Boolean(resolved));
  }, []);

  return [minimalMotion, setMinimalMotion];
}

/**
 * Effective minimal motion for the submission page: user preference OR OS
 * prefers-reduced-motion. Both take the same code path (no separate handling).
 */
export function useSubmissionMinimalMotion() {
  const [preference] = useMinimalMotionPreference();
  const osReduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  return preference || osReduced;
}
