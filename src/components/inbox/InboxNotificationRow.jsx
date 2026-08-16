// tuf-search: #InboxNotificationRow #inboxNotificationRow
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inboxNotificationCopy } from '@/utils/inboxNotificationCopy';
import { formatDate, formatTimeAgo } from '@/utils/Utility';
import './inboxNotificationRow.css';

const InboxNotificationRow = ({ notification, onRead, compact = false }) => {
  const { t, i18n } = useTranslation('pages');
  const copy = inboxNotificationCopy(t, notification);
  const unread = !notification.readAt;
  const className = [
    'inbox-notification-row',
    compact ? 'inbox-notification-row--compact' : '',
    unread ? 'inbox-notification-row--unread' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (unread && onRead) onRead(notification.id);
  };

  const inner = (
    <>
      <span className="inbox-notification-row__copy">
        <span className="inbox-notification-row__title">{copy.title}</span>
        {copy.body ? <span className="inbox-notification-row__body">{copy.body}</span> : null}
      </span>
      <span
        className="inbox-notification-row__meta"
        title={formatDate(notification.createdAt, i18n.language)}
      >
        {formatTimeAgo(notification.createdAt, i18n.language)}
      </span>
    </>
  );

  if (copy.href) {
    return (
      <Link className={className} to={copy.href} onClick={handleClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {inner}
    </button>
  );
};

export default InboxNotificationRow;
