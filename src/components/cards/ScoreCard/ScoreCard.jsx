// tuf-search: #ScoreCard #scoreCard #cards
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./scorecard.css"
import "@/index.css"
import { useTranslation } from "react-i18next";
import { clampFloat, formatScore, formatPassDate, formatCreatorDisplay, ICON_SIZE, selectIconSize } from "@/utils/Utility"
import { formatNumber } from "@/utils";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip } from '@/components/common/display/Tooltip';
import WorldsFirstFlag from "../WorldsFirstFlag/WorldsFirstFlag";
import PassFlags from "../PassFlags/PassFlags";
import { EditIcon, VideoLinkIcon } from "@/components/common/icons";
import { LikeButton } from "@/components/common/buttons";
import { EditPassPopup, OwnPassEditPopup } from "@/components/popups/Passes";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { getPrimaryVideoLink } from "@/utils/videoLink";
import { isAutoSubmittedPass } from "@/utils/passSubmissionSource";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import MarqueeText from "@/components/common/display/MarqueeText/MarqueeText";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import i18next from "i18next";
import { shouldShowXPerfectJudgements } from "@/utils/adofaiVersion";
import { isPureXPerfect } from "@/utils/CalcAcc";

function mergePassUpdate(current, updated) {
  const source = updated?.pass && typeof updated.pass === 'object' && updated.id == null
    ? updated.pass
    : updated;
  if (!source || typeof source !== 'object') return current;
  return {
    ...current,
    ...source,
    id: source.id ?? current.id,
    isLiked: source.isLiked ?? current.isLiked,
    likes: source.likes ?? current.likes,
    player: source.player ? { ...current.player, ...source.player } : current.player,
    level: source.level
      ? {
          ...current.level,
          ...source.level,
          diffId: source.level.diffId ?? source.level.difficulty?.id ?? current.level?.diffId,
        }
      : current.level,
    judgements: source.judgements
      ? { ...(current.judgements || {}), ...source.judgements }
      : current.judgements,
  };
}

function passForEditor(pass) {
  const judgements = pass?.judgements || {};
  return {
    ...pass,
    levelId: pass?.levelId ?? pass?.level?.id ?? '',
    playerId: pass?.playerId ?? pass?.player?.id ?? '',
    judgements: {
      ePerfect: judgements.ePerfect ?? 0,
      perfectMinus: judgements.perfectMinus ?? 0,
      perfect: judgements.perfect ?? 0,
      perfectPlus: judgements.perfectPlus ?? 0,
      lPerfect: judgements.lPerfect ?? 0,
      earlyDouble: judgements.earlyDouble ?? 0,
      earlySingle: judgements.earlySingle ?? 0,
      lateSingle: judgements.lateSingle ?? 0,
      lateDouble: judgements.lateDouble ?? 0,
    },
  };
}

