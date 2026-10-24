import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect, StateDisplay } from '@/components/common/selectors';
import { Tooltip } from '@/components/common/display/Tooltip';
import { ExternalLinkIcon, FilterIcon, ResetIcon, SortAscIcon, SortDescIcon, SortIcon } from '@/components/common/icons';
import { Collapsible, CollapsibleContent } from '@/components/common/Collapsible';
import { CreatorManagementPopup } from '@/components/popups/Creators';
import { EditLevelPopup, LevelListExportPopup } from '@/components/popups/Levels';
import UserAvatar from '@/components/layout/UserAvatar/UserAvatar';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { buildRequestExportRows, downloadPackExport } from '@/utils/packExportUtils';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import LevelRequestDetail from './LevelRequestDetail';
import LevelRequestFormPopup from './LevelRequestFormPopup';
import { AdvancedSearchBar } from '@/components/common/AdvancedSearch';
import LevelRequestStatusPopup from './LevelRequestStatusPopup';
import LevelRequestCurationTypes, { LevelRequestCurationDiff } from './LevelRequestCurationTypes';
import { LevelRequestTagDiff } from './LevelRequestTags';
import { applyAdminRequestListParams, collectRequestsForExport } from './collectRequestExport';
import {
  DEFAULT_REQUEST_LIST_SORT,
  creditRequestDiff,
  creditsFromLevel,
  requestErrorMessage,
  requestSortField,
  requestSortOrder,
  requestSortValue,
  curationRequestDiff,
  readAdminRequestFilters,
  readRequestListPanels,
  songRequestLabel,
  statusesForType,
  payloadHasRequestedCurve,
  storedRequestIssue,
  tagRequestDiff,
  tagRequestTargetIds,
  teamFromLevel,
  userCanEditLevel,
  userCanOpenAdminLevelEditor,
  userOwnsPendingRequest,
  canManageRequestType,
  writeAdminRequestFilters,
  writeRequestListPanels,
} from './levelRequestShared';
import '@/pages/common/search-section.css';
import '@/pages/common/sort.css';
import './levelRequests.css';

function requestQuerySetsStatus(query) {
  return /(?:^|[\s,|])!?status\s*[:=]/i.test(query || '');
}

const PAGE_SIZE = 20;

