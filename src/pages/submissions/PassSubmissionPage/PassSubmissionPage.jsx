import { CompleteNav } from "@/components/layout";
import "./passsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/misc/FormManager/FormManager";
import { useEffect, useState, useRef } from "react";
import { getVideoDetails } from "@/utils";
import calcAcc from "@/utils/CalcAcc";
import { getScoreV2 } from "@/utils/CalcScore";
import { parseJudgements } from "@/utils/ParseJudgements";
import { useAuth } from "@/contexts/AuthContext";
import { FetchIcon } from "@/components/common/icons";
import { validateFeelingRating, validateSpeed, validateNumber } from "@/utils/Utility";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import axios from 'axios';
import { StagingModeWarning } from "@/components/common/display";
import { ProfileSelector } from "@/components/common/selectors";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { useNavigate } from "react-router-dom";


const PassSubmissionPage = () => {
  const initialFormState = {
    levelId: '',
    videoLink: '',
    player: null,
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

  const { t } = useTranslation('pages');
  const { difficultyDict } = useDifficultyContext();
  const tPass = (key, params = {}) => t(`passSubmission.${key}`, params);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user.player.isSubmissionsPaused || user.player.isBanned || !user.isEmailVerified) {
      navigate('/submission')
    }
  }, [user]);

  const [formStateKey, setFormStateKey] = useState(0);
  const [form, setForm] = useState(initialFormState);
  const [accuracy, setAccuracy] = useState(null);
  const [score, setScore] = useState("");
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
  const [searchResults, setSearchResults] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const [videoDetail, setVideoDetail] = useState(null)

  const searchCancelTokenRef = useRef(null);
  const levelFetchCancelTokenRef = useRef(null);
  const videoDetailsCancelTokenRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  const [pendingProfiles, setPendingProfiles] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const searchTimeoutRef = useRef(null);

  // Add color logic for FetchIcon
  const getIconColor = () => {
    if (!form.levelId) return "#ffc107";
    if (levelLoading) return "#ffc107";
    if (!level) return "#dc3545";
    return "#28a745";
  };

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
    validationResult["player"] = form.player !== null;
    
    // Add validation for 12K/16K selection when IsUDiff is true
    if (IsUDiff) {
      validationResult["keyMode"] = form.is12K || form.is16K;
    }
    
    const frValid = validateFeelingRating(form["feelingRating"])
    const speedValid = validateSpeed(form["speed"])
    validationResult.speed = speedValid
    validationResult["videoLink"] = videoDetail && true;

    // Check for pending profile creation
    const newPendingProfiles = [];
    if (form.player?.isNewRequest) {
      newPendingProfiles.push({
        type: 'player',
        name: form.player.name
      });
    }
    setPendingProfiles(newPendingProfiles);

    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
    
    setIsValidFeelingRating(frValid);
    setIsValidSpeed(speedValid);
    setIsFormValidDisplay(displayValidationRes);
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
      setIsUDiff(difficultyDict[level.difficulty?.id]?.name[0] === "U" || difficultyDict[level.difficulty?.id]?.name[0] === "Q");
    }
    if(!form.levelId){
      setIsUDiff(false)
    }
    
  }, [level]);

  useEffect(() => {
    const { levelId } = form;

    if (!/^\d+$/.test(levelId)) {
      setLevelLoading(false);
      setLevel(null);
      return;
    }

    setLevelLoading(true);
    setLevel(null);

    // Cancel previous level fetch request if it exists
    if (levelFetchCancelTokenRef.current) {
      levelFetchCancelTokenRef.current.cancel('New level fetch initiated');
    }

    // Create new cancel token
    levelFetchCancelTokenRef.current = api.CancelToken.source();
      
    if (!levelId) {
      setLevel(null);
      setLevelLoading(false);
      return;
    }

    api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`, {
      cancelToken: levelFetchCancelTokenRef.current.token
    })
      .then((response) => {
        if (response.data.level.isDeleted) {
          setLevel(null);
          setLevelLoading(false);
          return;
        }
        setLevel(response.data.level ? response.data.level : null);
        setLevelLoading(false);
      })
      .catch((error) => {
        if (!api.isCancel(error)) {
          setLevel(null);
          setLevelLoading(false);
        }
      });

    // Cleanup function to cancel any pending requests when component unmounts
    // or when levelId changes
    return () => {
      if (levelFetchCancelTokenRef.current) {
        levelFetchCancelTokenRef.current.cancel('Component unmounted or levelId changed');
      }
    };
  }, [form.levelId]);

  // Add cleanup for search requests when component unmounts
  useEffect(() => {
    return () => {
      if (searchCancelTokenRef.current) {
        searchCancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  useEffect(() => {
    const { videoLink } = form;
    
    // Cancel previous video details request if it exists
    if (videoDetailsCancelTokenRef.current) {
      videoDetailsCancelTokenRef.current.cancel('New video details fetch initiated');
    }

    // Create new cancel token
    videoDetailsCancelTokenRef.current = axios.CancelToken.source();

    if (!videoLink) {
      setVideoDetail(null);
      return;
    }
    
    const searchAndSetProfile = async (channelName) => {
      try {
        // Search for profiles matching the channel name
        const searchUrl = `${import.meta.env.VITE_PLAYERS}/search/${encodeURIComponent(channelName)}`;

        const response = await api.get(searchUrl);
        const profiles = response.data;

 
        // Find exact match (case insensitive)
        const exactMatch = profiles.find(p => 
          p.player.name.toLowerCase() === channelName.toLowerCase()
        ).player;

        // Directly set the form state with the profile data
        setForm(prev => ({
          ...prev,
          player: exactMatch ? {
            id: exactMatch.id,
            name: exactMatch.name,
            isNewRequest: false
          } : {
            name: channelName,
            isNewRequest: true
          }
        }));
      } catch (error) {
        console.error('[Profile Search] Error searching profiles:', error);
        // Set as new request on error
        setForm(prev => ({
          ...prev,
          player: {
            name: channelName,
            isNewRequest: true
          }
        }));
      }
    };

    const fetchVideoDetails = async () => {
      try {
        const details = await getVideoDetails(videoLink);
        setVideoDetail(details);
        
        if (details?.channelName) {
          await searchAndSetProfile(details.channelName);
        }
      } catch (error) {
        console.error('[Video Details] Error fetching video details:', error);
        setVideoDetail(null);
      }
    };

    fetchVideoDetails();

    return () => {
      if (videoDetailsCancelTokenRef.current) {
        videoDetailsCancelTokenRef.current.cancel('Component unmounted');
      }
    };
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
        setScore(tPass("score.needId"));
    } else if (!newJudgements.every(Number.isInteger)) {
        setScore(tPass("score.needJudg"));
    } else if (!Object.values(passData).every(value => value !== null)) {
        setScore(tPass("score.needInfo"));
    } else if (passData && levelData) {
        setScore(getScoreV2(passData, levelData).toFixed(2));
    } else {
        setScore(tPass("score.noInfo"));
    }
};

 const submissionForm = new FormManager("pass")

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowMessage(true);
    setSuccess(false);
    
    if(!user){
      console.error("No user logged in");
      setError(tPass("alert.login"));
      return;
    }

    
    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true);
      setError(tPass("alert.form"));
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      // Clean the video URL before submission
      const cleanedVideoUrl = cleanVideoUrl(form.videoLink);

      submissionForm.setDetail('levelId', form.levelId);
      submissionForm.setDetail('videoLink', cleanedVideoUrl);
      submissionForm.setDetail('passer', form.player?.name || '');
      submissionForm.setDetail('passerId', form.player?.id);
      submissionForm.setDetail('passerRequest', form.player?.isNewRequest || false);
      submissionForm.setDetail('speed', form.speed);
      submissionForm.setDetail('feelingDifficulty', form.feelingRating);
      submissionForm.setDetail('title', videoDetail?.title || '');
      submissionForm.setDetail('videoLink', cleanedVideoUrl);
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

      const result = await submissionForm.submit();
      setSuccess(true);
      setFormStateKey(prevKey => prevKey + 1);
      setForm(initialFormState);
      setPendingProfiles([]); // Clear pending profiles after successful submission

    } catch (err) {
      console.error("Submission error:", err);
      setError(err.response?.data?.error || err.message || err.error || "Unknown error occurred");
    } finally {
      setSubmission(false);
      setSubmitAttempt(false);
    }
  };

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  const searchLevels = async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    // Cancel previous search request if it exists
    if (searchCancelTokenRef.current) {
      searchCancelTokenRef.current.cancel('New search initiated');
    }

    // Create new cancel token
    searchCancelTokenRef.current = api.CancelToken.source();

    try {
      const response = await api.get(`${import.meta.env.VITE_LEVELS}`, 
        {
          params: {
            query,
            limit: 50,
            offset: 0,
          },
          cancelToken: searchCancelTokenRef.current.token
        }
      );
      setSearchResults(response.data.results);
    } catch (error) {
      if (!api.isCancel(error)) {
        console.error('Error searching levels:', error);
        setSearchResults([]);
      }
    }
  };

  const handleLevelSelect = (selectedLevel) => {
    setForm(prev => ({
      ...prev,
      levelId: selectedLevel.id.toString()
    }));
    setLevel(selectedLevel);
    setIsExpanded(false);
  };

  const handleLevelInputChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({
      ...prev,
      levelId: value
    }));
    setSearchInput(value);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      if (value) {
        searchLevels(value);
      } else {
        setSearchResults([]);
      }
    }, 500);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && 
          searchContainerRef.current && 
          !dropdownRef.current.contains(event.target) && 
          !searchContainerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add handler for profile changes
  const handleProfileChange = (field, value) => {
    
    setForm(prev => {
      const newForm = {
        ...prev,
        [field]: value
      };
      return newForm;
    });

    // Reset pending profiles when profile selection changes
    if (field === 'player') {
      const newPendingProfiles = [];
      if (value?.isNewRequest) {
        newPendingProfiles.push({
          type: 'player',
          name: value.name
        });
      }
      setPendingProfiles(newPendingProfiles);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="pass-submission-page">
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
          {success? (<p>{tPass("alert.success")}</p>) :
          error? (<p>{tPass("alert.error")}{truncateString(error?.message || error?.toString() || error, 120)}</p>):
          (<p>{tPass("alert.loading")}</p>)}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>

        <form className={`form-container ${videoDetail ? 'shadow' : ''}`}
          style={{backgroundImage: `url(${videoDetail ? videoDetail.image : placeholder})`}}>
          <div className="thumbnail-container"
            style={{filter: videoDetail? `drop-shadow(0 0 1rem black)`: ""}}>
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
                <h2>{tPass("thumbnailInfo")}</h2>
              </div>
            )}
          </div>

          <div className="info">
            <h1>{tPass("title")}</h1>

            <div className="id-input">
              <div className="search-container" ref={searchContainerRef}>
                <input
                  type="text"
                  placeholder={tPass("submInfo.levelId")}
                  name="levelId"
                  value={searchInput}
                  onChange={handleLevelInputChange}
                  style={{ borderColor: isFormValidDisplay.levelId ? "" : "red" }}
                />
                {searchResults.length > 0 && (
                  <button 
                    type="button"
                    className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                    onClick={toggleExpand}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                )}
              </div>

              <div className={`level-dropdown ${isExpanded ? 'expanded' : ''}`} ref={dropdownRef}>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="level-option"
                    onClick={() => handleLevelSelect(result)}
                  >
                    <img 
                      src={difficultyDict[result.difficulty.id]?.icon} 
                      alt={difficultyDict[result.difficulty.id]?.name}
                      className="difficulty-icon"
                    />
                    <div className="level-content">
                      <div className="level-title">
                        {result.song} (ID: {result.id})
                      </div>
                      <div className="level-details">
                        <span>{result.artist}</span>
                        <span>{result.creator}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="information">
                {(level && form.levelId) ? 
                (<>
                  <img src={difficultyDict[level.difficulty.id]?.icon} alt={difficultyDict[level.difficulty.id]?.name} className="level-icon" />
                  <div className="level-info">
                    <h2 className="level-info-sub">{truncateString(level["song"], 30)}</h2>
                    <div className="level-info-sub">
                      <span>{truncateString(level["artist"], 15)}</span>
                      <span>{truncateString(level["creator"], 20)}</span>
                    </div>
                  </div>
                </>) : 
                (<div className="level-info">
                  <h2 className="level-info-sub" style={{color: "#aaa"}}>{tPass("levelInfo.song")}</h2>
                  <div className="level-info-sub">
                    <span style={{color: "#aaa"}}>{tPass("levelInfo.artist")}</span>
                    <span style={{color: "#aaa"}}>{tPass("levelInfo.charter")}</span>
                  </div>
                </div>)}

                <div className="verified">
                  <FetchIcon form={form} levelLoading={levelLoading} level={level} color={getIconColor()} />
                </div>

                <a href={level ? (level["id"] == form.levelId ? `/levels/${level["id"]}`: "#" ): "#"}
                  onClick={e => {
                    if (!level || (level && level["id"] != form.levelId)) {
                      e.preventDefault();
                    }
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-goto"
                  style={{
                    backgroundColor: getIconColor(),
                    cursor: !form.levelId ? "not-allowed": levelLoading ? "wait": level ? "pointer" : "not-allowed",
                    textShadow: "0 0 5px #0009"
                  }}>
                  {!form.levelId
                    ? tPass("levelFetching.input")
                    : levelLoading
                    ? tPass("levelFetching.fetching")
                    : level
                    ? tPass("levelFetching.goto")
                    : tPass("levelFetching.notfound")}
                </a>
              </div>
            </div>

            <div className="youtube-input">
              <input
                type="text"
                placeholder={tPass("videoInfo.videoLink")}
                name="videoLink"
                value={form.videoLink}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
              />
              {videoDetail ? 
              (<div className="youtube-info">
                <div className="yt-info">
                  <h4>{tPass("videoInfo.title")}</h4>
                  <p>{videoDetail.title}</p>
                </div>
                <div className="yt-info">
                  <h4>{tPass("videoInfo.channel")}</h4>
                  <p>{videoDetail.channelName}</p>
                </div>
                <div className="yt-info">
                  <h4>{tPass("videoInfo.timestamp")}</h4>
                  <p>{videoDetail.timestamp.replace("T", " ").replace("Z", "")}</p>
                </div>
              </div>) : 
              (<div className="yt-info">
                <p style={{color: "#aaa"}}>{tPass("videoInfo.nolink")}</p>
                <br />
              </div>)}
            </div>

            <div className="info-input">
              <ProfileSelector
                key={formStateKey}
                type="player"
                value={form.player}
                onChange={(value) => handleProfileChange('player', value)}
                required
                placeholder={tPass("submInfo.altname")}
                className={isFormValidDisplay.player ? "" : "error"}
                allowNewRequest={true}
              />
              <div className="tooltip-container">
                <input
                  type="checkbox"
                  value={form.isNoHold}
                  onChange={handleInputChange}
                  name="isNoHold"
                  checked={form.isNoHold}
                />
                <span style={{margin: '0 15px 0 10px', position: 'relative'}}>
                  {tPass("submInfo.nohold")}
                </span>
                <span className="tooltip" style={{bottom: "110%", right: "10%"}}>
                  {tPass("holdTooltip")}
                </span>
              </div>
            </div>

            <div className="info-input">
              <input
                type="text"
                placeholder={tPass("submInfo.speed")}
                name="speed"
                value={form.speed}
                onChange={handleInputChange}
                style={{
                  borderColor: isFormValidDisplay.speed ? "" : "red",
                  backgroundColor: isValidSpeed ? "" : "#f005"
                }}
              />
              <div style={{ display: 'flex', justifyContent: "center", gap: "10px"}}>
                <input
                  type="text"
                  placeholder={tPass("submInfo.feelDiff")}
                  name="feelingRating"
                  value={form.feelingRating}
                  onChange={handleInputChange}
                  style={{
                    borderColor: isFormValidDisplay.feelingRating ? "" : "red",
                    backgroundColor: !isValidFeelingRating ? "#ff05" : ""
                  }}
                />
                <div className="tooltip-container">
                  <span style={{
                    color: 'red',
                    visibility: `${!isValidFeelingRating ? '' : 'hidden'}`
                  }}>?</span>
                  <span className="tooltip" style={{
                    visibility: `${!isValidFeelingRating ? '' : 'hidden'}`,
                    bottom: "115%",
                    right: "-15%"
                  }}>{tPass("tooltip")}</span>
                </div>
              </div>
            </div>

            <div className={`info-input-container ${IsUDiff ? 'expand' : ''}`}
              style={{justifyContent: 'end', marginRight: '2.5rem'}}>
              <div className="tooltip-container keycount-checkbox">
                <input
                  type="checkbox"
                  value={form.is12K}
                  onChange={handleInputChange}
                  name="is12K"
                  checked={form.is12K}
                  style={{outline: IsUDiff && submitAttempt && !isFormValid.keyMode ? '2px solid red' : 'none'}}
                />
                <span style={{margin: '0 15px 0 10px', position: 'relative'}}>
                  {tPass("submInfo.is12K")}
                </span>
                <span className="tooltip" style={{bottom: '110%'}}>
                  {tPass("12kTooltip")}
                </span>
              </div>
              <div className="tooltip-container keycount-checkbox">
                <input
                  type="checkbox"
                  value={form.is16K}
                  onChange={handleInputChange}
                  name="is16K"
                  checked={form.is16K}
                  style={{outline: IsUDiff && submitAttempt && !isFormValid.keyMode ? '2px solid red' : 'none'}}
                />
                <span style={{margin: '0 15px 0 10px', position: 'relative'}}>
                  {tPass("submInfo.is16K")}
                </span>
                <span className="tooltip" style={{bottom: '110%'}}>
                  {tPass("16kTooltip")}
                </span>
              </div>
            </div>

            <div className="accuracy" style={{backgroundColor: "#ffffff06", color: "#fff"}}>
              <div className="top">
                <div className="each-accuracy">
                  <p>{tPass("judgements.ePerfect")}</p>
                  <input
                    type="text"
                    placeholder="#"
                    name="ePerfect"
                    value={form.ePerfect}
                    onChange={handleInputChange}
                    style={{
                      borderColor: isFormValidDisplay.ePerfect ? "" : "red",
                      color: "#FCFF4D"
                    }}
                  />
                </div>
                <div className="each-accuracy">
                  <p>{tPass("judgements.perfect")}</p>
                  <input
                    type="text"
                    placeholder="#"
                    name="perfect"
                    value={form.perfect}
                    onChange={handleInputChange}
                    style={{
                      borderColor: isFormValidDisplay.perfect ? "" : "red",
                      color: "#5FFF4E"
                    }}
                  />
                </div>
                <div className="each-accuracy">
                  <p>{tPass("judgements.lPerfect")}</p>
                  <input
                    type="text"
                    placeholder="#"
                    name="lPerfect"
                    value={form.lPerfect}
                    onChange={handleInputChange}
                    style={{
                      borderColor: isFormValidDisplay.lPerfect ? "" : "red",
                      color: "#FCFF4D"
                    }}
                  />
                </div>
              </div>

              <div className="bottom">
                <div className="each-accuracy">
                  <p>{tPass("judgements.tooearly")}</p>
                  <input
                    type="text"
                    placeholder="#"
                    name="tooEarly"
                    value={form.tooEarly}
                    onChange={handleInputChange}
                    style={{
                      borderColor: isFormValidDisplay.tooEarly ? "" : "red",
                      color: "#FF0000"
                    }}
                  />
                </div>
                <div className="each-accuracy">
                  <p>{tPass("judgements.early")}</p>
                  <input
                    type="text"
                    placeholder="#"
                    name="early"
                    value={form.early}
                    onChange={handleInputChange}
                    style={{
                      borderColor: isFormValidDisplay.early ? "" : "red",
                      color: "#FF6F4D"
                    }}
                  />
                </div>
                <div className="each-accuracy">
                  <p>{tPass("judgements.late")}</p>
                  <input
                    type="text"
                    placeholder="#"
                    name="late"
                    value={form.late}
                    onChange={handleInputChange}
                    style={{
                      borderColor: isFormValidDisplay.late ? "" : "red",
                      color: "#FF6F4D"
                    }}
                  />
                </div>
              </div>

              <div className="acc-score">
                <p>{tPass("acc")}{accuracy !== null ? accuracy : 'N/A'}</p>
                <p>{tPass("scoreCalc")}{score}</p>
              </div>
            </div>

            {pendingProfiles.length > 0 && (
              <div className="pending-profiles-warning">
                {tPass("warnings.pendingProfiles")}
                <ul>
                  {pendingProfiles.map((profile, index) => (
                    <li key={index}>
                      {profile.type}: <b>{profile.name}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              className="submit" 
              onClick={handleSubmit}
              disabled={submission}
            >
              {tPass("submit")}{submission && (<>{tPass("submitWait")}</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PassSubmissionPage;
