import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { ExternalLink } from '@/components/common/LinkConfirm';
import { CloseButton } from '@/components/common/buttons';
import { ItemPickManager } from '@/components/common/selectors';
import { EditIcon, ExternalLinkIcon, PinIcon } from '@/components/common/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { UsefulLinkClusterViewModes } from '@/utils/constants';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { normalizeLanguage } from '@/translations/config';
import {
  canEditUsefulLinkCluster,
  DEFAULT_LINK_LANGUAGE,
  displayFieldsForLocale,
  hostFromUrl,
  languageFlagSrc,
  languageLabel,
  localesOnLink,
  pickInitialSliceLanguage,
} from '@/utils/usefulLinkLocales';
import EditClusterPopup from '@/components/popups/Resources/EditClusterPopup';
import EditUsefulLinkPopup from '@/components/popups/Resources/EditUsefulLinkPopup';
import './resourcesPage.css';

const EMPTY_CUSTOM = { title: '', url: '', description: '', tagIds: [] };

function apiError(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

const ResourcesClusterDetailPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [languageMap, setLanguageMap] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LINK_LANGUAGE);
  const [languageReady, setLanguageReady] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [tags, setTags] = useState([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState('catalog');
  const [catalogPickIds, setCatalogPickIds] = useState([]);
  const [customLink, setCustomLink] = useState(EMPTY_CUSTOM);
  const [editingItem, setEditingItem] = useState(null);

  const canEdit = canEditUsefulLinkCluster(cluster, user);

  useBodyScrollLock(Boolean(editing || adding || editingItem));

  const loadCluster = useCallback(async () => {
    setLoadError(false);
    try {
      const { data } = await api.get(routes.usefulLinkClusters.byId(id));
      setCluster(data);
      return data;
    } catch {
      setLoadError(true);
      setCluster(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    api.get(routes.utils.languages()).then(({ data }) => {
      setLanguageMap(data && typeof data === 'object' ? data : {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setLanguageReady(false);
    loadCluster();
  }, [loadCluster, authLoading]);

  useEffect(() => {
    if (loading || !cluster?.linkCode || !id) return;
    if (id === cluster.linkCode) return;
    if (id !== String(cluster.numericId)) return;
    navigate(`/resources/${cluster.linkCode}${location.search}`, { replace: true });
  }, [cluster, id, loading, navigate, location.search]);

  useEffect(() => {
    if (!cluster || languageReady) return;
    const items = cluster.items || [];
    const available = new Set([DEFAULT_LINK_LANGUAGE]);
    for (const item of items) {
      for (const code of localesOnLink(item.link)) available.add(code);
    }
    const site = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    const next = pickInitialSliceLanguage([...available], site);
    const sliceCount = items.filter((item) => localesOnLink(item.link).includes(next)).length;
    setSelectedLanguage(sliceCount ? next : DEFAULT_LINK_LANGUAGE);
    setLanguageReady(true);
  }, [cluster, i18n.language, i18n.resolvedLanguage, languageReady]);

  useEffect(() => {
    if (!canEdit) return;
    api.get(routes.usefulLinks.list()).then(({ data }) => {
      setCatalog(Array.isArray(data) ? data : []);
    }).catch(() => {});
    api.get(routes.usefulLinks.tags()).then(({ data }) => {
      setTags(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [canEdit]);

  const items = cluster?.items || [];
  const localeDefaults = cluster?.localeDefaults || [];
  const availableCodes = useMemo(() => {
    const codes = new Set([DEFAULT_LINK_LANGUAGE]);
    for (const item of items) {
      for (const code of localesOnLink(item.link)) codes.add(code);
    }
    return [...codes];
  }, [items]);

  const slicedItems = useMemo(() => {
    const wanted = normalizeLanguage(selectedLanguage);
    const matching = items.filter((item) => {
      if (!item.link) return true;
      return localesOnLink(item.link).includes(wanted);
    });
    const defaultId = localeDefaults.find((row) => row.languageCode === wanted)?.itemId;
    return [...matching].sort((a, b) => {
      if (defaultId) {
        if (a.id === defaultId) return -1;
        if (b.id === defaultId) return 1;
      }
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
    });
  }, [items, selectedLanguage, localeDefaults]);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: cluster?.name || t('resources.meta.title'),
        description: cluster?.description || t('resources.meta.description'),
        pathname: location.pathname,
        image: cluster?.iconUrl || '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname, cluster],
  );

  const pickerLabels = useMemo(
    () => ({
      sectionCurrent: t('resources.picker.current'),
      sectionAdd: t('resources.picker.add'),
      searchPlaceholder: t('resources.picker.search'),
      emptySelected: t('resources.picker.emptySelected'),
      emptyPool: t('resources.picker.emptyPool'),
      noResults: t('resources.picker.noResults'),
      removeItem: t('resources.picker.remove'),
      addItem: t('resources.picker.addItem'),
    }),
    [t],
  );

  const catalogPickerLabels = useMemo(
    () => ({
      sectionCurrent: t('resources.itemPicker.current'),
      sectionAdd: t('resources.itemPicker.add'),
      searchPlaceholder: t('resources.itemPicker.search'),
      emptySelected: t('resources.itemPicker.emptySelected'),
      emptyPool: t('resources.itemPicker.emptyPool'),
      noResults: t('resources.itemPicker.noResults'),
      removeItem: t('resources.itemPicker.remove'),
      addItem: t('resources.itemPicker.addItem'),
    }),
    [t],
  );

  const shareUrl = cluster
    ? `${window.location.origin}/resources/${cluster.linkCode || cluster.id}`
    : '';

  const catalogPickerItems = useMemo(() => {
    const used = new Set(items.map((item) => item.linkId).filter(Boolean));
    return catalog
      .filter((link) => !used.has(link.id))
      .map((link) => ({
        id: link.id,
        name: link.title,
        color: link.tags?.[0]?.color,
        group: link.tags?.[0]?.group || '',
        groupSortOrder: link.tags?.[0]?.groupSortOrder,
      }));
  }, [catalog, items]);

  const setLocaleDefault = async (languageCode, itemId) => {
    try {
      const { data } = await api.put(routes.usefulLinkClusters.localeDefaults(cluster.id), {
        languageCode,
        itemId,
      });
      setCluster(data);
      toast.success(t('resources.clusters.defaults.saved'));
    } catch (error) {
      toast.error(apiError(error, t('resources.clusters.defaults.saveFailed')));
      throw error;
    }
  };

  const removeItem = async (item, name) => {
    if (!window.confirm(t('resources.clusters.items.removeConfirm', { name }))) return false;
    try {
      const { data } = await api.delete(routes.usefulLinkClusters.item(cluster.id, item.id));
      setCluster(data);
      toast.success(t('resources.clusters.items.removed'));
      return true;
    } catch (error) {
      toast.error(apiError(error, t('resources.clusters.items.removeFailed')));
      return false;
    }
  };

  const renderItemCard = (item, dragProvided) => {
    const link = item.link;
    if (!link) {
      return (
        <div
          className="resources-page__card resources-page__card--dead"
          ref={dragProvided?.innerRef}
          {...(dragProvided?.draggableProps || {})}
        >
          <div className="resources-page__card-copy">
            <strong>{t('resources.unavailable')}</strong>
          </div>
          {canEdit ? (
            <button
              type="button"
              className="btn-fill-danger"
              onClick={() => removeItem(item, t('resources.unavailable'))}
            >
              {t('resources.clusters.items.remove')}
            </button>
          ) : null}
        </div>
      );
    }
    const fields = displayFieldsForLocale(link, selectedLanguage);
    const isDefault = localeDefaults.some(
      (row) => row.languageCode === selectedLanguage && row.itemId === item.id,
    );
    const inner = (
      <>
        <div className="resources-page__card-copy">
          <div className="resources-page__card-title-row">
            <strong className="resources-page__card-title">{fields.title}</strong>
            {isDefault ? (
              <span className="resources-page__badge resources-page__badge--official">
                {t('resources.badges.defaultFor', { code: selectedLanguage.toUpperCase() })}
              </span>
            ) : null}
            {link.isCatalog ? (
              <span className="resources-page__chip-muted">{t('resources.badges.catalog')}</span>
            ) : (
              <span className="resources-page__chip-muted">{t('resources.badges.custom')}</span>
            )}
          </div>
          {fields.description ? (
            <p className="resources-page__card-description">{fields.description}</p>
          ) : null}
          <div className="resources-page__card-meta">
            <span>{hostFromUrl(fields.url)}</span>
            <div className="resources-page__tag-chips">
              {(link.tags || []).map((tag) => (
                <span
                  key={tag.id}
                  className="resources-page__tag-chip"
                  style={{ borderColor: tag.color, background: `${tag.color}40` }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <ExternalLinkIcon size={18} color="var(--color-white-t70)" />
      </>
    );

    return (
      <div
        className="resources-page__item-row"
        ref={dragProvided?.innerRef}
        {...(dragProvided?.draggableProps || {})}
      >
        <ExternalLink href={fields.url} className="resources-page__card resources-page__card--link">
          {inner}
        </ExternalLink>
        {canEdit ? (
          <div className="resources-page__item-actions">
            <button type="button" className="btn-fill-secondary" onClick={() => setEditingItem(item)}>
              {t('resources.clusters.items.editCustom')}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
        </div>
      </div>
    );
  }

  if (loadError || !cluster) {
    return (
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <p className="resources-page__empty">{t('resources.errors.clusterNotFound')}</p>
          <Link to="/resources" className="btn-fill-secondary">
            {t('buttons.back', { ns: 'common' })}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <header className="resources-page__header">
            <div className="resources-page__heading">
              <Link to="/resources" className="resources-page__back">
                {t('buttons.back', { ns: 'common' })}
              </Link>
              <div className="resources-page__card-title-row">
                {cluster.iconUrl ? (
                  <img src={cluster.iconUrl} alt="" className="resources-page__cluster-icon" />
                ) : null}
                <h1>{cluster.name}</h1>
                {cluster.isPinned ? <PinIcon size="18px" color="var(--color-white)" /> : null}
                {cluster.isOfficial ? (
                  <span className="resources-page__badge resources-page__badge--official">
                    {t('resources.badges.official')}
                  </span>
                ) : null}
              </div>
              {cluster.description ? <p>{cluster.description}</p> : null}
              {cluster.viewMode === UsefulLinkClusterViewModes.PUBLIC &&
              user?.id === cluster.ownerId &&
              !isAdmin ? (
                <p>{t('resources.frozenNotice')}</p>
              ) : null}
            </div>
            <div className="resources-page__header-actions">
              <button
                type="button"
                className="btn-fill-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success(t('resources.shareCopied'));
                  } catch {
                    toast.error(t('resources.copyFailed'));
                  }
                }}
              >
                {t('resources.copyShare')}
              </button>
              {canEdit ? (
                <>
                  <button type="button" className="btn-fill-secondary" onClick={() => setAdding(true)}>
                    {t('resources.clusters.items.add')}
                  </button>
                  <button type="button" className="btn-fill-primary" onClick={() => setEditing(true)}>
                    <EditIcon size="16px" color="currentColor" />
                    {t('buttons.edit', { ns: 'common' })}
                  </button>
                </>
              ) : null}
            </div>
          </header>

          <div className="resources-page__language-slice" role="group" aria-label={t('resources.language.label')}>
            {availableCodes.map((code) => (
              <button
                key={code}
                type="button"
                className={`resources-page__lang-btn${
                  selectedLanguage === code ? ' resources-page__lang-btn--active' : ''
                }`}
                onClick={() => setSelectedLanguage(code)}
              >
                <img src={languageFlagSrc(code, languageMap)} alt="" />
                <span>{languageLabel(code, languageMap)}</span>
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="resources-page__empty">
              {canEdit ? t('resources.clusters.items.emptyEditor') : t('resources.clusters.items.empty')}
            </p>
          ) : slicedItems.length === 0 ? (
            <p className="resources-page__empty">{t('resources.language.emptySlice')}</p>
          ) : (
            <div className="resources-page__list">
              {slicedItems.map((item) => (
                <div key={item.id}>{renderItemCard(item)}</div>
              ))}
            </div>
          )}
        </div>
        <Footer />
      {editing ? (
        <EditClusterPopup
          cluster={cluster}
          onClose={() => setEditing(false)}
          onUpdate={async (payload) => {
            const { data } = await api.patch(routes.usefulLinkClusters.byId(cluster.id), payload);
            setCluster(data);
          }}
          onClusterChange={setCluster}
          onDelete={async () => {
            await api.delete(routes.usefulLinkClusters.byId(cluster.id));
            navigate('/resources');
          }}
        />
      ) : null}

      {adding ? (
        <div className="difficulty-modal" onClick={() => setAdding(false)}>
          <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
            <CloseButton
              variant="floating"
              onClick={() => setAdding(false)}
              aria-label={t('buttons.close', { ns: 'common' })}
            />
            <h2>{t('resources.clusters.items.add')}</h2>
            <div className="sub-tab-navigation">
              <button
                type="button"
                className={`sub-tab-button ${addMode === 'catalog' ? 'active' : ''}`}
                onClick={() => setAddMode('catalog')}
              >
                {t('resources.clusters.items.addCatalog')}
              </button>
              <button
                type="button"
                className={`sub-tab-button ${addMode === 'custom' ? 'active' : ''}`}
                onClick={() => setAddMode('custom')}
              >
                {t('resources.clusters.items.addCustom')}
              </button>
            </div>
            {addMode === 'catalog' ? (
              <>
                <ItemPickManager
                  items={catalogPickerItems}
                  selectedIds={catalogPickIds}
                  onSelectedIdsChange={setCatalogPickIds}
                  enableGrouping
                  fallbackGroupLabel={t('resources.ungrouped')}
                  labels={catalogPickerLabels}
                />
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={() => setAdding(false)}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button
                    type="button"
                    className="confirm-button"
                    disabled={!catalogPickIds.length}
                    onClick={async () => {
                      try {
                        let latest = cluster;
                        for (const linkId of catalogPickIds) {
                          const { data } = await api.post(routes.usefulLinkClusters.items(cluster.id), { linkId });
                          latest = data;
                        }
                        setCluster(latest);
                        setCatalogPickIds([]);
                        setAdding(false);
                        toast.success(t('resources.clusters.items.added'));
                      } catch (error) {
                        toast.error(apiError(error, t('resources.clusters.items.addFailed')));
                      }
                    }}
                  >
                    {t('buttons.add', { ns: 'common' })}
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    const { data } = await api.post(routes.usefulLinkClusters.items(cluster.id), customLink);
                    setCluster(data);
                    setCustomLink(EMPTY_CUSTOM);
                    setAdding(false);
                    toast.success(t('resources.clusters.items.added'));
                  } catch (error) {
                    toast.error(apiError(error, t('resources.clusters.items.addFailed')));
                  }
                }}
              >
                <div className="form-group">
                  <label>{t('resources.links.fields.title')}</label>
                  <input
                    type="text"
                    value={customLink.title}
                    onChange={(event) => setCustomLink({ ...customLink, title: event.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('resources.links.fields.url')}</label>
                  <input
                    type="text"
                    value={customLink.url}
                    onChange={(event) => setCustomLink({ ...customLink, url: event.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('resources.links.fields.description')}</label>
                  <textarea
                    rows={3}
                    value={customLink.description}
                    onChange={(event) => setCustomLink({ ...customLink, description: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('resources.links.fields.tags')}</label>
                  <ItemPickManager
                    items={tags}
                    selectedIds={customLink.tagIds}
                    onSelectedIdsChange={(tagIds) => setCustomLink({ ...customLink, tagIds })}
                    enableGrouping
                    fallbackGroupLabel={t('resources.ungrouped')}
                    labels={pickerLabels}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={() => setAdding(false)}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button type="submit" className="confirm-button">
                    {t('buttons.add', { ns: 'common' })}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {editingItem?.link ? (
        <EditUsefulLinkPopup
          title={t('resources.clusters.items.editCustom')}
          link={editingItem.link}
          languageMap={languageMap}
          tags={tags}
          pickerLabels={pickerLabels}
          initialLanguageCode={selectedLanguage}
          canEditLink={!editingItem.link.isCatalog}
          itemId={editingItem.id}
          localeDefaults={localeDefaults}
          onClose={() => setEditingItem(null)}
          onSetDefault={(languageCode) => setLocaleDefault(languageCode, editingItem.id)}
          onDeleteItem={async () => {
            const name =
              displayFieldsForLocale(editingItem.link, selectedLanguage)?.title ||
              t('resources.unavailable');
            const removed = await removeItem(editingItem, name);
            if (removed) setEditingItem(null);
          }}
          onSave={async ({ languageCode, title, url, description, tagIds }) => {
            try {
              await api.patch(routes.usefulLinkClusters.itemLink(cluster.id, editingItem.id), {
                tagIds,
              });
              const { data } = await api.put(
                routes.usefulLinkClusters.itemLocales(cluster.id, editingItem.id),
                { languageCode, title, url, description },
              );
              setCluster(data);
              const nextItem = (data.items || []).find((row) => row.id === editingItem.id);
              if (nextItem) setEditingItem(nextItem);
              toast.success(t('resources.clusters.items.updated'));
            } catch (error) {
              toast.error(apiError(error, t('resources.clusters.items.updateFailed')));
              throw error;
            }
          }}
          onAddLocale={async (payload) => {
            try {
              const { data } = await api.put(
                routes.usefulLinkClusters.itemLocales(cluster.id, editingItem.id),
                payload,
              );
              setCluster(data);
              const nextItem = (data.items || []).find((row) => row.id === editingItem.id);
              if (nextItem) setEditingItem(nextItem);
              toast.success(t('resources.links.notifications.localeSaved'));
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.localeSaveFailed')));
              throw error;
            }
          }}
          onRemoveLocale={async (code) => {
            try {
              const { data } = await api.delete(
                routes.usefulLinkClusters.itemLocale(cluster.id, editingItem.id, code),
              );
              setCluster(data);
              const nextItem = (data.items || []).find((row) => row.id === editingItem.id);
              if (nextItem) setEditingItem(nextItem);
              toast.success(t('resources.links.notifications.localeRemoved'));
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.localeRemoveFailed')));
              throw error;
            }
          }}
        />
      ) : null}
      </div>
    </>
  );
};

export default ResourcesClusterDetailPage;
