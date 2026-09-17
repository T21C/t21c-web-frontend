// tuf-search: #DiscordRolesPopup #discordRolesPopup #popups #discordRoles
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { DiscordRolesManager } from '@/components/common/discord';
import './discordrolespopup.css';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';

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

  if (!isOpen) return null;

  return (
    <PopupShell
      onClose={handleClose}
      overlayClassName="discord-roles-popup"
      panelClassName="discord-roles-popup__content"
    >
        <CloseButton
          variant="floating"
          className="discord-roles-popup__close-button"
          onClick={handleClose}
          type="button"
          aria-label={t('buttons.close', { ns: 'common' })}
        />

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
    </PopupShell>
  );
};

export default DiscordRolesPopup;
