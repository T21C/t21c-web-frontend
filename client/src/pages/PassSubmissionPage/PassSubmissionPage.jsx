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
  const [canSwitch, setCanSwitch] = useState(false);
  
  const [level, setLevel] = useState(null);
  const [levelLoading, setLevelLoading] = useState(true);

  const [youtubeDetail, setYoutubeDetail] = useState({
    title: '-',
    channelName: '-',
    timestamp: '-',
  });


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
        console.log();
        
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
        console.log(passData);
        setScore(getScoreV2(passData, chartData).toFixed(2));
    } else {
        setScore("Insufficient data to calculate score.");
    }
};

  const scriptUrl = "https://script.google.com/macros/s/AKfycbzQt66nhy5wyOB8MxG-LFpkvrnf4BLCTXQBAV41hNM7oNIqUWWyjXAWhQuas093L61ZXg/exec"
  const googleForm = new GoogleFormSubmitter(scriptUrl)
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
    console.log(googleForm)
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
                      <svg
                        fill={color}
                        width="30px"
                        height="30px"
                        viewBox="-1.7 0 20.4 20.4"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M16.476 10.283A7.917 7.917 0 1 1 8.56 2.366a7.916 7.916 0 0 1 7.916 7.917zm-5.034-2.687a2.845 2.845 0 0 0-.223-1.13A2.877 2.877 0 0 0 9.692 4.92a2.747 2.747 0 0 0-1.116-.227 2.79 2.79 0 0 0-1.129.227 2.903 2.903 0 0 0-1.543 1.546 2.803 2.803 0 0 0-.227 1.128v.02a.792.792 0 0 0 1.583 0v-.02a1.23 1.23 0 0 1 .099-.503 1.32 1.32 0 0 1 .715-.717 1.223 1.223 0 0 1 .502-.098 1.18 1.18 0 0 1 .485.096 1.294 1.294 0 0 1 .418.283 1.307 1.307 0 0 1 .281.427 1.273 1.273 0 0 1 .099.513 1.706 1.706 0 0 1-.05.45 1.546 1.546 0 0 1-.132.335 2.11 2.11 0 0 1-.219.318c-.126.15-.25.293-.365.424a4.113 4.113 0 0 0-.451.639 3.525 3.525 0 0 0-.342.842 3.904 3.904 0 0 0-.12.995v.035a.792.792 0 0 0 1.583 0v-.035a2.324 2.324 0 0 1 .068-.59 1.944 1.944 0 0 1 .187-.463 2.49 2.49 0 0 1 .276-.39c.098-.115.209-.237.c-"
                      />
                      
                    </svg>
                    <p style={{ color }}>
                      {!form.levelId
                        ? 'Waiting'
                        : levelLoading
                        ? 'Fetching'
                        : level
                        ? 'Verified'
                        : 'Unverified'}
                    </p>
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
                Go to level
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

            <input
              type="text"
              placeholder="Feeling rating"
              name="feelingRating"
              value={form.feelingRating}
              onChange={handleInputChange}
            />
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