const infoCardText = (request, t) => {
  const payload = request.payload || {};
  if (payload.kind === 'song') return songRequestLabel(payload.songName, payload.suffix);
  if (payload.kind === 'artist') return payload.artistName || '';
  if (payload.kind === 'credits' && Array.isArray(payload.credits)) {
    const diff = creditRequestDiff(
      creditsFromLevel(request.level),
      payload.credits,
      teamFromLevel(request.level),
      payload.team,
    );
    const change = diff.change.length + (diff.teamChanged ? 1 : 0);
    if (!diff.add.length && !change && !diff.remove.length) return '';
    return t('levelRequests.form.creditSummary', {
      add: diff.add.length,
      change,
      remove: diff.remove.length,
    });
  }
  if (payload.kind === 'download' && payload.fileId) {
    const name = String(payload.originalName || payload.value || '').replace(/\s+/g, ' ').trim();
    if (!name) return '';
    return name.length > 80 ? `${name.slice(0, 77)}…` : name;
  }
  const value = String(payload.value || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > 80 ? `${value.slice(0, 77)}…` : value;
};

const LevelRequestBrowser = ({ mode = 'mine', type = null, highlightId = null, onQueueChange = null }) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const { difficulties, difficultyDict, curationTypesDict, tags: catalogTags } = useDifficultyContext();
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const savedFilters = mode === 'admin' ? readAdminRequestFilters(type) : null;
  const [searchInput, setSearchInput] = useState(savedFilters?.search || '');
  const [searchQuery, setSearchQuery] = useState((savedFilters?.search || '').trim());
  const [completedFilter, setCompletedFilter] = useState(savedFilters?.completed || 'hide');
  const [statusFilter, setStatusFilter] = useState(savedFilters?.status || '');
  const [sort, setSort] = useState(savedFilters?.sort || DEFAULT_REQUEST_LIST_SORT);
  const [filterOpen, setFilterOpen] = useState(() => readRequestListPanels().filterOpen);
  const [sortOpen, setSortOpen] = useState(() => readRequestListPanels().sortOpen);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingLevel, setEditingLevel] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const persistReady = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (mode !== 'admin' || !type) return;
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    writeAdminRequestFilters(type, {
      search: searchInput,
      completed: completedFilter,
      status: statusFilter,
      sort,
    });
  }, [completedFilter, mode, searchInput, sort, statusFilter, type]);

  useEffect(() => {
    if (mode !== 'admin') return;
    writeRequestListPanels({ filterOpen, sortOpen });
  }, [filterOpen, mode, sortOpen]);

  const load = useCallback(async (controller) => {
    setLoading(true);
    setError(false);
    const params = { limit: PAGE_SIZE, offset };
    if (mode === 'admin') params.type = type;
    if (searchQuery) params.q = searchQuery;
    if (mode === 'admin') {
      applyAdminRequestListParams(params, {
        sort,
        status: statusFilter,
        completedFilter,
      });
    }
    try {
      const response = await api.get(
        mode === 'mine' ? routes.database.levelRequests.mine() : routes.database.levelRequests.root(),
        { params, signal: controller?.signal },
      );
      setResults(response.data?.results || []);
      setTotal(Number(response.data?.total) || 0);
      if (!controller?.signal?.aborted) onQueueChange?.();
    } catch (err) {
      if (api.isCancel?.(err)) return;
      setError(true);
      setResults([]);
      setTotal(0);
    } finally {
      if (!controller?.signal?.aborted) setLoading(false);
    }
  }, [completedFilter, mode, offset, onQueueChange, searchQuery, sort, statusFilter, type]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [completedFilter, searchQuery, sort, statusFilter, type]);

  const openRequest = useCallback(async (id, { preferEdit = false } = {}) => {
    try {
      const response = await api.get(routes.database.levelRequests.byId(id));
      const request = response.data?.request || null;
      setSelected(request);
      setEditingLevel(false);
      if (preferEdit && userOwnsPendingRequest(user, request)) {
        setEditing(true);
      } else {
        setEditing(false);
      }
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    }
  }, [t, user]);

  useEffect(() => {
    if (highlightId) openRequest(highlightId);
  }, [highlightId, openRequest]);

  const withdraw = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await api.post(routes.database.levelRequests.withdraw(selected.id));
      setSelected(response.data?.request || null);
      toast.success(t('levelRequests.detail.withdrawn'));
      load();
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action, extra = {}) => {
    if (!selected) return;
    if (action === 'add_to_rating' && !window.confirm(t('levelRequests.detail.addToRatingConfirm', {
      rating: selected.payload?.requestedRating || '',
    }))) return;
    if (action === 'complete' && !window.confirm(t('levelRequests.detail.completeConfirm'))) return;
    if (action === 'delete_discord' && selected.type !== 'rerate' && !window.confirm(t('levelRequests.detail.deleteDiscordConfirm'))) return;
    setBusy(true);
    try {
      const response = await api.post(routes.database.levelRequests.actions(selected.id), { action, ...extra });
      setSelected(response.data?.request || null);
      const fileBacked = selected.payload?.kind === 'download' && selected.payload?.fileId;
      const doneKey = action === 'delete_discord' && selected.type === 'rerate'
        ? 'levelRequests.pipeline.close_discordDone'
        : action === 'accept' && fileBacked
          ? 'levelRequests.pipeline.acceptDownloadDone'
          : action === 'reject' && fileBacked
            ? 'levelRequests.pipeline.rejectDownloadDone'
            : `levelRequests.pipeline.${action}Done`;
      toast.success(t(doneKey));
      load();
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  const openBan = async () => {
    const playerId = selected?.requester?.playerId;
    if (!playerId) {
      toast.error(t('levelRequests.detail.banMissingPlayer'));
      return;
    }
    try {
      const response = await api.get(routes.database.players.byId(playerId));
      setPlayer(response.data);
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    }
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportContextName = mode === 'admin' && type
    ? t(`levelRequests.types.${type}`)
    : t('levelRequests.list.export.defaultContextName');
  const sortField = requestSortField(sort);
  const sortOrder = requestSortOrder(sort);
  const sortFieldOptions = useMemo(() => ([
    { value: 'created', label: t('levelRequests.list.sortCreated') },
    { value: 'updated', label: t('levelRequests.list.sortUpdated') },
  ]), [t]);
  const statusOptions = useMemo(() => ([
    { value: '', label: t('levelRequests.list.anyStatus') },
    ...statusesForType(type).map((status) => ({
      value: status,
      label: t(`levelRequests.statuses.${status}`),
    })),
  ]), [t, type]);
  const completedIdle = Boolean(statusFilter) || requestQuerySetsStatus(searchQuery);

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCompletedFilter('hide');
    setStatusFilter('');
    setSort(DEFAULT_REQUEST_LIST_SORT);
    setOffset(0);
  };

  const handleRequestExport = useCallback(async (format, { signal, onProgress, scope } = {}) => {
    const useFilters = scope === 'filters';
    const requests = await collectRequestsForExport({
      mode,
      type,
      searchQuery: useFilters ? searchQuery : '',
      completedFilter: useFilters ? completedFilter : 'hide',
      status: useFilters ? statusFilter : '',
      sort,
      signal,
      onProgress,
    });
    if (requests.length === 0) {
      toast.error(t('levelRequests.list.export.errors.empty'));
      const emptyError = new Error('empty');
      emptyError.name = 'EmptyExportError';
      throw emptyError;
    }
    const { headers, rows } = buildRequestExportRows(requests, {
      difficultyDict,
      curationTypesDict,
      unavailableLabel: t('levelRequests.list.export.unavailable'),
    });
    await downloadPackExport({
      format,
      packName: exportContextName,
      headers,
      rows,
    });
  }, [completedFilter, curationTypesDict, difficultyDict, exportContextName, mode, searchQuery, sort, statusFilter, t, type]);

  const showCurationBulk = mode === 'admin'
    && (type === 'curation' || type === 'curation_rerate')
    && canManageRequestType(user, type);

  const runBulkAction = async (action) => {
    if (!showCurationBulk) return;
    const typeLabel = t(`levelRequests.types.${type}`);
    const confirmKey = action === 'accept'
      ? 'levelRequests.list.acceptAllConfirm'
      : 'levelRequests.list.completeAllConfirm';
    if (!window.confirm(t(confirmKey, { type: typeLabel }))) return;
    setBusy(true);
    try {
      const response = await api.post(routes.database.levelRequests.bulkActions(), { type, action });
      const updated = Number(response.data?.updated) || 0;
      const failed = Number(response.data?.failed) || 0;
      if (failed > 0) {
        toast.error(t('levelRequests.list.bulkPartial', { updated, failed }));
      } else if (updated === 0) {
        toast.error(t('levelRequests.list.bulkNone'));
      } else {
        const doneKey = action === 'accept'
          ? 'levelRequests.list.acceptAllDone'
          : 'levelRequests.list.completeAllDone';
        toast.success(t(doneKey, { count: updated }));
      }
      if (selected) {
        try {
          const next = await api.get(routes.database.levelRequests.byId(selected.id));
          setSelected(next.data?.request || null);
        } catch {
          setSelected(null);
        }
      }
      load();
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="level-requests">
      <div className="search-section">
        <AdvancedSearchBar
          profile="request"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('levelRequests.list.searchPlaceholder')}
          helpLabel={t('levelRequests.list.searchHelp')}
          pending={searchInput.trim() !== searchQuery}
          tooltipId="request-search"
        />
        <div className="buttons-row">
          {mode === 'admin' && (
            <>
              <FilterIcon
                color="#ffffff"
                onClick={() => setFilterOpen((open) => !open)}
                data-tooltip-id="request-filter"
                className={`action-button${filterOpen ? ' active' : ''}`}
              />
              <SortIcon
                color="#ffffff"
                onClick={() => setSortOpen((open) => !open)}
                data-tooltip-id="request-sort"
                className={`action-button${sortOpen ? ' active' : ''}`}
              />
              <ResetIcon
                color="#ffffff"
                onClick={resetFilters}
                data-tooltip-id="request-reset"
                className="action-button"
              />
            </>
          )}
          {showCurationBulk && (
            <>
              <button
                type="button"
                className="level-requests__export-btn"
                onClick={() => runBulkAction('accept')}
                disabled={busy}
              >
                <span>{t('levelRequests.list.acceptAll')}</span>
              </button>
              <button
                type="button"
                className="level-requests__export-btn"
                onClick={() => runBulkAction('complete')}
                disabled={busy}
              >
                <span>{t('levelRequests.list.completeAll')}</span>
              </button>
            </>
          )}
          <button
            type="button"
            className="level-requests__export-btn"
            onClick={() => setShowExportPopup(true)}
          >
            <ExternalLinkIcon color="#ffffff" size="18px" />
            <span>{t('levelRequests.list.exportAs')}</span>
          </button>
        </div>
        <Tooltip id="request-search" place="bottom" noArrow>
          {t('levelRequests.list.tooltips.search')}
        </Tooltip>
        {mode === 'admin' && (
          <>
            <Tooltip id="request-filter" place="bottom" noArrow>
              {t('levelRequests.list.tooltips.filter')}
            </Tooltip>
            <Tooltip id="request-sort" place="bottom" noArrow>
              {t('levelRequests.list.tooltips.sort')}
            </Tooltip>
            <Tooltip id="request-reset" place="bottom" noArrow>
              {t('levelRequests.list.tooltips.reset')}
            </Tooltip>
          </>
        )}
      </div>

      {mode === 'admin' && (
        <div className="input-setting">
          <Collapsible
            open={filterOpen}
            onOpenChange={setFilterOpen}
            revealOverflow
            duration="0.5s"
            easing="cubic-bezier(0.4, 0, 0.2, 1)"
          >
            <CollapsibleContent>
              <div className="filter settings-class">
                <h2 className="setting-title">{t('levelRequests.list.filterTitle')}</h2>
                <div className="filter-section">
                  <div className="filter-row">
                    <CustomSelect
                      options={statusOptions}
                      value={statusOptions.find((option) => option.value === statusFilter) || statusOptions[0]}
                      onChange={(option) => setStatusFilter(option?.value || '')}
                      label={t('levelRequests.list.status')}
                      width="18rem"
                      wrapOptions
                    />
                    <StateDisplay
                      className={`level-requests__completed${completedIdle ? ' level-requests__completed--idle' : ''}`}
                      currentState={completedFilter}
                      states={['hide', 'show', 'only']}
                      onChange={setCompletedFilter}
                      label={t('levelRequests.list.completed')}
                      width={60}
                    />
                  </div>
                  {completedIdle && (
                    <p className="level-requests__hint">{t('levelRequests.list.statusIgnoresCompleted')}</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={sortOpen}
            onOpenChange={setSortOpen}
            revealOverflow
            duration="0.5s"
            easing="cubic-bezier(0.4, 0, 0.2, 1)"
          >
            <CollapsibleContent>
              <div className="sort sort-class">
                <h2 className="setting-title">{t('levelRequests.list.sortTitle')}</h2>
                <div className="sort-option">
                  <CustomSelect
                    options={sortFieldOptions}
                    value={sortFieldOptions.find((option) => option.value === sortField) || sortFieldOptions[0]}
                    onChange={(option) => setSort(requestSortValue(option?.value, sortOrder))}
                    label={t('levelRequests.list.sortBy')}
                  />
                  <div className="order">
                    <p>{t('levelRequests.list.sortOrder')}</p>
                    <Tooltip id="request-order-asc" place="bottom" noArrow>
                      {t('levelRequests.list.tooltips.orderAsc')}
                    </Tooltip>
                    <Tooltip id="request-order-desc" place="bottom" noArrow>
                      {t('levelRequests.list.tooltips.orderDesc')}
                    </Tooltip>
                    <div className="wrapper">
                      <SortAscIcon
                        className={`svg-fill${sortOrder === 'ASC' ? ' is-active' : ''}`}
                        onClick={() => setSort(requestSortValue(sortField, 'ASC'))}
                        data-tooltip-id="request-order-asc"
                      />
                      <SortDescIcon
                        className={`svg-fill${sortOrder === 'DESC' ? ' is-active' : ''}`}
                        onClick={() => setSort(requestSortValue(sortField, 'DESC'))}
                        data-tooltip-id="request-order-desc"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {error && <p>{t('levelRequests.list.error')}</p>}
      {loading && !results.length && <p>{t('levelRequests.list.loading')}</p>}
      {!loading && !error && !results.length && <p>{t('levelRequests.list.empty')}</p>}

      <div className="level-requests level-requests__list">
        {results.map((request) => {
          const currentIcon = request.level?.difficulty?.icon
            ? selectIconSize(request.level.difficulty.icon, ICON_SIZE.SMALL)
            : null;
          const requestedName = request.type === 'rerate' ? request.payload?.requestedRating : null;
          const requested = requestedName
            ? difficulties.find((diff) => diff.name?.toLowerCase() === String(requestedName).toLowerCase())
            : null;
          const requesterName = request.requester?.nickname || request.requester?.username;
          const infoText = request.type === 'info_change' ? infoCardText(request, t) : '';
          const reasonText = typeof request.reason === 'string' ? request.reason.trim() : '';
          const payloadIssue = (request.status === 'pending' || request.status === 'accepted')
            ? storedRequestIssue(request.type, request.payload, request.level, catalogTags)
            : null;
          return (
            <button
              key={request.id}
              type="button"
              className={`level-requests__card level-requests__card--${request.status}${selected?.id === request.id ? ' level-requests__card--active' : ''}`}
              onClick={() => openRequest(request.id, { preferEdit: true })}
            >
              {currentIcon && (
                <img className="level-requests__diff" src={currentIcon} alt={request.level.difficulty.name || ''} />
              )}
              <span className="level-requests__card-body">
                <strong>
                  {request.level?.missing
                    ? `${t('levelRequests.detail.levelMissing')} #${request.level?.id}`
                    : (request.level?.song || `#${request.levelId}`)}
                </strong>
                <span className="level-requests__card-meta">
                  <span>{t(`levelRequests.types.${request.type}`)}</span>
                  <span>{t(`levelRequests.statuses.${request.status}`)}</span>
                  {mode === 'admin' && requesterName && (
                    <span className="level-requests__requester">
                      <UserAvatar className="level-requests__avatar" {...userAvatarUrls(request.requester)} />
                      {requesterName}
                    </span>
                  )}
                  {requestedName && (
                    <span className="level-requests__request-diff">
                      {requested?.icon && (
                        <img src={selectIconSize(requested.icon, ICON_SIZE.SMALL)} alt="" />
                      )}
                      <span>{requestedName}</span>
                    </span>
                  )}
                  {payloadHasRequestedCurve(request.payload) && (
                    <span>{t('levelRequests.detail.scoreCurve')}</span>
                  )}
                  {request.type === 'info_change' && request.payload?.kind && (
                    <span>
                      {t(`levelRequests.kinds.${request.payload.kind}`)}
                      {infoText && `: ${infoText}`}
                    </span>
                  )}
                  {request.type === 'tag' && (
                    <LevelRequestTagDiff
                      {...tagRequestDiff(
                        tagRequestTargetIds(request.payload, request.level?.tagIds),
                        request.level?.tagIds,
                      )}
                    />
                  )}
                  {request.type === 'curation_rerate' && (
                    <LevelRequestCurationDiff
                      {...curationRequestDiff(request.payload, request.level?.curationTypeIds)}
                    />
                  )}
                  {request.type === 'curation' && (
                    <LevelRequestCurationTypes ids={request.payload?.curationTypeIds} variant="icons" />
                  )}
                  {payloadIssue && (
                    <span className="level-requests__hint level-requests__hint--issue">
                      {t(`levelRequests.errors.${payloadIssue}`)}
                    </span>
                  )}
                </span>
                {reasonText && (
                  <span className="level-requests__card-reason">{reasonText}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {total > PAGE_SIZE && (
        <div className="level-requests__actions">
          <button type="button" className="level-requests__button" disabled={offset <= 0} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>
            {t('levelRequests.list.previous')}
          </button>
          <span>{t('levelRequests.list.page', { page, totalPages })}</span>
          <button type="button" className="level-requests__button" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset((value) => value + PAGE_SIZE)}>
            {t('levelRequests.list.next')}
          </button>
        </div>
      )}

      {selected && (
        <PopupShell onClose={() => setSelected(null)} panelClassName="level-requests level-requests__popup">
          <CloseButton variant="floating" onClick={() => setSelected(null)} />
          <LevelRequestDetail
            request={selected}
            user={user}
            mode={mode}
            busy={busy}
            onEdit={() => setEditing(true)}
            onEditLevel={() => {
              if (userCanOpenAdminLevelEditor(user)) setEditingLevel(true);
            }}
            onWithdraw={withdraw}
            onNotes={() => setStatusOpen(true)}
            onAction={runAction}
            onBan={openBan}
            onUpdated={(next) => {
              setSelected(next || null);
              load();
            }}
          />
        </PopupShell>
      )}
      {editing && selected && userOwnsPendingRequest(user, selected) && (
        <LevelRequestFormPopup
          levelId={selected.levelId}
          type={selected.type}
          request={selected}
          level={selected.level}
          levelTagIds={selected.level?.tagIds}
          canEditChart={userCanEditLevel(user, selected.level)}
          onClose={() => setEditing(false)}
          onSaved={(request) => {
            setSelected(request);
            load();
          }}
        />
      )}
      {editingLevel && selected?.level?.id && !selected.level.missing && userCanOpenAdminLevelEditor(user) && (
        <EditLevelPopup
          level={{ id: selected.level.id, _ratingListMinimal: true }}
          onClose={() => setEditingLevel(false)}
          onUpdate={(updated) => {
            if (updated?.permanentDelete) {
              setEditingLevel(false);
              setSelected(null);
              load();
              return;
            }
            setEditingLevel(false);
            openRequest(selected.id);
            load();
          }}
        />
      )}
      {statusOpen && selected && (
        <LevelRequestStatusPopup
          request={selected}
          onClose={() => setStatusOpen(false)}
          onSaved={(request) => {
            setSelected(request);
            load();
          }}
        />
      )}
      {player && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
        <CreatorManagementPopup
          player={player}
          playerTab="moderation"
          onClose={() => setPlayer(null)}
          onUpdate={(next) => setPlayer(next)}
        />
      )}
      <LevelListExportPopup
        isOpen={showExportPopup}
        onClose={() => setShowExportPopup(false)}
        contextName={exportContextName}
        onExport={handleRequestExport}
        showScope
        title={t('levelRequests.list.export.title', { contextName: exportContextName })}
        description={t('levelRequests.list.export.description', { contextName: exportContextName })}
        scopeLabel={t('levelRequests.list.export.scope')}
        progressText={(progress) => t('levelRequests.list.export.progress', {
          fetched: progress.fetched,
          total: progress.total ?? '…',
        })}
        errorMessage={t('levelRequests.list.export.errors.exportFailed')}
        exportingLabel={t('levelRequests.list.export.exporting')}
        exportLabel={t('levelRequests.list.export.export')}
      />
    </div>
  );
};

export default LevelRequestBrowser;
