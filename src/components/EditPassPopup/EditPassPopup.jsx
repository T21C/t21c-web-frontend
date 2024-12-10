import { useState, useEffect } from 'react';
import './editpasspopup.css';
import api from '../../utils/api';
import { getScoreV2 } from '../Misc/CalcScore.js';
import calcAcc from '../Misc/CalcAcc.js';
import { getVideoDetails, checkLevel } from "../../Repository/RemoteRepository";
import { useTranslation } from 'react-i18next'; 
import { useAuth } from '../../context/AuthContext';
import { parseJudgements } from '../Misc/ParseJudgements';
import { validateFeelingRating, validateSpeed, validateNumber } from '../Misc/Utility';
import placeholder from '../../assets/placeholder/4.png';
import { FetchIcon } from '../FetchIcon/FetchIcon.jsx';
import { useNavigate } from 'react-router-dom';
import { PlayerInput } from '../../components/PlayerComponents/PlayerInput';

export const EditPassPopup = ({ pass, onClose, onUpdate }) => {
  const initialFormState = {
    levelId: pass.levelId.toString() || '',
    videoLink: pass.vidLink || '',
    speed: pass.speed || '1',
    playerId: pass.playerId || '',
    leaderboardName: pass.player.name || '',
    feelingRating: pass.feelingRating || '',
    ePerfect: pass.judgements.ePerfect.toString() || '',
    perfect: pass.judgements.perfect.toString() || '',
    lPerfect: pass.judgements.lPerfect.toString() || '',
    tooEarly: pass.judgements.earlyDouble.toString() || '',
    early: pass.judgements.earlySingle.toString() || '',
    late: pass.judgements.lateSingle.toString() || '',
    isNoHold: pass.isNoHoldTap || false,
    is12k: pass.is12K || false,
    is16k: pass.is16K || false
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

  const navigate = useNavigate();

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
      setIsUDiff(level["pguDiffNum"] >= 21);
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
    });


  }, [form.videoLink]);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
  
    // Determine the value based on whether the input is a checkbox
    const inputValue = type === 'checkbox' ? checked : value;
    if (name === "is16k"){
      form.is12k=false
    }
    if (name === "is12k"){
      form.is16k=false
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

const handleSubmit = async (e) => {
  e.preventDefault();
  setShowMessage(true);
  setSuccess(false);
  
  if (!user) {
    console.error("no user");
    setError(t("passSubmission.alert.login"));
    return;
  }

  // Check if player is selected
  if (!form.playerId) {
    setError("Please select a valid player");
    return;
  }

  if (!isFormValid) {
    setSubmitAttempt(true);
    setError(t("passSubmission.alert.form"));
    console.error("incomplete form, returning");
    return;
  }

  setSubmission(true);
  setError(null);

  try {
    const updateData = {
      // Required fields from the API
      levelId: parseInt(form.levelId),
      playerId: form.playerId,
      speed: parseFloat(form.speed) >= 1 ? parseFloat(form.speed) : 1,
      feelingRating: form.feelingRating,
      vidTitle: videoDetail?.title || level?.song || '',
      vidLink: form.videoLink,
      vidUploadTime: videoDetail?.timestamp || new Date().toISOString(),
      is12K: IsUDiff && form.is12k,
      is16K: IsUDiff && form.is16k,
      isNoHoldTap: form.isNoHold,

      // Judgements in the exact format expected by the API
      judgements: {
        earlyDouble: parseInt(form.tooEarly) || 0,
        earlySingle: parseInt(form.early) || 0,
        ePerfect: parseInt(form.ePerfect) || 0,
        perfect: parseInt(form.perfect) || 0,
        lPerfect: parseInt(form.lPerfect) || 0,
        lateSingle: parseInt(form.late) || 0,
        lateDouble: 0
      }
    };

    
    const response = await api.put(
      `${import.meta.env.VITE_INDIVIDUAL_PASSES}${pass.id}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data) {
      setSuccess(true);
      if (onUpdate) {
        await onUpdate(response.data.pass);
      }
    } else {
      setError("Failed to update pass");
    }
  } catch (err) {
    console.error("Error updating pass:", err);
    setError(err.response?.data?.error || err.message || "Unknown error occurred");
  } finally {
    setSubmission(false);
    setSubmitAttempt(false);
  }
};

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  const handleDelete = async () => {
    if (!window.confirm("Do you want to delete this pass? This can be undone later.")) {
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      const response = await api.patch(`${import.meta.env.VITE_INDIVIDUAL_PASSES}${pass.id}/soft-delete`);
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data.pass);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Soft deletion failed");
    } finally {
      setSubmission(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("Do you want to restore this pass?")) {
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      const response = await api.patch(`${import.meta.env.VITE_INDIVIDUAL_PASSES}${pass.id}/restore`);
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data.pass);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('passSubmission.restoreFailed'));
    } finally {
      setSubmission(false);
    }
  };

  return (
    <div className="edit-popup-overlay">
      <div className="form-container">
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className={`result-message ${showMessage ? 'visible' : ''}`} 
          style={{backgroundColor: 
            success? "#2b2" :
            error? "#b22":
            "#888"
          }}>
          {success? (<p>{t("passSubmission.alert.success")}</p>) :
           error? (<p>{t("passSubmission.alert.error")}{truncateString(error, 28)}</p>):
           (<p>{t("passSubmission.alert.loading")}</p>)}
          <button onClick={() => setShowMessage(false)} className="close-btn">×</button>
        </div>

        <form className={`form-container ${videoDetail ? 'shadow' : ''}`}
          style={{
            backgroundImage: `url(${videoDetail ? videoDetail.image : placeholder})`,
          }}>
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
                    placeholder={t("passSubmission.videoInfo.vidLink")}
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
                <PlayerInput
                  value={form.leaderboardName || ''}
                  onChange={(value) => {
                    setForm(prev => ({  
                      ...prev,
                      leaderboardName: value
                    }));
                  }}
                  onSelect={(player) => {
                    setForm(prev => ({
                      ...prev,
                      leaderboardName: player.name,
                      playerId: player.id
                    }));
                  }}
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
                  value={form.is12k}
                  onChange={handleInputChange}
                  name="is12k"
                  checked={form.is12k}
                />
                <span
                  style={{
                    margin: '0 15px 0 10px',
                    position: 'relative',
                  }}
                >
                  {t('passSubmission.submInfo.is12k')}
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
                  value={form.is16k}
                  onChange={handleInputChange}
                  name="is16k"
                  checked={form.is16k}
                />
                <span
                  style={{
                    margin: '0 15px 0 10px',
                    position: 'relative',
                  }}
                >
                  {t('passSubmission.submInfo.is16k')}
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

              <div className="button-group">
                <button 
                  disabled={submission} 
                  className="submit" 
                  onClick={handleSubmit}
                >
                  {submission ? t("passSubmission.submitWait") : t("passSubmission.submit")}
                </button>
                
                {pass.isDeleted ? (
                  <button 
                    type="button"
                    className="delete-button"
                    onClick={handleRestore}
                    style={{backgroundColor: "#28a745"}}
                    disabled={submission}
                  >
                    Restore{/*t("passSubmission.restore")*/}
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="delete-button"
                    onClick={handleDelete}
                    disabled={submission}
                  >
                    Delete{/*t("passSubmission.delete")*/}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
}; 