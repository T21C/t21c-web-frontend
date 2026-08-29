import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { CloseButton } from '@/components/common/buttons';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import ModsListControls from './ModsListControls';
import { DEFAULT_MOD_SORT, sortMods } from './modListSort';
import './modsPage.css';

const EMPTY_MOD = {
  name: '',
  creatorUsername: '',
  creatorDiscordId: '',
  version: '',
  description: '',
  downloadUrl: '',
  imageUrl: '',
  sourceUploadedAt: '',
  hidden: false,
};

function confirmDiscardUnsaved(t, isDirty) {
  if (!isDirty) return true;
  return window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }));
}

function apiError(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

function applyMods(data) {
  return Array.isArray(data?.mods) ? data.mods : [];
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formFromMod(mod) {
  return {
    name: mod?.name || '',
    creatorUsername: mod?.creatorUsername || '',
    creatorDiscordId: mod?.creatorDiscordId || '',
    version: mod?.version || '',
    description: mod?.description || '',
    downloadUrl: mod?.downloadUrl || '',
    imageUrl: mod?.imageUrl || '',
    sourceUploadedAt: toDatetimeLocalValue(mod?.sourceUploadedAt),
    hidden: Boolean(mod?.hidden),
  };
}

function isFormDirty(form, baseline) {
  return JSON.stringify(form) !== JSON.stringify(baseline);
}

function toPayload(form, { includeUploadedAt }) {
  const payload = {
    name: form.name,
    creatorUsername: form.creatorUsername,
    creatorDiscordId: form.creatorDiscordId,
    version: form.version,
    description: form.description,
    downloadUrl: form.downloadUrl,
    imageUrl: form.imageUrl || null,
    hidden: Boolean(form.hidden),
  };
  if (includeUploadedAt) {
    const uploaded = fromDatetimeLocalValue(form.sourceUploadedAt);
    if (uploaded) payload.sourceUploadedAt = uploaded;
  }
  return payload;
}

function creatorLabel(mod) {
  const username = mod?.creatorUsername || '';
  const snowflake = mod?.creatorDiscordId || '';
  if (username && snowflake) return `${username} @${snowflake}`;
  return username || snowflake;
}

function modSearchHaystack(mod) {
  return [
    mod?.name,
    mod?.creatorUsername,
    mod?.creatorDiscordId,
    creatorLabel(mod),
  ]
    .map((value) => String(value || '').toLowerCase())
    .join('\n');
}

function ModFormFields({ form, onChange, t }) {
  const setField = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    onChange({ ...form, [field]: value });
  };

  return (
    <>
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
      <div className="form-group">
        <label htmlFor="mod-version">{t('mods.fields.version')}</label>
        <input
          id="mod-version"
          type="text"
          value={form.version}
          onChange={setField('version')}
          maxLength={64}
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-download">{t('mods.fields.downloadUrl')}</label>
        <input
          id="mod-download"
          type="url"
          value={form.downloadUrl}
          onChange={setField('downloadUrl')}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-image">{t('mods.fields.imageUrl')}</label>
        <input
          id="mod-image"
          type="url"
          value={form.imageUrl}
          onChange={setField('imageUrl')}
        />
      </div>
      <div className="form-group">
        <label htmlFor="mod-uploaded">{t('mods.fields.sourceUploadedAt')}</label>
        <input
          id="mod-uploaded"
          type="datetime-local"
          value={form.sourceUploadedAt}
          onChange={setField('sourceUploadedAt')}
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
    </>
  );
}

const ModsEditPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('mods.meta.editTitle'),
        description: t('mods.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(DEFAULT_MOD_SORT);
  const [isCreating, setIsCreating] = useState(false);
  const [newMod, setNewMod] = useState(EMPTY_MOD);
  const [editingMod, setEditingMod] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_MOD);
  const [deletingMod, setDeletingMod] = useState(null);
  const [saving, setSaving] = useState(false);

  const anyModalOpen = Boolean(isCreating || editingMod || deletingMod);
  useBodyScrollLock(anyModalOpen);

  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      const { data } = await api.get(routes.admin.mods.root());
      setMods(applyMods(data));
    } catch {
      setLoadError(true);
      setMods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) loadData();
  }, [authLoading, isAdmin, loadData]);

  const visibleMods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? mods.filter((mod) => modSearchHaystack(mod).includes(q))
      : mods;
    return sortMods(filtered, sort);
  }, [mods, query, sort]);

  const closeCreate = () => {
    if (!confirmDiscardUnsaved(t, isFormDirty(newMod, EMPTY_MOD))) return;
    setIsCreating(false);
    setNewMod(EMPTY_MOD);
  };

  const closeEdit = () => {
    const baseline = formFromMod(editingMod);
    if (!confirmDiscardUnsaved(t, isFormDirty(editForm, baseline))) return;
    setEditingMod(null);
  };

  const canSubmit = (form) =>
    Boolean(form.name.trim() && form.creatorUsername.trim() && form.creatorDiscordId.trim() && form.downloadUrl.trim());

  if (authLoading) {
    return (
      <div className="mods-page">
        <div className="mods-page__container page-content-70rem">
          <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/mods" replace />;
  }

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="mods-page">
        <div className="mods-page__container page-content-70rem">
          <header className="mods-page__header">
            <div className="mods-page__heading">
              <Link to="/mods" className="mods-page__back">
                {t('mods.backToMods')}
              </Link>
              <h1>{t('mods.editTitle')}</h1>
              <p>{t('mods.editSubtitle')}</p>
            </div>
            <div className="mods-page__header-actions">
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => {
                  setNewMod(EMPTY_MOD);
                  setIsCreating(true);
                }}
              >
                {t('mods.createButton')}
              </button>
            </div>
          </header>

          <ModsListControls
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            t={t}
          />

          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : loadError ? (
            <div className="no-items-message">{t('mods.errors.loadFailed')}</div>
          ) : mods.length === 0 ? (
            <p className="mods-page__empty">{t('mods.noMods')}</p>
          ) : visibleMods.length === 0 ? (
            <p className="mods-page__empty">{t('mods.emptySearch')}</p>
          ) : (
            <div className="mods-page__list">
              {visibleMods.map((mod) => (
                <div key={mod.id} className="mods-page__admin-row">
                  <div className="mods-page__admin-row-copy">
                    <div className="mods-page__admin-row-name">
                      <strong>{mod.name}</strong>
                      {mod.version ? <span className="mods-page__version">{mod.version}</span> : null}
                      {mod.hidden ? (
                        <span className="mods-page__hidden-badge">{t('mods.hiddenBadge')}</span>
                      ) : null}
                    </div>
                    <div className="mods-page__admin-row-meta">{creatorLabel(mod)}</div>
                  </div>
                  <div className="mods-page__admin-row-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMod(mod);
                        setEditForm(formFromMod(mod));
                      }}
                      aria-label={t('buttons.edit', { ns: 'common' })}
                    >
                      <EditIcon color="#fff" size="20px" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingMod(mod)}
                      aria-label={t('buttons.delete', { ns: 'common' })}
                    >
                      <TrashIcon color="#fff" size="20px" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Footer />

        {isCreating ? (
          <div className="mods-page__modal" onClick={closeCreate}>
            <div className="mods-page__modal-content" onClick={(event) => event.stopPropagation()}>
              <CloseButton
                variant="floating"
                onClick={closeCreate}
                aria-label={t('buttons.close', { ns: 'common' })}
              />
              <h2>{t('mods.create.title')}</h2>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!canSubmit(newMod) || saving) return;
                  setSaving(true);
                  try {
                    await api.post(routes.admin.mods.root(), toPayload(newMod, { includeUploadedAt: true }));
                    toast.success(t('mods.notifications.created'));
                    setIsCreating(false);
                    setNewMod(EMPTY_MOD);
                    await loadData();
                  } catch (error) {
                    toast.error(apiError(error, t('mods.notifications.createFailed')));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <ModFormFields form={newMod} onChange={setNewMod} t={t} />
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={closeCreate}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button type="submit" className="confirm-button" disabled={!canSubmit(newMod) || saving}>
                    {t('mods.create.createButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {editingMod ? (
          <div className="mods-page__modal" onClick={closeEdit}>
            <div className="mods-page__modal-content" onClick={(event) => event.stopPropagation()}>
              <CloseButton
                variant="floating"
                onClick={closeEdit}
                aria-label={t('buttons.close', { ns: 'common' })}
              />
              <h2>{t('mods.edit.title')}</h2>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!canSubmit(editForm) || saving) return;
                  setSaving(true);
                  try {
                    await api.patch(
                      routes.admin.mods.byId(editingMod.id),
                      toPayload(editForm, { includeUploadedAt: true }),
                    );
                    toast.success(t('mods.notifications.updated'));
                    setEditingMod(null);
                    await loadData();
                  } catch (error) {
                    toast.error(apiError(error, t('mods.notifications.updateFailed')));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <ModFormFields form={editForm} onChange={setEditForm} t={t} />
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={closeEdit}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button type="submit" className="confirm-button" disabled={!canSubmit(editForm) || saving}>
                    {t('mods.edit.updateButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {deletingMod ? (
          <div className="mods-page__modal" onClick={() => setDeletingMod(null)}>
            <div className="mods-page__modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>{t('mods.delete.title')}</h2>
              <p>{t('mods.delete.message', { name: deletingMod.name })}</p>
              <p>{t('mods.delete.description')}</p>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setDeletingMod(null)}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  className="delete-confirm-button"
                  onClick={async () => {
                    try {
                      await api.delete(routes.admin.mods.byId(deletingMod.id));
                      toast.success(t('mods.notifications.deleted'));
                      setDeletingMod(null);
                      await loadData();
                    } catch (error) {
                      toast.error(apiError(error, t('mods.notifications.deleteFailed')));
                    }
                  }}
                >
                  {t('mods.delete.deleteButton')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default ModsEditPage;
