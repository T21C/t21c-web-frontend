// tuf-search: #InboxBell #inboxBell #layout #navigation
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellIcon, GearIcon } from '@/components/common/icons';
import InboxNotificationRow from '@/components/inbox/InboxNotificationRow';
import { useInboxNotifications } from '@/contexts/InboxNotificationContext';
import './inboxBell.css';

const InboxBell = ({ variant = 'desktop' }) => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const { items, unreadCount, markRead, markAllRead, markSeen, hide } = useInboxNotifications();
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div
      className={`inbox-bell ${isOpen ? 'inbox-bell--open' : ''} ${isMobile ? 'inbox-bell--mobile' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="inbox-bell__button"
        aria-label={t('notifications.bellAria', { count: unreadCount })}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <BellIcon size={22} color="var(--color-white)" />
        {unreadCount > 0 ? (
          <span className="inbox-bell__badge">{badgeLabel}</span>
        ) : null}
      </button>
      {isOpen ? (
        <div className="inbox-bell__menu" role="menu">
          <div className="inbox-bell__header">
            <span className="inbox-bell__title">{t('notifications.title')}</span>
            <div className="inbox-bell__header-actions">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  className="inbox-bell__mark-all"
                  onClick={markAllRead}
                >
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
          <Link
            to="/notifications"
            className="inbox-bell__footer"
            onClick={() => setIsOpen(false)}
          >
            {t('notifications.seeAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default InboxBell;
