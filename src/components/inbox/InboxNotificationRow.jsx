// tuf-search: #InboxNotificationRow #inboxNotificationRow
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inboxNotificationCopy } from '@/utils/inboxNotificationCopy';
import './inboxNotificationRow.css';

function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const InboxNotificationRow = ({ notification, onRead, compact = false }) => {
  const { t } = useTranslation('pages');
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
      <span className="inbox-notification-row__meta">{formatWhen(notification.createdAt)}</span>
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
