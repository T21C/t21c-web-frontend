import { CompleteNav } from "../../components";
import "./passsubmission.css";
import image from "../../assets/placeholder/3.png";
import { GoogleFormSubmitter } from "../../components/FormManager/googleForm";
import { useEffect, useState } from "react";
import { checkLevel, getYouTubeThumbnailUrl, getYouTubeVideoDetails } from "../../Repository/RemoteRepository";
import calcAcc from "../../components/Misc/CalcAcc";
import { getScoreV2 } from "../../components/Misc/CalcScore";
import { parseJudgements } from "../../components/Misc/ParseJudgements";
import { useAuth } from "../../context/AuthContext";
import {FetchIcon} from "../../components/FetchIcon/FetchIcon"

const PassSubmissionPage = () => {
  const initialFormState = {
    levelId: '',
    videoLink: '',
    leaderboardName: '',
    speed: '',
    feelingRating: '',
    ePerfect: '',
    perfect: '',
    lPerfect: '',
    tooEarly: '',
    early: '',
    late: '',
  };

  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [accuracy, setAccuracy] = useState("");
  const [score, setScore] = useState("");
  const [judgements, setJudgements] = useState([]);
  const [isInvalidFeelingRating, setIsInvalidFeelingRating] = useState(false); // Track validation

  const [level, setLevel] = useState(null);
  const [levelLoading, setLevelLoading] = useState(true);

  const [youtubeDetail, setYoutubeDetail] = useState({
    title: '-',
    channelName: '-',
    timestamp: '-',
  });

  const validateFeelingRating = (value) => {
    const regex = /^$|^[PGUpgu][1-9]$|^[PGUpgu]1[0-9]$|^[PGUpgu]20$/; // Validate P,G,U followed by 1-20
    return regex.test(value);
  };

  const truncateString = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  };

  useEffect(() => {
    if (level) {
      
      updateAccuracy(form);
      updateScore(form);
    }
  }, [level]);

  useEffect(() => {
    const { levelId } = form;
    setLevelLoading(true);
    setLevel(null);

      
    if (!levelId) {
      setLevel(null);
      setLevelLoading(false);
      return;
    }

    const cleanLevelId = levelId.startsWith('#') ? levelId.substring(1) : levelId;

    checkLevel(cleanLevelId)
      .then((data) => {
        
        setLevel(data ? data : null);
        setLevelLoading(false);
        console.log(data);
        
      })
      .catch(() => {
        setLevel(null);
        setLevelLoading(false);
      });
  }, [form.levelId]);

  useEffect(() => {
    const { videoLink } = form;

    getYouTubeVideoDetails(videoLink).then((res) => {
      setYoutubeDetail(
        res
          ? res
          : {
              title: '-',
              channelName: '-',
              timestamp: '-',
            }
      );
    });
  }, [form.videoLink]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;


    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    const updatedForm = {
      ...form,
      [name]: value,
    };

    if (name === 'feelingRating') {
      const isValid = validateFeelingRating(value);
      setIsInvalidFeelingRating(!isValid); // Update validation state

      if (!isValid) {
        e.target.style.backgroundColor = 'yellow';
      } else {
        e.target.style.backgroundColor = ''; // Reset to default
      }
    }


    updateAccuracy(updatedForm);

    updateScore(updatedForm);
    
    
  };

  const updateAccuracy = (updatedForm) => {
    
    const newJudgements = parseJudgements(updatedForm);
    setJudgements(newJudgements)

      // Calculate accuracy if all elements are valid integers
    if (newJudgements.every(Number.isInteger)) {
        setAccuracy((calcAcc(newJudgements)*100).toString().slice(0,7)+"%");
    } else {
        setAccuracy(null); // Reset if invalid input
    }
    };

  const updateScore = (updatedForm) => {

    const newJudgements = parseJudgements(updatedForm);

    const passData = {
        speed: updatedForm.speed,
        judgements: newJudgements, // Use new judgements here
    };

    const chartData = level;

    // Check if levelId is present and all judgements are valid
    if (!form.levelId) {
        setScore("Level ID is required.");
    } else if (!newJudgements.every(Number.isInteger)) {
        setScore("Not all judgements are filled.");
    } else if (!Object.values(passData).every(value => value !== null)) {
        setScore("Not enough pass info.");
    } else if (passData && chartData) {
        setScore(getScoreV2(passData, chartData).toFixed(2));
    } else {
        setScore("Insufficient data to calculate score.");
    }
};

 const googleForm = new GoogleFormSubmitter()
  const handleSubmit = (e) => {
    if(!user){
      console.log("no user");

      return 
    }
    e.preventDefault();
    googleForm.setDetail('id', form.levelId)
    googleForm.setDetail('*/Speed Trial', form.speed)
    googleForm.setDetail('Passer', form.leaderboardName)
    googleForm.setDetail('Feeling Difficulty', form.feelingRating)
    googleForm.setDetail('Title', youtubeDetail.title)
    googleForm.setDetail('*/Raw Video ID', form.videoLink)
    googleForm.setDetail('*/Raw Time (GMT)', youtubeDetail.timestamp)
    googleForm.setDetail('Early!!', form.tooEarly)
    googleForm.setDetail('Early!', form.early)
    googleForm.setDetail('EPerfect!', form.ePerfect)
    googleForm.setDetail('Perfect!', form.perfect)
    googleForm.setDetail('LPerfect!', form.lPerfect)
    googleForm.setDetail('Late!', form.late)
    googleForm.setDetail('Late!!', "0")
    googleForm.submit(user.access_token)
  }

  return (
    <div className="pass-submission-page">
      <CompleteNav />
      <div className="background-level"></div>

      <form>
        <div className="img-wrapper">
          <img src={getYouTubeThumbnailUrl(form.videoLink) || image} alt="" />
        </div>

        <div className="info">
          <h1>Pass Submission</h1>

          <div className="id-input">
            <input
              type="text"
              placeholder="Level Id"
              name="levelId"
              value={form.levelId}
              onChange={handleInputChange}
            />

            <div className="information">
                {level ? 
                (<div className="chart-info"><h2 className="chart-info-sub">{truncateString(level["song"], 30)}</h2>
                 <div className="chart-info-sub"><span>{truncateString(level["artist"], 15)}</span><span>{truncateString(level["creator"], 20)}</span></div></div>)
                 : 
                (<div className="chart-info"><h2 className="chart-info-sub" style={{color: "#aaa"}}>Song name</h2>
                 <div className="chart-info-sub"><span style={{color: "#aaa"}}>Artist</span><span style={{color: "#aaa"}}>Charter</span></div></div>)
                 } 

              <div className="verified">
                {(() => {
                  const color = !form.levelId
                    ? '#ffc107'
                    : levelLoading
                    ? '#ffc107'
                    : level
                    ? '#28a745'
                    : '#dc3545';
                  return (
                    <>
                    <FetchIcon form={form} levelLoading={levelLoading} level={level} color={color} />
                  </>
                  );
                })()}
              </div>
              <a
                href={level ? (level["id"] == form.levelId ? `/leveldetail?id=${level["id"]}`: "#" ): "#"}
                onClick={e => {
                  if (!level){
                    e.preventDefault();
                  }
                  else if (level) {
                    if(level["id"] != form.levelId){
                      e.preventDefault();
                    }
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="button-goto"
                style={{
                  backgroundColor: !form.levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545",
                  cursor: !form.levelId ? "not-allowed": levelLoading ? "wait": level ? "pointer" : "not-allowed",
                }}
              >
                
        {!form.levelId
          ? 'Input Level ID'
          : levelLoading
          ? 'Fetching'
          : level
          ? 'Go to level'
          : 'Level not found'}
              </a>
            </div>
          </div>

          <div className="youtube-input">
            <input
              type="text"
              placeholder="Video Link"
              name="videoLink"
              value={form.videoLink}
              onChange={handleInputChange}
            />

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

            <input
              style={{ maxWidth: '15rem' }}
              type="text"
              placeholder="Alt Leaderboard Name"
              name="leaderboardName"
              value={form.leaderboardName}
              onChange={handleInputChange}
            />
          </div>

          <div className="feel-speed">
            <input
              type="text"
              placeholder="Speed (ex: 1.2)"
              name="speed"
              value={form.speed}
              onChange={handleInputChange}
            />

      <div style={{ position: 'relative', display: 'inline-block', marginRight: '2rem', width:"80%"}}>
        <input
          type="text"
          placeholder="Feeling rating (ex. G12~G13)"
          name="feelingRating"
          value={form.feelingRating}
          onChange={handleInputChange}
        />
        {isInvalidFeelingRating && (
          <span
            style={{
              color: 'red',
              marginLeft: '10px',
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            ?
          </span>
        )}
      </div>
          </div>

          <div className="accuracy">
            <div className="top">
              <div className="each-accuracy">
                <p>E Perfect</p>
                <input
                  type="text"
                  placeholder="number"
                  name="ePerfect"
                  value={form.ePerfect}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>Perfect</p>
                <input
                  type="text"
                  placeholder="number"
                  name="perfect"
                  value={form.perfect}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>L Perfect</p>
                <input type="text"
                  name="lPerfect"
                  placeholder="number"
                  value={form.lPerfect}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="bottom">
              <div className="each-accuracy">
                <p>Too Early</p>
                <input
                  type="text"
                  placeholder="number"
                  name="tooEarly"
                  value={form.tooEarly}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>Early</p>
                <input
                  type="text"
                  placeholder="number"
                  name="early"
                  value={form.early}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>Late</p>
                <input
                  type="text"
                  placeholder="number"
                  name="late"
                  value={form.late}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="acc-score">
              <p>Accuracy: {accuracy !== null ? accuracy : 'N/A'}</p>
              <p>Score: {score}</p>
            </div>
          </div>

          <button className="submit" onClick={handleSubmit}>Submit</button>
        </div>
      </form>
    </div>
  );
};

export default PassSubmissionPage;
