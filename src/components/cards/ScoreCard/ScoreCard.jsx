// tuf-search: #ScoreCard #scoreCard #cards
import { Link } from "react-router-dom";
import "./scorecard.css"
import "@/index.css"
import { useTranslation } from "react-i18next";
import { clampFloat, formatScore, formatPassDate, formatCreatorDisplay, getPassKeycountBadgeType, getPassKeycountBadgeValue } from "@/utils/Utility"
import { formatNumber } from "@/utils";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { Tooltip } from "react-tooltip";
import WorldsFirstFlag from "../WorldsFirstFlag/WorldsFirstFlag";
import PassAdofaiV2Flag from "../PassAdofaiV2Flag";
import { VideoLinkIcon } from "@/components/common/icons";
import { getPrimaryVideoLink } from "@/utils/videoLink";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import MarqueeText from "@/components/common/display/MarqueeText/MarqueeText";
import i18next from "i18next";

const Judgements = ({judgements}) => {
  return (
    <div className="judgements-container">
      <div className="judgements-grid">
        <span className="e-perfect">{judgements.ePerfect}</span>
        <span className="perfect">{judgements.perfect}</span>
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

const keyCountFlagLabel = (pass, t) => {
  const type = getPassKeycountBadgeType(pass);
  if (type === 'keyCount') {
    return t('cards.pass.flags.keyCount', { count: getPassKeycountBadgeValue(pass) });
  }
  if (type === '16k') {
    return t('cards.pass.flags.sixteenKey');
  }
  if (type === '12k') {
    return t('cards.pass.flags.twelveKey');
  }
  return null;
};

const PassFlags = ({ pass, t }) => {
  const keyCountLabel = keyCountFlagLabel(pass, t);
  if (!keyCountLabel && !pass.isNoHoldTap && !pass.isAdofaiV2) {
    return null;
  }

  return (
    <div className="flags-wrapper">
      {keyCountLabel ? <div className="flag">{keyCountLabel}</div> : null}
      {pass.isNoHoldTap && <div className="flag">{t('cards.pass.flags.noHoldTap')}</div>}
      {pass.isAdofaiV2 && <PassAdofaiV2Flag className="flag flag--adofai-v2" />}
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const ScoreCard = ({ scoreData, topScores = [], potentialTopScores = [], mode = 'profile' }) => {
  const {t} = useTranslation('components');
  const isFeaturedMode = mode === 'featured';
  const isPassCardMode = mode === 'passcard' || isFeaturedMode;
  const isHiddenLevel = scoreData.level?.isHidden || false;
  const isHiddenPass = scoreData.isHidden || false;
  const { difficultyDict } = useDifficultyContext();
  const formattedDate = formatPassDate(scoreData.vidUploadTime, i18next?.language);
  const passDetailTo = `/passes/${scoreData.id}`;

  const cardStyle = {
    pointerEvents: isHiddenLevel ? 'none' : 'auto',
    ...(isPassCardMode && !isFeaturedMode && scoreData.isDeleted ? { backgroundColor: '#f0000099' } : {}),
  };

  const cardClassName = [
    'score-card',
    isPassCardMode ? 'score-card--passcard' : '',
    isFeaturedMode ? 'score-card--featured' : '',
    isHiddenPass ? 'hidden-pass' : '',
  ].filter(Boolean).join(' ');

  const difficultyIcon = !isHiddenLevel ? (
    <img src={difficultyDict[scoreData.level.diffId]?.icon} referrerPolicy="no-referrer" alt="" />
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
          data-tooltip-id="potential-score-tooltip">+{formatNumber(potentialScoreEntry.impact)}</p>
      ) : null}
      {potentialScoreEntry && (
        <Tooltip id="potential-score-tooltip" place="bottom" style={{maxWidth: '400px'}}>
          {t('score.card.tooltips.potentialScore')}
        </Tooltip>
      )}
    </div>
  );

  const accuracyBlock = (
    <div className="acc-wrapper">
      <div className="acc-wrapper-inner">
        <p className="score-exp">{t('score.card.labels.accuracy')}</p>
        <div className={`score-desc ${scoreData.accuracy == 1 ? 'pure-perfect' : ''}`}>{formatAccuracyRatio(scoreData.accuracy)}</div>
      </div>
      {!isFeaturedMode && scoreData.judgements ? <Judgements judgements={scoreData.judgements} /> : null}
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
      <PassFlags pass={scoreData} t={t} />
      {!isFeaturedMode && (formattedDate || (scoreData.videoLink && !isHiddenLevel)) && (
        <div className="score-card__trailing">
          {formattedDate && (
            <time className="score-card__date" dateTime={scoreData.vidUploadTime}>
              {formattedDate}
            </time>
          )}

          <div className="vid-logo-wrapper">
            {scoreData.videoLink && !isHiddenLevel && (
              <a className="svg-fill" href={getPrimaryVideoLink(scoreData.videoLink)} target="_blank" rel="noreferrer" title={t('score.card.tooltips.watchVideo')}>
                <VideoLinkIcon size="32px" url={scoreData.videoLink} />
              </a>
            )}
          </div>
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
    </div>
  );
};

export default ScoreCard;
