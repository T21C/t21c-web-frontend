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
import { CustomSelect, FacetQueryBuilder, ProfileSelector } from '@/components/common/selectors';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import { buildFacetQueryParam } from '@/utils/facetQueryCodec';
import ModsListControls from './ModsListControls';
import { listCreatorText } from './modPeople';
import { useModsList } from './useModsList';
import { VirtualList } from '@/components/common/VirtualList';
import './modsPage.css';

const EMPTY_MOD = {
  name: '',
  creatorUsername: '',
  creatorDiscordId: '',
  version: '',
  description: '',
  downloadUrl: '',
  projectUrl: '',
  deprecatedAfter: '',
  sourceUploadedAt: '',
  hidden: false,
  isPinned: false,
  slug: '',
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
    projectUrl: mod?.projectUrl || '',
    deprecatedAfter: mod?.deprecatedAfter || '',
    sourceUploadedAt: toDatetimeLocalValue(mod?.sourceUploadedAt),
    hidden: Boolean(mod?.hidden),
    isPinned: Boolean(mod?.isPinned),
    slug: mod?.slug || '',
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
    projectUrl: form.projectUrl || null,
    deprecatedAfter: form.deprecatedAfter || null,
    hidden: Boolean(form.hidden),
    isPinned: Boolean(form.isPinned),
  };
  if (form.slug.trim()) payload.slug = form.slug.trim();
  if (includeUploadedAt) {
    const uploaded = fromDatetimeLocalValue(form.sourceUploadedAt);
    if (uploaded) payload.sourceUploadedAt = uploaded;
  }
  return payload;
}

function mergeMods(prev, updated) {
  const byId = new Map(prev.map((mod) => [mod.id, mod]));
  for (const mod of updated) byId.set(mod.id, mod);
  return [...byId.values()];
}

