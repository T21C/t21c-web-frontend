// tuf-search: #SubmissionNotesField #submissionNotesField #admin #submissionManagement
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { EditIcon } from '@/components/common/icons';

/**
 * Read-only notes box with an explicit edit control, matching SubmissionVideoLinkField.
 *
 * @param {object} props
 * @param {string|null} [props.notes]
 * @param {(nextNotes: string) => Promise<void>} props.onSave
 */
export default function SubmissionNotesField({ notes = '', onSave }) {
  const { t } = useTranslation(['components', 'common']);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(notes || '');
    }
  }, [notes, editing]);

  const beginEdit = () => {
    setDraft(notes || '');
    setEditing(true);
  };

  const cancel = () => {
    setDraft(notes || '');
    setEditing(false);
  };

  const save = async () => {
    const next = draft.trim();
    const current = (notes || '').trim();
    if (next === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      toast.success(t('levelSubmissions.messages.success.notesUpdated'));
      setEditing(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error(error?.response?.data?.error || t('levelSubmissions.errors.notesUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="submission-notes">
      <span className="submission-notes__label">{t('levelSubmissions.details.notes')}</span>
      {editing ? (
        <div className="submission-notes__edit">
          <textarea
            className="submission-notes__textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            placeholder={t('levelSubmissions.details.notesPlaceholder')}
            maxLength={4000}
            disabled={saving}
            autoFocus
          />
          <div className="submission-notes__actions">
            <button
              type="button"
              className="submission-notes__save"
              onClick={() => void save()}
              disabled={saving}
              title={t('buttons.save', { ns: 'common' })}
            >
              ✓
            </button>
            <button
              type="button"
              className="submission-notes__cancel"
              onClick={cancel}
              disabled={saving}
              title={t('buttons.cancel', { ns: 'common' })}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="submission-notes__display">
          {notes ? (
            <p className="submission-notes__body">{notes}</p>
          ) : (
            <span className="submission-notes__empty">
              {t('levelSubmissions.details.notesPlaceholder')}
            </span>
          )}
          <button
            type="button"
            className="submission-notes__edit-btn"
            onClick={beginEdit}
            title={t('buttons.edit', { ns: 'common' })}
            aria-label={t('buttons.edit', { ns: 'common' })}
          >
            <EditIcon color="#fff" size="16px" />
          </button>
        </div>
      )}
    </div>
  );
}
