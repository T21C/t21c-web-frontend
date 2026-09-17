// tuf-search: #CalculatorToolPopup #passScoreCalculator
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';

export function CalculatorToolPopup({ title, onClose, children, panelClassName = '' }) {
  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="psc-tool-popup"
      panelClassName={`psc-tool-popup__panel${panelClassName ? ` ${panelClassName}` : ''}`}
      ariaLabelledBy="psc-tool-popup-title"
    >
      <div className="psc-tool-popup__header">
        <h2 id="psc-tool-popup-title">{title}</h2>
        <CloseButton variant="inline" onClick={onClose} aria-label="Close" />
      </div>
      <div className="psc-tool-popup__body">{children}</div>
    </PopupShell>
  );
}
