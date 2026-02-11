import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { DiscordRolesManager } from '@/components/common/discord';
import './discordrolespopup.css';

const DiscordRolesPopup = ({
  isOpen,
  onClose,
  roleType = 'DIFFICULTY',
  difficultyId = null,
  curationTypeId = null,
  curationTypes = [],
  verifiedPassword = '',
}) => {
  const { t } = useTranslation(['components', 'common']);
  const { difficulties: allDifficulties } = useDifficultyContext();
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  const modalRef = useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes from DiscordRolesManager
  const handleUnsavedChangesChange = (hasChanges) => {
    setHasUnsavedChanges(hasChanges);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        t('discordRoles.confirmClose.message') || 'You have unsaved changes. Are you sure you want to close?'
      );
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleMouseDown = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setMouseDownOutside(true);
    }
  };

  const handleMouseUp = (e) => {
    if (mouseDownOutside && modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
    setMouseDownOutside(false);
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside, hasUnsavedChanges]);

  if (!isOpen) return null;

  return (
    <div className="discord-roles-popup">
      <div className="discord-roles-popup__content" ref={modalRef}>
        <button 
          className="discord-roles-popup__close-button"
          onClick={handleClose}
          type="button"
        >
          ✖
        </button>

        <div className="discord-roles-popup__header">
          <h2>{t('discordRoles.title')}</h2>
        </div>

        <div className="discord-roles-popup__body">
          <DiscordRolesManager
            roleType={roleType}
            difficultyId={difficultyId}
            curationTypeId={curationTypeId}
            difficulties={allDifficulties}
            curationTypes={curationTypes}
            onUnsavedChangesChange={handleUnsavedChangesChange}
            verifiedPassword={verifiedPassword}
          />
        </div>
      </div>
    </div>
  );
};

export default DiscordRolesPopup;
