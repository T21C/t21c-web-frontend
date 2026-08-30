// tuf-search: #modEditForm
import toast from 'react-hot-toast';
import { CustomSelect } from '@/components/common/selectors';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { fromDatetimeLocalValue } from './ModReleasePopup';

export const EMPTY_MOD = {
  name: '',
  creatorUsername: '',
  creatorDiscordId: '',
  version: '',
  description: '',
  githubUrl: '',
  releaseSource: 'github',
  projectUrl: '',
  deprecatedAfter: '',
  sourceUploadedAt: '',
  hidden: false,
  isPinned: false,
  slug: '',
};

const ZIP_MAX_BYTES = 100 * 1024 * 1024;

export function confirmDiscardUnsaved(t, isDirty) {
  if (!isDirty) return true;
  return window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }));
}

export function apiError(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

export function applyMods(data) {
  return Array.isArray(data?.mods) ? data.mods : [];
}

export function formFromMod(mod) {
  return {
    name: mod?.name || '',
    creatorUsername: mod?.creatorUsername || '',
    creatorDiscordId: mod?.creatorDiscordId || '',
    version: '',
    description: mod?.description || '',
    githubUrl: '',
    releaseSource: 'github',
    projectUrl: mod?.projectUrl || '',
    deprecatedAfter: mod?.deprecatedAfter || '',
    sourceUploadedAt: '',
    hidden: Boolean(mod?.hidden),
    isPinned: Boolean(mod?.isPinned),
    slug: mod?.slug || '',
  };
}

export function isFormDirty(form, baseline) {
  return JSON.stringify(form) !== JSON.stringify(baseline);
}

export function toEditPayload(form) {
  const payload = {
    name: form.name,
    creatorUsername: form.creatorUsername,
    creatorDiscordId: form.creatorDiscordId,
    description: form.description,
    projectUrl: form.projectUrl || null,
    deprecatedAfter: form.deprecatedAfter || null,
    hidden: Boolean(form.hidden),
    isPinned: Boolean(form.isPinned),
  };
  if ((form.slug || '').trim()) payload.slug = form.slug.trim();
  return payload;
}

export function toCreatePayload(form) {
  const payload = {
    ...toEditPayload(form),
    version: form.version,
  };
  if (form.releaseSource === 'github') payload.githubUrl = form.githubUrl.trim();
  const uploaded = fromDatetimeLocalValue(form.sourceUploadedAt);
  if (uploaded) payload.sourceUploadedAt = uploaded;
  return payload;
}

export function toCreateFormData(form, zipFile) {
  const payload = toCreatePayload(form);
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null || key === 'githubUrl') return;
    if (typeof value === 'boolean') {
      body.append(key, value ? 'true' : 'false');
      return;
    }
    body.append(key, String(value));
  });
  body.append('file', zipFile);
  return body;
}

export function mergeMods(prev, updated) {
  const byId = new Map(prev.map((mod) => [mod.id, mod]));
  for (const mod of updated) byId.set(mod.id, mod);
  return [...byId.values()];
}

export function countOtherModsForAssign(mods, currentMod, userId) {
  if (!currentMod?.creatorDiscordId) return 0;
  return mods.filter((mod) => {
    if (mod.id === currentMod.id) return false;
    if (mod.creatorDiscordId !== currentMod.creatorDiscordId) return false;
    if (!userId) return true;
    return !(mod.assignees || []).some((assignee) => assignee.userId === userId);
  }).length;
}

export function canSubmitEdit(form) {
  return Boolean(form.name.trim() && form.creatorUsername.trim() && form.creatorDiscordId.trim());
}

