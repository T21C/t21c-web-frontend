// tuf-search: #InboxBell #inboxBell #layout #navigation
import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {BellIcon, GearIcon} from '@/components/common/icons';
import InboxNotificationRow from '@/components/inbox/InboxNotificationRow';
import {useInboxNotifications} from '@/contexts/InboxNotificationContext';
import {routes} from '@/api/routes';
import api from '@/utils/api';
import {
  fetchPushAvailability,
  getPushPermission,
  isPushSupported,
  subscribeCurrentBrowser,
} from '@/utils/webPush';
import { CLIENT_PREF_KEYS, getClientPreference, setClientPreferences } from '@/utils/clientPreferences';
import './inboxBell.css';

const InboxBell = ({variant = 'desktop'}) => {
  const {t, i18n} = useTranslation('pages');
  const location = useLocation();
  const {items, unreadCount, markRead, markAllRead, markSeen, hide} = useInboxNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const rootRef = useRef(null);
  const preview = items.slice(0, 8);
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const isMobile = variant === 'mobile';

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isOpen) return undefined;
    markSeen();
    const onPointerDown = (event) => {
      const insideBell = rootRef.current && rootRef.current.contains(event.target);
      const insideRowMenu = event.target.closest?.('.inbox-notification-row-menu');
      if (!insideBell && !insideRowMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, markSeen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!isPushSupported() || getPushPermission() !== 'default') return;
        if (getClientPreference(CLIENT_PREF_KEYS.INBOX_PUSH_NUDGE_DISMISSED, false)) return;
        const {available} = await fetchPushAvailability();
        if (!cancelled) setShowNudge(available);
      } catch {
        if (!cancelled) setShowNudge(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const dismissNudge = () => {
    setClientPreferences({ [CLIENT_PREF_KEYS.INBOX_PUSH_NUDGE_DISMISSED]: true });
    setShowNudge(false);
  };

  const enablePushFromNudge = async () => {
    try {
      const result = await subscribeCurrentBrowser(i18n.language);
      if (result.permission === 'granted') {
        await api.put(routes.notifications.preferences(), {pushEnabled: true});
      }
    } catch {
      /* optional */
    }
    dismissNudge();
  };

  return (
    <div
      className={`inbox-bell ${isOpen ? 'inbox-bell--open' : ''} ${isMobile ? 'inbox-bell--mobile' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="inbox-bell__button"
        aria-label={t('notifications.bellAria', {count: unreadCount})}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <BellIcon size={22} color="var(--color-white)" />
        {unreadCount > 0 ? <span className="inbox-bell__badge">{badgeLabel}</span> : null}
      </button>
      {isOpen ? (
        <div className="inbox-bell__menu" role="menu">
          <div className="inbox-bell__header">
            <span className="inbox-bell__title">{t('notifications.title')}</span>
            <div className="inbox-bell__header-actions">
              {unreadCount > 0 ? (
                <button type="button" className="inbox-bell__mark-all" onClick={markAllRead}>
                  {t('notifications.markAllRead')}
                </button>
              ) : null}
              <Link
                to="/settings/notifications"
                className="inbox-bell__settings"
                aria-label={t('notifications.settingsAria')}
                onClick={() => setIsOpen(false)}
              >
                <GearIcon size={18} color="currentColor" />
              </Link>
            </div>
          </div>
          {showNudge ? (
            <div className="inbox-bell__nudge">
              <p className="inbox-bell__nudge-text">{t('notifications.nudgeBody')}</p>
              <div className="inbox-bell__nudge-actions">
                <button type="button" className="inbox-bell__nudge-enable" onClick={enablePushFromNudge}>
                  {t('notifications.nudgeEnable')}
                </button>
                <button type="button" className="inbox-bell__nudge-dismiss" onClick={dismissNudge}>
                  {t('notifications.nudgeDismiss')}
                </button>
              </div>
            </div>
          ) : null}
          <div className="inbox-bell__list">
            {preview.length ? (
              preview.map((notification) => (
                <InboxNotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={markRead}
                  onHide={hide}
                  compact
                />
              ))
            ) : (
              <p className="inbox-bell__empty">{t('notifications.empty')}</p>
            )}
          </div>
          <Link to="/notifications" className="inbox-bell__footer" onClick={() => setIsOpen(false)}>
            {t('notifications.seeAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default InboxBell;
