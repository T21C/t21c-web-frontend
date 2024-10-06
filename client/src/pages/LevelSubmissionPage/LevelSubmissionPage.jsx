import { CompleteNav } from "../../components";
import "./levelsubmission.css";
import image from "../../assets/placeholder/3.png";
import { GoogleFormSubmitter } from "../../components/FormManager/googleForm";
import { useEffect, useState } from "react";
import { checkLevel, getYouTubeThumbnailUrl, getYouTubeVideoDetails } from "../../Repository/RemoteRepository";
import calcAcc from "../../components/Misc/CalcAcc";
import { getScoreV2 } from "../../components/Misc/CalcScore";
import { parseJudgements } from "../../components/Misc/ParseJudgements";
import { useAuth } from "../../context/AuthContext";
import {FetchIcon} from "../../components/FetchIcon/FetchIcon"

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
  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [level, setLevel] = useState(null);

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
    const requiredFields = ['artist', 'charter', 'creator', 'diff', 'dlLink', 'song', 'team', 'vfxer', 'vidLink', 'workshopLink'];
    const validationResult = {};
    const displayValidationRes = {};
    
    requiredFields.forEach(field => {
      validationResult[field] = (form[field].trim() !== '');
    });
  
    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }
  
    setIsFormValidDisplay(displayValidationRes);
    setIsFormValid(validationResult);
  };

  useEffect(() => {
    validateForm(); // Run validation on every form change
  }, [form, level, submitAttempt]);



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

    const updatedForm = {
      ...form,
      [name]: value,
    };

    if (name === 'suggested') {
      const isValid = validateFeelingRating(value);
      setIsInvalidFeelingRating(!isValid); // Update validation state

      if (!isValid) {
        e.target.style.backgroundColor = 'yellow';
      } else {
        e.target.style.backgroundColor = ''; // Reset to default
      }
    }
  };


 const googleForm = new GoogleFormSubmitter()
  const handleSubmit = (e) => {
  e.preventDefault();
  if (!user) {
    console.log("no user");
    return;
  }
  if (!Object.values(isFormValid).every(Boolean)) {
    setSubmitAttempt(true);
    console.log("incomplete form, returning");
    return;
  }

  googleForm.setDetail('Artist', form.artist);
  googleForm.setDetail('Charter', form.charter);
  googleForm.setDetail('Creator', form.creator);
  googleForm.setDetail('Difficulty', form.diff);
  googleForm.setDetail('Song', form.song);
  googleForm.setDetail('Team', form.team);
  googleForm.setDetail('VFX Artist', form.vfxer);
  googleForm.setDetail('Video Link', form.vidLink);
  googleForm.setDetail('Download Link', form.dlLink);
  googleForm.setDetail('Workshop Link', form.workshopLink);
  
  googleForm.submit(user.access_token);
};

  return (
    <div className="pass-submission-page">
      <CompleteNav />
      <div className="background-level"></div>

      <form style={{marginTop: "4rem"}}>
        <div className="img-wrapper">
          <img src={getYouTubeThumbnailUrl(form.vidLink) || image} alt="" />
        </div>

        <div className="info">
    <h1>New Submission</h1>

    <div className="input-group">
      <input
        type="text"
        placeholder="Artist"
        name="artist"
        value={form.artist}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Charter"
        name="charter"
        value={form.charter}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Creator"
        name="creator"
        value={form.creator}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Difficulty"
        name="diff"
        value={form.diff}
        onChange={handleInputChange}
      />
    </div>

    <div className="input-group">
      <input
        type="text"
        placeholder="Song"
        name="song"
        value={form.song}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Team"
        name="team"
        value={form.team}
        onChange={handleInputChange}
      />
    </div>

    <div className="input-group">
      <input
        type="text"
        placeholder="VFX Artist"
        name="vfxer"
        value={form.vfxer}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Video Link"
        name="vidLink"
        value={form.vidLink}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Download Link"
        name="dlLink"
        value={form.dlLink}
        onChange={handleInputChange}
      />
      <input
        type="text"
        placeholder="Workshop Link"
        name="workshopLink"
        value={form.workshopLink}
        onChange={handleInputChange}
      />
    </div>

          <button className="submit" onClick={handleSubmit}>Submit</button>
        </div>
      </form>
    </div>
  
  );
};

export default LevelSubmissionPage;
