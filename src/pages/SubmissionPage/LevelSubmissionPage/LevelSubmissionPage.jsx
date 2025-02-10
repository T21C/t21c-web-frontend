import { CompleteNav } from "@/components";
import "./levelsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getDriveFromYt, getVideoDetails } from "@/Repository/RemoteRepository";
import { useAuth } from "@/contexts/AuthContext";
import { validateFeelingRating } from "@/components/Misc/Utility";
import { useTranslation } from "react-i18next";
import StagingModeWarning from "../../../components/StagingModeWarning/StagingModeWarning";
import { ProfileSelector } from "@/components/ProfileSelector/ProfileSelector";
import { useNavigate } from 'react-router-dom';

const LevelSubmissionPage = () => {
  const initialFormState = {
    levelId: '',
    videoLink: '',
    speed: 1.0,
    is12K: false,
    is16K: false,
    isNoHoldTap: false,
    isWorldsFirst: false,
    accuracy: 100,
    scoreV2: 1000000,
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
    team: null
  };

  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelSubmission.${key}`, params);
  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [isInvalidFeelingRating, setIsInvalidFeelingRating] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});
  
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

  const navigate = useNavigate();

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

    // Validate that at least one charter is selected with valid data
    validationResult.charter = charters.length > 0 && charters[0].name && (charters[0].id !== null || charters[0].isNewRequest);

    // Validate download links
    validationResult.directLink = form.dlLink?.trim?.() !== '' || form.workshopLink?.trim?.() !== '';
    
    // Check for pending profile creations
    const newPendingProfiles = [];
    charters.forEach(charter => {
      if (charter.isNewRequest) {
        newPendingProfiles.push({
          type: 'charter',
          name: charter.name
        });
      }
    });
    if (form.vfxer?.isNewRequest) {
      newPendingProfiles.push({
        type: 'vfx',
        name: form.vfxer.name
      });
    }
    if (form.team?.isNewRequest) {
      newPendingProfiles.push({
        type: 'team',
        name: form.team.name
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
  }, [form, submitAttempt]);

  useEffect(() => {
    const { videoLink } = form;
  
    const fetchData = async () => {
      try {
        // Clean the video URL before fetching details
        const cleanedVideoLink = cleanVideoUrl(videoLink);
        const videoDetails = await getVideoDetails(cleanedVideoLink);
        setVideoDetail(videoDetails ? videoDetails : null);
  
        const driveDetails = await getDriveFromYt(cleanedVideoLink);
        if (driveDetails.drive) {
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

  const handleProfileChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Update pending profiles when profile selection changes
    const newPendingProfiles = [...pendingProfiles.filter(p => p.type !== field)];
    if (value?.isNewRequest) {
      newPendingProfiles.push({
        type: field,
        name: value.name
      });
    }
    setPendingProfiles(newPendingProfiles);
  };

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  const submissionForm = new FormManager("level")
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowMessage(true);
    setSuccess(false);
    
    if(!user){
      console.error("No user logged in");
      setError(tLevel("alert.login"));
      return;
    }

    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true);
      setError(tLevel("alert.form"));
      return;
    }

    setSubmission(true);
    setError(null);

    try {
      // Clean the video URL before submission
      const cleanedVideoUrl = cleanVideoUrl(form.videoLink);

      // Prepare creator requests
      const creatorRequests = [
        ...charters.map(charter => ({
          role: 'charter',
          creatorName: charter.name,
          creatorId: charter.id,
          isNewRequest: charter.isNewRequest
        })),
        ...vfxers.map(vfxer => ({
          role: 'vfxer',
          creatorName: vfxer.name,
          creatorId: vfxer.id,
          isNewRequest: vfxer.isNewRequest
        }))
      ];

      submissionForm.setDetail('artist', form.artist);
      submissionForm.setDetail('diff', form.diff);
      submissionForm.setDetail('song', form.song);
      submissionForm.setDetail('videoLink', cleanedVideoUrl);
      submissionForm.setDetail('directDL', form.dlLink);
      submissionForm.setDetail('wsLink', form.workshopLink || '');
      submissionForm.setDetail('creatorRequests', creatorRequests);
      
      // Team request
      if (team.name) {
        submissionForm.setDetail('teamRequest', {
          teamName: team.name,
          teamId: team.id,
          isNewRequest: team.isNewRequest
        });
      }

      const result = await submissionForm.submit(user.access_token);
      if (result === "ok") {
        setSuccess(true);
        setForm(initialFormState);
        setCharters([{ name: '', id: null, isNewRequest: false }]);
        setVfxers([{ name: '', id: null, isNewRequest: false }]);
        setTeam({ name: '', id: null, isNewRequest: false });
        setPendingProfiles([]);
        setVideoDetail(null);
        setSubmitAttempt(false);
        setIsFormValidDisplay({});
      } else {
        console.error("Submission error:", result);
        setError(result.response.data.error || result || "(Unknown)");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setSubmission(false);
    }
  };

  const addCharter = () => {
    setCharters([...charters, { name: '', id: null, isNewRequest: false }]);
  };

  const removeCharter = (index) => {
    setCharters(charters.filter((_, i) => i !== index));
  };

  const addVfxer = () => {
    setVfxers([...vfxers, { name: '', id: null, isNewRequest: false }]);
  };

  const removeVfxer = (index) => {
    setVfxers(vfxers.filter((_, i) => i !== index));
  };

  const handleCharterChange = (index, value) => {
    setCharters(prev => prev.map((charter, i) => 
      i === index ? value : charter
    ));
  };

  const handleVfxerChange = (index, value) => {
    setVfxers(prev => prev.map((vfxer, i) => 
      i === index ? value : vfxer
    ));
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
          {success ? <p>{tLevel("alert.success")}</p> :
           error ? <p>{tLevel("alert.error")} {truncateString(error?.message || error?.toString() || error, 60)}</p> :
           <p>{tLevel("alert.loading")}</p>}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>

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
              <h2>{tLevel("thumbnailInfo")}</h2>
            </>)}
          </div>

          <div className="info">
            <h1>{tLevel("title")}</h1>

            <div className="information">
              <input
                type="text"
                placeholder={tLevel("submInfo.song")}
                name="song"
                value={form.song}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.song ? "" : "red" }}
              />
              <input
                type="text"
                placeholder={tLevel("submInfo.artist")}
                name="artist"
                value={form.artist}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.artist ? "" : "red" }}
              />
            </div>

            <div className="youtube-input">
              <input
                type="text"
                placeholder={tLevel("submInfo.videoLink")}
                name="videoLink"
                value={form.videoLink}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
              />
              {videoDetail ? 
              (<div className="youtube-info">
                <div className="yt-info">
                  <h4>{tLevel("videoInfo.title")}</h4>
                  <p>{videoDetail.title}</p>
                </div>
                <div className="yt-info">
                  <h4>{tLevel("videoInfo.channel")}</h4>
                  <p>{videoDetail.channelName}</p>
                </div>
                <div className="yt-info">
                  <h4>{tLevel("videoInfo.timestamp")}</h4>
                  <p>{videoDetail.timestamp.replace("T", " ").replace("Z", "")}</p>
                </div>
              </div>) : 
              (<div className="yt-info">
                <p style={{color: "#aaa"}}>{tLevel("videoInfo.nolink")}</p>
                <br />
              </div>)}
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
                    }}>{tLevel("tooltip")}</span>
                </div>
                <input
                  type="text"
                  placeholder={tLevel("submInfo.diff")}
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
                type="team"
                value={team}
                onChange={setTeam}
                allowNewRequest
                placeholder={tLevel("submInfo.team")}
              />
            </div>

            
            <div className="info-group" style={{marginTop: "2rem"}}>
              <input
                type="text"
                placeholder={tLevel("submInfo.dlLink")}
                name="dlLink"
                value={form.dlLink}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
              />
              <span className="dl-links-or">{tLevel("submInfo.dlLinksOr")}</span>
              <input
                type="text"
                placeholder={tLevel("submInfo.workshop")}
                name="workshopLink"
                value={form.workshopLink}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
              />
            </div>

            {pendingProfiles.length > 0 && (
              <div className="pending-profiles-warning">
                {tLevel("warnings.pendingProfiles")}
                <ul>
                  {pendingProfiles.map((profile, index) => (
                    <li key={index}>
                      {profile.type}: {profile.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="creators-section">
              <h3>{tLevel("submInfo.charters")}</h3>
              {charters.map((charter, index) => (
                <div key={index} className="creator-row">
                  <ProfileSelector
                    type="charter"
                    value={charter}
                    onChange={(value) => handleCharterChange(index, value)}
                    allowNewRequest
                    required={index === 0}
                    placeholder={tLevel("submInfo.charter")}
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
                ➕ {tLevel("buttons.addCharter")}
              </button>
            </div>

            <div className="creators-section">
              <h3>{tLevel("submInfo.vfxers")}</h3>
              {vfxers.map((vfxer, index) => (
                <div key={index} className="creator-row">
                  <ProfileSelector
                    type="vfx"
                    value={vfxer}
                    onChange={(value) => handleVfxerChange(index, value)}
                    allowNewRequest
                    required={index === 0}
                    placeholder={tLevel("submInfo.vfxer")}
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
                ➕ {tLevel("buttons.addVfxer")}
              </button>
            </div>

            <button 
              className="submit" 
              onClick={handleSubmit}
              disabled={submission}
            >
              {tLevel("submit")}{submission && (<>{tLevel("submitWait")}</>)}
            </button>
          </div>
        </form>      
      </div>
    </div>
  );
};

export default LevelSubmissionPage;
