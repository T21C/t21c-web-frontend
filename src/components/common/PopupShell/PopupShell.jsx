// tuf-search: #PopupShell #popupShell
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Portal } from '@/components/common/Portal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { registerPopupShell } from '@/utils/portalRoot';
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
  const overlayRef = useRef(null);
  const overlayActive = Boolean(when) && !closeDisabled;
  useBodyScrollLock(Boolean(when));
  usePopupShellEscape(onClose, overlayActive && dismissOnEscape);

  useLayoutEffect(() => {
    if (!when) return undefined;
    return registerPopupShell(overlayRef.current);
  }, [when]);

  const handleOverlayClick = (event) => {
    overlayProps?.onClick?.(event);
    if (event.defaultPrevented) return;
    if (!overlayActive || !dismissOnOverlay) return;
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Portal when={when} mount={mount}>
      <div
        role="presentation"
        {...overlayProps}
        ref={overlayRef}
        className={classNames('popup-shell', overlayClassName, overlayProps?.className)}
        onClick={handleOverlayClick}
      >
        {overlayChildren ? (
          <div className="popup-shell__chrome">{overlayChildren}</div>
        ) : null}
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
