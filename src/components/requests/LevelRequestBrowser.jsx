import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { StateDisplay } from '@/components/common/selectors';
import { CreatorManagementPopup } from '@/components/popups/Creators';
import { EditLevelPopup } from '@/components/popups/Levels';
import UserAvatar from '@/components/layout/UserAvatar/UserAvatar';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import LevelRequestDetail from './LevelRequestDetail';
import LevelRequestFormPopup from './LevelRequestFormPopup';
import LevelRequestStatusPopup from './LevelRequestStatusPopup';
import LevelRequestCurationTypes, { LevelRequestCurationDiff } from './LevelRequestCurationTypes';
import { LevelRequestTagDiff } from './LevelRequestTags';
import {
  creditRequestDiff,
  creditsFromLevel,
  requestErrorMessage,
  curationRequestDiff,
  songRequestLabel,
  tagRequestDiff,
  tagRequestTargetIds,
  teamFromLevel,
  userCanEditLevel,
} from './levelRequestShared';
import './levelRequests.css';

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
  const value = String(payload.value || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > 80 ? `${value.slice(0, 77)}…` : value;
};

const LevelRequestBrowser = ({ mode = 'mine', type = null, highlightId = null, onQueueChange = null }) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const { difficulties } = useDifficultyContext();
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedFilter, setCompletedFilter] = useState('hide');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingLevel, setEditingLevel] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (controller) => {
    setLoading(true);
    setError(false);
    const params = { limit: PAGE_SIZE, offset };
    if (mode === 'admin') params.type = type;
    if (searchQuery) params.q = searchQuery;
    if (mode === 'admin' && completedFilter !== 'hide') params.completed = completedFilter;
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
  }, [mode, type, searchQuery, completedFilter, offset, onQueueChange]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [type, searchQuery, completedFilter]);

  const openRequest = useCallback(async (id, { preferEdit = false } = {}) => {
    try {
      const response = await api.get(routes.database.levelRequests.byId(id));
      const request = response.data?.request || null;
      setSelected(request);
      const ownsRequest = Boolean(
        user?.id && request?.requester?.id != null && String(request.requester.id) === String(user.id),
      );
      if (preferEdit && mode === 'mine' && ownsRequest && request.status === 'pending') {
        setEditing(true);
      }
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    }
  }, [mode, t, user?.id]);

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
      toast.success(t(action === 'delete_discord' && selected.type === 'rerate'
        ? 'levelRequests.pipeline.close_discordDone'
        : `levelRequests.pipeline.${action}Done`));
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

  return (
    <div className="level-requests">
      <div className="level-requests__filters">
        <input
          className="level-requests__search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('levelRequests.list.searchPlaceholder')}
          aria-label={t('levelRequests.list.searchPlaceholder')}
        />
        {mode === 'admin' && (
          <StateDisplay
            className="level-requests__completed"
            currentState={completedFilter}
            states={['hide', 'show', 'only']}
            onChange={setCompletedFilter}
            label={t('levelRequests.list.completed')}
            width={60}
          />
        )}
      </div>

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
                </span>
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
            onEditLevel={() => setEditingLevel(true)}
            onWithdraw={withdraw}
            onNotes={() => setStatusOpen(true)}
            onAction={runAction}
            onBan={openBan}
          />
        </PopupShell>
      )}
      {editing && selected && mode === 'mine' && (
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
      {editingLevel && selected?.level?.id && !selected.level.missing && (
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
    </div>
  );
};

export default LevelRequestBrowser;
