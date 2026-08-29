import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { ExternalLink } from '@/components/common/LinkConfirm';
import { ExternalLinkIcon } from '@/components/common/icons';
import ModsMarkdown from './ModsMarkdown';
import ModsListControls from './ModsListControls';
import { DEFAULT_MOD_SORT, sortMods } from './modListSort';
import './modsPage.css';

function applyMods(data) {
  return Array.isArray(data?.mods) ? data.mods : [];
}

function modSearchHaystack(mod) {
  return [
    mod?.name,
    mod?.creatorUsername,
    mod?.creatorDiscordId,
    mod?.creatorUsername && mod?.creatorDiscordId
      ? `${mod.creatorUsername} @${mod.creatorDiscordId}`
      : '',
  ]
    .map((value) => String(value || '').toLowerCase())
    .join('\n');
}

function formatUploadedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function creatorLabel(mod) {
  const username = mod?.creatorUsername || '';
  const snowflake = mod?.creatorDiscordId || '';
  if (username && snowflake) return `${username} @${snowflake}`;
  return username || snowflake;
}

const ModsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

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

  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(DEFAULT_MOD_SORT);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api
      .get(routes.mods.list())
      .then(({ data }) => {
        if (cancelled) return;
        setMods(applyMods(data));
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setMods([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searching = Boolean(query.trim());
  const visibleMods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? mods.filter((mod) => modSearchHaystack(mod).includes(q))
      : mods;
    return sortMods(filtered, sort);
  }, [mods, query, sort]);

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

          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : loadError ? (
            <div className="no-items-message">{t('mods.errors.loadFailed')}</div>
          ) : !mods.length ? (
            <p className="mods-page__empty">{t('mods.empty')}</p>
          ) : visibleMods.length === 0 ? (
            <p className="mods-page__empty">
              {searching ? t('mods.emptySearch') : t('mods.empty')}
            </p>
          ) : (
            <div className="mods-page__list">
              {visibleMods.map((mod) => (
                <article key={mod.id} className="mods-page__card">
                  {mod.imageUrl ? (
                    <img
                      className="mods-page__card-thumb"
                      src={mod.imageUrl}
                      alt=""
                    />
                  ) : null}
                  <div className="mods-page__card-copy">
                    <div className="mods-page__card-title-row">
                      <strong className="mods-page__card-title">{mod.name}</strong>
                      {mod.version ? (
                        <span className="mods-page__version">{mod.version}</span>
                      ) : null}
                    </div>
                    <div className="mods-page__card-meta">
                      <span>{creatorLabel(mod)}</span>
                      {formatUploadedAt(mod.sourceUploadedAt) ? (
                        <span>{formatUploadedAt(mod.sourceUploadedAt)}</span>
                      ) : null}
                    </div>
                    {mod.description ? (
                      <ModsMarkdown className="mods-page__card-description">
                        {mod.description}
                      </ModsMarkdown>
                    ) : null}
                  </div>
                  {mod.downloadUrl ? (
                    <ExternalLink href={mod.downloadUrl} className="mods-page__download">
                      <span>{t('mods.download')}</span>
                      <ExternalLinkIcon size={16} color="var(--color-white-t70)" />
                    </ExternalLink>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ModsPage;
