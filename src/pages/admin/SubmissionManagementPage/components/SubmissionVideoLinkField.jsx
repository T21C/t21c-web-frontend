// tuf-search: #SubmissionVideoLinkField #submissionVideoLinkField #admin #submissionManagement
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { EditIcon } from '@/components/common/icons';
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';

/**
 * Editable video URL under the embed so moderators can see / fix malformed links.
 *
 * @param {object} props
 * @param {string} [props.videoLink]
 * @param {(nextLink: string) => Promise<void>} props.onSave
 * @param {string} [props.labelKey] - i18n key under components ns
 * @param {string} [props.placeholderKey]
 * @param {string} [props.successKey]
 * @param {string} [props.errorKey]
 * @param {string} [props.emptyErrorKey]
 */
export default function SubmissionVideoLinkField({
  videoLink = '',
  onSave,
  labelKey = 'levelSubmissions.details.videoLink',
  placeholderKey = 'levelSubmissions.details.videoLinkPlaceholder',
  successKey = 'levelSubmissions.messages.success.videoLinkUpdated',
  errorKey = 'levelSubmissions.errors.videoLinkUpdateFailed',
  emptyErrorKey = 'levelSubmissions.errors.videoLinkRequired',
}) {
  const { t } = useTranslation(['components', 'common']);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(videoLink || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(videoLink || '');
    }
  }, [videoLink, editing]);

  const beginEdit = () => {
    setDraft(videoLink || '');
    setEditing(true);
  };

  const cancel = () => {
    setDraft(videoLink || '');
    setEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trim();
    const current = (videoLink || '').trim();
    if (trimmed === current) {
      setEditing(false);
      return;
    }
    if (!trimmed) {
      toast.error(t(emptyErrorKey));
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      toast.success(t(successKey));
      setEditing(false);
    } catch (error) {
      console.error('Error updating video link:', error);
      toast.error(error?.response?.data?.error || t(errorKey));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="submission-video-link-field">
      <span className="submission-video-link-field__label">{t(labelKey)}</span>
      {editing ? (
        <div className="submission-video-link-field__edit">
          <input
            type="url"
            className="submission-video-link-field__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void save();
              } else if (e.key === 'Escape') {
                cancel();
              }
            }}
            placeholder={t(placeholderKey)}
            disabled={saving}
            autoFocus
          />
          <div className="submission-video-link-field__actions">
            <button
              type="button"
              className="submission-video-link-field__save"
              onClick={() => void save()}
              disabled={saving}
              title={t('buttons.save', { ns: 'common' })}
            >
              ✓
            </button>
            <button
              type="button"
              className="submission-video-link-field__cancel"
              onClick={cancel}
              disabled={saving}
              title={t('buttons.cancel', { ns: 'common' })}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="submission-video-link-field__display">
          {videoLink ? (
            <a
              className="submission-video-link-field__link-wrap"
              href={videoLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MarqueeText
                className="submission-video-link-field__link"
                title={videoLink}
              >
                {videoLink}
              </MarqueeText>
            </a>
          ) : (
            <span className="submission-video-link-field__empty">{t(placeholderKey)}</span>
          )}
          <button
            type="button"
            className="submission-video-link-field__edit-btn"
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
