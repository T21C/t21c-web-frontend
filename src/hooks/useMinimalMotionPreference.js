// tuf-search: #useMinimalMotionPreference #preferences #submissionMinimalMotion
import { useSyncExternalStore } from 'react';
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onStoreChange) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function readReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Persisted Preferences → Motion → submission-page minimal motion.
 * Safe to use outside SettingsProvider (e.g. settings toggle).
 */
export function useMinimalMotionPreference() {
  return useClientPreference(CLIENT_PREF_KEYS.SUBMISSION_MINIMAL_MOTION, false);
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
