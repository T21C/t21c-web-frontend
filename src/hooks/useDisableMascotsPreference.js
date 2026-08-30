// tuf-search: #useDisableMascotsPreference #preferences #disableMascots
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';

/**
 * Persisted Preferences → Display → Disable mascots.
 * Safe to use outside SettingsProvider (e.g. submission page).
 */
export function useDisableMascotsPreference() {
  return useClientPreference(CLIENT_PREF_KEYS.SUBMISSION_DISABLE_MASCOTS, false);
}
