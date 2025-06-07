import { CompleteNav } from "@/components/layout";
import "./levelsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/misc/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getDriveFromYt, getVideoDetails } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { validateFeelingRating } from "@/utils/Utility";
import { useTranslation } from "react-i18next";
import { StagingModeWarning } from "@/components/common/display";
import { ProfileSelector } from "@/components/common/selectors";
import { LevelSelectionPopup, CDNTosPopup } from "@/components/popups";

import api from "@/utils/api";
import { prepareZipForUpload, validateZipSize, formatFileSize } from '@/utils/zipUtils';
import Cookies from 'js-cookie';

const encodeFilename = (str) => {
  // Convert string to UTF-8 bytes, then to hex
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const LevelSubmissionPage = () => {
  const initialFormState = {
    levelId: '',
    videoLink: '',
    speed: 1.0,
    is12K: false,
    is16K: false,
    isNoHoldTap: false,
    isWorldsFirst: false,
    accuracy: 0,
    scoreV2: 0,
    feelingDifficulty: 1.0,
    title: '',
    rawTime: '',
    artist: '',
    diff: '',
    song: '',
    dlLink: '',
    workshopLink: '',
    charter: null,
    vfxer: null,
    team: null,
    levelZip: null
  };

  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [formStateKey, setFormStateKey] = useState(0);
  const [isInvalidFeelingRating, setIsInvalidFeelingRating] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});
  const [finalSubmissionId, setFinalSubmissionId] = useState(null);

  const [showMessage, setShowMessage] = useState(false)
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [submission, setSubmission] = useState(false);

  const [videoDetail, setVideoDetail] = useState(null);
  const [pendingProfiles, setPendingProfiles] = useState([]);

  // State for multiple creators
  const [charters, setCharters] = useState([{ name: '', id: null, isNewRequest: false }]);
  const [vfxers, setVfxers] = useState([{ name: '', id: null, isNewRequest: false }]);
  const [team, setTeam] = useState({ name: '', id: null, isNewRequest: false });

  const [levelZipInfo, setLevelZipInfo] = useState(null);
  const [showLevelSelection, setShowLevelSelection] = useState(false);
  const [levelFiles, setLevelFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const [showCdnTos, setShowCdnTos] = useState(false);
  const [pendingZipFile, setPendingZipFile] = useState(null);

  // Helper function to clean video URLs
  const cleanVideoUrl = (url) => {
    // Match various video URL formats
    const patterns = [
      // YouTube patterns
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
      /https?:\/\/(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
      // Bilibili patterns
      /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
      /https?:\/\/(?:www\.)?b23\.tv\/(BV[a-zA-Z0-9]+)/,
      /https?:\/\/(?:www\.)?bilibili\.com\/.*?(BV[a-zA-Z0-9]+)/
    ];

    // Try each pattern
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // For Bilibili links, construct the standard URL format
        if (match[1] && match[1].startsWith('BV')) {
          return `https://www.bilibili.com/video/${match[1]}`;
        }
        // For YouTube links, construct based on the first pattern
        if (match[1]) {
          return `https://www.youtube.com/watch?v=${match[1]}`;
        }
      }
    }

    // If no pattern matches, return the original URL
    return url;
  };

  const truncateString = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  };

  const validateForm = () => {
    const requiredFields = ['artist', 'diff', 'song', 'videoLink'];
    const validationResult = {};
    const displayValidationRes = {};
    
    requiredFields.forEach(field => {
      validationResult[field] = form[field]?.trim?.() !== '';
    });

    // Validate creators
    validationResult.charter = charters.some(charter => 
      charter.name && (charter.id !== null || charter.isNewRequest)
    );

    // Validate download links - only required if no zip is uploaded
    validationResult.directLink = form.levelZip || form.dlLink?.trim?.() !== '' || form.workshopLink?.trim?.() !== '';
    
    // Check for pending profile creations
    const newPendingProfiles = [];
    
    // Add charter profiles
    charters.forEach(charter => {
      if (charter.name && charter.isNewRequest) {
        newPendingProfiles.push({
          type: 'charter',
          name: charter.name
        });
      }
    });

    // Add VFX-er profiles
    vfxers.forEach(vfxer => {
      if (vfxer.name && vfxer.isNewRequest) {
        newPendingProfiles.push({
          type: 'vfxer',
          name: vfxer.name
        });
      }
    });

    // Add team profile if needed
    if (team.name && team.isNewRequest) {
      newPendingProfiles.push({
        type: 'team',
        name: team.name
      });
    }

    setPendingProfiles(newPendingProfiles);

    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
    
    const frValid = validateFeelingRating(form.diff || '');
    setIsInvalidFeelingRating(!frValid);
    setIsFormValidDisplay(displayValidationRes);
    setIsFormValid(validationResult);
  };

  useEffect(() => {
    validateForm();
  }, [form, submitAttempt, charters, vfxers, team]);

  useEffect(() => {
    const { videoLink } = form;
  
    const fetchData = async () => {
      try {
        // Clean the video URL before fetching details
        const cleanedVideoLink = cleanVideoUrl(videoLink);
        const videoDetails = await getVideoDetails(cleanedVideoLink);
        setVideoDetail(videoDetails ? videoDetails : null);
  
        const driveDetails = await getDriveFromYt(cleanedVideoLink);
        if (driveDetails.drive && !form.levelZip) {
          setForm((prevForm) => ({
            ...prevForm,
            dlLink: driveDetails.drive ? driveDetails.drive : "",
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchData();
  }, [form.videoLink]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  const submissionForm = new FormManager("level")
  const resetForm = () => {
    setSuccess(true);
    setFormStateKey(formStateKey + 1);
    // Reset all form state
    setForm(initialFormState);
    setPendingProfiles([]);
    setVideoDetail(null);
    setLevelZipInfo(null);
    
    // Reset creator states with empty values
    setCharters([{ name: '', id: null, isNewRequest: false }]);
    setVfxers([{ name: '', id: null, isNewRequest: false }]);
    setTeam({ name: '', id: null, isNewRequest: false });
    
    // Reset validation states
    setSubmitAttempt(false);
    setIsInvalidFeelingRating(false);
    setIsFormValidDisplay({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowMessage(true);
    setSuccess(false);
    
    if(!user){
      console.error("No user logged in");
      setError(t('levelSubmission.alert.login'));
      return;
    }

    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true);
      setError(t('levelSubmission.alert.form'));
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      // Clean the video URL before submission
      const cleanedVideoUrl = cleanVideoUrl(form.videoLink);

      // Prepare creator requests - only include non-empty entries
      const creatorRequests = [
        ...charters
          .filter(charter => charter.name)
          .map(charter => ({
            role: 'charter',
            creatorName: charter.name,
            creatorId: charter.id,
            isNewRequest: charter.isNewRequest
          })),
        ...vfxers
          .filter(vfxer => vfxer.name)
          .map(vfxer => ({
            role: 'vfxer',
            creatorName: vfxer.name,
            creatorId: vfxer.id,
            isNewRequest: vfxer.isNewRequest
          }))
      ];

      // Prepare team request if present
      const teamRequest = team.name ? {
        teamName: team.name,
        teamId: team.id,
        isNewRequest: team.isNewRequest
      } : null;

      submissionForm.setDetail('artist', form.artist);
      submissionForm.setDetail('diff', form.diff);
      submissionForm.setDetail('song', form.song);
      submissionForm.setDetail('videoLink', cleanedVideoUrl);
      submissionForm.setDetail('directDL', form.dlLink);
      submissionForm.setDetail('wsLink', form.workshopLink);
      
      
      submissionForm.setDetail('creatorRequests', creatorRequests);
      submissionForm.setDetail('teamRequest', teamRequest);
      submissionForm.setDetail('levelZip', form.levelZip);
      
      // Encode the original filename using our UTF-8 to hex encoding
      if (form.levelZip) {
        submissionForm.setDetail('originalname', encodeFilename(form.levelZip.name));
      }

      const response = await submissionForm.submit();
      
      if (response.requiresLevelSelection) {
        setLevelFiles(response.levelFiles);
        setSelectedFileId(response.fileId);
        setShowLevelSelection(true);
        setFinalSubmissionId(response.submissionId);
        setSubmission(false); // Reset submission state since we're waiting for level selection
        return;
      }
      
      if (response.success) {
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError(error.response?.data?.error || error.message || error.error || "Unknown error occurred");
    } finally {
      setSubmission(false);
    }
  };

  const handleLevelSelect = async (selectedLevel) => {
    try {
      setSubmission(true); // Show loading state during level selection
      const response = await api.post(import.meta.env.VITE_SELECT_LEVEL, {
        submissionId: finalSubmissionId,
        selectedLevel
      });

      if (response.data.success) {
        resetForm();
      } else {
        throw new Error(response.data.error || 'Failed to select level');
      }
    } catch (error) {
      console.error('Level selection error:', error);
      setError(error.message || 'Failed to select level');
    } finally {
      setShowLevelSelection(false);
      setShowCancelWarning(false);
      setLevelFiles([]);
      setSelectedFileId(null);
      setSubmission(false);
    }
  };

  const handleLevelSelectionClose = () => {
    setShowCancelWarning(true);
  };

  const handleCancelConfirm = async () => {
    try {
      setSubmission(true);
      // Find the largest .adofai file
      const largestFile = levelFiles.reduce((largest, current) => 
        current.size > largest.size ? current : largest
      );
      
      const response = await api.post(import.meta.env.VITE_SELECT_LEVEL, {
        submissionId: finalSubmissionId,
        selectedLevel: largestFile.name
      });

      if (response.data.success) {
        resetForm();
      } else {
        throw new Error(response.data.error || 'Failed to select level');
      }
    } catch (error) {
      console.error('Level selection error:', error);
      setError(error.message || 'Failed to select level');
    } finally {
      setShowLevelSelection(false);
      setShowCancelWarning(false);
      setLevelFiles([]);
      setSelectedFileId(null);
      setSubmission(false);
    }
  };

  const handleCancelReject = () => {
    setShowCancelWarning(false);
  };

  const addCharter = () => {
    if (!Array.isArray(charters)) {
      setCharters([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setCharters([...charters, { name: '', id: null, isNewRequest: false }]);
  };

  const removeCharter = (index) => {
    if (!Array.isArray(charters)) {
      setCharters([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setCharters(charters.filter((_, i) => i !== index));
  };

  const addVfxer = () => {
    if (!Array.isArray(vfxers)) {
      setVfxers([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setVfxers([...vfxers, { name: '', id: null, isNewRequest: false }]);
  };

  const removeVfxer = (index) => {
    if (!Array.isArray(vfxers)) {
      setVfxers([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setVfxers(vfxers.filter((_, i) => i !== index));
  };

  const handleCharterChange = (index, value) => {
    if (!Array.isArray(charters)) {
      setCharters([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setCharters(prev => prev.map((charter, i) => 
      i === index ? (value || { name: '', id: null, isNewRequest: false }) : charter
    ));
  };

  const handleVfxerChange = (index, value) => {
    if (!Array.isArray(vfxers)) {
      setVfxers([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setVfxers(prev => prev.map((vfxer, i) => 
      i === index ? (value || { name: '', id: null, isNewRequest: false }) : vfxer
    ));
  };

  // Check if user has agreed to CDN ToS
  const hasAgreedToCdnTos = () => {
    return Cookies.get('cdn_tos_agreed') === 'true';
  };

  const handleCdnTosAgree = () => {
    setShowCdnTos(false);
    if (pendingZipFile) {
      processZipUpload(pendingZipFile);
      setPendingZipFile(null);
    }
  };

  const handleCdnTosDecline = () => {
    setShowCdnTos(false);
    setPendingZipFile(null);
  };

  const processZipUpload = async (file) => {
    try {
      // Validate file type and size
      if (!validateZipSize(file)) {
        setError(t('levelSubmission.alert.invalidZip'));
        return;
      }

      // Prepare zip file for upload
      const preparedZip = prepareZipForUpload(file);
      if (!preparedZip) {
        setError(t('levelSubmission.alert.invalidZip'));
        return;
      }

      setLevelZipInfo({
        name: preparedZip.originalName,
        size: preparedZip.size
      });

      setForm(prev => ({
        ...prev,
        levelZip: preparedZip.file
      }));

    } catch (error) {
      console.error('Error preparing zip file:', error);
      setError(t('levelSubmission.alert.invalidZip'));
    }
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!hasAgreedToCdnTos()) {
      setPendingZipFile(file);
      setShowCdnTos(true);
      return;
    }

    processZipUpload(file);
  };

  const handleRemoveZip = () => {
    setLevelZipInfo(null);
    setForm(prev => ({
      ...prev,
      levelZip: null
    }));
  };

  return (
    <div className="level-submission-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="form-container">
        {import.meta.env.MODE !== "production" && <StagingModeWarning />}
        <div className={`result-message ${showMessage ? 'visible' : ''}`} 
        style={{backgroundColor: 
        ( success? "#2b2" :
          error? "#b22":
          "#888"
        )}}>
          {success ? <p>{t('levelSubmission.alert.success')}</p> :
           error ? <p>{t('levelSubmission.alert.error')} {truncateString(error?.message || error?.toString() || error, 60)}</p> :
           <p>{t('levelSubmission.alert.loading')}</p>}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>

        {showLevelSelection && (
          <LevelSelectionPopup
            levelFiles={levelFiles}
            onSelect={handleLevelSelect}
            onClose={handleLevelSelectionClose}
          />
        )}

        {showCancelWarning && (
          <div className="warning-popup">
            <div className="warning-content">
              <h3>Warning: Level Selection Required</h3>
              <p>If you close this window, the system will automatically select the largest .adofai file from your zip and proceed with the submission. Are you sure you want to continue?</p>
              <div className="warning-buttons">
                <button onClick={handleCancelConfirm} className="confirm-btn">
                  Proceed with Largest File
                </button>
                <button onClick={handleCancelReject} className="cancel-btn">
                  Return to Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CDN ToS Agreement Prompt */}
        {showCdnTos && (
          <CDNTosPopup 
            onAgree={handleCdnTosAgree}
            onDecline={handleCdnTosDecline}
          />
        )}

        <form className={`form-container ${videoDetail ? 'shadow' : ''}`}>
          <div className="thumbnail-container">
            {videoDetail ? (
              <iframe
                src={videoDetail.embed}
                title="Video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "10px",
                  objectFit: "contain",
                  objectPosition: "center"
                }}
              ></iframe>
            ) : (<>
              <div className="thumbnail-text">
                <img src={placeholder} alt="placeholder" />
              </div>
              <h2>{t('levelSubmission.thumbnailInfo')}</h2>
            </>)}
          </div>

          <div className="info">
            <h1>{t('levelSubmission.title')}</h1>

            <div className="information">
              <input
                type="text"
                placeholder={t('levelSubmission.submInfo.song')}
                name="song"
                value={form.song}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.song ? "" : "red" }}
              />
              <input
                type="text"
                placeholder={t('levelSubmission.submInfo.artist')}
                name="artist"
                value={form.artist}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.artist ? "" : "red" }}
              />
            </div>

            <div className="youtube-input">
              <input
                type="text"
                placeholder={t('levelSubmission.submInfo.videoLink')}
                name="videoLink"
                value={form.videoLink}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
              />
              {videoDetail ? 
              (<div className="youtube-info">
                <div className="yt-info">
                  <h4>{t('levelSubmission.videoInfo.title')}</h4>
                  <p>{videoDetail.title}</p>
                </div>
                <div className="yt-info">
                  <h4>{t('levelSubmission.videoInfo.channel')}</h4>
                  <p>{videoDetail.channelName}</p>
                </div>
                <div className="yt-info">
                  <h4>{t('levelSubmission.videoInfo.timestamp')}</h4>
                  <p>{videoDetail.timestamp.replace("T", " ").replace("Z", "")}</p>
                </div>
              </div>) : 
              (<div className="yt-info">
                <p style={{color: "#aaa"}}>{t('levelSubmission.videoInfo.nolink')}</p>
                <br />
              </div>)}
            </div>

            <div className="zip-upload-section">
              <h3>{t('levelSubmission.submInfo.levelZip')}</h3>
              {!levelZipInfo ? (
                <div className="zip-upload-container">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    id="levelZip"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="levelZip" className="zip-upload-button">
                    {t('levelSubmission.buttons.uploadZip')}
                  </label>
                </div>
              ) : (
                <div className="zip-info">
                  <div className="zip-details">
                    <span className="zip-name">{levelZipInfo.name}</span>
                    <span className="zip-size">{(levelZipInfo.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button 
                    type="button" 
                    className="remove-zip-btn"
                    onClick={handleRemoveZip}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            <div className="info-group">
              <div className="diff-tooltip">
                <div className="tooltip-container">
                  <span style={{
                    color: 'red',
                    visibility: `${isInvalidFeelingRating ? '' : 'hidden'}`,
                    backgroundColor: "rgba(255, 255, 0, 0.25)",
                    padding: "0.2rem 0.4rem",
                    borderRadius: "5px",
                    margin: "0 -0.1rem"
                  }}>?</span>
                  <span className="tooltip" 
                    style={{
                      visibility: `${isInvalidFeelingRating ? '' : 'hidden'}`,
                      bottom: "115%",
                      left: "-2rem"
                    }}>{t('levelSubmission.tooltip')}</span>
                </div>
                <input
                  type="text"
                  placeholder={t('levelSubmission.submInfo.diff')}
                  name="diff"
                  value={form.diff}
                  onChange={handleInputChange}
                  style={{ 
                    borderColor: isFormValidDisplay.diff ? "" : "red",
                    backgroundColor: isInvalidFeelingRating ? "rgba(255, 255, 0, 0.25)" : ""
                  }}
                />
              </div>
              <ProfileSelector
                key={`team-${formStateKey}`}
                type="team"
                value={team}
                onChange={setTeam}
                allowNewRequest
                placeholder={t('levelSubmission.submInfo.team')}
              />
            </div>

            
            <div className="info-group" style={{marginTop: "2rem"}}>
              <input
                type="text"
                placeholder={t('levelSubmission.submInfo.dlLink')}
                name="dlLink"
                value={form.dlLink}
                onChange={handleInputChange}
                style={{ 
                  borderColor: isFormValidDisplay.directLink ? "" : "red",
                  opacity: form.levelZip ? 0.5 : 1,
                  cursor: form.levelZip ? 'not-allowed' : 'text'
                }}
                disabled={!!form.levelZip}
              />
              <span className="dl-links-or">{t('levelSubmission.submInfo.dlLinksOr')}</span>
              <input
                type="text"
                placeholder={t('levelSubmission.submInfo.workshop')}
                name="workshopLink"
                value={form.workshopLink}
                onChange={handleInputChange}
                style={{ 
                  borderColor: isFormValidDisplay.directLink ? "" : "red",
                }}
              />
            </div>



            <div className="creators-section">
              <h3>{t('levelSubmission.submInfo.charters')}</h3>
              {Array.isArray(charters) && charters.map((charter, index) => (
                <div key={index} className="creator-row">
                  <ProfileSelector
                    key={`charter-${formStateKey}`}
                    type="charter"
                    value={charter || { name: '', id: null, isNewRequest: false }}
                    onChange={(value) => handleCharterChange(index, value)}
                    allowNewRequest
                    required={index === 0}
                    placeholder={t('levelSubmission.submInfo.charter')}
                  />
                  {index > 0 && (
                    <button 
                      className="creator-action-btn remove-creator-btn"
                      onClick={() => removeCharter(index)}
                      type="button"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button 
                className="creator-action-btn add-creator-btn"
                onClick={addCharter}
                type="button"
              >
                ➕ {t('levelSubmission.buttons.addCharter')}
              </button>
            </div>

            <div className="creators-section">
              <h3>{t('levelSubmission.submInfo.vfxers')}</h3>
              {Array.isArray(vfxers) && vfxers.map((vfxer, index) => (
                <div key={index} className="creator-row">
                  <ProfileSelector
                    key={`vfxer-${formStateKey}`}
                    type="vfx"
                    value={vfxer || { name: '', id: null, isNewRequest: false }}
                    onChange={(value) => handleVfxerChange(index, value)}
                    allowNewRequest
                    required={index === 0}
                    placeholder={t('levelSubmission.submInfo.vfxer')}
                  />
                  {index > 0 && (
                    <button 
                      className="creator-action-btn remove-creator-btn"
                      onClick={() => removeVfxer(index)}
                      type="button"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button 
                className="creator-action-btn add-creator-btn"
                onClick={addVfxer}
                type="button"
              >
                ➕ {t('levelSubmission.buttons.addVfxer')}
              </button>
            </div>


                          {/* Display pending profiles warning */}
            {pendingProfiles.length > 0 && (
              <div className="pending-profiles-warning">
                <h3>{t('levelSubmission.warnings.pendingProfiles')}</h3>
                
                {/* Group profiles by type */}
                {['charter', 'vfxer', 'team'].map(type => {
                  const profiles = pendingProfiles.filter(p => 
                    type === 'charter' ? p.type === 'charter' :
                    type === 'vfxer' ? p.type === 'vfxer' :
                    p.type === 'team'
                  );
                  
                  if (profiles.length === 0) return null;
                  
                  return (
                    <div key={type} className="profile-group">
                      <h4>{t(`levelSubmission.roles.${type}s`)}</h4>
                      {profiles.map((profile, index) => (
                        <div key={index} className="profile-item">
                          <span>{profile.name}</span>
                          <span className="new-profile-badge">
                            {t('levelSubmission.badges.newProfile')}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <button 
              className="submit" 
              onClick={handleSubmit}
              disabled={submission}
            >
              {t('levelSubmission.buttons.submit')}{submission && (<>{t('levelSubmission.buttons.submitWait')}</>)}
            </button>
          </div>
        </form>      
      </div>
    </div>
  );
};

export default LevelSubmissionPage;
