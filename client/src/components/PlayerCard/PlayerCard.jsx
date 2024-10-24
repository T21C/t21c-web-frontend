import { useNavigate } from "react-router-dom";
import { getVideoDetails } from "../../Repository/RemoteRepository";
import "./playercard.css"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";


// eslint-disable-next-line react/prop-types
const PlayerCard = ({key, player, rankedScore, generalScore, twvKScore, wfScore, avgXacc, totalPasses, universalPasses, WFPasses, topDiff, latestClears}) => {
  console.log("got data", key, player, rankedScore, generalScore, twvKScore, wfScore, avgXacc, totalPasses, universalPasses, WFPasses, topDiff, latestClears);
  
  const [pfpSrc, setPfpSrc] = useState('');
  const {t} = useTranslation()  
  const navigate = useNavigate()
    const redirect = () => {
      navigate(`#`);
    };

    const onAnchorClick = (e) => {
      e.stopPropagation();
    };

    useEffect(() => {
      const fetchVideoDetails = async () => {
    
        const originalConsoleError = console.error;
        console.error = () => {};

        for (const link of latestClears) {
          if (link.vidLink) {
            try {
              const videoDetails = await getVideoDetails(link.vidLink);
    
              // Check if the videoDetails contain the needed data
              if (videoDetails && videoDetails.pfp) {
                setPfpSrc(videoDetails.pfp); // Set data and stop the loop
                break;
              }
            } catch (error) {
            }
          }
        }
        console.error = originalConsoleError;
      };
      
      fetchVideoDetails();
    }, [latestClears]);


  return (
    <div className='player-card' onClick={() => redirect()}>
      <div className="img-wrapper">
        {pfpSrc? (
          <img src={pfpSrc} referrerPolicy="no-referrer" alt="" />)
          :(<svg fill="#ffffff" viewBox="-0.32 -0.32 32.64 32.64" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="0.32"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16.001-7.163 16.001-16s-7.163-16-16.001-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14.001 6.28 14.001 14-6.281 14.032-14.001 14.032zM14.53 25.015h2.516v-2.539h-2.516zM15.97 6.985c-1.465 0-2.672 0.395-3.62 1.184s-1.409 2.37-1.386 3.68l0.037 0.073h2.295c0-0.781 0.261-1.904 0.781-2.308s1.152-0.604 1.893-0.604c0.854 0 1.511 0.232 1.971 0.696s0.689 1.127 0.689 1.989c0 0.725-0.17 1.343-0.512 1.855-0.343 0.512-0.916 1.245-1.721 2.198-0.831 0.749-1.344 1.351-1.538 1.806s-0.297 1.274-0.305 2.454h2.405c0-0.74 0.047-1.285 0.14-1.636s0.36-0.744 0.799-1.184c0.945-0.911 1.703-1.802 2.277-2.674 0.573-0.87 0.86-1.831 0.86-2.881 0-1.465-0.443-2.607-1.331-3.424s-2.134-1.226-3.736-1.226z"></path> </g></svg>)
      
        }
      </div>
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


