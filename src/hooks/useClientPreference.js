import { useCallback, useSyncExternalStore } from 'react';
import {
  getClientPreference,
  setClientPreferences,
  subscribeClientPreferences,
} from '@/utils/clientPreferences';

export function useClientPreference(key, fallback) {
  const value = useSyncExternalStore(
    subscribeClientPreferences,
    () => getClientPreference(key, fallback),
    () => fallback,
  );

  const setValue = useCallback((next) => {
    const current = getClientPreference(key, fallback);
    const resolved = typeof next === 'function' ? next(current) : next;
    setClientPreferences({ [key]: resolved });
  }, [fallback, key]);

  return [value, setValue];
}
