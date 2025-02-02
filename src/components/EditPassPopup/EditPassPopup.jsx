import { useState, useEffect } from 'react';
import './editpasspopup.css';
import api from '../../utils/api';
import { getScoreV2 } from '../Misc/CalcScore.js';
import calcAcc from '../Misc/CalcAcc.js';
import { getVideoDetails } from "../../Repository/RemoteRepository";
import { useTranslation } from 'react-i18next'; 
import { useAuth } from '../../contexts/AuthContext';
import { parseJudgements } from '../Misc/ParseJudgements';
import { validateFeelingRating, validateSpeed, validateNumber } from '../Misc/Utility';
import placeholder from '../../assets/placeholder/4.png';
import { FetchIcon } from '../Icons/FetchIcon.jsx';
import { useNavigate } from 'react-router-dom';
import { PlayerInput } from '../../components/PlayerComponents/PlayerInput';

export const EditPassPopup = ({ pass, onClose, onUpdate }) => {
  const { t } = useTranslation('components');
  const tPass = (key) => t(`passPopups.edit.${key}`);

  const initialFormState = {
    levelId: pass.levelId.toString() || '',
    videoLink: pass.videoLink || '',
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
    is12K: pass.is12K || false,
    is16K: pass.is16K || false,
    isAnnounced: pass.isAnnounced || false,
    isDuplicate: pass.isDuplicate || false
  };
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
      setIsUDiff(level?.difficulty?.id >= 41);
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

    api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`)
      .then((data) => {
        
        setLevel(data.data ? data.data : null);
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
        setScore(tPass('form.score.needId'));
    } else if (!newJudgements.every(Number.isInteger)) {
        setScore(tPass('form.score.needJudg'));
    } else if (!Object.values(passData).every(value => value !== null)) {
        setScore(tPass('form.score.needInfo'));
    } else if (passData && levelData) {
        setScore(getScoreV2(passData, levelData).toFixed(2));
    } else {
        setScore(tPass('form.score.noInfo'));
    }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setShowMessage(true);
  setSuccess(false);
  
  if (!user) {
    console.error("no user");
    setError(tPass('alert.login'));
    return;
  }

  // Check if player is selected
  if (!form.playerId) {
    setError("Please select a valid player");
    return;
  }

  if (!isFormValid) {
    setSubmitAttempt(true);
    setError(tPass('alert.form'));
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
      videoLink: form.videoLink,
      vidUploadTime: videoDetail?.timestamp || new Date().toISOString(),
      is12K: IsUDiff && form.is12K,
      is16K: IsUDiff && form.is16K,
      isNoHoldTap: form.isNoHold,
      isAnnounced: form.isAnnounced,
      isDuplicate: form.isDuplicate,

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
      `${import.meta.env.VITE_PASSES}/${pass.id}`,
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
    if (!window.confirm(tPass('confirmations.delete'))) {
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      const response = await api.delete(`${import.meta.env.VITE_PASSES}/${pass.id}`);
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
    if (!window.confirm(tPass('confirmations.restore'))) {
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      const response = await api.patch(`${import.meta.env.VITE_PASSES}/${pass.id}/restore`);
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Restoration failed");
    } finally {
      setSubmission(false);
    }
  };

  return (
    <div className="edit-pass-popup-overlay">
      <div className="form-container">
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Close"
        >
          {tPass('close')}
        </button>

        <div className={`result-message ${showMessage ? 'visible' : ''}`} 
          style={{backgroundColor: 
            success? "#2b2" :
            error? "#b22":
            "#888"
          }}>
          {success? (<p>{tPass('alert.success')}</p>) :
           error? (<p>{tPass('alert.error')}{truncateString(error, 28)}</p>):
           (<p>{tPass('alert.loading')}</p>)}
          <button onClick={() => setShowMessage(false)} className="close-btn">{tPass('close')}</button>
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
                <h2>{tPass('thumbnailInfo')}</h2>
              </div>
            )}
          </div>

          <div className="info">
            <h1>{tPass('title')}</h1>

            <div className="id-input">
              <input
                type="text"
                placeholder={tPass('form.submInfo.levelId')}
                name="levelId"
                value={form.levelId}
                onChange={handleInputChange}  
                style={{ borderColor: isFormValidDisplay.levelId ? "" : "red" }}
              />

              <div className="information">
                  {(level && form.levelId) ? 
                  (<div className="level-info"><h2 className="level-info-sub">{truncateString(level.song, 30)}</h2>
                   <div className="level-info-sub"><span>{truncateString(level.artist, 15)}</span><span>{truncateString(level.creator, 20)}</span></div></div>)
                  : 
                  (<div className="level-info"><h2 className="level-info-sub" style={{color: "#aaa"}}>{tPass('form.levelInfo.song')}</h2>
                   <div className="level-info-sub"><span style={{color: "#aaa"}}>{tPass('form.levelInfo.artist')}</span><span style={{color: "#aaa"}}>{tPass('form.levelInfo.charter')}</span></div></div>)
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
                  href={level ? (level.id == form.levelId ? `/levels/${level.id}`: "#" ): "#"}
                  onClick={e => {
                    if (!level){
                      e.preventDefault();
                    }
                    else if (level) {
                      if(level.id != form.levelId){
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
            ? tPass('form.levelFetching.input')
            : levelLoading
            ? tPass('form.levelFetching.fetching')
            : level
            ? tPass('form.levelFetching.goto')
            : tPass('form.levelFetching.notfound')}
                </a>
              </div>
            </div>

            <div className="youtube-input">
                  <input
                    type="text"
                    placeholder={tPass('form.videoInfo.videoLink')}
                    name="videoLink"
                    value={form.videoLink}
                    onChange={handleInputChange}
                    style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
                  />
                  {videoDetail? 
                  (<div className="youtube-info">
                    <div className="yt-info">
                      <h4>{tPass('form.videoInfo.title')}</h4>
                      <p style={{maxWidth:"%"}}>{videoDetail.title}</p>
                    </div>

                    <div className="yt-info">
                      <h4>{tPass('form.videoInfo.channel')}</h4>
                      <p>{videoDetail.channelName}</p>
                    </div>

                    <div className="yt-info">
                      <h4>{tPass('form.videoInfo.timestamp')}</h4>
                      <p>{videoDetail.timestamp.replace("T", " ").replace("Z", "")}</p>
                    </div>
                  </div>)
                  :(
                    <div className="yt-info">
                      <p style={{color: "#aaa"}}>{tPass('form.videoInfo.nolink')}</p>
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
                    }}>{tPass('form.submInfo.nohold')}</span>
                  <span className="tooltip" style={{
                     bottom: "110%",
                      right: "10%"}}>{tPass('holdTooltip')}</span>

                </div>
              </div>
          
          
          <div className="info-input">
                  <input
                    type="text"
                    placeholder={tPass('form.submInfo.speed')}
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
                placeholder={tPass('form.submInfo.feelDiff')}
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
                        right: "-15%"}}>{tPass('tooltip')}</span>
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
                  {tPass('form.submInfo.is12K')}
                </span>
                <span
                  className="tooltip"
                  style={{
                    bottom: '110%'
                  }}
                >
                  {tPass('12kTooltip')}
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
                  {tPass('form.submInfo.is16K')}
                </span>
                <span
                  className="tooltip"
                  style={{
                    bottom: '110%'
                  }}
                >
                  {tPass('16kTooltip')}
                </span>
              </div>
        </div>
        <div className="announcement-status">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="isAnnounced"
                    checked={form.isAnnounced}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  <span>Is Announced</span>
                </label>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="isDuplicate"
                    checked={form.isDuplicate}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  <span>Is Duplicate</span>
                </label>
              </div>
              <div className="accuracy" style={{backgroundColor: "#222", color: "#fff"}}>
                <div className="top">
                  <div className="each-accuracy">
                    <p>{tPass('form.judgements.ePerfect')}</p>
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
                    <p>{tPass('form.judgements.perfect')}</p>
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
                    <p>{tPass('form.judgements.lPerfect')}</p>
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
                    <p>{tPass('form.judgements.tooearly')}</p>
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
                    <p>{tPass('form.judgements.early')}</p>
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
                    <p>{tPass('form.judgements.late')}</p>
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
                  <p>{tPass('acc')}{accuracy !== null ? accuracy : 'N/A'}</p>
                  <p>{tPass('scoreCalc')}{score}</p>
                </div>
              </div>

              <div className="button-group">
                <button 
                  disabled={submission} 
                  className="submit" 
                  onClick={handleSubmit}
                >
                  {submission ? tPass('form.buttons.submitWait') : tPass('form.buttons.submit')}
                </button>
                
                <button 
                  type="button" 
                  className="delete-button"
                  onClick={pass.isDeleted ? handleRestore : handleDelete}
                  disabled={submission}
                >
                  {submission ? 
                    (pass.isDeleted ? tPass('form.buttons.delete.restoring') : tPass('form.buttons.delete.deleting')) : 
                    (pass.isDeleted ? tPass('form.buttons.delete.restore') : tPass('form.buttons.delete.default'))}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
}; 