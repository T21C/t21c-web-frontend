import { useNavigate } from "react-router-dom";
import "./passcard.css"
import { useTranslation } from "react-i18next";

const PassCard = ({ pass }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const redirect = () => {
    navigate(`/passes/${pass.id}`);
  };

  const onAnchorClick = (e) => {
    e.stopPropagation();
  };

  // Format accuracy to percentage with 2 decimal places
  const formattedAccuracy = (pass.accuracy * 100).toFixed(2) + '%';

  return (
    <div className='pass-card' onClick={() => redirect()} style={{ backgroundColor: pass.isDeleted ? "#f0000099" : "none" }}>
      <div className="pass-info-wrapper">
        <div className="group">
          <p className="pass-exp">#{pass.id} - {pass.player.name}</p>
          {pass.isWorldsFirst && <span className="wf-badge">WF</span>}
        </div>
        <p className='pass-desc'>{pass.level.song}</p>
      </div>

      <div className="stats-wrapper">
        <div className="accuracy-section">
          <p className="pass-exp">XAccuracy</p>
          <div className="pass-desc" style={{color: pass.accuracy == 1 ? "gold" : ""}}>{formattedAccuracy}</div>
        </div>

        <div className="score-section">
          <p className="pass-exp">Score</p>
          <div className="pass-desc">{pass.scoreV2.toFixed(2)}</div>
        </div>

        {pass.speed && (
          <div className="speed-section">
            <p className="pass-exp">Speed</p>
            <div className="pass-desc">{pass.speed}x</div>
          </div>
        )}
      </div>

      <div className="flags-wrapper">
        {pass.is12K && <div className="flag">12K</div>}
        {pass.isNoHoldTap && <div className="flag">NHT</div>}
        <img className="lv-icon" src={pass.level.difficulty.icon} alt="" />
      </div>

      <div className="video-wrapper">
        {pass.vidLink && (
          <a href={pass.vidLink.trim()} onClick={onAnchorClick} target="_blank" rel="noreferrer">
                    <svg viewBox="0 -3 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>youtube [#168]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -7442.000000)" fill="#ffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289" id="youtube-[#168]"> </path> </g> </g> </g> </g></svg>

          </a>
        )}
      </div>
    </div>
  );
};

export default PassCard; 