import { CompleteNav } from "../../components"
import "./passsubmission.css"
import image from "../../assets/placeholder/3.png"
import { useEffect, useState } from "react";
import { checkLevel, getYouTubeThumbnailUrl, getYouTubeVideoDetails } from "../../Repository/RemoteRepository";

const PassSubmissionPage = () => {
  const [levelId, setLevelId] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [leaderboardName, setLeaderBoardName] = useState('')
  const [speed, setSpeed] = useState('');
  const [feelingRating, setFeelingRating] = useState('');
  const [ePerfect, setEPerfect] = useState('');
  const [perfect, setPerfect] = useState('');
  const [lPerfect, setLPerfect] = useState('');
  const [tooEarly, setTooEarly] = useState('');
  const [early, setEarly] = useState('');
  const [late, setLate] = useState('');


  const [level,setLevel] = useState("")
  const [levelLoading, setLevelLoading] = useState(true)

  const [youtubeDetail, setYoutubeDetail] = useState({
    title: '-',
    channelName: '-',
    timestamp: '-'
  });

  useEffect(() => {
    if (!levelId) {
      setLevel("");
      setLevelLoading(false);
      return;
    }
    const cleanLevelId = levelId.startsWith('#') ? levelId.substring(1) : levelId;
    setLevelLoading(true);
    checkLevel(cleanLevelId).then((res) => {
      setLevel(res ? cleanLevelId : "");
      setLevelLoading(false); 
    }).catch(() => {
      setLevel("");
      setLevelLoading(false);
    });
  }, [levelId]);

  useEffect(()=>{
    getYouTubeVideoDetails(videoLink).then( res => res ? setYoutubeDetail(res) : setYoutubeDetail( {   
    title: '-',
    channelName: '-',
    timpestamp: '-'}))
  }, [videoLink])


  return (
    <div className="pass-submission-page">
        <CompleteNav/>
        <div className="background-level"></div>

        <form action="">
          <div className="img-wrapper">
            <img src={getYouTubeThumbnailUrl(videoLink) ? getYouTubeThumbnailUrl(videoLink) : image} alt="" />
          </div>

          <div className="info">
            <h1>Pass Submission</h1>

            <div className="id-input">
              <input type="text" placeholder="Level Id" value={levelId} onChange={(e) => setLevelId(e.target.value)} />

              <div className="information">
                <div className="verified">                
                {
                  !levelId ? 
                    <svg fill="#ffc107" width="30px" height="30px" viewBox="-1.7 0 20.4 20.4" xmlns="http://www.w3.org/2000/svg"><path d="M16.476 10.283A7.917 7.917 0 1 1 8.56 2.366a7.916 7.916 0 0 1 7.916 7.917zm-5.034-2.687a2.845 2.845 0 0 0-.223-1.13A2.877 2.877 0 0 0 9.692 4.92a2.747 2.747 0 0 0-1.116-.227 2.79 2.79 0 0 0-1.129.227 2.903 2.903 0 0 0-1.543 1.546 2.803 2.803 0 0 0-.227 1.128v.02a.792.792 0 0 0 1.583 0v-.02a1.23 1.23 0 0 1 .099-.503 1.32 1.32 0 0 1 .715-.717 1.223 1.223 0 0 1 .502-.098 1.18 1.18 0 0 1 .485.096 1.294 1.294 0 0 1 .418.283 1.307 1.307 0 0 1 .281.427 1.273 1.273 0 0 1 .099.513 1.706 1.706 0 0 1-.05.45 1.546 1.546 0 0 1-.132.335 2.11 2.11 0 0 1-.219.318c-.126.15-.25.293-.365.424-.135.142-.26.28-.374.412a4.113 4.113 0 0 0-.451.639 3.525 3.525 0 0 0-.342.842 3.904 3.904 0 0 0-.12.995v.035a.792.792 0 0 0 1.583 0v-.035a2.324 2.324 0 0 1 .068-.59 1.944 1.944 0 0 1 .187-.463 2.49 2.49 0 0 1 .276-.39c.098-.115.209-.237.329-.363l.018-.02c.129-.144.264-.301.403-.466a3.712 3.712 0 0 0 .384-.556 3.083 3.083 0 0 0 .28-.692 3.275 3.275 0 0 0 .108-.875zM9.58 14.895a.982.982 0 0 0-.294-.707 1.059 1.059 0 0 0-.32-.212l-.004-.001a.968.968 0 0 0-.382-.079 1.017 1.017 0 0 0-.397.08 1.053 1.053 0 0 0-.326.212 1.002 1.002 0 0 0-.215 1.098 1.028 1.028 0 0 0 .216.32 1.027 1.027 0 0 0 .722.295.968.968 0 0 0 .382-.078l.005-.002a1.01 1.01 0 0 0 .534-.534.98.98 0 0 0 .08-.392z"></path></svg>
                    :
                  levelLoading ? 
                    <svg fill="#ffc107" width="30px" height="30px" viewBox="-1.7 0 20.4 20.4" xmlns="http://www.w3.org/2000/svg"><path d="M16.476 10.283A7.917 7.917 0 1 1 8.56 2.366a7.916 7.916 0 0 1 7.916 7.917zm-5.034-2.687a2.845 2.845 0 0 0-.223-1.13A2.877 2.877 0 0 0 9.692 4.92a2.747 2.747 0 0 0-1.116-.227 2.79 2.79 0 0 0-1.129.227 2.903 2.903 0 0 0-1.543 1.546 2.803 2.803 0 0 0-.227 1.128v.02a.792.792 0 0 0 1.583 0v-.02a1.23 1.23 0 0 1 .099-.503 1.32 1.32 0 0 1 .715-.717 1.223 1.223 0 0 1 .502-.098 1.18 1.18 0 0 1 .485.096 1.294 1.294 0 0 1 .418.283 1.307 1.307 0 0 1 .281.427 1.273 1.273 0 0 1 .099.513 1.706 1.706 0 0 1-.05.45 1.546 1.546 0 0 1-.132.335 2.11 2.11 0 0 1-.219.318c-.126.15-.25.293-.365.424-.135.142-.26.28-.374.412a4.113 4.113 0 0 0-.451.639 3.525 3.525 0 0 0-.342.842 3.904 3.904 0 0 0-.12.995v.035a.792.792 0 0 0 1.583 0v-.035a2.324 2.324 0 0 1 .068-.59 1.944 1.944 0 0 1 .187-.463 2.49 2.49 0 0 1 .276-.39c.098-.115.209-.237.329-.363l.018-.02c.129-.144.264-.301.403-.466a3.712 3.712 0 0 0 .384-.556 3.083 3.083 0 0 0 .28-.692 3.275 3.275 0 0 0 .108-.875zM9.58 14.895a.982.982 0 0 0-.294-.707 1.059 1.059 0 0 0-.32-.212l-.004-.001a.968.968 0 0 0-.382-.079 1.017 1.017 0 0 0-.397.08 1.053 1.053 0 0 0-.326.212 1.002 1.002 0 0 0-.215 1.098 1.028 1.028 0 0 0 .216.32 1.027 1.027 0 0 0 .722.295.968.968 0 0 0 .382-.078l.005-.002a1.01 1.01 0 0 0 .534-.534.98.98 0 0 0 .08-.392z"></path></svg>
                    :
                  level ? 
                    <svg  width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z" fill="#28a745"></path> </g></svg> 
                    : 
                    <svg  width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM8.96963 8.96965C9.26252 8.67676 9.73739 8.67676 10.0303 8.96965L12 10.9393L13.9696 8.96967C14.2625 8.67678 14.7374 8.67678 15.0303 8.96967C15.3232 9.26256 15.3232 9.73744 15.0303 10.0303L13.0606 12L15.0303 13.9696C15.3232 14.2625 15.3232 14.7374 15.0303 15.0303C14.7374 15.3232 14.2625 15.3232 13.9696 15.0303L12 13.0607L10.0303 15.0303C9.73742 15.3232 9.26254 15.3232 8.96965 15.0303C8.67676 14.7374 8.67676 14.2625 8.96965 13.9697L10.9393 12L8.96963 10.0303C8.67673 9.73742 8.67673 9.26254 8.96963 8.96965Z" fill="#dc3545"></path> </g></svg>
                }

                <p style={{
                  color: !levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545"
                  }}>
                  {
                    !levelId ? "Waiting" :
                    levelLoading ? "Fetching" :
                    level ? "Verified" : "Unverified"
                  }
                </p>
              </div>
              <a 
                href={`/leveldetail?id=${level}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="button-goto"
                style={{
                  backgroundColor: !levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545",
                }}
              >
                Go to level
              </a>
              </div>
            </div>

            <div className="youtube-input">
              <input type="text" placeholder="Video Link" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} />

              <div className="information">
                <div className="yt-info">
                  <h4>YT Title</h4>
                  <p>{youtubeDetail.title}</p>
                </div>

                <div className="yt-info">
                  <h4>Channel</h4>
                  <p>{youtubeDetail.channelName}</p>
                </div>

                <div className="yt-info">
                  <h4>Timestamp</h4>
                  <p>{youtubeDetail.timestamp}</p>
                </div>
              </div>

              <input style={{maxWidth : "15rem"}} type="text" placeholder="Alt LeaderBoard Name" value={leaderboardName} onChange={(e) => setLeaderBoardName(e.target.value)} />

            </div>

            <div className="feel-speed">
              <input type="text" placeholder="Speed (ex : 1.2)" value={speed} onChange={(e) => setSpeed(e.target.value)} />
              <input type="text" placeholder="Feeling rating" value={feelingRating} onChange={(e) => setFeelingRating(e.target.value)} />
            </div>

            <div className="accuracy">
              <div className="top">
                <div className="each-accuracy">
                  <p>E Perfect</p>
                  <input type="text" placeholder="number" value={ePerfect} onChange={(e) => setEPerfect(e.target.value)} />
                </div>

                <div className="each-accuracy">
                  <p>Perfect</p>
                  <input type="text" placeholder="number" value={perfect} onChange={(e) => setPerfect(e.target.value)} />
                </div>

                <div className="each-accuracy">
                  <p>L Perfect</p>
                  <input type="text" placeholder="number" value={lPerfect} onChange={(e) => setLPerfect(e.target.value)} />
                </div>
              </div>

              <div className="bottom">
                <div className="each-accuracy">
                  <p>Too Early</p>
                  <input type="text" placeholder="number" value={tooEarly} onChange={(e) => setTooEarly(e.target.value)} />
                </div>

                <div className="each-accuracy">
                  <p>Early</p>
                  <input type="text" placeholder="number" value={early} onChange={(e) => setEarly(e.target.value)} />
                </div>

                <div className="each-accuracy">
                  <p>Late</p>
                  <input type="text" placeholder="number" value={late} onChange={(e) => setLate(e.target.value)} />
                </div>
              </div>

              <div className="acc-score">
                <p>Accuracy: -</p>
                <p>Score: -</p>
              </div>
            </div>

            <button className="submit">Submit</button>
          </div>
        </form>
    </div>
  )
}
export default PassSubmissionPage

