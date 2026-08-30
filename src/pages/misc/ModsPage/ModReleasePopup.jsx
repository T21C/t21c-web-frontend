// tuf-search: #ModReleasePopup
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { ExternalLinkIcon } from '@/components/common/icons';
import { CustomSelect } from '@/components/common/selectors';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import './modReleasePopup.css';

const VERSION_MAX = 64;
const NOTE_MAX = 16384;
const ZIP_MAX_BYTES = 100 * 1024 * 1024;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function buildModReleaseBody({ version, notes, releasedAt, githubUrl, file }) {
  if (file) {
    const body = new FormData();
    body.append('version', version);
    if (notes) body.append('notes', notes);
    if (releasedAt) body.append('releasedAt', releasedAt);
    body.append('file', file);
    return body;
  }
  const body = { version };
  if (notes !== undefined) body.notes = notes || null;
  if (releasedAt) body.releasedAt = releasedAt;
  if (githubUrl) body.githubUrl = githubUrl;
  return body;
}

function defaultSource(release, isEdit) {
  if (!isEdit) return 'github';
  if (release?.source === 'hosted') return 'zip';
  return 'github';
}

function emptyForm(release, isEdit) {
  return {
    source: defaultSource(release, isEdit),
    version: release?.version || '',
    notes: release?.notes || '',
    releasedAt: toDatetimeLocalValue(release?.releasedAt),
    githubUrl: release?.source === 'github' ? release.downloadUrl || '' : '',
    file: null,
  };
}

function canSubmit(form, isEdit, sourceLocked) {
  if (!form.version.trim()) return false;
  if (form.source === 'zip') {
    if (sourceLocked) return true;
    if (form.file) return form.file.size <= ZIP_MAX_BYTES;
    return false;
  }
  if (form.githubUrl.trim()) return true;
  return isEdit;
}

export default function ModReleasePopup({ isOpen, release, onClose, onSubmit }) {
  const { t } = useTranslation(['pages', 'common']);
  const isEdit = Boolean(release);
  const sourceLocked = isEdit && release?.source === 'hosted';
  const [form, setForm] = useState(() => emptyForm(release, isEdit));
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm(release, Boolean(release)));
    setSubmitting(false);
    setFileError('');
  }, [isOpen, release]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape' || submitting) return;
      if (document.querySelector('.custom-select-menu')) return;
      onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, submitting]);

  const sourceOptions = useMemo(
    () => [
      { value: 'zip', label: t('mods.releases.sources.zip') },
      { value: 'github', label: t('mods.releases.sources.github') },
    ],
    [t],
  );
  const selectedSource =
    sourceOptions.find((option) => option.value === form.source) || sourceOptions[1];

  if (!isOpen) return null;

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onFileChange = (event) => {
    const next = event.target.files?.[0] || null;
    if (next && next.size > ZIP_MAX_BYTES) {
      setFileError(t('mods.releases.zipTooLarge'));
      setForm((prev) => ({ ...prev, file: null }));
      event.target.value = '';
      return;
    }
    setFileError('');
    setForm((prev) => ({ ...prev, file: next }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit(form, isEdit, sourceLocked) || submitting) return;
    setSubmitting(true);
    try {
      const releasedAt = fromDatetimeLocalValue(form.releasedAt);
      await onSubmit?.({
        version: form.version.trim(),
        notes: form.notes.trim(),
        releasedAt,
        githubUrl: form.source === 'github' ? form.githubUrl.trim() : '',
        file: form.source === 'zip' ? form.file : null,
      });
    } catch {
      // Parent shows the error toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal mount="documentBody">
      <div className="mod-release-popup" role="presentation">
        <button
          type="button"
          className="mod-release-popup__backdrop"
          aria-label={t('buttons.cancel', { ns: 'common' })}
          disabled={submitting}
          onClick={() => {
            if (!submitting) onClose?.();
          }}
        />
        <form
          className="mod-release-popup__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mod-release-popup-title"
          onSubmit={submit}
        >
          <CloseButton
            variant="floating"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
          <h2 id="mod-release-popup-title" className="mod-release-popup__title">
            {isEdit ? t('mods.releases.editTitle') : t('mods.releases.addTitle')}
          </h2>
          <div className="mod-release-popup__field">
            <span>{t('mods.releases.source')}</span>
            <CustomSelect
              options={sourceOptions}
              value={selectedSource}
              onChange={(option) => {
                if (sourceLocked || !option?.value) return;
                setForm((prev) => ({ ...prev, source: option.value, file: null }));
                setFileError('');
              }}
              width="100%"
              isSearchable={false}
              isDisabled={sourceLocked || submitting}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          <label className="mod-release-popup__field">
            <span>{t('mods.fields.version')}</span>
            <input
              type="text"
              value={form.version}
              onChange={setField('version')}
              maxLength={VERSION_MAX}
              disabled={submitting}
              required
            />
          </label>
          {form.source === 'zip' ? (
            sourceLocked ? (
              <div className="mod-release-popup__field">
                <span>{t('mods.releases.zip')}</span>
                <a href={release.downloadUrl} className="mod-release-popup__zip-link">
                  <span>
                    {release.originalFilename
                      ? t('mods.releases.downloadZip', { name: release.originalFilename })
                      : t('mods.releases.downloadZipFallback')}
                  </span>
                  <ExternalLinkIcon size={16} color="currentColor" />
                </a>
                <p className="mod-release-popup__hint">{t('mods.releases.hostedZipHint')}</p>
              </div>
            ) : (
              <label className="mod-release-popup__field">
                <span>{t('mods.releases.zip')}</span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  onChange={onFileChange}
                  disabled={submitting}
                />
                {form.file ? (
                  <p className="mod-release-popup__hint">{form.file.name}</p>
                ) : (
                  <p className="mod-release-popup__hint">{t('mods.releases.zipHint')}</p>
                )}
                {fileError ? <p className="mod-release-popup__hint">{fileError}</p> : null}
              </label>
            )
          ) : (
            <label className="mod-release-popup__field">
              <span>{t('mods.releases.githubUrl')}</span>
              <input
                type="url"
                value={form.githubUrl}
                onChange={setField('githubUrl')}
                disabled={submitting}
                placeholder="https://github.com/org/repo/releases"
                required={!isEdit}
              />
            </label>
          )}
          <label className="mod-release-popup__field">
            <span>{t('mods.releases.releasedAt')}</span>
            <input
              type="datetime-local"
              value={form.releasedAt}
              onChange={setField('releasedAt')}
              disabled={submitting}
            />
          </label>
          <label className="mod-release-popup__field">
            <span>{t('mods.fields.notes')}</span>
            <textarea
              value={form.notes}
              onChange={setField('notes')}
              maxLength={NOTE_MAX}
              disabled={submitting}
              rows={4}
            />
          </label>
          <div className="mod-release-popup__actions">
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              className="btn-fill-primary"
              disabled={submitting || !canSubmit(form, isEdit, sourceLocked)}
            >
              {isEdit ? t('mods.releases.save') : t('mods.releases.add')}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
