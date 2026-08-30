// tuf-search: #useNavDropdownClickModePreference #preferences #navbar
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';

export const NAV_DROPDOWN_CLICK_MODE_CYCLE = 'cycle';
export const NAV_DROPDOWN_CLICK_MODE_PIN = 'pin';

export const NAV_DROPDOWN_CLICK_MODES = Object.freeze([
  NAV_DROPDOWN_CLICK_MODE_CYCLE,
  NAV_DROPDOWN_CLICK_MODE_PIN,
]);

/**
 * Persisted Preferences → Navigation → section-dropdown click mode.
 * `cycle` (default): click walks internal links; `pin`: click pins the menu.
 */
export function useNavDropdownClickModePreference() {
  return useClientPreference(
    CLIENT_PREF_KEYS.NAV_DROPDOWN_CLICK_MODE,
    NAV_DROPDOWN_CLICK_MODE_CYCLE,
  );
}
