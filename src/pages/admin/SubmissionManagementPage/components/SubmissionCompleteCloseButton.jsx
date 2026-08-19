// tuf-search: #SubmissionCompleteCloseButton #submissionCompleteCloseButton #admin #submissionManagement
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CrossIcon } from '@/components/common/icons';
import { HOLD_TO_CLOSE_ALL_MS } from './submissionDismiss';

const CLICK_MAX_MS = 220;

function isPointerOnButton(event, button) {
  if (!button) return false;
  if (button.contains(event.target)) return true;
  const node = document.elementFromPoint(event.clientX, event.clientY);
  return !!(node && button.contains(node));
}

export default function SubmissionCompleteCloseButton({ onClose, onCloseAll }) {
  const { t } = useTranslation('pages');
  const [hovered, setHovered] = useState(false);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const buttonRef = useRef(null);
  const holdRef = useRef({
    start: 0,
    raf: 0,
    pointerId: null,
    closedAll: false,
    overButton: false,
    listening: false,
  });
  const callbacksRef = useRef({ onClose, onCloseAll });
  callbacksRef.current = { onClose, onCloseAll };

  const stopRaf = () => {
    if (holdRef.current.raf) {
      cancelAnimationFrame(holdRef.current.raf);
      holdRef.current.raf = 0;
    }
  };

  const clearHold = () => {
    stopRaf();
    holdRef.current.start = 0;
    holdRef.current.pointerId = null;
    holdRef.current.closedAll = false;
    holdRef.current.overButton = false;
    setHolding(false);
    setProgress(0);
  };

  const docListenersRef = useRef({ up: null, cancel: null });

  const removeDocListeners = () => {
    if (!holdRef.current.listening) return;
    holdRef.current.listening = false;
    window.removeEventListener('pointerup', docListenersRef.current.up, true);
    window.removeEventListener('pointercancel', docListenersRef.current.cancel, true);
  };

  if (!docListenersRef.current.up) {
    docListenersRef.current.up = (event) => {
      if (event.pointerId !== holdRef.current.pointerId) return;
      removeDocListeners();

      const releasedOnButton = isPointerOnButton(event, buttonRef.current);
      const elapsed = holdRef.current.start ? performance.now() - holdRef.current.start : 0;
      const closedAll = holdRef.current.closedAll;
      clearHold();

      if (closedAll || !releasedOnButton) return;
      if (elapsed > 0 && elapsed <= CLICK_MAX_MS) {
        callbacksRef.current.onClose();
      }
    };
    docListenersRef.current.cancel = (event) => {
      if (holdRef.current.pointerId != null && event.pointerId !== holdRef.current.pointerId) return;
      removeDocListeners();
      clearHold();
    };
  }

  useEffect(() => () => {
    stopRaf();
    removeDocListeners();
  }, []);

  const handlePointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    holdRef.current.start = performance.now();
    holdRef.current.pointerId = event.pointerId;
    holdRef.current.closedAll = false;
    holdRef.current.overButton = true;
    setHolding(true);
    setProgress(0);

    if (!holdRef.current.listening) {
      holdRef.current.listening = true;
      window.addEventListener('pointerup', docListenersRef.current.up, true);
      window.addEventListener('pointercancel', docListenersRef.current.cancel, true);
    }

    const tick = (now) => {
      if (!holdRef.current.start || !holdRef.current.overButton) return;
      const elapsed = now - holdRef.current.start;
      const nextProgress = Math.min(1, elapsed / HOLD_TO_CLOSE_ALL_MS);
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        holdRef.current.closedAll = true;
        holdRef.current.raf = 0;
        setProgress(1);
        callbacksRef.current.onCloseAll();
        return;
      }
      holdRef.current.raf = requestAnimationFrame(tick);
    };
    stopRaf();
    holdRef.current.raf = requestAnimationFrame(tick);
  };

  const handlePointerLeave = () => {
    setHovered(false);
    if (!holdRef.current.start) return;
    holdRef.current.overButton = false;
    stopRaf();
    holdRef.current.start = 0;
    holdRef.current.closedAll = false;
    setHolding(false);
    setProgress(0);
  };

  const showTooltip = hovered || holding;

  return (
    <div className="submission-complete-close">
      <button
        ref={buttonRef}
        type="button"
        className={`submission-complete-close-btn${holding ? ' is-holding' : ''}`}
        aria-label={t('submissionManagement.jobs.closeAccepted')}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(event) => event.preventDefault()}
      >
        <CrossIcon color="currentColor" size={16} />
      </button>
      {showTooltip && (
        <div className="submission-complete-close-tooltip" role="tooltip">
          <span
            className="submission-complete-hold-circle"
            style={{ '--hold-progress': String(progress) }}
            aria-hidden="true"
          />
          <span>{t('submissionManagement.jobs.holdToCloseAll')}</span>
        </div>
      )}
    </div>
  );
}
