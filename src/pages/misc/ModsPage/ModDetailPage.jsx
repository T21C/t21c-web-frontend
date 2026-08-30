import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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
import { EditIcon, ExternalLinkIcon } from '@/components/common/icons';
import ModsMarkdown from './ModsMarkdown';
import ModLikeButton from './ModLikeButton';
import { dumpCreatorLabel, hasAssignees, isAssignedToMod, otherAssignees } from './modPeople';
import { modDownloadHref, modPermalink } from './modUrls';
import './modsPage.css';

function formatUploadedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function PersonLink({ person }) {
  const name = person?.name || '';
  if (!name) return null;
  if (!person.playerId) return <span>{name}</span>;
  return <Link to={`/profile/${person.playerId}`}>{name}</Link>;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

const ModDetailPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const { slug, version } = useParams();
  const location = useLocation();
  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setLoadError(false);
    try {
      const path = version
        ? routes.mods.bySlugVersion(slug, version)
        : routes.mods.bySlug(slug);
      const { data } = await api.get(path);
      setMod(data?.mod || null);
      if (!data?.mod) setLoadError(true);
    } catch {
      setMod(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, version]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = mod?.selectedVersion || mod?.latestVersion || (mod?.versions || [])[0] || null;
  const latest = (mod?.versions || [])[0] || mod?.latestVersion || null;
  const assignedToMod = isAssignedToMod(mod, user?.id);
  const canEditMod = Boolean(mod && (assignedToMod || hasFlag(user, permissionFlags.SUPER_ADMIN)));
  const editHref = assignedToMod ? `/developers/mods/${mod.id}` : '/mods/edit';
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: mod?.name ? `${mod.name} · ${t('mods.title')}` : t('mods.title'),
        description: mod?.description || t('mods.meta.description'),
        pathname: location.pathname,
        image: mod?.imageUrl || '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname, mod],
  );

  const copyLatest = async () => {
    try {
      await copyText(`${window.location.origin}${modPermalink(mod.slug)}`);
      toast.success(t('mods.copy.copied'));
    } catch {
      toast.error(t('mods.copy.failed'));
    }
  };

  const copyVersion = async (label) => {
    try {
      await copyText(`${window.location.origin}${modPermalink(mod.slug, label)}`);
      toast.success(t('mods.copy.copied'));
    } catch {
      toast.error(t('mods.copy.failed'));
    }
  };

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="mods-page mod-detail-page">
        <div className="mods-page__container page-content-70rem">
          <Link to="/mods" className="mods-page__back">
            {t('mods.backToMods')}
          </Link>
          {loading ? (
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          ) : loadError || !mod ? (
            <div className="no-items-message">{t('mods.errors.notFound')}</div>
          ) : (
            <>
              <header className="mod-detail-page__header">
                {mod.imageUrl ? (
                  <img className="mod-detail-page__icon" src={mod.imageUrl} alt="" />
                ) : (
                  <span className="mod-detail-page__icon mod-detail-page__icon--fallback" aria-hidden>
                    {(mod.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="mod-detail-page__heading">
                  <div className="mods-page__card-title-row">
                    <h1>{mod.name}</h1>
                    {mod.isPinned ? <span className="mods-page__pin-badge">{t('mods.pinned')}</span> : null}
                    {latest?.version ? <span className="mods-page__version">{latest.version}</span> : null}
                  </div>
                  <div className="mods-page__card-meta">
                    {hasAssignees(mod) ? (
                      <div className="mods-page__people">
                        {mod.postedBy ? (
                          <div className="mods-page__people-row">
                            <span>{t('mods.postedBy')}</span>
                            <PersonLink person={mod.postedBy} />
                          </div>
                        ) : null}
                        {otherAssignees(mod).length ? (
                          <div className="mods-page__people-row">
                            {mod.postedBy ? <span>{t('mods.alsoAssigned')}</span> : null}
                            {otherAssignees(mod).map((person) => (
                              <PersonLink key={person.userId} person={person} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : dumpCreatorLabel(mod) ? (
                      <span>{dumpCreatorLabel(mod)}</span>
                    ) : null}
                    <span>{t('mods.downloadsCount', { count: Number(mod.downloadCount || 0) })}</span>
                  </div>
                  <div className="mods-page__tags">
                    {(mod.tags || []).map((tag) => (
                      <span
                        key={tag.id}
                        className="mods-page__tag"
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mod-detail-page__actions">
                  {canEditMod ? (
                    <Link to={editHref} className="btn-fill-primary">
                      <EditIcon size="16px" color="currentColor" />
                      <span>{t('buttons.edit', { ns: 'common' })}</span>
                    </Link>
                  ) : null}
                  <ModLikeButton mod={mod} />
                  {mod.projectUrl ? (
                    <ExternalLink href={mod.projectUrl} className="mods-page__download">
                      <span>{t('mods.project')}</span>
                      <ExternalLinkIcon size={16} color="currentColor" />
                    </ExternalLink>
                  ) : null}
                  {latest ? (
                    <a href={modDownloadHref(mod.slug)} className="mods-page__download">
                      <span>{t('mods.download')}</span>
                      <ExternalLinkIcon size={16} color="currentColor" />
                    </a>
                  ) : null}
                  <button type="button" className="mods-page__download" onClick={copyLatest}>
                    {t('mods.copy.latest')}
                  </button>
                </div>
              </header>

              {mod.description ? (
                <section className="mod-detail-page__readme">
                  <h2>{t('mods.readme')}</h2>
                  <ModsMarkdown className="mods-page__card-description">{mod.description}</ModsMarkdown>
                </section>
              ) : null}

              <section className="mod-detail-page__releases">
                <h2>{t('mods.releases.title')}</h2>
                {(mod.versions || []).length === 0 ? (
                  <p className="mods-page__empty">{t('mods.releases.empty')}</p>
                ) : (
                  <ul className="mod-detail-page__release-list">
                    {(mod.versions || []).map((release, index) => {
                      const isLatest = index === 0;
                      const isSelected = selected?.id === release.id || selected?.version === release.version;
                      return (
                        <li
                          key={release.id}
                          className={`mod-detail-page__release ${isSelected ? 'is-selected' : ''}`.trim()}
                        >
                          <div className="mod-detail-page__release-head">
                            <Link to={modPermalink(mod.slug, release.version)} className="mod-detail-page__release-name">
                              {release.version}
                            </Link>
                            {isLatest ? <span className="mods-page__pin-badge">{t('mods.releases.latest')}</span> : null}
                            <span className="mods-page__card-meta">{formatUploadedAt(release.releasedAt)}</span>
                          </div>
                          {release.notes ? (
                            <ModsMarkdown className="mods-page__card-description">{release.notes}</ModsMarkdown>
                          ) : null}
                          <div className="mod-detail-page__release-actions">
                            <a
                              href={modDownloadHref(mod.slug, release.version)}
                              className="mods-page__download"
                            >
                              <span>{t('mods.download')}</span>
                              <ExternalLinkIcon size={16} color="currentColor" />
                            </a>
                            <button
                              type="button"
                              className="mods-page__download"
                              onClick={() => copyVersion(release.version)}
                            >
                              {t('mods.copy.permalink')}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ModDetailPage;
