// tuf-search: #CalculatorToolPopup #passScoreCalculator
import { useEffect, useRef } from 'react';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export function CalculatorToolPopup({ title, onClose, children, panelClassName = '' }) {
  const panelRef = useRef(null);
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <Portal>
      <div
        className="psc-tool-popup"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          className={`psc-tool-popup__panel${panelClassName ? ` ${panelClassName}` : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="psc-tool-popup-title"
        >
          <div className="psc-tool-popup__header">
            <h2 id="psc-tool-popup-title">{title}</h2>
            <CloseButton variant="inline" onClick={onClose} aria-label="Close" />
          </div>
          <div className="psc-tool-popup__body">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
