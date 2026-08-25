import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/contexts/AuthContext';
import {
  fetchPushAvailability,
  isPushSupported,
  registerPushServiceWorker,
  subscribeCurrentBrowser,
  syncPushLocale,
} from '@/utils/webPush';

const WebPushLifecycle = () => {
  const {user} = useAuth();
  const {i18n} = useTranslation();

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const {available} = await fetchPushAvailability();
        if (cancelled || !available || !isPushSupported()) return;
        await registerPushServiceWorker();
        if (Notification.permission === 'granted') {
          await subscribeCurrentBrowser(i18n.language);
        }
      } catch {
        /* push is optional */
      }
    })();
    const onLanguageChanged = (language) => {
      syncPushLocale(language).catch(() => {});
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      cancelled = true;
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [user, i18n]);

  return null;
};

export default WebPushLifecycle;
