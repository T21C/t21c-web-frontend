// tuf-search: #SettingsNotificationsPage #settingsNotificationsPage #account #settings
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-hot-toast';
import {routes} from '@/api/routes';
import api from '@/utils/api';
import {
  clearLocalPushSubscription,
  getPushDeviceKey,
  getPushPermission,
  isPushSupported,
  refreshCurrentBrowser,
  subscribeCurrentBrowser,
} from '@/utils/webPush';
import './settingsSubPage.css';
import './settingsNotificationsPage.css';

function pushDeviceLabel(device, t) {
  const browser = device?.browser && device.browser !== 'Browser' ? device.browser : '';
  const os = device?.os || '';
  if (browser && os) return t('settings.notifications.pushDeviceOn', {browser, os});
  if (browser) return t('settings.notifications.pushDeviceBrowserOnly', {browser});
  if (os) return t('settings.notifications.pushDeviceOsOnly', {os});
  return t('settings.notifications.pushDeviceUnknown');
}

function formatSeenAt(value, locale) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const SettingsNotificationsPage = () => {
  const {t, i18n} = useTranslation('pages');
  const [preferences, setPreferences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [hideOwnActivity, setHideOwnActivity] = useState(false);
  const [permission, setPermission] = useState(getPushPermission());
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [detachingId, setDetachingId] = useState(null);
  const [hideOwnBusy, setHideOwnBusy] = useState(false);
  const unsupported = !isPushSupported();
  const currentAttached = devices.some((device) => device.isCurrent);

  const applyState = (data) => {
    if (Array.isArray(data?.preferences)) setPreferences(data.preferences);
    if (Array.isArray(data?.categories)) setCategories(data.categories);
    if (typeof data?.pushEnabled === 'boolean') setPushEnabled(data.pushEnabled);
    if (typeof data?.pushAvailable === 'boolean') setPushAvailable(data.pushAvailable);
    if (typeof data?.hideOwnActivity === 'boolean') setHideOwnActivity(data.hideOwnActivity);
  };

  const fetchDevices = useCallback(async () => {
    if (isPushSupported() && getPushPermission() === 'granted') {
      await refreshCurrentBrowser(i18n.language);
    }
    const {data} = await api.get(routes.notifications.pushDevices(getPushDeviceKey()));
    setDevices(Array.isArray(data?.devices) ? data.devices : []);
  }, [i18n.language]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {data} = await api.get(routes.notifications.preferences());
      applyState(data);
      setPermission(getPushPermission());
      if (data?.pushAvailable) {
        await fetchDevices();
      } else {
        setDevices([]);
      }
    } catch (error) {
      toast.error(t('settings.notifications.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, fetchDevices]);

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
      prev.map((row) => (row.type === pref.type ? {...row, inApp: next} : row)),
    );
    try {
      const {data} = await api.put(routes.notifications.preferences(), {
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
        prev.map((row) => (row.type === pref.type ? {...row, inApp: pref.inApp} : row)),
      );
    }
  };

  const toggleCategory = async (category, currentlyEnabled) => {
    const next = !currentlyEnabled;
    setCategories((prev) =>
      prev.map((row) => (row.category === category ? {...row, inApp: next} : row)),
    );
    try {
      const {data} = await api.put(routes.notifications.preferences(), {
        category,
        inApp: next,
      });
      applyState(data);
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
      setCategories((prev) =>
        prev.map((row) => (row.category === category ? {...row, inApp: currentlyEnabled} : row)),
      );
    }
  };

  const toggleHideOwnActivity = async () => {
    if (hideOwnBusy) return;
    const next = !hideOwnActivity;
    setHideOwnBusy(true);
    setHideOwnActivity(next);
    try {
      const {data} = await api.put(routes.notifications.preferences(), {hideOwnActivity: next});
      applyState(data);
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
      setHideOwnActivity(!next);
    } finally {
      setHideOwnBusy(false);
    }
  };

  const togglePush = async () => {
    if (!pushAvailable || unsupported || permission === 'denied' || pushBusy) return;
    setPushBusy(true);
    try {
      if (!pushEnabled) {
        const result = await subscribeCurrentBrowser(i18n.language);
        setPermission(result.permission);
        if (result.permission !== 'granted') return;
        const {data} = await api.put(routes.notifications.preferences(), {pushEnabled: true});
        applyState(data);
        await fetchDevices();
      } else {
        const {data} = await api.put(routes.notifications.preferences(), {pushEnabled: false});
        applyState(data);
      }
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
    } finally {
      setPushBusy(false);
    }
  };

  const attachThisDevice = async () => {
    if (!pushAvailable || unsupported || permission === 'denied' || pushBusy) return;
    setPushBusy(true);
    try {
      const result = await subscribeCurrentBrowser(i18n.language);
      setPermission(result.permission);
      if (result.permission !== 'granted' || !result.attached) return;
      if (!pushEnabled) {
        const {data} = await api.put(routes.notifications.preferences(), {pushEnabled: true});
        applyState(data);
      }
      await fetchDevices();
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
    } finally {
      setPushBusy(false);
    }
  };

  const detachDevice = async (device) => {
    if (!device?.id || detachingId) return;
    setDetachingId(device.id);
    try {
      await api.delete(routes.notifications.pushDevice(device.id));
      if (device.isCurrent) await clearLocalPushSubscription();
      await fetchDevices();
    } catch (error) {
      toast.error(t('settings.notifications.saveError'));
    } finally {
      setDetachingId(null);
    }
  };

  return (
    <div className="settings-sub-page settings-notifications-page">
      <h1 className="settings-sub-page__title">{t('settings.notifications.title')}</h1>
      <p className="settings-sub-page__text">{t('settings.notifications.subtitle')}</p>

      {loading ? (
        <p className="settings-sub-page__text">{t('settings.notifications.loading')}</p>
      ) : (
        <>
          <div className="settings-notifications-page__account">
            <label className="settings-notifications-page__toggle settings-notifications-page__toggle--account">
              <input
                type="checkbox"
                checked={hideOwnActivity}
                disabled={hideOwnBusy}
                onChange={toggleHideOwnActivity}
              />
              <span className="settings-notifications-page__toggle-label">
                {t('settings.notifications.hideOwnActivityTitle')}
              </span>
            </label>
            <p className="settings-notifications-page__status">
              {t('settings.notifications.hideOwnActivityHint')}
            </p>
          </div>
          {pushAvailable && (
            <div className="settings-notifications-page__push">
              <label className="settings-notifications-page__toggle">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  disabled={unsupported || permission === 'denied' || pushBusy}
                  onChange={togglePush}
                />
                <span className="settings-notifications-page__toggle-label">
                  {t('settings.notifications.pushTitle')}
                </span>
              </label>
              {unsupported && (
                <p className="settings-notifications-page__status">
                  {t('settings.notifications.pushUnsupported')}
                </p>
              )}
              {permission === 'denied' && (
                <p className="settings-notifications-page__status">
                  {t('settings.notifications.pushDenied')}
                </p>
              )}
              <div className="settings-notifications-page__devices">
                <div className="settings-notifications-page__devices-header">
                  <span className="settings-notifications-page__devices-title">
                    {t('settings.notifications.pushDevicesTitle')}
                  </span>
                  {!unsupported && permission !== 'denied' && !currentAttached && (
                    <button
                      type="button"
                      className="btn-fill-primary settings-sub-page__btn"
                      onClick={attachThisDevice}
                      disabled={pushBusy}
                    >
                      {t('settings.notifications.pushAttach')}
                    </button>
                  )}
                </div>
                {devices.length === 0 ? (
                  <p className="settings-notifications-page__status">
                    {t('settings.notifications.pushDevicesEmpty')}
                  </p>
                ) : (
                  <ul className="settings-notifications-page__device-list">
                    {devices.map((device) => {
                      const seen = formatSeenAt(device.lastSeenAt, i18n.language);
                      return (
                        <li key={device.id} className="settings-notifications-page__device">
                          <div className="settings-notifications-page__device-main">
                            <div className="settings-notifications-page__device-title">
                              <span>{pushDeviceLabel(device, t)}</span>
                              {device.isCurrent && (
                                <span className="settings-notifications-page__device-badge">
                                  {t('settings.notifications.pushDeviceThis')}
                                </span>
                              )}
                            </div>
                            {seen && (
                              <span className="settings-notifications-page__status">
                                {t('settings.notifications.pushDeviceLastSeen', {date: seen})}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn-fill-danger settings-sub-page__btn"
                            onClick={() => detachDevice(device)}
                            disabled={detachingId === device.id}
                          >
                            {t('buttons.remove', {ns: 'common'})}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
          {grouped.map(([category, rows]) => {
            const enabled = categoryEnabled.get(category) !== false;
            const categoryLocked = rows.length > 0 && rows.every((pref) => pref.lockedChannels?.inApp);
            return (
              <details key={category} className="settings-notifications-page__section">
                <summary
                  className="settings-notifications-page__section-header"
                  id={`settings-notifications-${category}`}
                >
                  <span className="settings-notifications-page__section-title">
                    {t(`settings.notifications.categories.${category}`, {
                      defaultValue: category,
                    })}
                  </span>
                  {!categoryLocked && (
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
                  )}
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
          })}
        </>
      )}
    </div>
  );
};

export default SettingsNotificationsPage;
