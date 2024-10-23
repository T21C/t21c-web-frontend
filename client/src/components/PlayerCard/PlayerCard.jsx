import { useNavigate } from "react-router-dom";
//import { getPlayerImage } from "../../Repository/RemoteRepository";
import "./playercard.css"
import { useTranslation } from "react-i18next";


// eslint-disable-next-line react/prop-types
const PlayerCard = ({player, rankedScore, generalScore, avgXacc, totalPasses, universalPasses, WFPasses, topDiff}) => {
  console.log("got data",player, rankedScore, generalScore, avgXacc, totalPasses, universalPasses, WFPasses, topDiff);
  
  const {t} = useTranslation()  
  const navigate = useNavigate()
    const redirect = () => {
      navigate(`#`);
    };

    const onAnchorClick = (e) => {
      e.stopPropagation();
    };

  return (
    <div className='player-card' onClick={() => redirect()}>
      {/* <div className="id player-id">#{id}</div> 
      <div className="img-wrapper">
          <img src={getPlayerImage(newDiff, pdnDiff, pguDiff, legacy)} alt="" />
      </div>
        */}
      <div className="name-wrapper">
          <div className="group">
              <p className="player-exp">{t("playerCardComponent.player")}</p>
          </div>
          <p className='player-desc'>{player}</p>
      </div>
      <div className="score-wrapper">
          <p className="player-exp">{t("playerCardComponent.rankedScore")}</p>
          <div className="player-desc">{rankedScore.toFixed(2)}</div>
      </div>
      <div className="score-wrapper">
          <p className="player-exp">{t("playerCardComponent.generalScore")}</p>
          <div className="player-desc">{generalScore.toFixed(2)}</div>
      </div>

        <div className="acc-wrapper">
            <p className="player-exp">{t("playerCardComponent.avgXacc")}</p>
            <div className="player-desc">{(avgXacc*100).toFixed(2)}%</div>
        </div>
    </div>
  );
};

export default PlayerCard;


