// tuf-search: #PopupShell #popupShell
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Portal } from '@/components/common/Portal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  getPopupStackRoot,
  getTopPopupShell,
  PopupLayerContext,
  registerPopupShell,
} from '@/utils/portalRoot';
import './popupshell.css';

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

function assignRef(ref, node) {
  if (!ref) return;
  if (typeof ref === 'function') ref(node);
  else ref.current = node;
}

function usePopupShellEscape(onClose, enabled, overlayRef) {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (getTopPopupShell() !== overlayRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, enabled, overlayRef]);
}

function getAppBody() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('#root .body');
}

export function PopupShell({
  onClose,
  children,
  overlayChildren,
  closeDisabled = false,
  dismissOnOverlay = true,
  dismissOnEscape = true,
  belowNav = false,
  overlayClassName = '',
  panelClassName = '',
  overlayProps,
  panelProps,
  ariaLabelledBy,
  ariaLabel,
  mount: _mount,
  root,
  when = true,
  role = 'dialog',
}) {
  const overlayRef = useRef(null);
  const [shellNode, setShellNode] = useState(null);
  const [belowNavRoot, setBelowNavRoot] = useState(() => (belowNav ? getAppBody() : null));
  const pressedOnOverlayRef = useRef(false);
  const overlayActive = Boolean(when) && !closeDisabled;
  useBodyScrollLock(Boolean(when));
  usePopupShellEscape(onClose, overlayActive && dismissOnEscape, overlayRef);

  useLayoutEffect(() => {
    if (!belowNav) {
      setBelowNavRoot(null);
      return undefined;
    }
    const node = getAppBody();
    setBelowNavRoot((current) => (current === node ? current : node));
    return undefined;
  }, [belowNav]);

  useLayoutEffect(() => {
    if (!when || (belowNav && !root && !belowNavRoot)) {
      setShellNode(null);
      return undefined;
    }
    setShellNode(overlayRef.current);
    return registerPopupShell(overlayRef.current);
  }, [when, belowNav, belowNavRoot, root]);

  const handleOverlayPointerDown = (event) => {
    overlayProps?.onPointerDown?.(event);
    pressedOnOverlayRef.current = event.button === 0 && event.target === event.currentTarget;
  };

  const handleOverlayPointerUp = (event) => {
    overlayProps?.onPointerUp?.(event);
    const startedOnOverlay = pressedOnOverlayRef.current;
    pressedOnOverlayRef.current = false;
    if (event.defaultPrevented) return;
    if (!overlayActive || !dismissOnOverlay) return;
    if (!startedOnOverlay || event.button !== 0) return;
    if (event.target !== event.currentTarget) return;
    onClose();
  };

  const handleOverlayPointerCancel = (event) => {
    overlayProps?.onPointerCancel?.(event);
    pressedOnOverlayRef.current = false;
  };

  const handleOverlayClick = (event) => {
    overlayProps?.onClick?.(event);
  };

  const setOverlayRef = (node) => {
    overlayRef.current = node;
    assignRef(overlayProps?.ref, node);
  };

  const layerValue = useMemo(() => ({ inPopup: true, shell: shellNode }), [shellNode]);
  const stackRoot = !belowNav && typeof document !== 'undefined' ? getPopupStackRoot() : null;
  const portalRoot = root ?? (belowNav ? belowNavRoot : stackRoot);

  if (belowNav && !root && !belowNavRoot) return null;

  return (
    <Portal when={when} root={portalRoot}>
      <div
        role="presentation"
        {...overlayProps}
        ref={setOverlayRef}
        className={classNames(
          'popup-shell',
          belowNav && 'popup-shell--below-nav',
          overlayClassName,
          overlayProps?.className,
        )}
        onPointerDown={handleOverlayPointerDown}
        onPointerUp={handleOverlayPointerUp}
        onPointerCancel={handleOverlayPointerCancel}
        onClick={handleOverlayClick}
      >
        <PopupLayerContext.Provider value={layerValue}>
          {overlayChildren ? (
            <div className="popup-shell__chrome">{overlayChildren}</div>
          ) : null}
          <div
            className={classNames('popup-shell__panel', panelClassName)}
            role={role}
            aria-modal={belowNav ? 'false' : 'true'}
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabel}
            {...panelProps}
          >
            {children}
          </div>
        </PopupLayerContext.Provider>
      </div>
    </Portal>
  );
}
