import { CompleteNav } from "../../components";
import "./levelsubmission.css";
import image from "../../assets/placeholder/3.png";
import { GoogleFormSubmitter } from "../../components/FormManager/googleForm";
import { useEffect, useRef, useState } from "react";
import { getYouTubeThumbnailUrl, getYouTubeVideoDetails } from "../../Repository/RemoteRepository";
import { useAuth } from "../../context/AuthContext";

const LevelSubmissionPage = () => {
  const initialFormState = {
    artist: '',
    charter: '',
    creator: '',
    diff: '',
    dlLink: '',
    song: '',
    team: '',
    vfxer: '',
    vidLink: '',
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

  const [youtubeDetail, setYoutubeDetail] = useState(null)
  


  const validateFeelingRating = (value) => {
    const regex = /^$|^[PGUpgu][1-9]$|^[PGUpgu]1[0-9]$|^[PGUpgu]20$/; // Validate P,G,U followed by 1-20
    return regex.test(value);
  };

  const truncateString = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  };

  const validateForm = () => {
    const requiredFields = ['artist', 'creator', 'diff', 'dlLink', 'song', 'vidLink', 'workshopLink'];
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
    const { vidLink } = form;
    
    getYouTubeVideoDetails(vidLink).then((res) => {
      setYoutubeDetail(
        res
          ? res
          : null
      );
    });
  }, [form.vidLink]);

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

 const googleForm = new GoogleFormSubmitter("chart")
  const handleSubmit = (e) => {
  e.preventDefault()
    
  if (!user) {
    console.log("no user");
    return;
  }
  if (!Object.values(isFormValid).every(Boolean)) {
    setSubmitAttempt(true);
    console.log("incomplete form, returning");
    return;
  }

  setShowMessage(true)
  setError(null);
  setSuccess(false);
  googleForm.setDetail('artist', form.artist);
  googleForm.setDetail('charter', form.charter);
  googleForm.setDetail('creator', form.creator);
  googleForm.setDetail('diff', form.diff);
  googleForm.setDetail('song', form.song);
  googleForm.setDetail('team', form.team);
  googleForm.setDetail('vfxer', form.vfxer);
  googleForm.setDetail('videoLink', form.vidLink);
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
          error? (<p>Error ocurred: {truncateString(error, 20)}</p>):
          (<p>Submitting...</p>)}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>
      <form>
        
        <div className="img-wrapper">
          <img src={getYouTubeThumbnailUrl(form.vidLink) || image} alt="" />
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
                  name="vidLink"
                  value={form.vidLink}
                  onChange={handleInputChange}
                  style={{ borderColor: isFormValidDisplay.vidLink ? "" : "red" }}
                />
                {youtubeDetail? 
                (<div className="information">
                  <div className="yt-info">
                    <h4>YT Title</h4>
                    <p>{youtubeDetail.title}</p>
                  </div>

                  <div className="yt-info">
                    <h4>Channel</h4>
                    <p>{youtubeDetail.channelName}</p>
                  </div>

                  <div className="yt-info">
                    <h4>Timestamp</h4>
                    <p>{youtubeDetail.timestamp}</p>
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
          />
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
        <div className="info-group">
          <input
            type="text"
            placeholder="Creator"
            name="creator"
            value={form.creator}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.creator ? "" : "red" }}
          />
          <input
            type="text"
            placeholder="Team Name"
            name="team"
            value={form.team}
            onChange={handleInputChange}
          />
        </div>

        <div className="info-group">
          <input
            type="text"
            placeholder="VFX-ers"
            name="vfxer"
            value={form.vfxer}
            onChange={handleInputChange}
          />
          </div>
          
        <div className="info-group">
          <input
            type="text"
            placeholder="Download Link"
            name="dlLink"
            value={form.dlLink}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
          />
          <input
            type="text"
            placeholder="Workshop Link"
            name="workshopLink"
            value={form.workshopLink}
            onChange={handleInputChange}
            style={{ borderColor: isFormValidDisplay.directLink ? "" : "red" }}
          />
        </div>

            <button className="submit" onClick={handleSubmit}>Submit</button>
        </div>
      </form>      
    </div>
    </div>
  
  );
};

export default LevelSubmissionPage;
