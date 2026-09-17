// tuf-search: #PopupShell #popupShell
import { useEffect } from 'react';
import { Portal } from '@/components/common/Portal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import './popupshell.css';

const escapeStack = [];

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

function usePopupShellEscape(onClose, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    escapeStack.push(onClose);

    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (escapeStack[escapeStack.length - 1] !== onClose) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const idx = escapeStack.lastIndexOf(onClose);
      if (idx !== -1) escapeStack.splice(idx, 1);
    };
  }, [onClose, enabled]);
}

export function PopupShell({
  onClose,
  children,
  overlayChildren,
  closeDisabled = false,
  dismissOnOverlay = true,
  dismissOnEscape = true,
  overlayClassName = '',
  panelClassName = '',
  overlayProps,
  panelProps,
  ariaLabelledBy,
  ariaLabel,
  mount,
  when = true,
  role = 'dialog',
}) {
  const overlayActive = Boolean(when) && !closeDisabled;
  useBodyScrollLock(Boolean(when));
  usePopupShellEscape(onClose, overlayActive && dismissOnEscape);

  const handleOverlayClick = (event) => {
    overlayProps?.onClick?.(event);
    if (event.defaultPrevented) return;
    if (!overlayActive || !dismissOnOverlay) return;
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Portal when={when} mount={mount}>
      <div
        className={classNames('popup-shell', overlayClassName)}
        role="presentation"
        {...overlayProps}
        onClick={handleOverlayClick}
      >
        {overlayChildren}
        <div
          className={classNames('popup-shell__panel', panelClassName)}
          role={role}
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          {...panelProps}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
