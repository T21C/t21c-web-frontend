import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
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
import { normalizeLanguage } from '@/translations/config';
import {
  availableSliceCodes,
  displayFieldsForLocale,
  displayGroupName,
  linkDisplayHost,
  languageFlagSrc,
  languageLabel,
  linkHasLocale,
  localesOnGroup,
  localesOnLink,
  pickInitialSliceLanguage,
} from '@/utils/usefulLinkLocales';
import './resourcesPage.css';

function applyCatalog(data) {
  return {
    groups: Array.isArray(data?.groups) ? data.groups : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

function linkSearchHaystack(link, languageCode) {
  const locale = displayFieldsForLocale(link, languageCode);
  const parts = [locale?.title, locale?.description, locale?.url, locale?.shorthand];
  for (const row of link?.locales || []) {
    parts.push(row.title, row.description, row.url, row.shorthand);
  }
  return parts.map((value) => String(value || '').toLowerCase()).join('\n');
}

function groupNameHaystack(group) {
  const parts = [group?.name];
  for (const row of group?.locales || []) {
    parts.push(row.name);
  }
  return parts.map((value) => String(value || '').toLowerCase()).join('\n');
}

function linkMatchesQuery(link, languageCode, query, groupsById) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (linkSearchHaystack(link, languageCode).includes(q)) return true;
  for (const groupId of link?.groupIds || []) {
    const group = groupsById?.get(groupId);
    if (group && groupNameHaystack(group).includes(q)) return true;
  }
  return false;
}

const ResourcesPage = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') ?? '';
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('resources.meta.title'),
        description: t('resources.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const [groups, setGroups] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState(qParam);
  const [languageMap, setLanguageMap] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [languageTouched, setLanguageTouched] = useState(false);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    api.get(routes.utils.languages()).then(({ data }) => {
      setLanguageMap(data && typeof data === 'object' ? data : {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api
      .get(routes.usefulLinks.list())
      .then(({ data }) => {
        if (cancelled) return;
        const catalog = applyCatalog(data);
        setGroups(catalog.groups);
        setLinks(catalog.links);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setGroups([]);
        setLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableCodes = useMemo(() => {
    const codes = new Set([
      ...availableSliceCodes(links, localesOnLink),
      ...availableSliceCodes(groups, localesOnGroup),
    ]);
    return [...codes];
  }, [links, groups]);

  const siteLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    setLanguageTouched(false);
  }, [siteLanguage]);

  useEffect(() => {
    if (languageTouched) return;
    if (loading) {
      setSelectedLanguage(siteLanguage);
      return;
    }
    setSelectedLanguage(pickInitialSliceLanguage(availableCodes, siteLanguage));
  }, [availableCodes, siteLanguage, loading, languageTouched]);

  const languageCode =
    selectedLanguage || pickInitialSliceLanguage(availableCodes, siteLanguage);
  const searching = Boolean(query.trim());
  const linkById = useMemo(() => {
    const map = new Map();
    for (const link of links) map.set(link.id, link);
    return map;
  }, [links]);

  const groupById = useMemo(() => {
    const map = new Map();
    for (const group of groups) map.set(group.id, group);
    return map;
  }, [groups]);

  const visibleLink = useCallback(
    (link) =>
      Boolean(link) &&
      linkHasLocale(link.locales, languageCode) &&
      linkMatchesQuery(link, languageCode, query, groupById),
    [languageCode, query, groupById],
  );

  const groupedSections = useMemo(() => {
    if (!groups.length) {
      const ungrouped = [...links]
        .sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0) || a.id - b.id)
        .filter(visibleLink);
      return ungrouped.length || !searching
        ? [{ id: 'ungrouped', name: t('resources.ungrouped'), links: ungrouped }]
        : [];
    }
    return groups
      .map((group) => ({
        id: group.id,
        name: displayGroupName(group, languageCode),
        links: (group.linkIds || [])
          .map((id) => linkById.get(id))
          .filter(visibleLink),
      }))
      .filter((section) => section.links.length > 0 || !searching);
  }, [groups, links, linkById, visibleLink, searching, languageCode, t]);

  const visibleCount = groupedSections.reduce((sum, section) => sum + section.links.length, 0);
  const hasAnyLocaleLinks = links.some((link) => linkHasLocale(link.locales, languageCode));

  const renderCard = (link) => {
    const fields = displayFieldsForLocale(link, languageCode);
    if (!fields?.url) return null;
    return (
      <ExternalLink
        key={link.id}
        href={fields.url}
        className="resources-page__card resources-page__card--link"
      >
        <div className="resources-page__card-copy">
          <div className="resources-page__card-title-row">
            <strong className="resources-page__card-title">{fields.title}</strong>
          </div>
          {fields.description ? (
            <p className="resources-page__card-description">{fields.description}</p>
          ) : null}
          <div className="resources-page__card-meta">
            <span>{linkDisplayHost(fields.url, fields.shorthand)}</span>
          </div>
        </div>
        <ExternalLinkIcon size={18} color="var(--color-white-t70)" />
      </ExternalLink>
    );
  };

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <header className="resources-page__header">
            <div className="resources-page__heading">
              <h1>{t('resources.title')}</h1>
              <p>{t('resources.subtitle')}</p>
            </div>
            <div className="resources-page__header-actions">
              {isAdmin ? (
                <Link to="/resources/edit" className="btn-fill-primary">
                  {t('buttons.edit', { ns: 'common' })}
                </Link>
              ) : null}
            </div>
          </header>

          <div
            className="resources-page__language-slice"
            role="group"
            aria-label={t('resources.language.label')}
          >
            {availableCodes.map((code) => (
              <button
                key={code}
                type="button"
                className={`resources-page__lang-btn${
                  languageCode === code ? ' resources-page__lang-btn--active' : ''
                }`}
                onClick={() => {
                  setLanguageTouched(true);
                  setSelectedLanguage(code);
                }}
              >
                <img src={languageFlagSrc(code, languageMap)} alt="" />
                <span>{languageLabel(code, languageMap)}</span>
              </button>
            ))}
          </div>

          <div className="resources-page__search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('resources.searchPlaceholder')}
            />
          </div>

          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : loadError ? (
            <div className="no-items-message">{t('resources.errors.loadFailed')}</div>
          ) : !links.length ? (
            <p className="resources-page__empty">{t('resources.empty')}</p>
          ) : visibleCount === 0 ? (
            <p className="resources-page__empty">
              {searching
                ? t('resources.emptySearch')
                : hasAnyLocaleLinks
                  ? t('resources.empty')
                  : t('resources.language.emptySlice')}
            </p>
          ) : (
            <div className="resources-page__groups">
              {groupedSections.map((section) =>
                section.links.length === 0 ? null : (
                  <section key={section.id} className="resources-page__group">
                    <h2>{section.name}</h2>
                    <div className="resources-page__list">
                      {section.links.map(renderCard)}
                    </div>
                  </section>
                ),
              )}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ResourcesPage;
