// tuf-search: #BotModsEditPage #botModsEditPage #mods #botMods
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
import { PopupShell } from '@/components/common/PopupShell';
import { CustomSelect, StateDisplay } from '@/components/common/selectors';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { apiError, applyMods, toastBotModLinked } from './modEditForm';
import './botModsEditPage.css';

const EMPTY_ROWS = [];

function catalogOptions(mods) {
  return (Array.isArray(mods) ? mods : EMPTY_ROWS).map((mod) => ({
    value: String(mod.id),
    label: `${mod.name} (${mod.slug || mod.id})`,
  }));
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

const BotModsEditPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const runModSearch = useDebouncedRequest(300);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('mods.botMods.metaTitle'),
        description: t('mods.botMods.subtitle'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const filterOptions = useMemo(
    () => [
      { value: 'all', label: t('mods.botMods.filters.all') },
      { value: 'unlinked', label: t('mods.botMods.filters.unlinked') },
      { value: 'linked', label: t('mods.botMods.filters.linked') },
      { value: 'problems', label: t('mods.botMods.filters.problems') },
      { value: 'duplicates', label: t('mods.botMods.filters.duplicates') },
    ],
    [t],
  );

  const [rows, setRows] = useState(EMPTY_ROWS);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [linkingRow, setLinkingRow] = useState(null);
  const [catalogMods, setCatalogMods] = useState(EMPTY_ROWS);
  const [selectedModId, setSelectedModId] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const loadRows = useCallback(
    async ({ silent } = {}) => {
      if (!silent) {
        setLoading(true);
        setLoadError('');
      }
      try {
        const { data } = await api.get(routes.admin.botMods.root(), {
          params: {
            q: query.trim() || undefined,
            filter,
            offset: 0,
            limit: 500,
          },
        });
        setRows(Array.isArray(data?.botMods) ? data.botMods : EMPTY_ROWS);
        setTotal(typeof data?.total === 'number' ? data.total : 0);
        setLoadError('');
      } catch (error) {
        const message = apiError(error, t('mods.botMods.loadFailed'));
        if (silent) {
          toast.error(message);
        } else {
          setRows(EMPTY_ROWS);
          setTotal(0);
          setLoadError(message);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [filter, query, t],
  );

  useEffect(() => {
    if (!authLoading && isAdmin) void loadRows();
  }, [authLoading, isAdmin, loadRows]);

  const searchCatalog = useCallback(
    async (q, { immediate = false } = {}) => {
      const params = { offset: 0, limit: 50, sort: 'name-asc' };
      if (q) params.q = q;
      const runner = immediate || !q ? runModSearch.flush : runModSearch;
      try {
        const { data } = await runner(({ signal }) =>
          api.get(routes.admin.mods.root(), { params, signal }),
        );
        setCatalogMods(applyMods(data));
      } catch (error) {
        if (api.isCancel(error)) return;
        toast.error(apiError(error, t('mods.botMods.linkFailed')));
      }
    },
    [runModSearch, t],
  );

  const openLink = async (row) => {
    setLinkingRow(row);
    setSelectedModId('');
    setCatalogMods(EMPTY_ROWS);
    await searchCatalog('', { immediate: true });
  };

  const closeLink = () => {
    setLinkingRow(null);
    setSelectedModId('');
    setSavingLink(false);
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data } = await api.post(routes.admin.botMods.sync());
      if (data?.alreadyRunning) {
        toast(t('mods.botMods.alreadyRunning'));
      } else {
        toast.success(
          t('mods.botMods.syncSummary', {
            fetched: data?.fetched ?? 0,
            created: data?.created ?? 0,
            skipped: data?.skipped ?? 0,
            errors: data?.errors ?? 0,
          }),
        );
      }
      await loadRows({ silent: true });
    } catch (error) {
      toast.error(apiError(error, t('mods.botMods.syncFailed')));
    } finally {
      setSyncing(false);
    }
  };

  const handleLink = async (event) => {
    event.preventDefault();
    if (!linkingRow || !selectedModId || savingLink) return;
    setSavingLink(true);
    try {
      const { data } = await api.put(routes.admin.botMods.link(linkingRow.id), { modId: Number(selectedModId) });
      toastBotModLinked(t, data?.botMod);
      closeLink();
      await loadRows({ silent: true });
    } catch (error) {
      toast.error(apiError(error, t('mods.botMods.linkFailed')));
      setSavingLink(false);
    }
  };

  const handleUnlink = async (row) => {
    if (busyId || !row?.link) return;
    if (!window.confirm(t('mods.botMods.unlinkConfirm', { name: row.name }))) return;
    setBusyId(row.id);
    try {
      await api.delete(routes.admin.botMods.link(row.id));
      toast.success(t('mods.botMods.unlinkedOk'));
      await loadRows({ silent: true });
    } catch (error) {
      toast.error(apiError(error, t('mods.botMods.unlinkFailed')));
    } finally {
      setBusyId('');
    }
  };

  const handleWatch = async (row, enabled) => {
    if (busyId || !row?.link) return;
    setBusyId(row.id);
    try {
      await api.patch(routes.admin.botMods.link(row.id), { enabled });
      await loadRows({ silent: true });
    } catch (error) {
      toast.error(apiError(error, t('mods.botMods.watchFailed')));
    } finally {
      setBusyId('');
    }
  };

  const handleDuplicate = async (row, isDuplicate) => {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await api.patch(routes.admin.botMods.byId(row.id), { isDuplicate });
      await loadRows({ silent: true });
    } catch (error) {
      toast.error(apiError(error, t('mods.botMods.duplicateFailed')));
    } finally {
      setBusyId('');
    }
  };

  const selectedFilter = filterOptions.find((option) => option.value === filter) || filterOptions[0];
  const selectedCatalog = catalogOptions(catalogMods).find((option) => option.value === selectedModId) || null;

  if (authLoading) {
    return (
      <div className="bot-mods-page">
        <div className="bot-mods-page__container page-content-1000">
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
      <div className="bot-mods-page">
        <div className="bot-mods-page__container page-content-1000">
          <header className="bot-mods-page__header">
            <div className="bot-mods-page__heading">
              <Link to="/mods/edit" className="bot-mods-page__back">
                {t('mods.botMods.backToEdit')}
              </Link>
              <h1>{t('mods.botMods.title')}</h1>
              <p>{t('mods.botMods.subtitle')}</p>
            </div>
            <div className="bot-mods-page__header-actions">
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                {syncing ? t('mods.botMods.syncing') : t('mods.botMods.sync')}
              </button>
            </div>
          </header>

          <div className="bot-mods-page__controls">
            <label className="bot-mods-page__search">
              <span className="bot-mods-page__control-label">{t('mods.botMods.searchPlaceholder')}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('mods.botMods.searchPlaceholder')}
              />
            </label>
            <div className="bot-mods-page__filter">
              <span className="bot-mods-page__control-label">{t('mods.botMods.filterLabel')}</span>
              <CustomSelect
                options={filterOptions}
                value={selectedFilter}
                onChange={(option) => setFilter(option?.value || 'all')}
                width="16rem"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : loadError ? (
            <div className="error-message">{loadError}</div>
          ) : rows.length === 0 ? (
            <div className="no-items-message">
              {query.trim() || filter !== 'all' ? t('mods.botMods.emptySearch') : t('mods.botMods.empty')}
            </div>
          ) : (
            <ul className="bot-mods-page__list">
              {rows.map((row) => {
                const statusKey = row.link?.lastSyncStatus
                  ? `mods.botMods.statuses.${row.link.lastSyncStatus}`
                  : '';
                const statusLabel = statusKey && t(statusKey) !== statusKey ? t(statusKey) : row.link?.lastSyncStatus;
                const releaseVersions = (row.releases || []).map((release) => release.version).filter(Boolean);
                const versionLabel = releaseVersions.length
                  ? releaseVersions.join(', ')
                  : row.version || t('mods.botMods.noVersion');
                return (
                  <li key={row.id} className={`bot-mods-page__item${row.isDuplicate ? ' bot-mods-page__item--duplicate' : ''}`}>
                    <div className="bot-mods-page__item-main">
                      <div className="bot-mods-page__item-info">
                        <p className="bot-mods-page__item-name">{row.name}</p>
                        <p className="bot-mods-page__item-meta">
                          <span>{row.cachedUsername}</span>
                          <span>{versionLabel}</span>
                        </p>
                        <p className="bot-mods-page__item-link">
                          {row.link ? (
                            <Link to={`/mods/${row.link.modSlug || ''}`}>
                              {t('mods.botMods.linked', { name: row.link.modName || row.link.modId })}
                            </Link>
                          ) : (
                            t('mods.botMods.unlinked')
                          )}
                        </p>
                        <p className="bot-mods-page__item-sync">
                          {row.link?.lastSyncAt
                            ? `${t('mods.botMods.lastSync')}: ${formatWhen(row.link.lastSyncAt)}${statusLabel ? ` · ${statusLabel}` : ''}`
                            : t('mods.botMods.lastSyncNever')}
                          {row.link?.lastSyncMessage ? ` — ${row.link.lastSyncMessage}` : ''}
                        </p>
                        <div className="bot-mods-page__flags">
                          {row.isDuplicate ? (
                            <span className="bot-mods-page__flag">{t('mods.botMods.duplicate')}</span>
                          ) : null}
                          {row.missingSince ? (
                            <span className="bot-mods-page__flag bot-mods-page__flag--warn">
                              {t('mods.botMods.missing')}
                            </span>
                          ) : null}
                          {row.ignoreUpdate ? (
                            <span className="bot-mods-page__flag">{t('mods.botMods.ignoreUpdate')}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bot-mods-page__item-actions">
                        {row.link ? (
                          <>
                            <StateDisplay
                              label={t('mods.botMods.watch')}
                              currentState={row.link.enabled ? 'on' : 'off'}
                              states={['off', 'on']}
                              activeStates={['on']}
                              onChange={(state) => void handleWatch(row, state === 'on')}
                              width={56}
                              height={24}
                              padding={3}
                            />
                            <button
                              type="button"
                              className="btn-fill-danger"
                              onClick={() => void handleUnlink(row)}
                              disabled={busyId === row.id}
                            >
                              {t('mods.botMods.unlink')}
                            </button>
                          </>
                        ) : row.isDuplicate ? null : (
                          <button
                            type="button"
                            className="btn-fill-primary"
                            onClick={() => void openLink(row)}
                          >
                            {t('mods.botMods.link')}
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="bot-mods-page__duplicate">
                      <input
                        type="checkbox"
                        checked={Boolean(row.isDuplicate)}
                        disabled={busyId === row.id}
                        onChange={(event) => void handleDuplicate(row, event.target.checked)}
                      />
                      {t('mods.botMods.duplicate')}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {!loading && !loadError ? (
            <p className="bot-mods-page__count">{t('totalResults', { ns: 'common', count: total })}</p>
          ) : null}
        </div>
        <Footer />
      </div>

      {linkingRow ? (
        <PopupShell
          onClose={closeLink}
          overlayClassName="bot-mods-page bot-mods-page__modal"
          panelClassName="bot-mods-page__modal-content"
        >
          <CloseButton onClick={closeLink} />
          <h2>{t('mods.botMods.linkPopupTitle')}</h2>
          <p className="bot-mods-page__modal-lead">{linkingRow.name}</p>
          <form onSubmit={handleLink} className="bot-mods-page__link-form">
            <CustomSelect
              options={catalogOptions(catalogMods)}
              value={selectedCatalog}
              onChange={(option) => setSelectedModId(option?.value || '')}
              onInputChange={(value, meta) => {
                if (meta?.action === 'input-change') void searchCatalog(value);
                return value;
              }}
              placeholder={t('mods.botMods.pickMod')}
              width="100%"
              isClearable
              isSearchable
              filterOption={() => true}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
            <div className="modal-actions">
              <button type="button" className="cancel-button btn-fill-ghost" onClick={closeLink}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="submit"
                className="confirm-button btn-fill-primary"
                disabled={!selectedModId || savingLink}
              >
                {savingLink ? t('loading.saving', { ns: 'common' }) : t('mods.botMods.link')}
              </button>
            </div>
          </form>
        </PopupShell>
      ) : null}
    </>
  );
};

export default BotModsEditPage;
