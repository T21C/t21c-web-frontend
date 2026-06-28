// tuf-search: #ScoreCard #scoreCard #cards
import { Link } from "react-router-dom";
import "./scorecard.css"
import "@/index.css"
import { useTranslation } from "react-i18next";
import { clampFloat, formatScore, formatPassDate, formatCreatorDisplay, normalizeKeyCount } from "@/utils/Utility"
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

const PassFlags = ({ pass, t }) => (
  <div className="flags-wrapper">
    {normalizeKeyCount(pass.keyCount) != null ? (
      <div className="flag">{t('cards.pass.flags.keyCount', { count: normalizeKeyCount(pass.keyCount) })}</div>
    ) : (
      <>
        {pass.is12K && <div className="flag">{t('cards.pass.flags.twelveKey')}</div>}
        {pass.is16K && <div className="flag">{t('cards.pass.flags.sixteenKey')}</div>}
      </>
    )}
    {pass.isNoHoldTap && <div className="flag">{t('cards.pass.flags.noHoldTap')}</div>}
    {pass.isAdofaiV2 && <PassAdofaiV2Flag className="flag flag--adofai-v2" />}
  </div>
);

// eslint-disable-next-line react/prop-types
const ScoreCard = ({ scoreData, topScores = [], potentialTopScores = [], mode = 'profile' }) => {
  const {t} = useTranslation('components');
  const isPassCardMode = mode === 'passcard';
  const isHiddenLevel = scoreData.level?.isHidden || false;
  const isHiddenPass = scoreData.isHidden || false;
  const { difficultyDict } = useDifficultyContext();
  const formattedDate = formatPassDate(scoreData.vidUploadTime, i18next?.language);

  const cardStyle = {
    pointerEvents: isHiddenLevel ? 'none' : 'auto',
    ...(isPassCardMode && scoreData.isDeleted ? { backgroundColor: '#f0000099' } : {}),
  };

  return (
    <div
      className={`score-card ${isPassCardMode ? 'score-card--passcard' : ''} ${isHiddenPass ? 'hidden-pass' : ''}`}
      style={cardStyle}
    >
      <div className="img-wrapper">
        {!isHiddenLevel && (
          <img src={difficultyDict[scoreData.level.diffId]?.icon} referrerPolicy="no-referrer" alt="" />
        )}
        {isHiddenLevel && (
          <div className="hidden-level-icon">🔒</div>
        )}
      </div>
      {isPassCardMode ? (
        <div className="score-card__info-column">
          {scoreData.player?.id && (
            <Link className="score-card__player-row" to={`/profile/${scoreData.player.id}`}>
              <UserAvatar {...userAvatarUrls(scoreData.player)} className="score-card__player-avatar" />
              <MarqueeText className="score-desc-player" as="span">
                {scoreData.player.name}
              </MarqueeText>
            </Link>
          )}
          <Link className="name-wrapper" to={`/passes/${scoreData.id}`}>
            <MarqueeText className="score-desc score-desc-song" as="p">
              {scoreData.level.song}
            </MarqueeText>
            <MarqueeText className="score-exp score-exp-artist" as="p">
              {scoreData.level.artist ?? 'Hidden level'}
            </MarqueeText>
          </Link>
        </div>
      ) : (
      <Link className="name-wrapper" to={`/passes/${scoreData.id}`}>
        <p className="score-desc-creator">{formatCreatorDisplay(scoreData.level)}</p>
        <MarqueeText className="score-desc score-desc-song" as="p">
          {scoreData.level.song}
        </MarqueeText>
        <MarqueeText className="score-exp score-exp-artist" as="p">
          {scoreData.level.artist ?? 'Hidden level'}
        </MarqueeText>
      </Link>
      )}
      {scoreData.isWorldsFirst && (
        <WorldsFirstFlag variant="clear" tooltipIndex={`${scoreData.id}-clear`} className="wf-badge" />
      )}
      {scoreData.isWorldsFirstPP && (
        <WorldsFirstFlag variant="pp" tooltipIndex={`${scoreData.id}-pp`} className="wf-badge" />
      )}
      <div className="score-wrapper">
          <p className="score-exp">{t('score.card.labels.score')}</p>
          <p className="score-desc">{formatScore(scoreData.scoreV2)}</p>
          {
          topScores.find(score => score.id === scoreData.id) ?
          <p className="score-impact">+{formatNumber(
            topScores.find(score => score.id === scoreData.id).impact)
          }</p> :
          potentialTopScores.find(score => score.id === scoreData.id) &&
           <p className="score-impact potential"
           data-tooltip-id="potential-score-tooltip">+{formatNumber(
            potentialTopScores.find(score => score.id === scoreData.id).impact)
          }</p>
          }
          <Tooltip id="potential-score-tooltip" place="bottom" style={{maxWidth: '400px'}}>
            {t('score.card.tooltips.potentialScore')}
          </Tooltip>
      </div>
      <div className="acc-wrapper">
        <div className="acc-wrapper-inner">
          <p className="score-exp">{t('score.card.labels.accuracy')}</p>
          <div className={`score-desc ${scoreData.accuracy == 1 ? 'pure-perfect' : ''}`}>{formatAccuracyRatio(scoreData.accuracy)}</div>
          </div>
          {scoreData.judgements && <Judgements judgements={scoreData.judgements} />}
      </div>

      <div className="speed-wrapper">
          <p className="score-exp">{t('score.card.labels.speed')}</p>
          <div className="score-desc">{clampFloat(scoreData.speed, 2)}×</div>
      </div>

      {isPassCardMode && <PassFlags pass={scoreData} t={t} />}

      {(formattedDate || (scoreData.videoLink && !isHiddenLevel)) && (
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

      <span className="score-card__clear-id">#{scoreData.id}</span>
    </div>
  );
};

export default ScoreCard;
