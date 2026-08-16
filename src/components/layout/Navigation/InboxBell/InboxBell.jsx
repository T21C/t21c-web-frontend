// tuf-search: #InboxBell #inboxBell #layout #navigation
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellIcon } from '@/components/common/icons';
import InboxNotificationRow from '@/components/inbox/InboxNotificationRow';
import { useInboxNotifications } from '@/contexts/InboxNotificationContext';
import './inboxBell.css';

const InboxBell = ({ variant = 'desktop' }) => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const { items, unreadCount, markRead, markAllRead, markSeen } = useInboxNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const preview = items.slice(0, 8);
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isOpen) return undefined;
    markSeen();
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen, markSeen]);

  if (variant === 'mobile') {
    return (
      <Link
        to="/notifications"
        className="inbox-bell inbox-bell--mobile"
        aria-label={t('notifications.bellAria', { count: unreadCount })}
      >
        <BellIcon size={22} color="var(--color-white)" />
        {unreadCount > 0 ? (
          <span className="inbox-bell__badge">{badgeLabel}</span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className={`inbox-bell ${isOpen ? 'inbox-bell--open' : ''}`} ref={rootRef}>
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
            {unreadCount > 0 ? (
              <button
                type="button"
                className="inbox-bell__mark-all"
                onClick={markAllRead}
              >
                {t('notifications.markAllRead')}
              </button>
            ) : null}
          </div>
          <div className="inbox-bell__list">
            {preview.length ? (
              preview.map((notification) => (
                <InboxNotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={markRead}
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
