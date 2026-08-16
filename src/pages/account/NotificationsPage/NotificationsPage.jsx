// tuf-search: #NotificationsPage #notificationsPage #account #notifications
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import InboxNotificationRow from '@/components/inbox/InboxNotificationRow';
import { useInboxNotifications } from '@/contexts/InboxNotificationContext';
import './notificationsPage.css';

const NotificationsPage = () => {
  const { t } = useTranslation('pages');
  const {
    items,
    unreadCount,
    nextCursor,
    loading,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  } = useInboxNotifications();

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="notifications-page page-content-70rem">
      <div className="notifications-page__header">
        <div className="notifications-page__heading">
          <h1 className="notifications-page__title">{t('notifications.title')}</h1>
          <p className="notifications-page__subtitle">
            {unreadCount > 0
              ? t('notifications.unread', { count: unreadCount })
              : t('notifications.subtitle')}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            className="notifications-page__mark-all"
            onClick={markAllRead}
          >
            {t('notifications.markAllRead')}
          </button>
        ) : null}
      </div>

      <div className="notifications-page__list">
        {items.length ? (
          items.map((notification) => (
            <InboxNotificationRow
              key={notification.id}
              notification={notification}
              onRead={markRead}
            />
          ))
        ) : (
          <p className="notifications-page__empty">
            {loading ? t('notifications.loading') : t('notifications.empty')}
          </p>
        )}
      </div>

      {nextCursor ? (
        <button
          type="button"
          className="notifications-page__more"
          onClick={loadMore}
          disabled={loading}
        >
          {t('notifications.loadMore')}
        </button>
      ) : null}
    </div>
  );
};

export default NotificationsPage;
