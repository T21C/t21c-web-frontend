import { CompleteNav } from "../../components";
import "./levelsubmission.css";
import placeholder from "../../assets/placeholder/3.png";
import { FormManager } from "../../components/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getVideoDetails } from "../../Repository/RemoteRepository";
import { useAuth } from "../../context/AuthContext";
import { validateFeelingRating } from "../../components/Misc/Utility";

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
    
    getVideoDetails(videoLink).then((res) => {
      setVideoDetail(
        res
          ? res
          : null
      );
    });


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

 const googleForm = new FormManager("chart")
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
  googleForm.setDetail('artist', form.artist);
  googleForm.setDetail('charter', form.charter);
  googleForm.setDetail('diff', form.diff);
  googleForm.setDetail('song', form.song);
  googleForm.setDetail('team', form.team);
  googleForm.setDetail('vfxer', form.vfxer);
  googleForm.setDetail('videoLink', form.videoLink);
  googleForm.setDetail('directDL', form.dlLink);
  googleForm.setDetail('wsLink', form.workshopLink);
  
  googleForm.submit(user.access_token)
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
          {success? (<p>Form submitted successfully!</p>) :
          error? (<p>Error: {truncateString(error, 27)}</p>):
          (<p>Submitting...</p>)}
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
      <h2>Video not found</h2>
      </div>
    )}
  </div>
        <div className="info">
          <h1>Submit a Level</h1>

          <div className="information">
          <input
            type="text"
            placeholder="Song"
            name="song"
            value={form.song}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.song ? "" : "red" }}
          />
          <input
            type="text"
            placeholder="Artist"
            name="artist"
            value={form.artist}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.artist ? "" : "red" }}
          />
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
                {videoDetail? 
                (<div className="youtube-info">
                  <div className="yt-info">
                    <h4>YT Title</h4>
                    <p style={{maxWidth:"%"}}>{videoDetail.title}</p>
                  </div>

                  <div className="yt-info">
                    <h4>Channel</h4>
                    <p>{videoDetail.channelName}</p>
                  </div>

                  <div className="yt-info">
                    <h4>Timestamp</h4>
                    <p>{videoDetail.timestamp}</p>
                  </div>
                </div>)
                :(
                  <div className="yt-info">
                    <p style={{color: "#aaa"}}>No link provided</p>
                    <br />
                    </div>)}
        </div>
        <div className="info-group">
          <input
            type="text"
            placeholder="Charter"
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
                  left: "-2rem"}}>Unknown difficulty, will submit but please make sure it's readable by the managers. Correct diff ex.: G13; P7~P13; 21.1+; 19~20.0+</span>
          </div>
            <input
            type="text"
            placeholder="Difficulty"
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
            placeholder="VFX-ers (opt.)"
            name="vfxer"
            value={form.vfxer}
            onChange={handleInputChange}
          />
          <input
            type="text"
            placeholder="Team Name (opt.)"
            name="team"
            value={form.team}
            onChange={handleInputChange}
          />
          </div>
          
        <div className="info-group" style={{marginTop: "2rem",paddingLeft: "30px", paddingRight: "30px"}}>
          <input
            type="text"
            placeholder="Download Link"
            name="dlLink"
            value={form.dlLink}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
          />
          <span style={{display: "flex", alignItems: "center"}}>or</span>
          <input
            type="text"
            placeholder="Workshop Link"
            name="workshopLink"
            value={form.workshopLink}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
          />
        </div>

          <button disabled={submission} className="submit" onClick={handleSubmit}>Submit {submission && (<>(please wait)</>)}</button>
        </div>
      </form>      
    </div>
    </div>
  
  );
};

export default LevelSubmissionPage;
