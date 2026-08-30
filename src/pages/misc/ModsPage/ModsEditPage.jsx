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
import { FacetQueryBuilder } from '@/components/common/selectors';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import { buildFacetQueryParam } from '@/utils/facetQueryCodec';
import ModsListControls from './ModsListControls';
import { listCreatorText } from './modPeople';
import { useModsList } from './useModsList';
import { VirtualList } from '@/components/common/VirtualList';
import ModAdminEditPopup from './ModAdminEditPopup';
import {
  EMPTY_MOD,
  apiError,
  confirmDiscardUnsaved,
  isFormDirty,
  mergeMods,
  ModFormFields,
  toCreateFormData,
  toCreatePayload,
} from './modEditForm';
import './modsPage.css';

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
  const [deletingMod, setDeletingMod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createIconFile, setCreateIconFile] = useState(null);
  const [createIconPreview, setCreateIconPreview] = useState('');
  const [iconPicker, setIconPicker] = useState(null);
  const [catalogTags, setCatalogTags] = useState([]);
  const [createZipFile, setCreateZipFile] = useState(null);

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

  const anyModalOpen = Boolean(isCreating || deletingMod || iconPicker);
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
    if (!confirmDiscardUnsaved(t, isFormDirty(newMod, EMPTY_MOD) || Boolean(createIconFile) || Boolean(createZipFile))) return;
    setIsCreating(false);
    setNewMod(EMPTY_MOD);
    setPendingCreateIcon(null);
    setCreateZipFile(null);
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
    if (iconPicker !== 'create') return;
    setPendingCreateIcon(file);
    setIconPicker(null);
  };

  const handleIconRemove = () => {
    setPendingCreateIcon(null);
  };

  const canSubmitCreate = (form) => {
    const base =
      form.name.trim() &&
      form.creatorUsername.trim() &&
      form.creatorDiscordId.trim() &&
      form.version.trim();
    if (!base) return false;
    if (form.releaseSource === 'zip') return Boolean(createZipFile);
    return Boolean(form.githubUrl.trim());
  };

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
                  setCreateZipFile(null);
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
                      onClick={() => setEditingMod(mod)}
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
                  if (!canSubmitCreate(newMod) || saving) return;
                  setSaving(true);
                  try {
                    const body =
                      newMod.releaseSource === 'zip'
                        ? toCreateFormData(newMod, createZipFile)
                        : toCreatePayload(newMod);
                    const { data } = await api.post(routes.admin.mods.root(), body);
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
                    setCreateZipFile(null);
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
                  isCreate
                  zipFile={createZipFile}
                  onZipFileChange={setCreateZipFile}
                  icon={{
                    previewUrl: createIconPreview,
                    disabled: saving,
                    onChange: () => setIconPicker('create'),
                    onRemove: handleIconRemove,
                  }}
                />
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={closeCreate}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button type="submit" className="confirm-button" disabled={!canSubmitCreate(newMod) || saving}>
                    {t('mods.create.createButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <ModAdminEditPopup
          isOpen={Boolean(editingMod)}
          mod={editingMod}
          listMods={mods}
          onClose={() => setEditingMod(null)}
          onChange={(next) => {
            setEditingMod(next);
            setMods((prev) => mergeMods(prev, [next]));
          }}
          onBulkChange={(updated) => {
            setMods((prev) => mergeMods(prev, updated));
            const current = updated.find((item) => item.id === editingMod?.id);
            if (current) setEditingMod(current);
          }}
          onSaved={async (next) => {
            if (next) setMods((prev) => mergeMods(prev, [next]));
            setEditingMod(null);
            await reload();
          }}
          onNeedReload={() => void reload()}
        />

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
          currentAvatar={createIconPreview}
          mode="avatar"
          title={t('mods.icon.change')}
          outputFileName="mod-icon.jpg"
        />
      </div>
    </>
  );
};

export default ModsEditPage;
