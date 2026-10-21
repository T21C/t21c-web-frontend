import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTufHelperLiteSettings } from '@/hooks/useTufHelperLiteIpc';
import TufHelperLiteDownloadManager from './TufHelperLiteDownloadManager';
import TufHelperLiteSettings from './TufHelperLiteSettings';
import { useTufHelperLiteDialog } from './useTufHelperLiteDialog';
import './tufHelperLiteDialog.css';

export const TufHelperLiteDialogs = ({ active, onChange, onClose, health }) => {
  const settings = useTufHelperLiteSettings();
  const tempMode = settings?.tempDownloadMode;
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const previousSize = useRef(null);
  const transitionFrom = useRef(null);
  const resizeAnimation = useRef(null);
  const contentAnimation = useRef(null);
  const view = active === 'downloads' && !tempMode ? 'downloads' : 'settings';
  useTufHelperLiteDialog(dialogRef, Boolean(active));
  useEffect(() => {
    if (active === 'downloads' && tempMode) onChange('settings');
  }, [active, onChange, tempMode]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) {
      resizeAnimation.current?.cancel();
      contentAnimation.current?.cancel();
      previousSize.current = null;
      return;
    }
    const from = transitionFrom.current || (resizeAnimation.current
      ? dialog.getBoundingClientRect() : previousSize.current);
    transitionFrom.current = null;
    resizeAnimation.current?.cancel();
    contentAnimation.current?.cancel();
    dialog.classList.remove('is-resizing');
    const size = { width: dialog.offsetWidth, height: dialog.offsetHeight };
    previousSize.current = size;
    dialog.scrollTop = 0;
    dialog.focus({ preventScroll: true });
    if (!from || !dialog.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    dialog.classList.add('is-resizing');
    const animation = dialog.animate([
      { width: `${from.width}px`, height: `${from.height}px` },
      { width: `${size.width}px`, height: `${size.height}px` },
    ], { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    resizeAnimation.current = animation;
    contentAnimation.current = bodyRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    animation.finished.then(() => {
      if (resizeAnimation.current !== animation) return;
      resizeAnimation.current = null;
      dialog.classList.remove('is-resizing');
    }).catch(() => {});
  }, [active, view]);

  useEffect(() => () => {
    resizeAnimation.current?.cancel();
    contentAnimation.current?.cancel();
  }, []);

  if (!active) return null;
  return (
    <div
      className="tufhelper-download-manager__overlay"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className={`tufhelper-download-manager tufhelper-dialog${view === 'settings' ? ' tufhelper-settings' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={view === 'settings' ? 'tufhelper-settings-title' : 'tufhelper-download-manager-title'}
        tabIndex={-1}
      >
        <div ref={bodyRef} className="tufhelper-dialog__body">
          {view === 'settings' ? (
            <TufHelperLiteSettings
              onClose={onClose}
              onManageDownloads={() => {
                transitionFrom.current = dialogRef.current.getBoundingClientRect();
                onChange('downloads');
              }}
              health={health}
            />
          ) : <TufHelperLiteDownloadManager onClose={onClose} health={health} dialogRef={dialogRef} />}
        </div>
      </div>
    </div>
  );
};