function ModIconRow({ previewUrl, name, disabled, onChange, onRemove, t }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="mods-page__icon-row">
      {previewUrl ? (
        <img className="mods-page__icon-preview" src={previewUrl} alt="" />
      ) : (
        <span className="mods-page__icon-preview mods-page__icon-preview--fallback" aria-hidden>
          {initial}
        </span>
      )}
      <div className="mods-page__icon-actions">
        <button type="button" className="cancel-button" disabled={disabled} onClick={onChange}>
          {t('mods.icon.change')}
        </button>
        {previewUrl ? (
          <button type="button" className="cancel-button" disabled={disabled} onClick={onRemove}>
            {t('mods.icon.remove')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ModFormFields({ form, onChange, t, icon, isCreate, zipFile, onZipFileChange }) {
  const setField = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    onChange({ ...form, [field]: value });
  };
  const sourceOptions = [
    { value: 'zip', label: t('mods.releases.sources.zip') },
    { value: 'github', label: t('mods.releases.sources.github') },
  ];
  const selectedSource =
    sourceOptions.find((option) => option.value === form.releaseSource) || sourceOptions[1];

  return (
    <>
      {icon ? (
        <ModIconRow
          previewUrl={icon.previewUrl}
          name={form.name}
          disabled={icon.disabled}
          onChange={icon.onChange}
          onRemove={icon.onRemove}
          t={t}
        />
      ) : null}
      <div className="form-group">
        <label htmlFor="mod-name">{t('mods.fields.name')}</label>
        <input
          id="mod-name"
          type="text"
          value={form.name}
          onChange={setField('name')}
          maxLength={512}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-slug">{t('mods.fields.slug')}</label>
        <input
          id="mod-slug"
          type="text"
          value={form.slug}
          onChange={setField('slug')}
          maxLength={80}
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-creator-username">{t('mods.fields.creatorUsername')}</label>
        <input
          id="mod-creator-username"
          type="text"
          value={form.creatorUsername}
          onChange={setField('creatorUsername')}
          maxLength={64}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-creator-discord">{t('mods.fields.creatorDiscordId')}</label>
        <input
          id="mod-creator-discord"
          type="text"
          value={form.creatorDiscordId}
          onChange={setField('creatorDiscordId')}
          maxLength={32}
          required
        />
      </div>
      {isCreate ? (
        <>
          <div className="form-group">
            <label htmlFor="mod-version">{t('mods.fields.version')}</label>
            <input
              id="mod-version"
              type="text"
              value={form.version}
              onChange={setField('version')}
              maxLength={64}
              required
            />
          </div>
          <div className="form-group">
            <span>{t('mods.releases.source')}</span>
            <CustomSelect
              options={sourceOptions}
              value={selectedSource}
              onChange={(option) => {
                if (!option?.value) return;
                onChange({ ...form, releaseSource: option.value });
                onZipFileChange?.(null);
              }}
              width="100%"
              isSearchable={false}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          {form.releaseSource === 'zip' ? (
            <div className="form-group">
              <label htmlFor="mod-zip">{t('mods.releases.zip')}</label>
              <input
                id="mod-zip"
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => {
                  const next = event.target.files?.[0] || null;
                  if (next && next.size > ZIP_MAX_BYTES) {
                    toast.error(t('mods.releases.zipTooLarge'));
                    onZipFileChange?.(null);
                    event.target.value = '';
                    return;
                  }
                  onZipFileChange?.(next);
                }}
              />
              {zipFile ? <p className="mods-page__assign-empty">{zipFile.name}</p> : null}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="mod-github">{t('mods.releases.githubUrl')}</label>
              <input
                id="mod-github"
                type="url"
                value={form.githubUrl}
                onChange={setField('githubUrl')}
                placeholder="https://github.com/org/repo/releases"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="mod-uploaded">{t('mods.fields.sourceUploadedAt')}</label>
            <input
              id="mod-uploaded"
              type="datetime-local"
              value={form.sourceUploadedAt}
              onChange={setField('sourceUploadedAt')}
            />
          </div>
        </>
      ) : null}
      <div className="form-group">
        <label htmlFor="mod-project">{t('mods.fields.projectUrl')}</label>
        <input
          id="mod-project"
          type="url"
          value={form.projectUrl}
          onChange={setField('projectUrl')}
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-description">{t('mods.fields.description')}</label>
        <textarea
          id="mod-description"
          rows={8}
          value={form.description}
          onChange={setField('description')}
          maxLength={16384}
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-deprecated-after">{t('mods.fields.deprecatedAfter')}</label>
        <input
          id="mod-deprecated-after"
          type="text"
          value={form.deprecatedAfter}
          onChange={setField('deprecatedAfter')}
          maxLength={64}
          placeholder="v2.9.8"
        />
      </div>
      <div className="form-group form-group--checkbox">
        <label htmlFor="mod-hidden">
          <input
            id="mod-hidden"
            type="checkbox"
            checked={Boolean(form.hidden)}
            onChange={setField('hidden')}
          />
          {t('mods.fields.hidden')}
        </label>
      </div>
      <div className="form-group form-group--checkbox">
        <label htmlFor="mod-pinned">
          <input
            id="mod-pinned"
            type="checkbox"
            checked={Boolean(form.isPinned)}
            onChange={setField('isPinned')}
          />
          {t('mods.fields.isPinned')}
        </label>
      </div>
    </>
  );
}
