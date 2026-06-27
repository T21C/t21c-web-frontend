// tuf-search: #PassCard #passCard #cards
import { Link } from "react-router-dom";
import "./passcard.css"
import { useTranslation } from "react-i18next";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import PassAdofaiV2Flag from "../PassAdofaiV2Flag";
import WorldsFirstFlag from "../WorldsFirstFlag/WorldsFirstFlag";
import { normalizeKeyCount, formatPassDate } from "@/utils/Utility";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { VideoLinkIcon } from "@/components/common/icons";
import MarqueeText from "@/components/common/display/MarqueeText/MarqueeText";
import i18next from "i18next";

const PassCard = ({ pass }) => {
  const { t } = useTranslation('components');
  
  const { difficultyDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[pass.level.diffId];
  const passTo = `/passes/${pass.id}`;

  const onAnchorClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(pass.videoLink.trim(), "_blank", "noopener,noreferrer");
  };

  const formattedAccuracy = formatAccuracyRatio(pass.accuracy);
  const formattedDate = formatPassDate(pass.vidUploadTime, i18next?.language);

  return (
    <div className='pass-card' style={{ backgroundColor: pass.isDeleted ? "#f0000099" : "none" }}>
      <Link className="pass-card__link-wrap" to={passTo} aria-label={pass.level?.song || `Pass ${pass.id}`}>
              <img 
          src={difficultyInfo?.icon} 
          alt={difficultyInfo?.name || 'Difficulty icon'} 
          className="difficulty-icon"
        />
      <div className="pass-info-wrapper">
        <div className="group">
          <MarqueeText className="pass-exp" as="p" title={`#${pass.id} - ${pass.player.name}`}>
            #{pass.id} - {pass.player.name}
          </MarqueeText>
          <UserAvatar {...userAvatarUrls(pass.player)} className="user-avatar" />
          {pass.isWorldsFirst && (
            <WorldsFirstFlag variant="clear" tooltipIndex={`${pass.id}-clear`} className="wf-badge" />
          )}
          {pass.isWorldsFirstPP && (
            <WorldsFirstFlag variant="pp" tooltipIndex={`${pass.id}-pp`} className="wf-badge" />
          )}
        </div>
        <MarqueeText className="pass-desc" as="p" title={pass.level.song}>
          {pass.level.song}
        </MarqueeText>
      </div>

      <div className="stats-wrapper">
        <div className="accuracy-section">
          <p className="pass-exp">{t('cards.pass.stats.xAccuracy')}</p>
          <div className="pass-desc" style={{color: pass.accuracy === 1 ? "gold" : ""}}>{formattedAccuracy}</div>
        </div>

        <div className="score-section">
          <p className="pass-exp">{t('cards.pass.stats.score')}</p>
          <div className="pass-desc">{pass.scoreV2.toFixed(2)}</div>
        </div>

        {pass.speed && (
          <div className="speed-section">
            <p className="pass-exp">{t('cards.pass.stats.speed')}</p>
            <div className="pass-desc">{pass.speed}x</div>
          </div>
        )}
      </div>

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
      </Link>

      {formattedDate && (
        <time className="pass-card__date" dateTime={pass.vidUploadTime}>
          {formattedDate}
        </time>
      )}

      <div className="pass-card__video">
        {pass.videoLink && (
          <a 
            href={pass.videoLink.trim()} 
            onClick={onAnchorClick} 
            target="_blank" 
            rel="noreferrer"
            title={t('cards.pass.links.video')}
          >
            <VideoLinkIcon url={pass.videoLink.trim()} />
          </a>
        )}
      </div>
    </div>
  );
};

export default PassCard; 