function countOtherModsForAssign(mods, currentMod, userId) {
  if (!currentMod?.creatorDiscordId) return 0;
  return mods.filter((mod) => {
    if (mod.id === currentMod.id) return false;
    if (mod.creatorDiscordId !== currentMod.creatorDiscordId) return false;
    if (!userId) return true;
    return !(mod.assignees || []).some((assignee) => assignee.userId === userId);
  }).length;
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

function ModFormFields({ form, onChange, t, icon }) {
  const setField = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    onChange({ ...form, [field]: value });
  };

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
        <label htmlFor="mod-project">{t('mods.fields.projectUrl')}</label>
        <input
          id="mod-project"
          type="url"
          value={form.projectUrl}
          onChange={setField('projectUrl')}
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

  const [tagFacet, setTagFacet] = useState(null);
  const facetQuery = useMemo(() => buildFacetQueryParam({ tags: tagFacet }), [tagFacet]);
  const {
    mods,
    setMods,
    loading,
    loadingMore,
    loadError,
    hasMore,
    total,
    query,
    setQuery,
    sort,
    setSort,
    loadMore,
    reload,
  } = useModsList({
    path: routes.admin.mods.root(),
    enabled: !authLoading && isAdmin,
    facetQuery,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [newMod, setNewMod] = useState(EMPTY_MOD);
  const [editingMod, setEditingMod] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_MOD);
  const [deletingMod, setDeletingMod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assignPlayer, setAssignPlayer] = useState(null);
  const [applyToSameCreator, setApplyToSameCreator] = useState(false);
  const [assignConfirmCount, setAssignConfirmCount] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [createIconFile, setCreateIconFile] = useState(null);
  const [createIconPreview, setCreateIconPreview] = useState('');
  const [iconPicker, setIconPicker] = useState(null);
  const [iconBusy, setIconBusy] = useState(false);
  const [catalogTags, setCatalogTags] = useState([]);
  const [versionForm, setVersionForm] = useState({ version: '', downloadUrl: '', releasedAt: '', notes: '' });
  const [mergeSourceId, setMergeSourceId] = useState('');

  const mergeOptions = useMemo(
    () =>
      (editingMod
        ? mods.filter((item) => item.id !== editingMod.id)
        : mods
      ).map((item) => ({
        value: String(item.id),
        label: `${item.name} (${item.slug || item.id})`,
      })),
    [mods, editingMod],
  );

  const loadCatalogTags = useCallback(async () => {
    try {
      const { data } = await api.get(routes.admin.mods.tags());
      setCatalogTags(Array.isArray(data?.tags) ? data.tags : []);
    } catch {
      setCatalogTags([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) void loadCatalogTags();
  }, [authLoading, isAdmin, loadCatalogTags]);

  const openEdit = async (mod) => {
    setEditingMod(mod);
    setEditForm(formFromMod(mod));
    setAssignPlayer(null);
    setApplyToSameCreator(false);
    setAssignConfirmCount(null);
    setMergeSourceId('');
    setVersionForm({ version: '', downloadUrl: '', releasedAt: '', notes: '' });
    try {
      const { data } = await api.get(routes.admin.mods.byId(mod.id));
      if (data?.mod) {
        setEditingMod(data.mod);
        setEditForm(formFromMod(data.mod));
      }
    } catch (error) {
      toast.error(apiError(error, t('mods.errors.loadFailed')));
    }
  };

  const anyModalOpen = Boolean(isCreating || editingMod || deletingMod || iconPicker);
  useBodyScrollLock(anyModalOpen);

  const setPendingCreateIcon = (file) => {
    setCreateIconPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : '';
    });
    setCreateIconFile(file || null);
  };

  useEffect(() => {
    return () => {
      if (createIconPreview) URL.revokeObjectURL(createIconPreview);
    };
  }, [createIconPreview]);

  const searching = Boolean(query.trim());

  const closeCreate = () => {
    if (!confirmDiscardUnsaved(t, isFormDirty(newMod, EMPTY_MOD) || Boolean(createIconFile))) return;
    setIsCreating(false);
    setNewMod(EMPTY_MOD);
    setPendingCreateIcon(null);
  };

  const closeEdit = () => {
    const baseline = formFromMod(editingMod);
    if (!confirmDiscardUnsaved(t, isFormDirty(editForm, baseline))) return;
    setEditingMod(null);
    setAssignPlayer(null);
    setApplyToSameCreator(false);
    setAssignConfirmCount(null);
  };

  const runAssign = async (applySame) => {
    if (!editingMod || !assignPlayer?.id || assigning) return;
    setAssigning(true);
    try {
      const { data } = await api.post(routes.admin.mods.assignees(editingMod.id), {
        playerId: assignPlayer.id,
        applyToSameCreator: Boolean(applySame),
      });
      const updated = Array.isArray(data?.mods) ? data.mods : [];
      setMods((prev) => mergeMods(prev, updated));
      const current = updated.find((mod) => mod.id === editingMod.id);
      if (current) setEditingMod(current);
      setAssignPlayer(null);
      setApplyToSameCreator(false);
      setAssignConfirmCount(null);
      if (updated.length > 1) await reload();
      const count = Number(data?.assignedModCount) || updated.length;
      toast.success(
        count > 1 ? t('mods.assign.assignedMany', { count }) : t('mods.assign.assigned'),
      );
    } catch (error) {
      toast.error(apiError(error, t('mods.assign.failed')));
    } finally {
      setAssigning(false);
    }
  };

  const requestAssign = async () => {
    if (!editingMod || !assignPlayer?.id || assignPlayer.isNewRequest) return;
    let otherCount = 0;
    if (applyToSameCreator && editingMod.creatorDiscordId) {
      try {
        const { data } = await api.get(routes.admin.mods.root(), {
          params: {
            q: editingMod.creatorDiscordId,
            offset: 0,
            limit: 100,
            sort: 'name-asc',
          },
        });
        otherCount = countOtherModsForAssign(applyMods(data), editingMod, assignPlayer.user?.id);
      } catch {
        otherCount = countOtherModsForAssign(mods, editingMod, assignPlayer.user?.id);
      }
    }
    if (otherCount > 0) {
      setAssignConfirmCount(otherCount);
      return;
    }
    void runAssign(false);
  };

  const unassignUser = async (userId) => {
    if (!editingMod || assigning) return;
    setAssigning(true);
    try {
      const { data } = await api.delete(routes.admin.mods.assignee(editingMod.id, userId));
      if (data?.mod) {
        setEditingMod(data.mod);
        setMods((prev) => mergeMods(prev, [data.mod]));
      }
      toast.success(t('mods.assign.removed'));
    } catch (error) {
      toast.error(apiError(error, t('mods.assign.removeFailed')));
    } finally {
      setAssigning(false);
    }
  };

  const applyModUpdate = (mod) => {
    if (!mod) return;
    setEditingMod(mod);
    setMods((prev) => mergeMods(prev, [mod]));
  };

  const postModIcon = async (modId, file) => {
    const body = new FormData();
    body.append('icon', file);
    const { data } = await api.post(routes.admin.mods.icon(modId), body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.mod;
  };

  const handleIconSave = async (file) => {
    if (iconPicker === 'create') {
      setPendingCreateIcon(file);
      setIconPicker(null);
      return;
    }
    if (iconPicker !== 'edit' || !editingMod) return;
    setIconBusy(true);
    try {
      const next = await postModIcon(editingMod.id, file);
      applyModUpdate(next);
      toast.success(t('mods.icon.uploaded'));
    } catch (error) {
      toast.error(getCdnErrorMessage(error, t('mods.icon.uploadFailed')));
    } finally {
      setIconBusy(false);
      setIconPicker(null);
    }
  };

  const handleIconRemove = async () => {
    if (isCreating) {
      setPendingCreateIcon(null);
      return;
    }
    if (!editingMod) return;
    setIconBusy(true);
    try {
      const { data } = await api.delete(routes.admin.mods.icon(editingMod.id));
      applyModUpdate(data?.mod);
      toast.success(t('mods.icon.removed'));
    } catch (error) {
      toast.error(apiError(error, t('mods.icon.removeFailed')));
    } finally {
      setIconBusy(false);
    }
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
              <Link to="/mods/edit/tags" className="btn-fill-secondary">
                {t('mods.tags.manage')}
              </Link>
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => {
                  setNewMod(EMPTY_MOD);
                  setPendingCreateIcon(null);
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
          >
            {catalogTags.length ? (
              <FacetQueryBuilder
                items={catalogTags}
                value={tagFacet}
                onChange={setTagFacet}
                title={t('mods.tags.filter')}
                enableGrouping={false}
              />
            ) : null}
          </ModsListControls>

          {total != null && !loadError ? (
            <span className="mods-page__total">
              {t('totalResults', { ns: 'common', count: total })}
            </span>
          ) : null}

          {loading && mods.length === 0 ? (
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          ) : loadError ? (
            <div className="no-items-message">{t('mods.errors.loadFailed')}</div>
          ) : mods.length === 0 ? (
            <p className="mods-page__empty">
              {searching ? t('mods.emptySearch') : t('mods.noMods')}
            </p>
          ) : (
            <VirtualList
              style={{ paddingBottom: '4rem', minHeight: '50vh' }}
              items={mods}
              loadMore={loadMore}
              hasMore={hasMore}
              loadingMore={loadingMore}
              overscan={400}
              listClassName="mods-page__list"
              itemClassName="mods-page__list-item"
              loader={<div className="loader loader-relative" />}
              endMessage={
                <p className="mods-page__end-message">
                  <b>{t('mods.infScroll.end')}</b>
                </p>
              }
              renderItem={(mod) => (
                <div className="mods-page__admin-row">
                  <div className="mods-page__admin-row-copy">
                    <div className="mods-page__admin-row-name">
                      <strong>{mod.name}</strong>
                      {mod.version ? <span className="mods-page__version">{mod.version}</span> : null}
                      {mod.isPinned ? (
                        <span className="mods-page__pin-badge">{t('mods.pinned')}</span>
                      ) : null}
                      {mod.deprecatedAfter ? (
                        <span className="mods-page__deprecated-badge">
                          {t('mods.deprecatedAfterLabel', { version: mod.deprecatedAfter })}
                        </span>
                      ) : null}
                      {mod.hidden ? (
                        <span className="mods-page__hidden-badge">{t('mods.hiddenBadge')}</span>
                      ) : null}
                    </div>
                    <div className="mods-page__admin-row-meta">{listCreatorText(mod)}</div>
                    {Array.isArray(mod.tags) && mod.tags.length ? (
                      <div className="mods-page__tags">
                        {mod.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="mods-page__tag"
                            style={{ borderColor: tag.color, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="mods-page__admin-row-actions">
                    <button
                      type="button"
                      onClick={() => void openEdit(mod)}
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
              )}
              computeItemKey={(index, mod) => mod?.id ?? index}
            />
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
                    const { data } = await api.post(
                      routes.admin.mods.root(),
                      toPayload(newMod, { includeUploadedAt: true }),
                    );
                    if (createIconFile && data?.id) {
                      try {
                        await postModIcon(data.id, createIconFile);
                      } catch (iconError) {
                        toast.error(getCdnErrorMessage(iconError, t('mods.icon.uploadFailed')));
                      }
                    }
                    toast.success(t('mods.notifications.created'));
                    setIsCreating(false);
                    setNewMod(EMPTY_MOD);
                    setPendingCreateIcon(null);
                    await reload();
                  } catch (error) {
                    toast.error(apiError(error, t('mods.notifications.createFailed')));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <ModFormFields
                  form={newMod}
                  onChange={setNewMod}
                  t={t}
                  icon={{
                    previewUrl: createIconPreview,
                    disabled: saving || iconBusy,
                    onChange: () => setIconPicker('create'),
                    onRemove: handleIconRemove,
                  }}
                />
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
                    await reload();
                  } catch (error) {
                    toast.error(apiError(error, t('mods.notifications.updateFailed')));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <ModFormFields
                  form={editForm}
                  onChange={setEditForm}
                  t={t}
                  icon={{
                    previewUrl: editingMod.imageUrl,
                    disabled: saving || iconBusy,
                    onChange: () => setIconPicker('edit'),
                    onRemove: handleIconRemove,
                  }}
                />
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={closeEdit}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button type="submit" className="confirm-button" disabled={!canSubmit(editForm) || saving}>
                    {t('mods.edit.updateButton')}
                  </button>
                </div>
              </form>
              <div className="mods-page__assign">
                <p className="mods-page__assign-title">{t('mods.assign.title')}</p>
                <div className="mods-page__assignee-chips">
                  {(editingMod.assignees || []).length === 0 ? (
                    <span className="mods-page__assign-empty">{t('mods.assign.empty')}</span>
                  ) : (
                    (editingMod.assignees || []).map((assignee) => (
                      <span key={assignee.userId} className="mods-page__assignee-chip">
                        <span>{assignee.name}</span>
                        <button
                          type="button"
                          onClick={() => unassignUser(assignee.userId)}
                          disabled={assigning}
                          aria-label={t('mods.assign.remove', { name: assignee.name })}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <ProfileSelector
                  type="player"
                  value={assignPlayer}
                  onChange={setAssignPlayer}
                  placeholder={t('mods.assign.placeholder')}
                  portalDropdown
                  allowRequestNew={false}
                  disabled={assigning}
                />
                <label className="mods-page__assign-same">
                  <input
                    type="checkbox"
                    checked={applyToSameCreator}
                    onChange={(event) => setApplyToSameCreator(event.target.checked)}
                    disabled={assigning}
                  />
                  {t('mods.assign.applySameCreator')}
                </label>
                <button
                  type="button"
                  className="confirm-button"
                  disabled={!assignPlayer?.id || assignPlayer.isNewRequest || assigning}
                  onClick={requestAssign}
                >
                  {t('mods.assign.addButton')}
                </button>
              </div>
              <div className="mods-page__assign">
                <p className="mods-page__assign-title">{t('mods.tags.title')}</p>
                {catalogTags.length === 0 ? (
                  <span className="mods-page__assign-empty">
                    {t('mods.tags.empty')}{' '}
                    <Link to="/mods/edit/tags">{t('mods.tags.manage')}</Link>
                  </span>
                ) : null}
                <div className="mods-page__assignee-chips">
                  {catalogTags.map((tag) => {
                    const selected = (editingMod.tags || []).some((item) => item.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`mods-page__tag-toggle ${selected ? 'is-selected' : ''}`.trim()}
                        style={{ color: tag.color }}
                        onClick={async () => {
                          const nextIds = selected
                            ? (editingMod.tags || []).filter((item) => item.id !== tag.id).map((item) => item.id)
                            : [...(editingMod.tags || []).map((item) => item.id), tag.id];
                          try {
                            const { data } = await api.put(routes.admin.mods.modTags(editingMod.id), {
                              tagIds: nextIds,
                            });
                            if (data?.mod) applyModUpdate(data.mod);
                          } catch (error) {
                            toast.error(apiError(error, t('mods.tags.assignFailed')));
                          }
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mods-page__assign">
                <p className="mods-page__assign-title">{t('mods.releases.title')}</p>
                <ul className="mods-page__version-list">
                  {(editingMod.versions || []).map((release) => (
                    <li key={release.id}>
                      <strong>{release.version}</strong>
                      <span>{release.downloadUrl}</span>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={async () => {
                          try {
                            const { data } = await api.delete(
                              routes.admin.mods.version(editingMod.id, release.id),
                            );
                            if (data?.mod) applyModUpdate(data.mod);
                          } catch (error) {
                            toast.error(apiError(error, t('mods.releases.deleteFailed')));
                          }
                        }}
                      >
                        {t('buttons.delete', { ns: 'common' })}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mods-page__version-form">
                  <input
                    type="text"
                    value={versionForm.version}
                    onChange={(event) => setVersionForm((prev) => ({ ...prev, version: event.target.value }))}
                    placeholder={t('mods.fields.version')}
                  />
                  <input
                    type="url"
                    value={versionForm.downloadUrl}
                    onChange={(event) => setVersionForm((prev) => ({ ...prev, downloadUrl: event.target.value }))}
                    placeholder={t('mods.fields.downloadUrl')}
                  />
                  <input
                    type="datetime-local"
                    value={versionForm.releasedAt}
                    onChange={(event) => setVersionForm((prev) => ({ ...prev, releasedAt: event.target.value }))}
                  />
                  <textarea
                    value={versionForm.notes}
                    onChange={(event) => setVersionForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder={t('mods.fields.notes')}
                    rows={3}
                  />
                  <button
                    type="button"
                    className="confirm-button"
                    disabled={!versionForm.version.trim() || !versionForm.downloadUrl.trim()}
                    onClick={async () => {
                      try {
                        const body = {
                          version: versionForm.version.trim(),
                          downloadUrl: versionForm.downloadUrl.trim(),
                          notes: versionForm.notes || null,
                        };
                        const released = fromDatetimeLocalValue(versionForm.releasedAt);
                        if (released) body.releasedAt = released;
                        const { data } = await api.post(routes.admin.mods.versions(editingMod.id), body);
                        if (data?.mod) applyModUpdate(data.mod);
                        setVersionForm({ version: '', downloadUrl: '', releasedAt: '', notes: '' });
                        toast.success(t('mods.releases.created'));
                      } catch (error) {
                        toast.error(apiError(error, t('mods.releases.createFailed')));
                      }
                    }}
                  >
                    {t('mods.releases.add')}
                  </button>
                </div>
              </div>
              <div className="mods-page__assign">
                <p className="mods-page__assign-title">{t('mods.merge.title')}</p>
                <CustomSelect
                  options={mergeOptions}
                  value={mergeOptions.find((option) => option.value === mergeSourceId) || null}
                  onChange={(option) => setMergeSourceId(option?.value || '')}
                  placeholder={t('mods.merge.placeholder')}
                  width="100%"
                  isClearable
                  isSearchable
                />
                <button
                  type="button"
                  className="delete-confirm-button"
                  disabled={!mergeSourceId}
                  onClick={async () => {
                    if (!window.confirm(t('mods.merge.confirm', { name: editingMod.name }))) return;
                    try {
                      const { data } = await api.post(routes.admin.mods.merge(editingMod.id), {
                        sourceModId: Number(mergeSourceId),
                      });
                      if (data?.mod) applyModUpdate(data.mod);
                      setMergeSourceId('');
                      toast.success(t('mods.merge.done'));
                      await reload();
                    } catch (error) {
                      toast.error(apiError(error, t('mods.merge.failed')));
                    }
                  }}
                >
                  {t('mods.merge.button')}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {assignConfirmCount != null ? (
          <div className="mods-page__modal" onClick={() => setAssignConfirmCount(null)}>
            <div className="mods-page__modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>{t('mods.assign.confirmTitle')}</h2>
              <p>{t('mods.assign.confirmMessage', { count: assignConfirmCount })}</p>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setAssignConfirmCount(null)}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  className="confirm-button"
                  disabled={assigning}
                  onClick={() => void runAssign(true)}
                >
                  {t('mods.assign.confirmButton')}
                </button>
              </div>
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
                      await reload();
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

        <ImageSelectorPopup
          isOpen={Boolean(iconPicker)}
          onClose={() => setIconPicker(null)}
          onSave={handleIconSave}
          currentAvatar={iconPicker === 'edit' ? editingMod?.imageUrl : createIconPreview}
          mode="avatar"
          title={t('mods.icon.change')}
          outputFileName="mod-icon.jpg"
        />
      </div>
    </>
  );
};

export default ModsEditPage;
