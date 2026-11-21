// tuf-search: #SubmissionNotesField #submissionNotesField #admin #submissionManagement
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { EditIcon } from '@/components/common/icons';
import { LevelMentionField } from '@/components/misc';
import SubmissionCollapsibleText from './SubmissionCollapsibleText';

/**
 * Read-only notes box with an explicit edit control, matching SubmissionVideoLinkField.
 * The note body stays collapsed so a long note does not stretch the card.
 *
 * @param {object} props
 * @param {string|null} [props.notes]
 * @param {(nextNotes: string) => Promise<void>} props.onSave
 */
export default function SubmissionNotesField({ notes = '', onSave }) {
  const { t } = useTranslation(['components', 'common']);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes || '');
  const [saving, setSaving] = useState(false);
  const hasNotes = Boolean((notes || '').trim());

  useEffect(() => {
    if (!editing) {
      setDraft(notes || '');
    }
  }, [notes, editing]);

  const beginEdit = () => {
    setDraft(notes || '');
    setEditing(true);
    setOpen(true);
  };

  const cancel = () => {
    setDraft(notes || '');
    setEditing(false);
    setOpen(false);
  };

  const save = async () => {
    const next = draft.trim();
    const current = (notes || '').trim();
    if (next === current) {
      setEditing(false);
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      toast.success(t('levelSubmissions.messages.success.notesUpdated'));
      setEditing(false);
      setOpen(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error(error?.response?.data?.error || t('levelSubmissions.errors.notesUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubmissionCollapsibleText
      className="submission-notes"
      label={t('levelSubmissions.details.notes')}
      empty={!hasNotes && !editing}
      emptyLabel={t('levelSubmissions.details.notesPlaceholder')}
      open={editing || open}
      onOpenChange={(next) => {
        if (editing) return;
        setOpen(next);
      }}
      actions={!editing ? (
        <button
          type="button"
          className="submission-notes__edit-btn"
          onClick={beginEdit}
          title={t('buttons.edit', { ns: 'common' })}
          aria-label={t('buttons.edit', { ns: 'common' })}
        >
          <EditIcon color="#fff" size="16px" />
        </button>
      ) : null}
    >
      {editing ? (
        <div className="submission-notes__edit">
          <LevelMentionField
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
        <p className="submission-notes__body">{notes}</p>
      )}
    </SubmissionCollapsibleText>
  );
}
