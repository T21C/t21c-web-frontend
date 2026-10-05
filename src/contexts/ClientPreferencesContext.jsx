// tuf-search: #ClientPreferencesContext #clientPreferences
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import i18next, { changeAppLanguage, normalizeLanguage } from '@/translations/config';
import { useClientPreference } from '@/hooks/useClientPreference';
import {
  CLIENT_PREF_KEYS,
  setAccountPreferencesListener,
  syncClientPreferencesWithUser,
} from '@/utils/clientPreferences';

export function ClientPreferencesProvider({ children }) {
  const { user, setUser } = useAuth();
  const [savedLanguage] = useClientPreference(CLIENT_PREF_KEYS.APP_LANGUAGE, null);
  const suggestedLanguage = typeof user?.suggestedAppLanguage === 'string' && user.suggestedAppLanguage
    ? user.suggestedAppLanguage
    : null;

  useEffect(() => {
    setAccountPreferencesListener((prefs) => {
      setUser((prev) => (prev ? { ...prev, clientPreferences: prefs } : prev));
    });
    return () => setAccountPreferencesListener(null);
  }, [setUser]);

  useEffect(() => {
    void syncClientPreferencesWithUser(user ?? null);
  }, [user]);

  useEffect(() => {
    const lang = typeof savedLanguage === 'string' && savedLanguage
      ? savedLanguage
      : suggestedLanguage;
    if (typeof lang !== 'string' || !lang) return;
    const current = normalizeLanguage(i18next.resolvedLanguage || i18next.language);
    if (current === normalizeLanguage(lang)) return;
    void changeAppLanguage(lang, { persist: false });
  }, [user?.id, savedLanguage, suggestedLanguage]);

  return children;
}

export default ClientPreferencesProvider;
