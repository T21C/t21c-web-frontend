import { useEffect, useId, useRef } from 'react';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import AutoraterEmbed from '@/components/cards/RatingItem/AutoraterEmbed';
import autoraterIcon from '@/assets/icons/autorater-v2.png';
import './autoraterlevelpopup.css';

export function AutoraterLevelPopup({ levelId, onClose }) {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    const trigger = document.activeElement;
    panel.current?.querySelector('button')?.focus();
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="autorater-level-popup"
      panelClassName="autorater-level-popup__panel"
      ariaLabelledBy={titleId}
      panelProps={{ ref: panel }}
    >
      <div className="autorater-level-popup__header">
        <img src={autoraterIcon} alt="" aria-hidden="true" />
        <div className="autorater-level-popup__heading">
          <h2 id={titleId}>Auto Rater Cat v2</h2>
          <span>TUF level #{levelId}</span>
        </div>
        <CloseButton onClick={onClose} aria-label="Close Auto Rater Cat v2" />
      </div>
      <div className="autorater-level-popup__body">
        <AutoraterEmbed key={levelId} levelId={levelId} />
      </div>
    </PopupShell>
  );
}
