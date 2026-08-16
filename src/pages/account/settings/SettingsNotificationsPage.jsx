// tuf-search: #SettingsNotificationsPage #settingsNotificationsPage #account #settings
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import './settingsSubPage.css';
import './settingsNotificationsPage.css';

const SettingsNotificationsPage = () => {
  const { t } = useTranslation('pages');
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(routes.notifications.preferences());
      setPreferences(data?.preferences ?? []);
    } catch (error) {
      toast.error(t('settings.notifications.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const pref of preferences) {
      const key = pref.category || 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(pref);
    }
    return [...map.entries()];
  }, [preferences]);

  const toggleInApp = async (pref) => {
    if (pref.lockedChannels?.inApp) return;
    const next = !pref.inApp;
    setPreferences((prev) =>
      prev.map((row) => (row.type === pref.type ? { ...row, inApp: next } : row)),
    );
    try {
      const { data } = await api.put(routes.notifications.preferences(), {
        type: pref.type,
        inApp: next,
      });
      if (data?.preference) {
        setPreferences((prev) =>
          prev.map((row) => (row.type === data.preference.type ? data.preference : row)),
        );
      }
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
      setPreferences((prev) =>
        prev.map((row) => (row.type === pref.type ? { ...row, inApp: pref.inApp } : row)),
      );
    }
  };

  return (
    <div className="settings-sub-page settings-notifications-page">
      <h1 className="settings-sub-page__title">{t('settings.notifications.title')}</h1>
      <p className="settings-sub-page__text">{t('settings.notifications.subtitle')}</p>

      {loading ? (
        <p className="settings-sub-page__text">{t('settings.notifications.loading')}</p>
      ) : (
        grouped.map(([category, rows]) => (
          <section
            key={category}
            className="settings-notifications-page__section"
            aria-labelledby={`settings-notifications-${category}`}
          >
            <h2
              id={`settings-notifications-${category}`}
              className="settings-notifications-page__section-title"
            >
              {t(`settings.notifications.categories.${category}`, {
                defaultValue: category,
              })}
            </h2>
            {rows.map((pref) => (
              <label key={pref.type} className="settings-notifications-page__toggle">
                <input
                  type="checkbox"
                  checked={pref.inApp}
                  disabled={Boolean(pref.lockedChannels?.inApp)}
                  onChange={() => toggleInApp(pref)}
                />
                <span className="settings-notifications-page__toggle-copy">
                  <span className="settings-notifications-page__toggle-label">
                    {t(`${pref.i18nKey}.title`)}
                  </span>
                  <span className="settings-notifications-page__toggle-desc">
                    {t('settings.notifications.inApp')}
                  </span>
                </span>
              </label>
            ))}
          </section>
        ))
      )}
    </div>
  );
};

export default SettingsNotificationsPage;
