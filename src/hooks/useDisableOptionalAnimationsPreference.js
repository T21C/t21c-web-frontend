// tuf-search: #useDisableOptionalAnimationsPreference #preferences #performance
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';

/**
 * Persisted Preferences → Performance → disable optional animations.
 * The html class is also set when the browser requests reduced motion.
 */
export function useDisableOptionalAnimationsPreference() {
  return useClientPreference(CLIENT_PREF_KEYS.PERFORMANCE_DISABLE_OPTIONAL_ANIMATIONS, false);
}