const Judgements = ({judgements, showXPerfect}) => {
  return (
    <div className="judgements-container">
      <div className={`judgements-grid${showXPerfect ? ' judgements-grid--xperfect' : ''}`}>
        <span className="e-perfect">{judgements.ePerfect}</span>
        {showXPerfect ? <span className="perfect-minus">{judgements.perfectMinus ?? 0}</span> : null}
        <span className="perfect">{judgements.perfect}</span>
        {showXPerfect ? <span className="perfect-plus">{judgements.perfectPlus ?? 0}</span> : null}
        <span className="l-perfect">{judgements.lPerfect}</span>
        </div>
        <div className="judgements-grid">
        <span className="early-double">{judgements.earlyDouble}</span>
        <span className="early-single">{judgements.earlySingle}</span>
        <span className="late-single">{judgements.lateSingle}</span>
      </div>
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const ScoreCard = ({ scoreData: scoreDataProp, topScores = [], potentialTopScores = [], mode = 'profile', onPassUpdated }) => {
  const {t} = useTranslation(['components', 'pages']);
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState(scoreDataProp);
  const [showEditPopup, setShowEditPopup] = useState(false);

  useEffect(() => {
    setScoreData(scoreDataProp);
  }, [scoreDataProp]);

  const isFeaturedMode = mode === 'featured';
  const isPassCardMode = mode === 'passcard' || isFeaturedMode;
  const showPassLike = mode === 'passcard';
  const isSuperAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const isOwnPass = Boolean(user?.playerId) && user.playerId === scoreData.player?.id;
  const canEditPass = mode === 'passcard' && (isSuperAdmin || isOwnPass);
  const isHiddenLevel = scoreData.level?.isHidden || false;
  const isHiddenPass = scoreData.isHidden || false;
  const showVideo = Boolean(scoreData.videoLink) && !isHiddenLevel && !isAutoSubmittedPass(scoreData);
  const { difficultyDict } = useDifficultyContext();
  const formattedDate = formatPassDate(scoreData.vidUploadTime, i18next?.language);
  const passDetailTo = `/passes/${scoreData.id}`;
  const [likeState, setLikeState] = useState({
    isLiked: Boolean(scoreData.isLiked),
    likes: scoreData.likes ?? 0,
  });

  useEffect(() => {
    setLikeState({
      isLiked: Boolean(scoreData.isLiked),
      likes: scoreData.likes ?? 0,
    });
  }, [scoreData.id, scoreData.isLiked, scoreData.likes]);

  const handlePassUpdate = (updated) => {
    const next = mergePassUpdate(scoreData, updated);
    setScoreData(next);
    onPassUpdated?.(next);
  };

  const handleEditClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowEditPopup(true);
  };

  const handleLikeRequest = async (action) => {
    const { data } = await api.put(routes.database.passes.like(scoreData.id), { action });
    if (!data?.success) throw new Error('like failed');
    return { likes: data.likes };
  };

  const handleLikeChange = ({ liked: nextLiked, count: nextCount }) => {
    setLikeState({ isLiked: nextLiked, likes: nextCount });
  };
  const xPerfectMode = !!(scoreData.isXPerfectMode || scoreData.flags?.isXPerfectMode);
  const accuracyClass = isPureXPerfect(scoreData.judgements, xPerfectMode)
    ? 'pure-xperfect'
    : scoreData.accuracy == 1
      ? 'pure-perfect'
      : '';

  const cardStyle = {
    pointerEvents: isHiddenLevel && !canEditPass ? 'none' : 'auto',
    ...(isPassCardMode && !isFeaturedMode && scoreData.isDeleted ? { backgroundColor: '#f0000099' } : {}),
  };

  const cardClassName = [
    'score-card',
    isPassCardMode ? 'score-card--passcard' : '',
    isFeaturedMode ? 'score-card--featured' : '',
    isHiddenPass ? 'hidden-pass' : '',
  ].filter(Boolean).join(' ');

  const difficultyIcon = !isHiddenLevel ? (
    <img src={selectIconSize(difficultyDict[scoreData.level.diffId]?.icon, ICON_SIZE.MEDIUM)} referrerPolicy="no-referrer" alt="" />
  ) : (
    <div className="hidden-level-icon">🔒</div>
  );

  const songArtistBlock = (
    <>
      <MarqueeText className="score-desc score-desc-song" as="p">
        {scoreData.level.song}
      </MarqueeText>
      <MarqueeText className="score-exp score-exp-artist" as="p">
        {scoreData.level.artist ?? 'Hidden level'}
      </MarqueeText>
    </>
  );

  const playerRow = scoreData.player?.id ? (
    isFeaturedMode ? (
      <div className="score-card__player-row">
        <UserAvatar {...userAvatarUrls(scoreData.player)} className="score-card__player-avatar" />
        <MarqueeText className="score-desc-player" as="span">
          {scoreData.player.name}
        </MarqueeText>
      </div>
    ) : (
      <Link className="score-card__player-row" to={`/profile/${scoreData.player.id}`}>
        <UserAvatar {...userAvatarUrls(scoreData.player)} className="score-card__player-avatar" />
        <MarqueeText className="score-desc-player" as="span">
          {scoreData.player.name}
        </MarqueeText>
      </Link>
    )
  ) : null;

  const primaryInfo = isPassCardMode ? (
    <div className="score-card__info-column">
      {playerRow}
      {isFeaturedMode ? (
        <div className="name-wrapper">{songArtistBlock}</div>
      ) : (
        <Link className="name-wrapper" to={passDetailTo}>
          {songArtistBlock}
        </Link>
      )}
    </div>
  ) : (
    <Link className="name-wrapper" to={passDetailTo}>
      <p className="score-desc-creator">{formatCreatorDisplay(scoreData.level)}</p>
      {songArtistBlock}
    </Link>
  );

  const topScoreEntry = !isFeaturedMode
    ? topScores.find(score => score.id === scoreData.id)
    : undefined;
  const potentialScoreEntry = !isFeaturedMode && !topScoreEntry
    ? potentialTopScores.find(score => score.id === scoreData.id)
    : undefined;

  const scoreBlock = (
    <div className="score-wrapper">
      <p className="score-exp">{t('score.card.labels.score')}</p>
      <p className="score-desc">{formatScore(scoreData.scoreV2)}</p>
      {topScoreEntry ? (
        <p className="score-impact">+{formatNumber(topScoreEntry.impact)}</p>
      ) : null}
      {potentialScoreEntry ? (
        <p className="score-impact potential"
          data-tooltip-id={`potential-score-tooltip-${scoreData.id}`}>+{formatNumber(potentialScoreEntry.impact)}</p>
      ) : null}
      {potentialScoreEntry && (
        <Tooltip
          id={`potential-score-tooltip-${scoreData.id}`}
          place="top"
          style={{ maxWidth: '16rem', zIndex: 1000 }}
        >
          {t('score.card.tooltips.potentialScore')}
        </Tooltip>
      )}
    </div>
  );

  const accuracyBlock = (
    <div className="acc-wrapper">
      <div className="acc-wrapper-inner">
        <p className="score-exp">{t('score.card.labels.accuracy')}</p>
        <div className={`score-desc ${accuracyClass}`}>{formatAccuracyRatio(scoreData.accuracy)}</div>
      </div>
      {!isFeaturedMode && scoreData.judgements ? (
        <Judgements
          judgements={scoreData.judgements}
          showXPerfect={shouldShowXPerfectJudgements(scoreData)}
        />
      ) : null}
    </div>
  );

  const speedBlock = (
    <div className="speed-wrapper">
      <p className="score-exp">{t('score.card.labels.speed')}</p>
      <div className="score-desc">{clampFloat(scoreData.speed, 2)}×</div>
    </div>
  );

  const secondaryContent = (
    <>
      {!isFeaturedMode && scoreData.isWorldsFirst && (
        <WorldsFirstFlag variant="clear" tooltipIndex={`${scoreData.id}-clear`} className="wf-badge" />
      )}
      {!isFeaturedMode && scoreData.isWorldsFirstPP && (
        <WorldsFirstFlag variant="pp" tooltipIndex={`${scoreData.id}-pp`} className="wf-badge" />
      )}
      {scoreBlock}
      {accuracyBlock}
      {speedBlock}
      <PassFlags pass={scoreData} />
      {scoreData.keyboardSetup?.keyCount && 1 == 0 ? (// disable
        <p className="score-card__keyboard-bind">
          {t("score.card.labels.keyboardBind", { count: scoreData.keyboardSetup.keyCount })}
        </p>
      ) : null}
      {!isFeaturedMode && (showPassLike || formattedDate || showVideo) && (
        <div className="score-card__trailing">
          {formattedDate && (
            <time className="score-card__date" dateTime={scoreData.vidUploadTime}>
              {formattedDate}
            </time>
          )}

          {showPassLike && (
            <LikeButton
              className="score-card__like"
              liked={likeState.isLiked}
              count={likeState.likes}
              onRequest={handleLikeRequest}
              onChange={handleLikeChange}
              stopPropagation
              invisibleWhenEmpty={!user}
              disabled={scoreData?.id == null}
            />
          )}

          {(showVideo || !showPassLike) && (
            <div className="vid-logo-wrapper">
              {showVideo && (
                <a className="svg-fill" href={getPrimaryVideoLink(scoreData.videoLink)} target="_blank" rel="noreferrer" title={t('score.card.tooltips.watchVideo')}>
                  <VideoLinkIcon size="32px" url={scoreData.videoLink} />
                </a>
              )}
            </div>
          )}
          {canEditPass && (
            <button
              type="button"
              className="score-card__edit-button"
              onClick={handleEditClick}
              title={t('passDetail.buttons.edit', { ns: 'pages' })}
              aria-label={t('passDetail.buttons.edit', { ns: 'pages' })}
            >
              <EditIcon color="#ffffff" size="32px" />
            </button>
          )}
        </div>
      )}
    </>
  );

  if (isFeaturedMode) {
    return (
      <Link
        to={passDetailTo}
        className={cardClassName}
        style={cardStyle}
      >
        <div className="score-card__row score-card__row--primary">
          <div className="img-wrapper">{difficultyIcon}</div>
          {primaryInfo}
        </div>
        <div className="score-card__row score-card__row--secondary">
          {secondaryContent}
        </div>
        <span className="score-card__clear-id">#{scoreData.id}</span>
      </Link>
    );
  }

  return (
    <div
      className={cardClassName}
      style={cardStyle}
    >
      <div className="score-card__row score-card__row--primary">
        <div className="img-wrapper">{difficultyIcon}</div>
        {primaryInfo}
      </div>

      <div className="score-card__row score-card__row--secondary">
        {secondaryContent}
      </div>

      <span className="score-card__clear-id">#{scoreData.id}</span>

      {showEditPopup && isSuperAdmin && (
        <EditPassPopup
          pass={passForEditor(scoreData)}
          onClose={() => setShowEditPopup(false)}
          onUpdate={(updated) => {
            handlePassUpdate(updated);
            setShowEditPopup(false);
          }}
        />
      )}
      {showEditPopup && !isSuperAdmin && isOwnPass && (
        <OwnPassEditPopup
          pass={passForEditor(scoreData)}
          onClose={() => setShowEditPopup(false)}
          onUpdate={(updated) => {
            handlePassUpdate(updated);
            setShowEditPopup(false);
          }}
        />
      )}
    </div>
  );
};

export default ScoreCard;
