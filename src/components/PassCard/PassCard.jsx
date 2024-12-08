import { useNavigate } from "react-router-dom";
import "./passcard.css"
import { useTranslation } from "react-i18next";
import { getLevelImage } from "../../Repository/RemoteRepository";

const PassCard = ({ pass }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const redirect = () => {
    navigate(`/passdetail?id=${pass.id}`);
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
          <div className="pass-desc">{formattedAccuracy}</div>
        </div>

        <div className="score-section">
          <p className="pass-exp">Score</p>
          <div className="pass-desc">{Math.round(pass.scoreV2)}</div>
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
        <img className="lv-icon" src={getLevelImage(pass.level.pguDiff)} alt="" />
      </div>

      <div className="video-wrapper">
        {pass.vidLink && (
          <a href={pass.vidLink.trim()} onClick={onAnchorClick} target="_blank" rel="noreferrer">
            <svg className="svg-fill" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 12L10.5 14V10L14 12Z" fill="#ffffff"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" fill="#ffffff"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};

export default PassCard; 