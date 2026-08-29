import { useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { ExternalLink } from '@/components/common/LinkConfirm';
import { ExternalLinkIcon } from '@/components/common/icons';
import { VirtualList } from '@/components/common/VirtualList';
import ModsMarkdown from './ModsMarkdown';
import ModsListControls from './ModsListControls';
import { dumpCreatorLabel, hasAssignees, otherAssignees } from './modPeople';
import { useModsList } from './useModsList';
import './modsPage.css';

function formatUploadedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function personName(person) {
  return person?.name || '';
}

function PersonLink({ person }) {
  const name = personName(person);
  if (!name) return null;
  if (!person.playerId) return <span>{name}</span>;
  return <Link to={`/profile/${person.playerId}`}>{name}</Link>;
}

function ModCatalogCard({ mod, t }) {
  const assigned = hasAssignees(mod);
  const also = otherAssignees(mod);
  const dumpLabel = dumpCreatorLabel(mod);
  return (
    <article className="mods-page__card">
      {mod.imageUrl ? (
        <img className="mods-page__card-thumb" src={mod.imageUrl} alt="" />
      ) : null}
      <div className="mods-page__card-copy">
        <div className="mods-page__card-title-row">
          <strong className="mods-page__card-title">{mod.name}</strong>
          {mod.version ? <span className="mods-page__version">{mod.version}</span> : null}
        </div>
        <div className="mods-page__card-meta">
          {!assigned && dumpLabel ? <span>{dumpLabel}</span> : null}
          {assigned && (mod.postedBy || also.length) ? (
            <div className="mods-page__people">
              {mod.postedBy ? (
                <div className="mods-page__people-row">
                  <span>{t('mods.postedBy')}</span>
                  <PersonLink person={mod.postedBy} />
                </div>
              ) : null}
              {also.length ? (
                <div className="mods-page__people-row">
                  {mod.postedBy ? <span>{t('mods.alsoAssigned')}</span> : null}
                  {also.map((person) => (
                    <PersonLink key={person.userId} person={person} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {formatUploadedAt(mod.sourceUploadedAt) ? (
            <span>{formatUploadedAt(mod.sourceUploadedAt)}</span>
          ) : null}
        </div>
        {mod.description ? (
          <ModsMarkdown className="mods-page__card-description">{mod.description}</ModsMarkdown>
        ) : null}
      </div>
      <div className="mods-page__card-actions">
        {mod.projectUrl ? (
          <ExternalLink href={mod.projectUrl} className="mods-page__download">
            <span>{t('mods.project')}</span>
            <ExternalLinkIcon size={16} color="currentColor" />
          </ExternalLink>
        ) : null}
        {mod.downloadUrl ? (
          <ExternalLink href={mod.downloadUrl} className="mods-page__download">
            <span>{t('mods.download')}</span>
            <ExternalLinkIcon size={16} color="currentColor" />
          </ExternalLink>
        ) : null}
      </div>
    </article>
  );
}

const ModsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const {
    mods,
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
  } = useModsList({ path: routes.mods.list() });

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('mods.meta.title'),
        description: t('mods.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const searching = Boolean(query.trim());
  const renderItem = useCallback((mod) => <ModCatalogCard mod={mod} t={t} />, [t]);

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="mods-page">
        <div className="mods-page__container page-content-70rem">
          <header className="mods-page__header">
            <div className="mods-page__heading">
              <h1>{t('mods.title')}</h1>
            </div>
            <div className="mods-page__header-actions">
              {isAdmin ? (
                <Link to="/mods/edit" className="btn-fill-primary">
                  {t('buttons.edit', { ns: 'common' })}
                </Link>
              ) : null}
            </div>
          </header>

          <ModsListControls
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            t={t}
          />

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
              {searching ? t('mods.emptySearch') : t('mods.empty')}
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
              renderItem={renderItem}
              computeItemKey={(index, mod) => mod?.id ?? index}
            />
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ModsPage;
