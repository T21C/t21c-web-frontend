import './editpasspopup.css';
import api from '@/utils/api';
import { getScoreV2 } from '@/utils/CalcScore';
import calcAcc from '@/utils/CalcAcc';
import { getVideoDetails } from "@/utils";
import { useTranslation } from 'react-i18next'; 
import { useAuth } from '@/contexts/AuthContext';
import { parseJudgements } from '@/utils/ParseJudgements';
import { validateFeelingRating, validateSpeed, validateNumber, formatCreatorDisplay } from '@/utils/Utility';
import placeholder from '@/assets/placeholder/4.png';
import { FetchIcon } from '@/components/common/icons';
import { useNavigate } from 'react-router-dom';
import { PlayerInput } from '@/components/common/selectors';
import { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';

export const EditPassPopup = ({ pass, onClose, onUpdate }) => {
  const { t } = useTranslation('components');

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
    isDuplicate: pass.isDuplicate || false,
    vidUploadTime: pass.vidUploadTime || videoDetail?.timestamp || new Date().toISOString()
  };
  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [accuracy, setAccuracy] = useState(null);
  const [score, setScore] = useState("");
  const [judgements, setJudgements] = useState([]);
  const [isValidFeelingRating, setIsValidFeelingRating] = useState(true); // Track validation
  const [isValidSpeed, setIsValidSpeed] = useState(true)
  const [isValidTimestamp, setIsValidTimestamp] = useState(true); // Track timestamp validation
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
    const timestampValid = validateTimestamp(form["vidUploadTime"])
    validationResult.speed = speedValid
    validationResult.vidUploadTime = timestampValid
    validationResult["videoLink"] = videoDetail && true;

    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
    
    setIsValidFeelingRating(frValid);
    setIsValidSpeed(speedValid); // Update validation state
    setIsValidTimestamp(timestampValid); // Update timestamp validation state
    setIsFormValidDisplay(displayValidationRes); // Set the validity object
    setIsFormValid(validationResult)
  };

  const validateTimestamp = (timestamp) => {
    if (!timestamp || timestamp.trim() === '') return false;
    // Regex to match ISO 8601 format like "2025-06-26T06:10:21.000Z"
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoRegex.test(timestamp.trim());
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
        
        setLevel(data.data ? data.data.level : null);
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
        setScore(t('passPopups.edit.form.score.needId'));
    } else if (!newJudgements.every(Number.isInteger)) {
        setScore(t('passPopups.edit.form.score.needJudg'));
    } else if (!Object.values(passData).every(value => value !== null)) {
        setScore(t('passPopups.edit.form.score.needInfo'));
    } else if (passData && levelData) {
        setScore(getScoreV2(passData, levelData).toFixed(2));
    } else {
        setScore(t('passPopups.edit.form.score.noInfo'));
    }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setShowMessage(true);
  setSuccess(false);
  
  if (!user) {
    console.error("no user");
    setError(t('passPopups.edit.alert.login'));
    return;
  }

  // Check if player is selected
  if (!form.playerId) {
    setError("Please select a valid player");
    return;
  }

  if (!isFormValid) {
    setSubmitAttempt(true);
    setError(t('passPopups.edit.alert.form'));
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
      vidUploadTime: form.vidUploadTime,
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
    setError(err.response?.data?.error || err.message || err.error || "Unknown error occurred");
  } finally {
    setSubmission(false);
    setSubmitAttempt(false);
  }
};

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  const handleDelete = async () => {
    if (!window.confirm(t('passPopups.edit.confirmations.delete'))) {
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
    if (!window.confirm(t('passPopups.edit.confirmations.restore'))) {
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
          {t('passPopups.edit.close')}
        </button>

        <div className={`result-message ${showMessage ? 'visible' : ''}`} 
          style={{backgroundColor: 
            success? "#2b2" :
            error? "#b22":
            "#888"
          }}>
          {success? (<p>{t('passPopups.edit.alert.success')}</p>) :
           error? (<p>{t('passPopups.edit.alert.error')}{truncateString(error, 28)}</p>):
           (<p>{t('loading.generic', { ns: 'common' })}</p>)}
          <button onClick={() => setShowMessage(false)} className="close-btn">{t('passPopups.edit.close')}</button>
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
                <h2>{t('passPopups.edit.thumbnailInfo')}</h2>
              </div>
            )}
          </div>

          <div className="info">
            <h1>{t('passPopups.edit.title')}</h1>

            <div className="id-input">
              <input
                type="text"
                placeholder={t('passPopups.edit.form.submInfo.levelId')}
                name="levelId"
                value={form.levelId}
                onChange={handleInputChange}  
                style={{ borderColor: isFormValidDisplay.levelId ? "" : "red" }}
              />

              <div className="information">
                  {(level && form.levelId) ? 
                  (<div className="level-info"><h2 className="level-info-sub">{truncateString(level.song, 30)}</h2>
                   <div className="level-info-sub">
                    <span>{truncateString(level.artist, 15)}</span>
                    <span>{formatCreatorDisplay(level)}</span>
                   </div></div>)
                  : 
                  (<div className="level-info"><h2 className="level-info-sub" style={{color: "#aaa"}}>{t('passPopups.edit.form.levelInfo.song')}</h2>
                   <div className="level-info-sub"><span style={{color: "#aaa"}}>{t('passPopups.edit.form.levelInfo.artist')}</span><span style={{color: "#aaa"}}>{t('passPopups.edit.form.levelInfo.charter')}</span></div></div>)
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
            ? t('passPopups.edit.form.levelFetching.input')
            : levelLoading
            ? t('passPopups.edit.form.levelFetching.fetching')
            : level
            ? t('passPopups.edit.form.levelFetching.goto')
            : t('passPopups.edit.form.levelFetching.notfound')}
                </a>
              </div>
            </div>

            <div className="youtube-input">
                  <input
                    type="text"
                    placeholder={t('passPopups.edit.form.videoInfo.videoLink')}
                    name="videoLink"
                    value={form.videoLink}
                    onChange={handleInputChange}
                    style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
                  />
                  {videoDetail? 
                  (<div className="youtube-info">
                    <div className="yt-info">
                      <h4>{t('passPopups.edit.form.videoInfo.title')}</h4>
                      <p style={{maxWidth:"%"}}>{videoDetail.title}</p>
                    </div>

                    <div className="yt-info">
                      <h4>{t('passPopups.edit.form.videoInfo.channel')}</h4>
                      <p>{videoDetail.channelName}</p>
                    </div>

                    <div className="yt-info">
                      <h4>{t('passPopups.edit.form.videoInfo.timestamp')}</h4>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DDTHH:MM:SS"
                        name="vidUploadTime"
                        value={form.vidUploadTime}
                        onChange={handleInputChange}
                        style={{ borderColor: isFormValidDisplay.vidUploadTime ? "" : "red" }}
                      />
                    </div>
                  </div>)
                  :(
                    <div className="yt-info">
                      <p style={{color: "#aaa"}}>{t('passPopups.edit.form.videoInfo.nolink')}</p>
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
              </div>
          
          
          <div className="info-input">
                  <input
                    type="text"
                    placeholder={t('passPopups.edit.form.submInfo.speed')}
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
                placeholder={t('passPopups.edit.form.submInfo.feelDiff')}
                name="feelingRating"
                value={form.feelingRating}
                onChange={handleInputChange}
                style={{ 
                  borderColor: isFormValidDisplay.feelingRating ? "" : "#ff000044",
                  backgroundColor: !isValidFeelingRating ? "#ffff0044" : ""
                }} 
              />
              <div className="fr-tooltip-icon" data-tooltip-id={!isValidFeelingRating ? "fr-tooltip" : ""} data-tooltip-content={t('passPopups.edit.tooltip')}>
                <span style={{
                    visibility: `${!isValidFeelingRating? '' : 'hidden'}`,
                  }}>?</span>
                  <Tooltip className='tooltip' id="fr-tooltip" place="bottom-end" effect="solid"/>
              </div>
            </div>
          </div>

          <div className="checkbox-row">
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

            <div className="gameplay-checkboxes">
              <div className="hold-checkbox" 
                data-tooltip-id="holdTooltip"
                data-tooltip-content={t('passPopups.edit.holdTooltip')}
                >
                <Tooltip id="holdTooltip" place="top-end" effect="solid"/>
                <input
                 type="checkbox" 
                 value={form.isNoHold} 
                 onChange={handleInputChange} 
                 name="isNoHold" 
                 checked={form.isNoHold}
                 />
                <span>{t('passPopups.edit.form.submInfo.nohold')}</span>
              </div>

              <div className="keycount-checkbox" 
                data-tooltip-id="12kTooltip"
                data-tooltip-content={t('passPopups.edit.12kTooltip')}>
                <input
                  type="checkbox"
                  value={form.is12K}
                  onChange={handleInputChange}
                  name="is12K"
                  checked={form.is12K}
                />
                <span>
                  {t('passPopups.edit.form.submInfo.is12K')}
                </span>
                <Tooltip className='tooltip' id="12kTooltip" place="bottom-end" effect="solid"/>
              </div>

              <div className="keycount-checkbox" 
                data-tooltip-id="16kTooltip"
                data-tooltip-content={t('passPopups.edit.16kTooltip')}>
                <input
                  type="checkbox"
                  value={form.is16K}
                  onChange={handleInputChange}
                  name="is16K"
                  checked={form.is16K}
                />
                <span>
                  {t('passPopups.edit.form.submInfo.is16K')}
                </span>
                <Tooltip className='tooltip' id="16kTooltip" place="bottom-end" effect="solid"/>
              </div>
            </div>
          </div>

              <div className="accuracy">
                <div className="top">
                  <div className="each-accuracy">
                    <p>{t('passPopups.edit.form.judgements.ePerfect')}</p>
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
                    <p>{t('passPopups.edit.form.judgements.perfect')}</p>
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
                    <p>{t('passPopups.edit.form.judgements.lPerfect')}</p>
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
                    <p>{t('passPopups.edit.form.judgements.tooearly')}</p>
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
                    <p>{t('passPopups.edit.form.judgements.early')}</p>
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
                    <p>{t('passPopups.edit.form.judgements.late')}</p>
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
                  <p>{t('passPopups.edit.acc')}{accuracy !== null ? accuracy : 'N/A'}</p>
                  <p>{t('passPopups.edit.scoreCalc')}{score}</p>
                </div>
              </div>

              <div className="button-group">
                <button 
                  disabled={submission} 
                  className="submit" 
                  onClick={handleSubmit}
                >
                  {t('passPopups.edit.form.buttons.submit')}
                </button>
                
                <button 
                  type="button" 
                  className="delete-button"
                  onClick={pass.isDeleted ? handleRestore : handleDelete}
                  disabled={submission}
                >
                  {pass.isDeleted ? t('passPopups.edit.form.buttons.delete.restore') : t('passPopups.edit.form.buttons.delete.default')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
}; 