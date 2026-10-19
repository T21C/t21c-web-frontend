import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { CommentFormatter } from '@/components/misc';
import { CheckmarkIcon, CopyIcon, CrossIcon, DiscordIcon, EditIcon, PassIcon, ShieldIcon, TrashIcon } from '@/components/common/icons';
import UserAvatar from '@/components/layout/UserAvatar/UserAvatar';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { formatAccuracyRatio } from '@/utils/statFormatters';
import { formatCreatorDisplay, ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { PIPELINE_ACTIONS, actionButtonClass, canManageRequestType, curationRequestDiff, songRequestLabel, tagRequestDiff, tagRequestTargetIds } from './levelRequestShared';
import LevelRequestCurationTypes, { LevelRequestCurationDiff } from './LevelRequestCurationTypes';
import { LevelRequestCreditDiff } from './LevelRequestInfoFields';
import { LevelRequestTagDiff } from './LevelRequestTags';
import DiscordThreadPingPopup from '@/components/discord/DiscordThreadPingPopup';

const DiffMark = ({ icon, name }) => {
  const src = icon ? selectIconSize(icon, ICON_SIZE.SMALL) : null;
  return (
    <span className="level-requests__diff-mark">
      {src && <img src={src} alt="" />}
      <span>{name || '—'}</span>
    </span>
  );
};

const LevelRequestDetail = ({
  request,
  user,
  mode = 'mine',
  onEdit,
  onEditLevel,
  onWithdraw,
  onNotes,
  onAction,
  onBan,
  busy = false,
}) => {
  const { t } = useTranslation('pages');
  const { difficulties } = useDifficultyContext();
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState(request.publicNote || '');
  const [threadPrompt, setThreadPrompt] = useState(null);
  const payload = request.payload || {};
  const iconForName = (name) => {
    if (!name) return null;
    return difficulties.find((diff) => diff.name?.toLowerCase() === String(name).toLowerCase())?.icon || null;
  };
  const currentIcon = request.level?.difficulty?.icon || null;
  const ownerView = mode === 'mine';
  const isOwner = Boolean(user?.id && request.requester?.id != null && String(request.requester.id) === String(user.id));
  const pending = request.status === 'pending';
  const manageable = !ownerView && canManageRequestType(user, request.type);
  const availableActions = ownerView
    ? []
    : PIPELINE_ACTIONS.filter((action) => (request.availableActions || []).includes(action));

  useEffect(() => {
    setRejecting(false);
    setRejectNote(request.publicNote || '');
    setThreadPrompt(null);
  }, [request.id, request.publicNote]);

  const copyReason = async () => {
    try {
      await navigator.clipboard.writeText(request.reason || '');
      toast.success(t('levelRequests.detail.copied'));
    } catch {
      toast.error(t('levelRequests.detail.copyFailed'));
    }
  };

  const showBan = !ownerView && request.type === 'rerate' && hasFlag(user, permissionFlags.SUPER_ADMIN);
  const levelTitle = request.level?.missing
    ? `${t('levelRequests.detail.levelMissing')} #${request.level?.id}`
    : [request.level?.song || `#${request.level?.id}`, request.type === 'rerate' ? request.level?.artist : null]
        .filter(Boolean)
        .join(' - ');
  const creatorLine = request.type === 'rerate'
    ? formatCreatorDisplay({
        team: typeof request.level?.team === 'string' ? request.level.team : '',
        levelCredits: request.level?.levelCredits,
      })
    : '';
  const showCreators = creatorLine && creatorLine !== 'No credits';

  return (
    <div className="level-requests__detail">
      <span className="level-requests__corner level-requests__corner--id">#{request.id}</span>
      <span className="level-requests__corner level-requests__corner--status">
        {t(`levelRequests.statuses.${request.status}`)}
      </span>
      <section className="level-requests__section">
        <div className="level-requests__headline">
          {currentIcon && (
            <img className="level-requests__diff" src={selectIconSize(currentIcon, ICON_SIZE.MEDIUM)} alt="" />
          )}
          <div className="level-requests__headline-text">
            {/*{<strong>{t(`levelRequests.types.${request.type}`)}</strong>*/}
            <div className="level-requests__level-line">
              <div className="level-requests__level-title">
                {request.level?.missing ? (
                  <strong>{levelTitle}</strong>
                ) : (
                  <Link to={`/levels/${request.level?.id}`} target="_blank" rel="noopener noreferrer"><strong>{levelTitle}</strong></Link>
                )}
                {(request.type === 'curation' || request.type === 'curation_rerate') && (
                  (request.level?.curationTypeIds || []).length > 0
                    ? <LevelRequestCurationTypes ids={request.level.curationTypeIds} variant="icons" />
                    : <span className="level-requests__hint">{t('levelRequests.form.tagsNone')}</span>
                )}
              </div>
              {request.type !== 'rerate' && request.level?.artist && <span>{request.level.artist}</span>}
            </div>
            {request.type === 'rerate' && showCreators && (
              <span className="level-requests__creators">{creatorLine}</span>
            )}
            <div className="level-requests__requester-row">
              {request.requester?.playerId ? (
                <Link
                  className="level-requests__requester level-requests__requester-profile"
                  to={`/profile/${request.requester.playerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UserAvatar className="level-requests__avatar" {...userAvatarUrls(request.requester)} />
                  <span>{request.requester?.nickname || request.requester?.username || request.requester?.id}</span>
                </Link>
              ) : (
                <div className="level-requests__requester">
                  <UserAvatar className="level-requests__avatar" {...userAvatarUrls(request.requester)} />
                  <span>{request.requester?.nickname || request.requester?.username || request.requester?.id}</span>
                </div>
              )}
              {showBan && (
                <button
                  type="button"
                  className="level-requests__button level-requests__button--icon"
                  onClick={onBan}
                  aria-label={t('levelRequests.detail.ban')}
                  title={t('levelRequests.detail.ban')}
                >
                  <ShieldIcon size={16} color="currentColor" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      {request.type === 'rerate' && (
        <section className="level-requests__section level-requests__facts">
          <div>
            <span>{t('levelRequests.detail.requested')}</span>
            <DiffMark icon={iconForName(payload.requestedRating)} name={payload.requestedRating} />
          </div>
          <div>
            <span>{t('levelRequests.detail.difficultyAtSubmit')}</span>
            <DiffMark icon={iconForName(payload.frozenDiffName)} name={payload.frozenDiffName} />
          </div>
          <div>
            <span>{t('levelRequests.detail.current')}</span>
            <DiffMark icon={currentIcon} name={request.level?.difficulty?.name} />
          </div>
        </section>
      )}
      {request.type === 'info_change' && payload.kind && (
        <section className="level-requests__section">
          <strong>{t(`levelRequests.kinds.${payload.kind}`)}</strong>
          {payload.kind === 'credits' && Array.isArray(payload.credits) && (
            <LevelRequestCreditDiff
              level={request.level}
              credits={payload.credits || []}
              team={payload.team ?? null}
            />
          )}
          {payload.kind !== 'credits' && (payload.songName || payload.suffix || payload.artistName || payload.value) && (
            <div className="level-requests__tag-diff-row">
              <span className="level-requests__tag-diff-label">{t('levelRequests.form.changeTo')}</span>
              <span className="level-requests__change-values">
                {payload.kind === 'song'
                  ? songRequestLabel(payload.songName, payload.suffix)
                  : payload.kind === 'artist' ? payload.artistName : payload.value}
              </span>
            </div>
          )}
        </section>
      )}
      {request.type === 'tag' && (
        <section className="level-requests__section">
          <LevelRequestTagDiff
            {...tagRequestDiff(
              tagRequestTargetIds(payload, request.level?.tagIds),
              request.level?.tagIds,
            )}
          />
        </section>
      )}
      {request.type === 'curation_rerate' && (
        <section className="level-requests__section">
          <LevelRequestCurationDiff
            {...curationRequestDiff(payload, request.level?.curationTypeIds)}
          />
        </section>
      )}
      {request.type === 'curation' && (payload.curationTypeIds || []).length > 0 && (
        <section className="level-requests__section">
          <LevelRequestCurationTypes ids={payload.curationTypeIds} variant="display" />
        </section>
      )}
      {(request.comparisons || []).length > 0 && (
        <section className="level-requests__section">
          <strong>{t('levelRequests.detail.comparisons')}</strong>
          {request.comparisons.map((row) => {
            const credits = formatCreatorDisplay({team: row.team, levelCredits: row.credits});
            const showCredits = credits && credits !== 'No credits';
            return (
              <Link
                className="level-requests__comparison"
                key={row.levelId}
                to={`/levels/${row.levelId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {row.currentIcon && (
                  <img src={selectIconSize(row.currentIcon, ICON_SIZE.SMALL)} alt={row.currentDiffName || ''} />
                )}
                <span className="level-requests__comparison-main">
                  <span className="level-requests__comparison-song">
                    {row.missing
                      ? `${t('levelRequests.detail.levelMissing')}`
                      : (row.song || `#${row.levelId}`)}
                  </span>
                  {!row.missing && (row.artist || showCredits) && (
                    <span className="level-requests__comparison-artist">
                      {row.artist}
                      {showCredits && <span className="level-requests__comparison-credits">{credits}</span>}
                    </span>
                  )}
                </span>
                <span className="level-requests__comparison-id">#{row.levelId}</span>
              </Link>
            );
          })}
        </section>
      )}
      {request.reason && (
        <section className="level-requests__section">
          <CommentFormatter resolveLevelRefs>{request.reason}</CommentFormatter>
        </section>
      )}
      {(request.bestPass || request.publicNote || (!ownerView && (request.internalNote || request.discordPostError))) && (
        <section className="level-requests__section">
          {request.bestPass && (
            <Link className="level-requests__requester" to={`/passes/${request.bestPass.id}`} target="_blank" rel="noopener noreferrer">
              <PassIcon size="16px" color="currentColor" />
              {t('levelRequests.detail.clear')}: {request.bestPass.scoreV2}
              {request.bestPass.accuracy != null && ` · ${formatAccuracyRatio(request.bestPass.accuracy)}`}
            </Link>
          )}
          {request.publicNote && (
            <div className="level-requests__note">
              <span className="level-requests__note-label">{t('levelRequests.detail.publicNote')}</span>
              <div className="level-requests__note-content">{request.publicNote}</div>
            </div>
          )}
          {!ownerView && request.internalNote && (
            <div className="level-requests__note">
              <span className="level-requests__note-label">{t('levelRequests.detail.internalNote')}</span>
              <div className="level-requests__note-content">{request.internalNote}</div>
            </div>
          )}
          {!ownerView && request.discordPostError && (
            <div>{t('levelRequests.detail.discordError')}: {request.discordPostError}</div>
          )}
        </section>
      )}
      <div className="level-requests__actions">
        {request.reason && (
          <button type="button" className="level-requests__button" onClick={copyReason}>
            <CopyIcon size={16} color="currentColor" />
            {t('levelRequests.detail.copyReason')}
          </button>
        )}
        {mode === 'mine' && isOwner && pending && (
          <button type="button" className="level-requests__button" onClick={onEdit} disabled={busy}>
            <EditIcon size="16px" color="currentColor" />
            {t('levelRequests.detail.edit')}
          </button>
        )}
        {mode === 'admin' && request.level?.id && !request.level?.missing && (
          <button type="button" className="level-requests__button" onClick={onEditLevel} disabled={busy}>
            <EditIcon size="16px" color="currentColor" />
            {t('levelRequests.detail.edit')}
          </button>
        )}
        {mode === 'mine' && isOwner && pending && (
          <button type="button" className="level-requests__button" onClick={onWithdraw} disabled={busy}>
            {t('levelRequests.detail.withdraw')}
          </button>
        )}
        {manageable && (
          <button type="button" className="level-requests__button" onClick={onNotes} disabled={busy}>
            {t('levelRequests.detail.notes')}
          </button>
        )}
        {request.type === 'rerate' && request.discordMessageUrl && (
          <a
            className="level-requests__button"
            href={request.discordMessageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DiscordIcon size={16} color="currentColor" />
            {t(request.discordThreadClosed ? 'levelRequests.detail.threadClosed' : 'levelRequests.detail.thread')}
          </a>
        )}
        {!rejecting && availableActions.map((action) => (
          <button
            key={action}
            type="button"
            className={`level-requests__button ${actionButtonClass(action)}`.trim()}
            onClick={() => {
              if (action === 'reject') {
                setRejecting(true);
                return;
              }
              const opensThreadPrompt = action === 'discord_vote'
                || action === 'retry_discord'
                || action === 'reopen_discord'
                || (action === 'delete_discord' && request.type === 'rerate');
              if (opensThreadPrompt) {
                setThreadPrompt(action);
                return;
              }
              onAction?.(action);
            }}
            disabled={busy}
          >
            {(action === 'accept' || action === 'complete' || action === 'add_to_rating') && (
              <CheckmarkIcon size={16} color="currentColor" />
            )}
            {(action === 'discord_vote' || action === 'retry_discord' || action === 'reopen_discord' || (action === 'delete_discord' && request.type === 'rerate')) && (
              <DiscordIcon size={16} color="currentColor" />
            )}
            {action === 'delete_discord' && request.type !== 'rerate' && (
              <TrashIcon size={16} color="currentColor" />
            )}
            {action === 'reject' && (
              <CrossIcon size={16} color="currentColor" />
            )}
            {t(action === 'delete_discord' && request.type === 'rerate'
              ? 'levelRequests.pipeline.close_discord'
              : `levelRequests.pipeline.${action}`)}
          </button>
        ))}
      </div>
      {rejecting && (
        <div className="level-requests__reject">
          <label className="level-requests__field">
            <span>{t('levelRequests.pipeline.rejectNote')}</span>
            <textarea
              value={rejectNote}
              maxLength={1000}
              onChange={(event) => setRejectNote(event.target.value)}
            />
          </label>
          <div className="level-requests__actions">
            <button
              type="button"
              className="level-requests__button level-requests__button--danger"
              onClick={() => onAction?.('reject', { publicNote: rejectNote })}
              disabled={busy}
            >
              <CrossIcon size={16} color="currentColor" />
              {t('levelRequests.pipeline.rejectConfirm')}
            </button>
            <button type="button" className="level-requests__button" onClick={() => setRejecting(false)} disabled={busy}>
              {t('levelRequests.form.cancel')}
            </button>
          </div>
        </div>
      )}
      {threadPrompt && (
        <DiscordThreadPingPopup
          action={threadPrompt === 'reopen_discord' ? 'reopen' : threadPrompt === 'delete_discord' ? 'close' : 'create'}
          onClose={() => setThreadPrompt(null)}
          onConfirm={(ping) => {
            const action = threadPrompt;
            setThreadPrompt(null);
            onAction?.(action, {ping});
          }}
        />
      )}
    </div>
  );
};

export default LevelRequestDetail;
