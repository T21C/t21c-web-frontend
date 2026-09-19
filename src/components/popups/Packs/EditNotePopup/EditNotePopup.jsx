// tuf-search: #EditNotePopup #editNotePopup #popups #packs
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import './EditNotePopup.css';

const NOTE_BODY_MAX_LENGTH = 2000;

const EditNotePopup = ({
  isOpen,
  note,
  onClose,
  onSave,
  submitting = false,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen || !note) {
      setName('');
      setDescription('');
      return;
    }
    setName(note.name || '');
    setDescription(typeof note.description === 'string' ? note.description : '');
  }, [isOpen, note]);

  if (!isOpen || !note) {
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
      overlayClassName="edit-note-popup__overlay"
      panelClassName="edit-note-popup"
    >
      <CloseButton
        variant="floating"
        className="edit-note-popup__close-btn"
        onClick={onClose}
        disabled={submitting}
        aria-label={t('buttons.close', { ns: 'common' })}
      />

      <form className="edit-note-popup__content" onSubmit={handleSubmit}>
        <h2 className="edit-note-popup__title">
          {t('packPopups.editNote.title')}
        </h2>

        <label className="edit-note-popup__field">
          <span className="edit-note-popup__label">
            {t('packPopups.editNote.name.label')}
          </span>
          <input
            type="text"
            className="edit-note-popup__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('packPopups.editNote.name.placeholder')}
            maxLength={255}
            required
            autoFocus
            disabled={submitting}
          />
        </label>

        <label className="edit-note-popup__field">
          <span className="edit-note-popup__label">
            {t('packPopups.editNote.description.label')}
          </span>
          <textarea
            className="edit-note-popup__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('packPopups.editNote.description.placeholder')}
            maxLength={NOTE_BODY_MAX_LENGTH}
            rows={6}
            disabled={submitting}
          />
          <span className="edit-note-popup__help">
            {t('packPopups.editNote.description.help')}
          </span>
        </label>

        <div className="edit-note-popup__actions">
          <button
            type="button"
            className="edit-note-popup__secondary-btn"
            onClick={onClose}
            disabled={submitting}
          >
            {t('buttons.cancel', { ns: 'common' })}
          </button>
          <button
            type="submit"
            className="edit-note-popup__primary-btn"
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

export default EditNotePopup;
