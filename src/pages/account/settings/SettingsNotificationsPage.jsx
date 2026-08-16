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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const applyState = (data) => {
    if (Array.isArray(data?.preferences)) setPreferences(data.preferences);
    if (Array.isArray(data?.categories)) setCategories(data.categories);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(routes.notifications.preferences());
      applyState(data);
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

  const categoryEnabled = useMemo(() => {
    const map = new Map();
    for (const row of categories) {
      map.set(row.category, row.inApp !== false);
    }
    return map;
  }, [categories]);

  const toggleInApp = async (pref) => {
    if (pref.lockedChannels?.inApp) return;
    if (pref.categoryInApp === false) return;
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

  const toggleCategory = async (category, currentlyEnabled) => {
    const next = !currentlyEnabled;
    setCategories((prev) =>
      prev.map((row) => (row.category === category ? { ...row, inApp: next } : row)),
    );
    try {
      const { data } = await api.put(routes.notifications.preferences(), {
        category,
        inApp: next,
      });
      applyState(data);
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
      setCategories((prev) =>
        prev.map((row) => (row.category === category ? { ...row, inApp: currentlyEnabled } : row)),
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
        grouped.map(([category, rows]) => {
          const enabled = categoryEnabled.get(category) !== false;
          return (
            <details
              key={category}
              className="settings-notifications-page__section"
            >
              <summary
                className="settings-notifications-page__section-header"
                id={`settings-notifications-${category}`}
              >
                <span className="settings-notifications-page__section-title">
                  {t(`settings.notifications.categories.${category}`, {
                    defaultValue: category,
                  })}
                </span>
                <label
                  className="settings-notifications-page__toggle settings-notifications-page__toggle--category"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={!enabled}
                    onChange={() => toggleCategory(category, enabled)}
                  />
                  <span className="settings-notifications-page__toggle-label">
                    {t('settings.notifications.muteCategory')}
                  </span>
                </label>
              </summary>
              <div className="settings-notifications-page__section-body">
                {rows.map((pref) => (
                  <label key={pref.type} className="settings-notifications-page__toggle">
                    <input
                      type="checkbox"
                      checked={pref.inApp}
                      disabled={Boolean(pref.lockedChannels?.inApp) || !enabled}
                      onChange={() => toggleInApp(pref)}
                    />
                    <span className="settings-notifications-page__toggle-label">
                      {t(`${pref.i18nKey}.title`)}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          );
        })
      )}
    </div>
  );
};

export default SettingsNotificationsPage;
