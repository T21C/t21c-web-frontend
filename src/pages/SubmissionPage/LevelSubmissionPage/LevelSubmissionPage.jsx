import { CompleteNav } from "@/components";
import "./levelsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getDriveFromYt, getVideoDetails } from "@/Repository/RemoteRepository";
import { useAuth } from "@/context/AuthContext";
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

  const {t} = useTranslation()
  const { user } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [isInvalidFeelingRating, setIsInvalidFeelingRating] = useState(false); // Track validation
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
    setIsInvalidFeelingRating(!frValid); // Update validation state
    setIsFormValidDisplay(displayValidationRes);
    setIsFormValid(validationResult);
  };

  useEffect(() => {
    validateForm(); // Run validation on every form change
  }, [form, submitAttempt]);



  useEffect(() => {
    const { videoLink } = form;
  
    // Define an async function inside useEffect
    const fetchData = async () => {
      try {
        // Fetch video details
        const videoDetails = await getVideoDetails(videoLink);
        setVideoDetail(videoDetails ? videoDetails : null);
        if (videoDetails){
          form.charter = videoDetails.channelName
        }
  
        // Fetch Drive link from YouTube
        const driveDetails = await getDriveFromYt(videoLink);
        if (driveDetails.drive) {
          console.log(driveDetails);
  
          // Update form with drive link if available
          setForm((prevForm) => ({
            ...prevForm,
            dlLink: driveDetails.drive ? driveDetails.drive : "",
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    // Call the async function
    fetchData();
  }, [form.videoLink]); // Dependency array to re-run when form.videoLink changes
  

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

 const submissionForm = new FormManager("chart")
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowMessage(true)
    setSuccess(false);
    if(!user){
      console.log("no user");
      setError("You must be logged in.");

      return 
    }
    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true)
      setError("Incomplete form!");
      console.log("incomplete form, returning")
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
          {success ? <p>{t("levelSubmission.alert.success")}</p> :
           error ? <p>{t("levelSubmission.alert.error")} {truncateString(error?.message || error?.toString() || error, 27)}</p> :
           <p>{t("levelSubmission.alert.loading")}</p>}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>
  

        <form className={`form-container ${videoDetail ? 'shadow' : ''}`}
    style={{
      backgroundImage: `url(${videoDetail ? videoDetail.image : placeholder})`,
    }}>
  <div
    className="thumbnail-container"
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
      <h2>{t("levelSubmission.thumbnailInfo")}</h2>
      </div>
    )}
  </div>
        <div className="info">
          <h1>{t("levelSubmission.title")}</h1>

          <div className="information">
          <input
            type="text"
            placeholder={t("levelSubmission.submInfo.song")}
            name="song"
            value={form.song}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.song ? "" : "red" }}
          />
          <input
            type="text"
            placeholder={t("levelSubmission.submInfo.artist")}
            name="artist"
            value={form.artist}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.artist ? "" : "red" }}
          />
        </div>
        <div className="youtube-input">
                <input
                  type="text"
                  placeholder={t("levelSubmission.submInfo.vidLink")}
                  name="videoLink"
                  value={form.videoLink}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.videoLink ? "" : "red" }}
                />
                {videoDetail? 
                (<div className="youtube-info">
                  <div className="yt-info">
                    <h4>{t("levelSubmission.videoInfo.title")}</h4>
                    <p style={{maxWidth:"%"}}>{videoDetail.title}</p>
                  </div>

                  <div className="yt-info">
                    <h4>{t("levelSubmission.videoInfo.channel")}</h4>
                    <p>{videoDetail.channelName}</p>
                  </div>

                  <div className="yt-info">
                    <h4>{t("levelSubmission.videoInfo.timestamp")}</h4>
                    <p>{videoDetail.timestamp.replace("T", " ").replace("Z", "")}</p>
                  </div>
                </div>)
                :(
                  <div className="yt-info">
                    <p style={{color: "#aaa"}}>{t("levelSubmission.videoInfo.nolink")}</p>
                    <br />
                    </div>)}
        </div>
        <div className="info-group">
          <input
            type="text"
            placeholder={t("levelSubmission.submInfo.charter")}
            name="charter"
            value={form.charter}
            onChange={handleInputChange}
            style={{marginLeft: "6px", borderColor: isFormValidDisplay.directLink ? "" : "red" }}
         
            
          />
          <div className="diff-tooltip">
          <div className="tooltip-container">
          <span style={{
              color: 'red',
              visibility: `${isInvalidFeelingRating? '' : 'hidden'}`
            }}>?</span>
          <span className="tooltip" 
                style={{
                  visibility: `${isInvalidFeelingRating? '' : 'hidden'}`,
                 bottom: "115%",
                  left: "-2rem"}}>{t("levelSubmission.tooltip")}</span>
          </div>
            <input
            type="text"
            placeholder={t("levelSubmission.submInfo.diff")}
            name="diff"
            value={form.diff}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.diff ? "" : "red",
                    backgroundColor: isInvalidFeelingRating ? "yellow" : ""
             }}
          />
          </div>
          </div>
        <div className="info-group">
          
        <input
            type="text"
            placeholder={t("levelSubmission.submInfo.vfxer")}
            name="vfxer"
            value={form.vfxer}
            onChange={handleInputChange}
          />
          <input
            type="text"
            placeholder={t("levelSubmission.submInfo.team")}
            name="team"
            value={form.team}
            onChange={handleInputChange}
          />
          </div>
          
        <div className="info-group" style={{marginTop: "2rem",paddingLeft: "30px", paddingRight: "30px"}}>
          <input
            type="text"
            placeholder={t("levelSubmission.submInfo.dlLink")}
            name="dlLink"
            value={form.dlLink}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
          />
          <span style={{display: "flex", alignItems: "center"}}>{t("levelSubmission.submInfo.dlLinksOr")}</span>
          <input
            type="text"
            placeholder={t("levelSubmission.submInfo.workshop")}
            name="workshopLink"
            value={form.workshopLink}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
          />
        </div>

        <button disabled={submission} className="submit" onClick={handleSubmit}>{t("levelSubmission.submit")}{submission && (<>{t("levelSubmission.submitWait")}</>)}</button>
        </div>
      </form>      
    </div>
    </div>
  
  );
};

export default LevelSubmissionPage;
