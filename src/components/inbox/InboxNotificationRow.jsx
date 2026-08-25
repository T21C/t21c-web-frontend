// tuf-search: #InboxNotificationRow #inboxNotificationRow
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Portal } from '@/components/common/Portal';
import { BellOffIcon, EyeOffIcon, MoreVerticalIcon } from '@/components/common/icons';
import { PORTALED_PANEL_CLASS, usePortaledPanelAnchor } from '@/hooks/usePortaledPanelAnchor';
import { inboxNotificationCopy } from '@/utils/inboxNotificationCopy';
import { formatDate, formatTimeAgo } from '@/utils/Utility';
import './inboxNotificationRow.css';

const InboxNotificationRow = ({ notification, onRead, onHide, compact = false }) => {
  const { t, i18n } = useTranslation('pages');
  const copy = inboxNotificationCopy(t, notification);
  const unread = !notification.readAt;
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);
  const kebabRef = useRef(null);
  const menuRef = useRef(null);
  const className = [
    'inbox-notification-row',
    compact ? 'inbox-notification-row--compact' : '',
    unread ? 'inbox-notification-row--unread' : '',
    menuOpen ? 'inbox-notification-row--menu-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const typeTitle = t(`notifications.types.${notification.type}.title`, {
    defaultValue: t('notifications.unknown.title'),
  });

  const { panelStyle } = usePortaledPanelAnchor({
    open: menuOpen,
    anchorRef: kebabRef,
    panelRef: menuRef,
    gap: 4,
    minHeight: 0,
    maxHeightCap: 280,
    horizontalAlign: 'end',
  });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      const insideRow = rootRef.current && rootRef.current.contains(event.target);
      const insideMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!insideRow && !insideMenu) setMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleClick = () => {
    if (unread && onRead) onRead(notification.id);
  };

  const stopMenuEvent = (event) => {
    event.stopPropagation();
  };

  const toggleMenu = (event) => {
    stopMenuEvent(event);
    setMenuOpen((open) => !open);
  };

  const handleHide = (event, disableType = false) => {
    stopMenuEvent(event);
    setMenuOpen(false);
    if (onHide) onHide(notification.id, { disableType });
  };

  const inner = (
    <>
      <span className="inbox-notification-row__header">
        <span className="inbox-notification-row__title">{copy.title}</span>
        <span
          className="inbox-notification-row__meta"
          title={formatDate(notification.createdAt, i18n.language)}
        >
          {formatTimeAgo(notification.createdAt, i18n.language)}
        </span>
      </span>
      {copy.body ? <span className="inbox-notification-row__body">{copy.body}</span> : null}
    </>
  );

  return (
    <div className={className} ref={rootRef}>
      {copy.href ? (
        <Link className="inbox-notification-row__main" to={copy.href} onClick={handleClick}>
          {inner}
        </Link>
      ) : (
        <button type="button" className="inbox-notification-row__main" onClick={handleClick}>
          {inner}
        </button>
      )}
      <div className="inbox-notification-row__actions">
        <button
          ref={kebabRef}
          type="button"
          className="inbox-notification-row__kebab"
          aria-label={t('notifications.menuAria')}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={toggleMenu}
          onPointerDown={stopMenuEvent}
        >
          <MoreVerticalIcon size={16} color="currentColor" />
        </button>
      </div>
      <Portal when={menuOpen} mount="documentBody">
        <div
          ref={menuRef}
          className={`inbox-notification-row-menu ${PORTALED_PANEL_CLASS} portaled-panel--z-dropdown`}
          role="menu"
          style={{
            ...panelStyle,
            visibility: panelStyle ? 'visible' : 'hidden',
          }}
          onClick={stopMenuEvent}
          onPointerDown={stopMenuEvent}
        >
          <button
            type="button"
            role="menuitem"
            className="inbox-notification-row-menu__item"
            onClick={(event) => handleHide(event)}
          >
            <EyeOffIcon size={18} color="currentColor" className="inbox-notification-row-menu__icon" />
            <span>{t('notifications.hide')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="inbox-notification-row-menu__item"
            onClick={(event) => handleHide(event, true)}
          >
            <BellOffIcon size={18} color="currentColor" className="inbox-notification-row-menu__icon" />
            <span>{t('notifications.disableType', { title: typeTitle })}</span>
          </button>
        </div>
      </Portal>
    </div>
  );
};

export default InboxNotificationRow;
