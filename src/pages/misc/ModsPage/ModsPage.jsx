import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags, StartGuideCta } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { CalendarIcon, DownloadIcon, InfoIcon, UsersIcon, WarningIcon } from '@/components/common/icons';
import { VirtualList } from '@/components/common/VirtualList';
import { FacetQueryBuilder } from '@/components/common/selectors';
import { buildFacetQueryParam } from '@/utils/facetQueryCodec';
import api from '@/utils/api';
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import toast from 'react-hot-toast';
import { LikeButton } from '@/components/common/buttons';
import ModsListControls from './ModsListControls';
import ModReportPopup from './ModReportPopup';
import { assignedPeople, dumpCreatorLabel, hasAssignees } from './modPeople';
import { useModsList } from './useModsList';
import { modDownloadHref, modPermalink } from './modUrls';
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

function excerpt(text) {
  const plain = String(text || '')
    .replace(/[#*_`>\-\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  return plain.length > 140 ? `${plain.slice(0, 137)}…` : plain;
}

function ModTags({ tags }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  return (
    <div className="mods-page__tags">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="mods-page__tag"
          style={{ borderColor: tag.color, color: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}

function AuthorLine({ mod }) {
  if (hasAssignees(mod)) {
    const people = assignedPeople(mod);
    if (!people.length) return null;
    return (
      <div className="mods-page__people-row">
        {people.map((person) => (
          <PersonLink key={person.userId} person={person} />
        ))}
      </div>
    );
  }
  const dumpLabel = dumpCreatorLabel(mod);
  return dumpLabel ? <span>{dumpLabel}</span> : null;
}

function ModCatalogCard({ mod, t, onReport }) {
  const href = modPermalink(mod.slug);
  const summary = excerpt(mod.description);
  const uploaded = formatUploadedAt(mod.sourceUploadedAt);
  const hasAuthor = hasAssignees(mod) ? assignedPeople(mod).length > 0 : Boolean(dumpCreatorLabel(mod));
  return (
    <article className={`mods-page__card ${mod.isPinned ? 'is-pinned' : ''}`.trim()}>
      <div className="mods-page__card-head">
        {mod.imageUrl ? <img className="mods-page__card-thumb" src={mod.imageUrl} alt="" /> : null}
        <div className="mods-page__card-title-row">
          <Link className="mods-page__card-title" to={href}>
            {mod.name}
          </Link>
          {mod.isPinned ? <span className="mods-page__pin-badge">{t('mods.pinned')}</span> : null}
          {mod.deprecatedAfter ? (
            <span className="mods-page__deprecated-badge">
              {t('mods.deprecatedAfterLabel', { version: mod.deprecatedAfter })}
            </span>
          ) : null}
        </div>
        <LikeButton
          className="mods-page__card-like"
          liked={Boolean(mod.isLiked)}
          count={Number(mod.likes || 0)}
          iconSize={16}
          stopPropagation
          onRequest={async (action) => {
            const { data } = await api.put(routes.mods.like(mod.slug), { action });
            if (!data?.success) throw new Error('like failed');
            return { likes: data.likes };
          }}
          disabled={!mod.slug}
        />
      </div>
      {summary ? <p className="mods-page__card-excerpt">{summary}</p> : null}
      <div className="mods-page__card-meta-list">
        {hasAuthor ? (
          <div className="mods-page__meta-row">
            <UsersIcon size={16} color="currentColor" />
            <AuthorLine mod={mod} />
          </div>
        ) : null}
        {mod.version ? (
          <div className="mods-page__meta-row">
            <span className="mods-page__meta-hash" aria-hidden>
              #
            </span>
            <span>
              {t('mods.fields.version')}: {mod.version}
            </span>
          </div>
        ) : null}
        {uploaded ? (
          <div className="mods-page__meta-row">
            <CalendarIcon size={16} color="currentColor" />
            <span>{uploaded}</span>
          </div>
        ) : null}
      </div>
      <div className="mods-page__card-extras">
        <ModTags tags={mod.tags} />
        <div className="mods-page__card-extras-actions">
          <span>{t('mods.downloadsCount', { count: Number(mod.downloadCount || 0) })}</span>
        </div>
      </div>
      <div className="mods-page__card-footer">
        <button
          type="button"
          className="mods-page__card-report"
          aria-label={t('mods.report.label')}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onReport?.(mod);
          }}
        >
          <WarningIcon size="16px" color="currentColor" />
          <span aria-hidden="true">{t('mods.report.label')}</span>
        </button>
        <div className="mods-page__card-actions">
          {mod.slug ? (
            <a href={modDownloadHref(mod.slug)} className="btn-fill-primary mods-page__card-download">
              <DownloadIcon size={16} color="currentColor" />
              <span>{t('mods.download')}</span>
            </a>
          ) : null}
          <Link to={href} className="mods-page__card-details">
            <InfoIcon size={16} color="currentColor" />
            <span>{t('mods.details')}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

const ModsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const [tagItems, setTagItems] = useState([]);
  const [tagFacet, setTagFacet] = useState(null);
  const [reportingMod, setReportingMod] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(routes.mods.tags())
      .then((res) => {
        if (!cancelled) setTagItems(Array.isArray(res.data?.tags) ? res.data.tags : []);
      })
      .catch(() => {
        if (!cancelled) setTagItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facetQuery = useMemo(() => buildFacetQueryParam({ tags: tagFacet }), [tagFacet]);
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
  } = useModsList({
    path: routes.mods.list(),
    withLikeState: Boolean(user),
    facetQuery,
  });

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

  const searching = Boolean(query.trim()) || Boolean(facetQuery);
  const requestReport = useCallback(
    (mod) => {
      if (!user) {
        toast.error(t('mods.report.loginRequired'));
        return;
      }
      setReportingMod(mod);
    },
    [t, user],
  );
  const renderItem = useCallback(
    (mod) => <ModCatalogCard mod={mod} t={t} onReport={requestReport} />,
    [requestReport, t],
  );

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="mods-page">
        <div className="mods-page__container page-content-70rem">
          <header className="mods-page__header">
            <div className="mods-page__heading">
              <h1>{t('mods.title')}</h1>
            </div>
            <StartGuideCta
              title={t('mods.startGuideCta.title')}
              subtitle={t('mods.startGuideCta.subtitle')}
              dismissLabel={t('mods.startGuideCta.dontShowAgain')}
              iconAlt={t('mods.startGuideCta.iconAlt')}
              to="/resources?q=install+mods"
              appearFrom="left"
              dismissPreferenceKey={CLIENT_PREF_KEYS.MODS_START_GUIDE_CTA_DISMISSED}
            />
            <div className="mods-page__header-actions">
              {isAdmin ? (
                <>
                  <Link to="/mods/edit/tags" className="btn-fill-secondary">
                    {t('mods.tags.manage')}
                  </Link>
                  <Link to="/mods/edit" className="btn-fill-primary">
                    {t('buttons.edit', { ns: 'common' })}
                  </Link>
                </>
              ) : null}
            </div>
          </header>

          <ModsListControls
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            t={t}
          >
            {tagItems.length ? (
              <FacetQueryBuilder
                items={tagItems}
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
              grid
              minColumnWidth={300}
              gap={20}
              listClassName="mods-page__grid"
              itemClassName="mods-page__grid-item"
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
      <ModReportPopup
        isOpen={Boolean(reportingMod)}
        mod={reportingMod}
        onClose={() => setReportingMod(null)}
      />
    </>
  );
};

export default ModsPage;
