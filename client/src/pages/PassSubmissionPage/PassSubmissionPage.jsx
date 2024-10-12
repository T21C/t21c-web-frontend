import { CompleteNav } from "../../components";
import "./passsubmission.css";
import image from "../../assets/placeholder/3.png";
import { FormManager } from "../../components/FormManager/FormManager";
import { useEffect, useState } from "react";
import { checkLevel, getYouTubeThumbnailUrl, getYouTubeVideoDetails } from "../../Repository/RemoteRepository";
import calcAcc from "../../components/Misc/CalcAcc";
import { getScoreV2 } from "../../components/Misc/CalcScore";
import { parseJudgements } from "../../components/Misc/ParseJudgements";
import { useAuth } from "../../context/AuthContext";
import {FetchIcon} from "../../components/FetchIcon/FetchIcon"
import { validateFeelingRating } from "../../components/Misc/Utility";

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
    isNoHold: false,
  };

  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [accuracy, setAccuracy] = useState(null);
  const [score, setScore] = useState("Level ID is required");
  const [judgements, setJudgements] = useState([]);
  const [isInvalidFeelingRating, setIsInvalidFeelingRating] = useState(false); // Track validation
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});

  const [showMessage, setShowMessage] = useState(false)
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [submission, setSubmission] = useState(false);
  const [level, setLevel] = useState(null);
  const [levelLoading, setLevelLoading] = useState(true);

  const [youtubeDetail, setYoutubeDetail] = useState(null)



  const truncateString = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  };

  const validateForm = () => {
    const requiredFields = ['levelId', 'videoLink', 'leaderboardName', 'feelingRating', 'ePerfect', 'perfect', 'lPerfect', 'tooEarly', 'early', 'late'];
    const validationResult = {};
    const displayValidationRes = {}
    requiredFields.forEach(field => {
      validationResult[field] = (form[field].trim() !== ''); // Check if each field is filled
    });

    validationResult["levelId"] = !(level === null || level === undefined);
    
    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
    
    const frValid = validateFeelingRating(form["feelingRating"])
    setIsInvalidFeelingRating(!frValid); // Update validation state
    setIsFormValidDisplay(displayValidationRes); // Set the validity object
    setIsFormValid(validationResult)
  };

  useEffect(() => {
    validateForm(); // Run validation on every form change
  }, [form, level, submitAttempt]);

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
          : null
      );
    });
  }, [form.videoLink]);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
  
    // Determine the value based on whether the input is a checkbox
    const inputValue = type === 'checkbox' ? checked : value;
  
  
    // Update the form state
    setForm((prev) => ({
      ...prev,
      [name]: inputValue,
    }));
  
    // Create an updated form object
    const updatedForm = {
      ...form,
      [name]: inputValue,
    };
  
    // Update accuracy and score
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
        isNoHoldTap: updatedForm.isNoHold,
    };

    const chartData = level;

    // Check if levelId is present and all judgements are valid
    if (!form.levelId) {
        setScore("Level ID is required");
    } else if (!newJudgements.every(Number.isInteger)) {
        setScore("Not all judgements are filled");
    } else if (!Object.values(passData).every(value => value !== null)) {
        setScore("Not enough pass info");
    } else if (passData && chartData) {
        setScore(getScoreV2(passData, chartData).toFixed(2));
    } else {
        setScore("Insufficient data to calculate score");
    }
};

 const googleForm = new FormManager("pass")
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowMessage(true)
    setSuccess(false);
    if(!user){
      console.log("no user");
      setError("You must be logged in");

      return 
    }
    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true)
      setError("Incomplete form");
      console.log("incomplete form, returning")
      return
    };

    setSubmission(true)
    setError(null);
    googleForm.setDetail('id', form.levelId)
    googleForm.setDetail('*/Speed Trial', form.speed? form.speed : 1.0)
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
    googleForm.setDetail('NHT', form.isNoHold)

    googleForm.submit(user.access_token)
  .then(result => {
    if (result === "ok") {
      setSuccess(true);
      setForm(initialFormState)
    } else {
      setError(result);
    }
  })
  .catch(err => {
    setError(err.message || "Unknown");
  })
  .finally(()=>{
    setSubmission(false)
    setSubmitAttempt(false);
  })
  }

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  return (
    <div className="pass-submission-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="form-container">
      <div className={`result-message ${showMessage ? 'visible' : ''}`} 
        style={{backgroundColor: 
        ( success? "#2b2" :
          error? "#b22":
          "#888"
        )}}>
          {success? (<p>Form submitted successfully!</p>) :
          error? (<p>Error: {truncateString(error, 28)}</p>):
          (<p>Submitting...</p>)}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>
      <form>
        <div className="img-wrapper">
          <img src={getYouTubeThumbnailUrl(form.videoLink) || image} alt="" />
        </div>

        <div className="info">
          <h1>Submit a Pass</h1>

          <div className="id-input">
            <input
              type="text"
              placeholder="Level Id"
              name="levelId"
              value={form.levelId}
              onChange={handleInputChange}  
              style={{ borderColor: isFormValidDisplay.levelId ? "" : "red" }}
            
            />

            <div className="information">
                {(level && form.levelId) ? 
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
              style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
            />
            {youtubeDetail? 
            (<div className="information">
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
            </div>)
            :(
              <div className="yt-info">
                <p style={{color: "#aaa"}}>No link provided</p>
                <br />
                </div>)}
            


          </div>
          <div className="info-input">
            <input
              type="text"
              placeholder="Alt Leaderboard Name"
              name="leaderboardName"
              value={form.leaderboardName}
              onChange={handleInputChange}
              style={{ borderColor: isFormValidDisplay.leaderboardName ? "" : "red"  }}
            />
            <div className="tooltip-container">
              <input
               type="checkbox" 
               value={form.isNoHold} 
               onChange={handleInputChange} 
               name="isNoHold" 
               checked={form.isNoHold}
               />
              <span style={{
                  margin: '0 15px 0 10px',
                  position: 'relative',
                }}>Used alternate holds</span>
              <span className="tooltip" style={{
                 bottom: "110%",
                  right: "10%"}}>Tick if you have used hold option other than "Normal hold" (0.9x score)</span>

            </div>
          </div>
      
      
      <div className="info-input">
            <input
              type="text"
              placeholder="Speed (ex: 1.2)"
              name="speed"
              value={form.speed}
              onChange={handleInputChange}
            />

      <div style={{ display: 'flex', justifyContent: "center", gap: "10px"}}>
        <input
          type="text"
          placeholder="Feeling rating (ex. G12)"
          name="feelingRating"
          value={form.feelingRating}
          onChange={handleInputChange}
          style={{ borderColor: isFormValidDisplay.feelingRating ? "" : "red",
            backgroundColor: isInvalidFeelingRating ? "yellow" : ""
          }} 
        />
          <div className="tooltip-container">
          <span style={{
              color: 'red',
              visibility: `${isInvalidFeelingRating? '' : 'hidden'}`
            }}>?</span>
          <span className="tooltip" 
                style={{
                  visibility: `${isInvalidFeelingRating? '' : 'hidden'}`,
                 bottom: "115%",
                  right: "-15%"}}>Unknown difficulty, will submit but please make sure it's readable by the managers. Correct diff ex.: G13; P7~P13; 21.1+; 19~20.0+</span>
        </div>
      </div>
          </div>

          <div className="accuracy">
            <div className="top">
              <div className="each-accuracy">
                <p>E Perfect</p>
                <input
                  type="text"
                  placeholder="#"
                  name="ePerfect"
                  value={form.ePerfect}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.ePerfect ? "" : "red" }}
                />
              </div>

              <div className="each-accuracy">
                <p>Perfect</p>
                <input
                  type="text"
                  placeholder="#"
                  name="perfect"
                  value={form.perfect}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.perfect ? "" : "red" }}
                />
              </div>

              <div className="each-accuracy">
                <p>L Perfect</p>
                <input type="text"
                  name="lPerfect"
                  placeholder="#"
                  value={form.lPerfect}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.lPerfect ? "" : "red" }}
                />
              </div>
            </div>

            <div className="bottom">
              <div className="each-accuracy">
                <p>Too Early</p>
                <input
                  type="text"
                  placeholder="#"
                  name="tooEarly"
                  value={form.tooEarly}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.tooEarly ? "" : "red" }}
                />
              </div>

              <div className="each-accuracy">
                <p>Early</p>
                <input
                  type="text"
                  placeholder="#"
                  name="early"
                  value={form.early}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.early ? "" : "red" }}
                />
              </div>

              <div className="each-accuracy">
                <p>Late</p>
                <input
                  type="text"
                  placeholder="#"
                  name="late"
                  value={form.late}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.late ? "" : "red" }}
                />
              </div>
            </div>

            <div className="acc-score">
              <p>Accuracy: {accuracy !== null ? accuracy : 'N/A'}</p>
              <p>Score: {score}</p>
            </div>
          </div>

          <button disabled={submission} className="submit" onClick={handleSubmit}>Submit {submission && (<>(please wait)</>)}</button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default PassSubmissionPage;
