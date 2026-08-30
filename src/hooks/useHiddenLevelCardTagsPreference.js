// tuf-search: #useHiddenLevelCardTagsPreference #preferences #hiddenLevelCardTags
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';

const EMPTY = [];

/**
 * Persisted display preference: tag ids hidden on level cards.
 */
export function useHiddenLevelCardTagsPreference() {
  return useClientPreference(CLIENT_PREF_KEYS.DISPLAY_HIDDEN_LEVEL_CARD_TAG_IDS, EMPTY);
}
