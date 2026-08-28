import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { CustomSelect } from '@/components/common/selectors';
import { PinIcon } from '@/components/common/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { UsefulLinkClusterViewModes } from '@/utils/constants';
import CreateClusterPopup from '@/components/popups/Resources/CreateClusterPopup';
import ResourcesCatalogAdmin from './ResourcesCatalogAdmin';
import './resourcesPage.css';

const PAGE_SIZE = 30;

const ResourcesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const isMy = location.pathname === '/resources/my';

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: isMy ? t('resources.meta.myTitle') : t('resources.meta.title'),
        description: isMy ? t('resources.meta.myDescription') : t('resources.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname, isMy],
  );

  const [clusters, setClusters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('RECENT');
  const [viewMode, setViewMode] = useState(String(UsefulLinkClusterViewModes.PUBLIC));
  const [managingCatalog, setManagingCatalog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [languageMap, setLanguageMap] = useState({});
  const [offset, setOffset] = useState(0);

  useBodyScrollLock(creating);

  useEffect(() => {
    api.get(routes.utils.languages()).then(({ data }) => {
      setLanguageMap(data && typeof data === 'object' ? data : {});
    }).catch(() => {});
  }, []);

  const sortOptions = [
    { value: 'RECENT', label: t('resources.sort.recent') },
    { value: 'NAME', label: t('resources.sort.name') },
  ];

  const viewModeOptions = [
    { value: 'all', label: t('resources.viewMode.all') },
    { value: String(UsefulLinkClusterViewModes.PUBLIC), label: t('resources.viewMode.public') },
    { value: String(UsefulLinkClusterViewModes.LINKONLY), label: t('resources.viewMode.linkonly') },
    { value: String(UsefulLinkClusterViewModes.PRIVATE), label: t('resources.viewMode.private') },
  ];

  const loadClusters = useCallback(
    async ({ append = false, nextOffset = 0 } = {}) => {
      setLoadError(false);
      try {
        const params = {
          offset: nextOffset,
          limit: PAGE_SIZE,
          sort,
          order: sort === 'NAME' ? 'ASC' : 'DESC',
        };
        if (query.trim()) params.query = query.trim();
        if (isMy) params.mine = 'true';
        if (isAdmin && !isMy && viewMode !== 'all') params.viewMode = viewMode;
        const { data } = await api.get(routes.usefulLinkClusters.list(), { params });
        const page = Array.isArray(data?.clusters) ? data.clusters : [];
        setTotal(Number(data?.total) || 0);
        setClusters((prev) => (append ? [...prev, ...page] : page));
        setOffset(nextOffset + page.length);
      } catch {
        setLoadError(true);
        if (!append) setClusters([]);
      } finally {
        setLoading(false);
      }
    },
    [query, sort, viewMode, isMy, isAdmin],
  );

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    loadClusters({ append: false, nextOffset: 0 });
  }, [loadClusters, authLoading]);

  const handleCreate = async (payload) => {
    const { data } = await api.post(routes.usefulLinkClusters.list(), payload);
    return data;
  };

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <header className="resources-page__header">
            <div className="resources-page__heading">
              <h1>{isMy ? t('resources.titleMy') : t('resources.title')}</h1>
              <p>{isMy ? t('resources.subtitleMy') : t('resources.subtitle')}</p>
            </div>
            <div className="resources-page__header-actions">
              {user && !managingCatalog ? (
                <Link
                  to={isMy ? '/resources' : '/resources/my'}
                  className="btn-fill-secondary"
                >
                  {isMy ? t('resources.allClusters') : t('resources.myClusters')}
                </Link>
              ) : null}
              {user && !managingCatalog ? (
                <button type="button" className="btn-fill-primary" onClick={() => setCreating(true)}>
                  {t('resources.createCluster')}
                </button>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  className={managingCatalog ? 'btn-fill-secondary' : 'btn-fill-primary'}
                  onClick={() => setManagingCatalog((value) => !value)}
                >
                  {managingCatalog ? t('buttons.done', { ns: 'common' }) : t('resources.manageCatalog')}
                </button>
              ) : null}
            </div>
          </header>

          {managingCatalog && isAdmin ? (
            <ResourcesCatalogAdmin languageMap={languageMap} />
          ) : (
            <>
              <div className="resources-page__search">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('resources.searchPlaceholder')}
                />
                <CustomSelect
                  options={sortOptions}
                  value={sortOptions.find((option) => option.value === sort)}
                  onChange={(option) => setSort(option?.value || 'RECENT')}
                  width="10rem"
                />
                {isAdmin && !isMy ? (
                  <CustomSelect
                    options={viewModeOptions}
                    value={viewModeOptions.find((option) => option.value === viewMode)}
                    onChange={(option) => setViewMode(option?.value || String(UsefulLinkClusterViewModes.PUBLIC))}
                    width="12rem"
                  />
                ) : null}
              </div>

              {loading ? (
                <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
              ) : loadError ? (
                <div className="no-items-message">{t('resources.errors.loadFailed')}</div>
              ) : clusters.length === 0 ? (
                <p className="resources-page__empty">
                  {isMy
                    ? t('resources.emptyMine')
                    : query.trim()
                      ? t('resources.emptySearch')
                      : t('resources.empty')}
                </p>
              ) : (
                <div className="resources-page__clusters">
                  {clusters.map((cluster) => (
                    <Link
                      key={cluster.id}
                      to={`/resources/${cluster.linkCode || cluster.id}`}
                      className="resources-page__cluster-card"
                    >
                      {cluster.iconUrl ? (
                        <img src={cluster.iconUrl} alt="" className="resources-page__cluster-icon" />
                      ) : null}
                      <div className="resources-page__card-copy">
                        <div className="resources-page__card-title-row">
                          <strong className="resources-page__card-title">{cluster.name}</strong>
                          {cluster.isPinned ? <PinIcon size="16px" color="var(--color-white)" /> : null}
                          {cluster.isOfficial ? (
                            <span className="resources-page__badge resources-page__badge--official">
                              {t('resources.badges.official')}
                            </span>
                          ) : null}
                        </div>
                        {cluster.description ? (
                          <p className="resources-page__card-description">{cluster.description}</p>
                        ) : null}
                        {(cluster.tags || []).length ? (
                          <div className="resources-page__tag-chips">
                            {cluster.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="resources-page__tag-chip"
                                style={{ borderColor: tag.color, background: `${tag.color}40` }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="resources-page__card-meta">
                          <span>
                            {cluster.owner?.nickname || cluster.owner?.username || ''}
                          </span>
                          <span>
                            {t('resources.itemCount', {
                              count: cluster.itemCount || 0,
                              plural: (cluster.itemCount || 0) === 1 ? '' : 's',
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {clusters.length < total ? (
                <button
                  type="button"
                  className="btn-fill-secondary"
                  onClick={() => loadClusters({ append: true, nextOffset: offset })}
                >
                  {t('resources.loadMore')}
                </button>
              ) : null}
            </>
          )}
        </div>
        <Footer />
      </div>
      {creating ? (
        <CreateClusterPopup
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      ) : null}
    </>
  );
};

export default ResourcesPage;
