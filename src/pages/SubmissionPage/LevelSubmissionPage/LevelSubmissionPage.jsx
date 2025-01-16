import { CompleteNav } from "@/components";
import "./levelsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getDriveFromYt, getVideoDetails } from "@/Repository/RemoteRepository";
import { useAuth } from "@/contexts/AuthContext";
import { validateFeelingRating } from "@/components/Misc/Utility";
import { useTranslation } from "react-i18next";

const LevelSubmissionPage = () => {
  const initialFormState = {
    artist: '',
    charter: '',
    diff: '',
    dlLink: '',
    song: '',
    team: '',
    vfxer: '',
    videoLink: '',
    workshopLink: ''
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

  const [videoDetail, setVideoDetail] = useState(null)

  const truncateString = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  };

  const validateForm = () => {
    const requiredFields = ['artist','charter', 'diff', 'dlLink', 'song', 'videoLink', 'workshopLink'];
    const validationResult = {};
    const displayValidationRes = {};
    
    requiredFields.forEach(field => {
      validationResult[field] = (form[field].trim() !== '');
    });
    validationResult.directLink = validationResult["dlLink"] || validationResult["workshopLink"]
    
    delete validationResult["dlLink"];
    delete validationResult["workshopLink"];
    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
    
    const frValid = validateFeelingRating(form["diff"])
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
        const videoDetails = await getVideoDetails(videoLink);
        setVideoDetail(videoDetails ? videoDetails : null);
        if (videoDetails){
          form.charter = videoDetails.channelName
        }
  
        const driveDetails = await getDriveFromYt(videoLink);
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

  const handleCloseSuccessMessage = () => {
    setShowMessage(false)
  };

  const submissionForm = new FormManager("level")
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowMessage(true)
    setSuccess(false);
    if(!user){
      console.error("no user");
      setError(tLevel("alert.login"));
      return 
    }
    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true)
      setError(tLevel("alert.form"));
      console.error("incomplete form, returning")
      return
    };

    setSubmission(true)
    setError(null);
    submissionForm.setDetail('artist', form.artist);
    submissionForm.setDetail('charter', form.charter);
    submissionForm.setDetail('diff', form.diff);
    submissionForm.setDetail('song', form.song);
    submissionForm.setDetail('team', form.team);
    submissionForm.setDetail('vfxer', form.vfxer);
    submissionForm.setDetail('videoLink', form.videoLink);
    submissionForm.setDetail('directDL', form.dlLink);
    submissionForm.setDetail('wsLink', form.workshopLink);
  
    submissionForm.submit(user.access_token)
    .then(result => {
      if (result === "ok") {
        setSuccess(true);
        setForm(initialFormState)
        setSubmitAttempt(false);
      } else {
        setError(result);
      }
    })
    .catch(err => {
      setError(err.message || "(Unknown)");
    })
    .finally(()=>{
      setSubmission(false)
      setSubmitAttempt(false);
    })
  };

  return (
    <div className="level-submission-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="form-container">
        <div className={`result-message ${showMessage ? 'visible' : ''}`} 
        style={{backgroundColor: 
        ( success? "#2b2" :
          error? "#b22":
          "#888"
        )}}>
          {success ? <p>{tLevel("alert.success")}</p> :
           error ? <p>{tLevel("alert.error")} {truncateString(error?.message || error?.toString() || error, 27)}</p> :
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
              <input
                type="text"
                placeholder={tLevel("submInfo.charter")}
                name="charter"
                value={form.charter}
                onChange={handleInputChange}
                style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
              />
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
            </div>

            <div className="info-group">
              <input
                type="text"
                placeholder={tLevel("submInfo.vfxer")}
                name="vfxer"
                value={form.vfxer}
                onChange={handleInputChange}
              />
              <input
                type="text"
                placeholder={tLevel("submInfo.team")}
                name="team"
                value={form.team}
                onChange={handleInputChange}
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

            <button disabled={submission} className="submit" onClick={handleSubmit}>
              {tLevel("submit")}{submission && (<>{tLevel("submitWait")}</>)}
            </button>
          </div>
        </form>      
      </div>
    </div>
  );
};

export default LevelSubmissionPage;
