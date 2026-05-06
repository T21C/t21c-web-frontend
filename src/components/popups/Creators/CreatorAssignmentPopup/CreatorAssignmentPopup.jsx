// tuf-search: #CreatorAssignmentPopup #creatorAssignmentPopup #popups #creators #creatorAssignment
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getPortalRoot } from '@/utils/portalRoot';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import './creatorAssignmentPopup.css';
import { CreatorAssignmentPanel } from './CreatorAssignmentPanel';

export const CreatorAssignmentPopup = ({ user, onClose, onUpdate }) => {
  const { t } = useTranslation(['components', 'common']);
  const popupRef = useRef(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const popupContent = (
    <div className="creator-assignment-popup-overlay">
      <div className="creator-assignment-popup-host">
        <div className="creator-assignment-popup" ref={popupRef}>
          <CloseButton
            variant="floating"
            onClick={onClose}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
          <CreatorAssignmentPanel user={user} onUserUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, getPortalRoot());
};
