// tuf-search: #CreatorAssignmentPopup #creatorAssignmentPopup #popups #creators #creatorAssignment
import React from 'react';
import { PopupShell } from '@/components/common/PopupShell';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import './creatorAssignmentPopup.css';
import { CreatorAssignmentPanel } from './CreatorAssignmentPanel';

export const CreatorAssignmentPopup = ({ user, onClose, onUpdate }) => {
  const { t } = useTranslation(['components', 'common']);

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="creator-assignment-popup-overlay"
      panelClassName="creator-assignment-popup-host"
    >
        <div className="creator-assignment-popup">
          <CloseButton
            variant="floating"
            onClick={onClose}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
          <CreatorAssignmentPanel user={user} onUserUpdate={onUpdate} />
        </div>
    </PopupShell>
  );
};
