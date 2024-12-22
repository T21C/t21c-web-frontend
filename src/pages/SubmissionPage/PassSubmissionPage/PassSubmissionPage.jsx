import { CompleteNav } from "@/components";
import "./passsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getVideoDetails } from "@/Repository/RemoteRepository";
import calcAcc from "@/components/Misc/CalcAcc";
import { getScoreV2 } from "@/components/Misc/CalcScore";
import { parseJudgements } from "@/components/Misc/ParseJudgements";
import { useAuth } from "@/contexts/AuthContext";
import {FetchIcon} from "@/components/FetchIcon/FetchIcon"
import { validateFeelingRating, validateSpeed, validateNumber } from "@/components/Misc/Utility";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";

const checkLevel = async (levelId) => {
  const response = await api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`);
  return response.data;
}

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
    is12K: false,
    is16K: false
  };

  const { t } = useTranslation()
  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [accuracy, setAccuracy] = useState(null);
  const [score, setScore] = useState("");
  const [judgements, setJudgements] = useState([]);
  const [isValidFeelingRating, setIsValidFeelingRating] = useState(true); // Track validation
  const [isValidSpeed, setIsValidSpeed] = useState(true)
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});
  const [IsUDiff, setIsUDiff] = useState(false)

  const [showMessage, setShowMessage] = useState(false)
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [submission, setSubmission] = useState(false);
  const [level, setLevel] = useState(null);
  const [levelLoading, setLevelLoading] = useState(true);

  const [videoDetail, setVideoDetail] = useState(null)



  const truncateString = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  };

  const validateForm = () => {
    const requiredFields = ['levelId', 'videoLink', 'feelingRating', 'ePerfect', 'perfect', 'lPerfect', 'tooEarly', 'early', 'late'];
    const judgements = ['ePerfect', 'perfect', 'lPerfect', 'tooEarly', 'early', 'late']
    const validationResult = {};
    const displayValidationRes = {}
    requiredFields.forEach(field => {
      if (judgements.includes(field)){
        validationResult[field] = (form[field].trim() !== '') && validateNumber(form[field]) ; 
      }
      else{
        validationResult[field] = (form[field].trim() !== ''); // Check if each field is filled
      }
    });

    validationResult["levelId"] = !(level === null || level === undefined);
    

    
    const frValid = validateFeelingRating(form["feelingRating"])
    const speedValid = validateSpeed(form["speed"])
    validationResult.speed = speedValid
    validationResult["videoLink"] = videoDetail && true;


    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
    
    setIsValidFeelingRating(frValid);
    setIsValidSpeed(speedValid); // Update validation state
    setIsFormValidDisplay(displayValidationRes); // Set the validity object
    setIsFormValid(validationResult)
  };

  useEffect(() => {
    validateForm(); // Run validation on every form change
  }, [form, level, submitAttempt, videoDetail]);

  useEffect(() => {
    if (level) {
      
      updateAccuracy(form);
      updateScore(form);
    }

    if(level){
      setIsUDiff(level.difficulty?.name[0] === "U" || level.difficulty?.name[0] === "Q");
    }
    if(!form.levelId){
      setIsUDiff(false)
    }
    
  }, [level]);

  useEffect(() => {
    const { levelId } = form;

    if (!/^\d+$/.test(levelId)){
      setLevelLoading(false);
      setLevel(null);
      return;
    }

    setLevelLoading(true);
    setLevel(null);

      
    if (!levelId) {
      setLevel(null);
      setLevelLoading(false);
      return;
    }

    checkLevel(levelId)
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
    
    getVideoDetails(videoLink).then((res) => {
      setVideoDetail(
        res
          ? res
          : null
      );
      if (res){
        form.leaderboardName = res.channelName
      }
    });


  }, [form.videoLink]);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
  
    // Determine the value based on whether the input is a checkbox
    const inputValue = type === 'checkbox' ? checked : value;
    if (name === "is16K"){
      form.is12K=false
    }
    if (name === "is12K"){
      form.is16K=false
    }
  
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

    const levelData = level;

    // Check if levelId is present and all judgements are valid
    if (!form.levelId) {
        setScore(t("passSubmission.score.needId"));
    } else if (!newJudgements.every(Number.isInteger)) {
        setScore(t("passSubmission.score.needJudg"));
    } else if (!Object.values(passData).every(value => value !== null)) {
        setScore(t("passSubmission.score.needInfo"));
    } else if (passData && levelData) {
        setScore(getScoreV2(passData, levelData).toFixed(2));
    } else {
        setScore(t("passSubmission.score.noInfo"));
    }
};

 const submissionForm = new FormManager("pass")
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowMessage(true)
    setSuccess(false);
    if(!user){
      console.error("no user");
      setError(t("passSubmission.alert.login"));

      return 
    }
    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true)
      setError(t("passSubmission.alert.form"));
      console.error("incomplete form, returning")
      return
    };

    setSubmission(true)
    setError(null);

    submissionForm.setDetail('levelId', form.levelId);
    submissionForm.setDetail('videoLink', form.videoLink);
    submissionForm.setDetail('passer', form.leaderboardName);
    submissionForm.setDetail('speed', form.speed);
    submissionForm.setDetail('feelingDifficulty', form.feelingRating);
    submissionForm.setDetail('title', videoDetail?.title || '');
    submissionForm.setDetail('videoLink', form.videoLink);
    submissionForm.setDetail('rawTime', videoDetail?.timestamp || new Date().toISOString());

    // Add judgements directly to form
    submissionForm.setDetail('earlyDouble', parseInt(form.tooEarly) || 0);
    submissionForm.setDetail('earlySingle', parseInt(form.early) || 0);
    submissionForm.setDetail('ePerfect', parseInt(form.ePerfect) || 0);
    submissionForm.setDetail('perfect', parseInt(form.perfect) || 0);
    submissionForm.setDetail('lPerfect', parseInt(form.lPerfect) || 0);
    submissionForm.setDetail('lateSingle', parseInt(form.late) || 0);
    submissionForm.setDetail('lateDouble', 0);

    // Add flags directly to form
    submissionForm.setDetail('is12K', IsUDiff && form.is12K);
    submissionForm.setDetail('isNoHoldTap', form.isNoHold);
    submissionForm.setDetail('is16K', IsUDiff && form.is16K);

    submissionForm.submit(user.access_token)
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
          {success? (<p>{t("passSubmission.alert.success")}</p>) :
          error? (<p>{t("passSubmission.alert.error")}{truncateString(error?.message || error?.toString() || error, 27)}</p>):
          (<p>{t("passSubmission.alert.loading")}</p>)}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div><form
  className={`form-container ${videoDetail ? 'shadow' : ''}`}
  style={{
    backgroundImage: `url(${videoDetail ? videoDetail.image : placeholder})`,
  }}
>
  <div
    className="thumbnail-container"
    style={{
      filter: videoDetail? `drop-shadow(0 0 1rem black)`: ""}}
  >
    {videoDetail ? (
      <iframe
        src={videoDetail.embed}
        title="Video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    ) : (
      <div className="thumbnail-text">
        <h2>{t("passSubmission.thumbnailInfo")}</h2>
      </div>
    )}
  </div>

        <div className="info">
          <h1>{t("passSubmission.title")}</h1>

          <div className="id-input">
            <input
              type="text"
              placeholder={t("passSubmission.submInfo.levelId")}
              name="levelId"
              value={form.levelId}
              onChange={handleInputChange}  
              style={{ borderColor: isFormValidDisplay.levelId ? "" : "red" }}
            
            />

            <div className="information">
                {(level && form.levelId) ? 
                (<div className="level-info"><h2 className="level-info-sub">{truncateString(level["song"], 30)}</h2>
                 <div className="level-info-sub"><span>{truncateString(level["artist"], 15)}</span><span>{truncateString(level["creator"], 20)}</span></div></div>)
                : 
                (<div className="level-info"><h2 className="level-info-sub" style={{color: "#aaa"}}>{t("passSubmission.levelInfo.song")}</h2>
                 <div className="level-info-sub"><span style={{color: "#aaa"}}>{t("passSubmission.levelInfo.artist")}</span><span style={{color: "#aaa"}}>{t("passSubmission.levelInfo.charter")}</span></div></div>)
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
                href={level ? (level["id"] == form.levelId ? `/levels/${level["id"]}`: "#" ): "#"}
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
          ? t("passSubmission.levelFetching.input")
          : levelLoading
          ? t("passSubmission.levelFetching.fetching")
          : level
          ? t("passSubmission.levelFetching.goto")
          : t("passSubmission.levelFetching.notfound")}
              </a>
            </div>
          </div>

          <div className="youtube-input">
                <input
                  type="text"
                  placeholder={t("passSubmission.videoInfo.videoLink")}
                  name="videoLink"
                  value={form.videoLink}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
                />
                {videoDetail? 
                (<div className="youtube-info">
                  <div className="yt-info">
                    <h4>{t("passSubmission.videoInfo.title")}</h4>
                    <p style={{maxWidth:"%"}}>{videoDetail.title}</p>
                  </div>

                  <div className="yt-info">
                    <h4>{t("passSubmission.videoInfo.channel")}</h4>
                    <p>{videoDetail.channelName}</p>
                  </div>

                  <div className="yt-info">
                    <h4>{t("passSubmission.videoInfo.timestamp")}</h4>
                    <p>{videoDetail.timestamp.replace("T", " ").replace("Z", "")}</p>
                  </div>
                </div>)
                :(
                  <div className="yt-info">
                    <p style={{color: "#aaa"}}>{t("passSubmission.videoInfo.nolink")}</p>
                    <br />
                    </div>)}
        </div>
          <div className="info-input">
            <input
              type="text"
              placeholder={t("passSubmission.submInfo.altname")}
              name="leaderboardName"
              value={form.leaderboardName}
              onChange={handleInputChange}
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
                }}>{t("passSubmission.submInfo.nohold")}</span>
              <span className="tooltip" style={{
                 bottom: "110%",
                  right: "10%"}}>{t("passSubmission.holdTooltip")}</span>

            </div>
          </div>
      
      
      <div className="info-input">
              <input
                type="text"
                placeholder={t("passSubmission.submInfo.speed")}
                name="speed"
                value={form.speed}
                onChange={handleInputChange}
                style={{ 
                  borderColor: isFormValidDisplay.speed ? "" : "red",
                  backgroundColor: isValidSpeed? "transparent" : "#faa"}}
              />
  
        <div style={{ display: 'flex', justifyContent: "center", gap: "10px"}}>
          <input
            type="text"
            placeholder={t("passSubmission.submInfo.feelDiff")}
            name="feelingRating"
            value={form.feelingRating}
            onChange={handleInputChange}
            style={{ 
              borderColor: isFormValidDisplay.feelingRating ? "" : "red",
              backgroundColor: !isValidFeelingRating ? "yellow" : ""
            }} 
          />
          <div className="tooltip-container">
            <span style={{
                color: 'red',
                visibility: `${!isValidFeelingRating? '' : 'hidden'}`
              }}>?</span>
            <span className="tooltip" 
                  style={{
                    visibility: `${!isValidFeelingRating? '' : 'hidden'}`,
                   bottom: "115%",
                    right: "-15%"}}>{t("passSubmission.tooltip")}</span>
          </div>
        </div>
      </div>
      <div
      className={`info-input-container ${IsUDiff ? 'expand' : ''}`}
      style={{ justifyContent: 'end', marginRight: '2.5rem' }}
    >
          <div className="tooltip-container keycount-checkbox">
            <input
              type="checkbox"
              value={form.is12K}
              onChange={handleInputChange}
              name="is12K"
              checked={form.is12K}
            />
            <span
              style={{
                margin: '0 15px 0 10px',
                position: 'relative',
              }}
            >
              {t('passSubmission.submInfo.is12K')}
            </span>
            <span
              className="tooltip"
              style={{
                bottom: '110%'
              }}
            >
              {t('passSubmission.12kTooltip')}
            </span>
          </div>
          <div className="tooltip-container keycount-checkbox">
            <input
              type="checkbox"
              value={form.is16K}
              onChange={handleInputChange}
              name="is16K"
              checked={form.is16K}
            />
            <span
              style={{
                margin: '0 15px 0 10px',
                position: 'relative',
              }}
            >
              {t('passSubmission.submInfo.is16K')}
            </span>
            <span
              className="tooltip"
              style={{
                bottom: '110%'
              }}
            >
              {t('passSubmission.16kTooltip')}
            </span>
          </div>
    </div>
          <div className="accuracy" style={{backgroundColor: "#222", color: "#fff"}}>
            <div className="top">
              <div className="each-accuracy">
                <p>{t("passSubmission.judgements.ePerfect")}</p>
                <input
                  type="text"
                  placeholder="#"
                  name="ePerfect"
                  value={form.ePerfect}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.ePerfect ? "" : "red",
                    color: "#FCFF4D"
                  }}
                />
              </div>

              <div className="each-accuracy">
                <p>{t("passSubmission.judgements.perfect")}</p>
                <input
                  type="text"
                  placeholder="#"
                  name="perfect"
                  value={form.perfect}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.perfect ? "" : "red",
                    color: "#5FFF4E" }}
                />
              </div>

              <div className="each-accuracy">
                <p>{t("passSubmission.judgements.lPerfect")}</p>
                <input type="text"
                  name="lPerfect"
                  placeholder="#"
                  value={form.lPerfect}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.lPerfect ? "" : "red",
                    color: "#FCFF4D" }}
                />
              </div>
            </div>

            <div className="bottom">
              <div className="each-accuracy">
                <p>{t("passSubmission.judgements.tooearly")}</p>
                <input
                  type="text"
                  placeholder="#"
                  name="tooEarly"
                  value={form.tooEarly}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.tooEarly ? "" : "red",
                    color: "#FF0000"  }}
                />
              </div>

              <div className="each-accuracy">
                <p>{t("passSubmission.judgements.early")}</p>
                <input
                  type="text"
                  placeholder="#"
                  name="early"
                  value={form.early}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.early ? "" : "red",
                    color: "#FF6F4D"  }}
                />
              </div>

              <div className="each-accuracy">
                <p>{t("passSubmission.judgements.late")}</p>
                <input
                  type="text"
                  placeholder="#"
                  name="late"
                  value={form.late}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.late ? "" : "red",
                    color: "#FF6F4D"  }}
                />
              </div>
            </div>

            <div className="acc-score">
              <p>{t("passSubmission.acc")}{accuracy !== null ? accuracy : 'N/A'}</p>
              <p>{t("passSubmission.scoreCalc")}{score}</p>
            </div>
          </div>

          <button disabled={submission} className="submit" onClick={handleSubmit}>{t("passSubmission.submit")}{submission && (<>{t("passSubmission.submitWait")}</>)}</button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default PassSubmissionPage;
