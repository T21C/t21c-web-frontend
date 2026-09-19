// tuf-search: #EditFolderPopup #editFolderPopup #popups #packs
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import './EditFolderPopup.css';

const FOLDER_DESCRIPTION_MAX_LENGTH = 2000;

const EditFolderPopup = ({
  isOpen,
  folder,
  onClose,
  onSave,
  submitting = false,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen || !folder) {
      setName('');
      setDescription('');
      return;
    }
    setName(folder.name || '');
    setDescription(typeof folder.description === 'string' ? folder.description : '');
  }, [isOpen, folder]);

  if (!isOpen || !folder) {
    return null;
  }

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || !onSave) return;
    onSave({
      name: trimmedName,
      description,
    });
  };

  return (
    <PopupShell
      onClose={onClose}
      closeDisabled={submitting}
      overlayClassName="edit-folder-popup__overlay"
      panelClassName="edit-folder-popup"
    >
      <CloseButton
        variant="floating"
        className="edit-folder-popup__close-btn"
        onClick={onClose}
        disabled={submitting}
        aria-label={t('buttons.close', { ns: 'common' })}
      />

      <form className="edit-folder-popup__content" onSubmit={handleSubmit}>
        <h2 className="edit-folder-popup__title">
          {t('packPopups.editFolder.title')}
        </h2>

        <label className="edit-folder-popup__field">
          <span className="edit-folder-popup__label">
            {t('packPopups.editFolder.name.label')}
          </span>
          <input
            type="text"
            className="edit-folder-popup__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('packPopups.editFolder.name.placeholder')}
            maxLength={255}
            required
            autoFocus
            disabled={submitting}
          />
          <span className="edit-folder-popup__help">
            {t('packPopups.editFolder.name.help')}
          </span>
        </label>

        <label className="edit-folder-popup__field">
          <span className="edit-folder-popup__label">
            {t('packPopups.editFolder.description.label')}
          </span>
          <textarea
            className="edit-folder-popup__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('packPopups.editFolder.description.placeholder')}
            maxLength={FOLDER_DESCRIPTION_MAX_LENGTH}
            rows={4}
            disabled={submitting}
          />
        </label>

        <div className="edit-folder-popup__actions">
          <button
            type="button"
            className="edit-folder-popup__secondary-btn"
            onClick={onClose}
            disabled={submitting}
          >
            {t('buttons.cancel', { ns: 'common' })}
          </button>
          <button
            type="submit"
            className="edit-folder-popup__primary-btn"
            disabled={!canSubmit}
          >
            {submitting
              ? t('loading.saving', { ns: 'common' })
              : t('buttons.save', { ns: 'common' })}
          </button>
        </div>
      </form>
    </PopupShell>
  );
};

export default EditFolderPopup;
