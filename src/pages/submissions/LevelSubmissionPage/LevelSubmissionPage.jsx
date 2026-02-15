
import "./levelsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/misc/FormManager/FormManager";
import { useEffect, useState } from "react";
import { getVideoDetails } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { validateFeelingRating } from "@/utils/Utility";
import { Trans, useTranslation } from "react-i18next";
import { StagingModeWarning } from "@/components/common/display";
import { ProfileSelector } from "@/components/common/selectors";
import { LevelSelectionPopup, CDNTosPopup, LevelUploadPopup } from "@/components/popups/Levels";
import { SongSelectorPopup } from "@/components/popups/Songs";
import { ArtistSelectorPopup } from "@/components/popups/Artists";

import api from "@/utils/api";
import { prepareZipForUpload, validateZipSize } from '@/utils/zipUtils';
import Cookies from 'js-cookie';
import { useNavigate } from "react-router-dom";
import { hasAnyFlag, hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { QuestionmarkCircleIcon } from "@/components/common/icons";
import { Tooltip } from "react-tooltip";
import toast from "react-hot-toast";

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
    suffix: '',
    dlLink: '',
    workshopLink: '',
    charter: null,
    vfxer: null,
    team: null,
    levelZip: null,
    songId: null,
    artistId: null,
    isNewSongRequest: false,
    isNewArtistRequest: false,
    requiresSongEvidence: false,
    requiresArtistEvidence: false
  };

  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasAnyFlag(user, [permissionFlags.SUBMISSIONS_PAUSED, permissionFlags.BANNED]) || !hasFlag(user, permissionFlags.EMAIL_VERIFIED)) {
      navigate('/submission')
    }
  }, [user]);

  const [form, setForm] = useState(initialFormState);
  const [formStateKey, setFormStateKey] = useState(0);
  const [isInvalidFeelingRating, setIsInvalidFeelingRating] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});
  const [finalSubmissionId, setFinalSubmissionId] = useState(null);

  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [submission, setSubmission] = useState(false);

  const [videoDetail, setVideoDetail] = useState(null);
  const [pendingProfiles, setPendingProfiles] = useState([]);

  // State for multiple creators
  const [charters, setCharters] = useState([{ name: '', id: null, isNewRequest: false }]);
  const [vfxers, setVfxers] = useState([{ name: '', id: null, isNewRequest: false }]);
  const [team, setTeam] = useState({ name: '', id: null, isNewRequest: false });

  // State for song/artist selection
  const [selectedSong, setSelectedSong] = useState(null);
  const [artists, setArtists] = useState([{ name: '', id: null, isNewRequest: false }]);
  const [showSongSelector, setShowSongSelector] = useState(false);
  const [showArtistSelector, setShowArtistSelector] = useState({ show: false, index: 0 });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceType, setEvidenceType] = useState('song'); // 'song' or 'artist'

  const [levelZipInfo, setLevelZipInfo] = useState(null);
  const [showLevelSelection, setShowLevelSelection] = useState(false);
  const [levelFiles, setLevelFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const [showCdnTos, setShowCdnTos] = useState(false);
  const [pendingZipFile, setPendingZipFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

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

  const validateForm = () => {
    // Use selected song/artist or fallback to form text fields
    const songValue = selectedSong?.songName || form.song;
    const hasArtists = artists.some(artist => artist.name && (artist.id !== null || artist.isNewRequest));
    const artistValue = artists.length > 0 ? artists.map(a => a.name).filter(Boolean).join(', ') : form.artist;
    
    const validationResult = {};
    const displayValidationRes = {};
    
    // Validate required fields
    validationResult.artist = hasArtists || artistValue?.trim?.() !== '';
    validationResult.song = songValue?.trim?.() !== '';
    validationResult.diff = form.diff?.trim?.() !== '';
    validationResult.videoLink = form.videoLink?.trim?.() !== '';

    // Validate creators
    validationResult.charter = charters.some(charter => 
      charter.name && (charter.id !== null || charter.isNewRequest)
    );

    // Validate download links - only required if no zip is uploaded
    validationResult.directLink = form.levelZip || form.dlLink?.trim?.() !== '' || form.workshopLink?.trim?.() !== '';
    
    // Validate evidence - required when new song/artist requests exist
    const hasNewSongRequest = selectedSong?.isNewRequest || false;
    const hasNewArtistRequests = artists.some(artist => artist.isNewRequest);
    const requiresEvidence = hasNewSongRequest || hasNewArtistRequests;
    validationResult.evidence = !requiresEvidence || evidenceFiles.length > 0;
    
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
  
        if (videoDetails?.downloadLink && !form.levelZip) {
          setForm((prevForm) => ({
            ...prevForm,
            dlLink: videoDetails.downloadLink ? videoDetails.downloadLink : "",
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

  const submissionForm = new FormManager("level")
  const resetForm = () => {
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
    
    // Reset song/artist selection
    setSelectedSong(null);
    setArtists([{ name: '', id: null, isNewRequest: false }]);
    setEvidenceFiles([]);
    setEvidenceType('song');
    // Note: Artist selector will be re-enabled automatically when selectedSong is null
    
    // Reset validation states
    setSubmitAttempt(false);
    setIsInvalidFeelingRating(false);
    setIsFormValidDisplay({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!user){
      console.error("No user logged in");
      toast.error(t('levelSubmission.alert.login'));
      return;
    }

    // Validate song/artist - must have either selected or text input
    const songValue = selectedSong?.songName || form.song;
    const artistValue = artists.length > 0 ? artists.map(a => a.name).filter(Boolean).join(', ') : form.artist;
    
    if (!songValue?.trim() || !artistValue?.trim() || !form.diff?.trim() || !form.videoLink?.trim()) {
      setSubmitAttempt(true);
      toast.error(t('levelSubmission.alert.form'));
      return;
    }

    if (!Object.values(isFormValid).every(Boolean)) {
      setSubmitAttempt(true);
      toast.error(t('levelSubmission.alert.form'));
      return;
    }

    setSubmission(true);

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

      // Set song/artist data (normalized or text)
      const artistDisplayName = artists.length > 0 
        ? artists.map(a => a.name).filter(Boolean).join(', ')
        : form.artist;
      submissionForm.setDetail('artist', artistDisplayName);
      submissionForm.setDetail('song', selectedSong?.songName || form.song);
      submissionForm.setDetail('songId', selectedSong?.songId || null);
      // Use first artist ID for backward compatibility, or null if multiple artists
      const firstArtistId = artists.length === 1 && artists[0].id ? artists[0].id : null;
      submissionForm.setDetail('artistId', firstArtistId);
      submissionForm.setDetail('isNewSongRequest', selectedSong?.isNewRequest || false);
      // Check if any artist is a new request
      const hasNewArtistRequest = artists.some(artist => artist.isNewRequest);
      submissionForm.setDetail('isNewArtistRequest', hasNewArtistRequest);
      // Evidence is required when new requests exist or when verification state requires it
      const requiresSongEvidence = selectedSong?.isNewRequest || false;
      const requiresArtistEvidence = artists.some(artist => 
        artist.isNewRequest && (artist.verificationState === 'declined' || artist.verificationState === 'mostly_declined')
      );
      submissionForm.setDetail('requiresSongEvidence', requiresSongEvidence);
      submissionForm.setDetail('requiresArtistEvidence', requiresArtistEvidence);
      submissionForm.setDetail('diff', form.diff);
      submissionForm.setDetail('suffix', form.suffix || '');
      submissionForm.setDetail('videoLink', cleanedVideoUrl);
      submissionForm.setDetail('directDL', form.dlLink);
      submissionForm.setDetail('wsLink', form.workshopLink);
      
      
      submissionForm.setDetail('creatorRequests', creatorRequests);
      submissionForm.setDetail('teamRequest', teamRequest);
      submissionForm.setDetail('levelZip', form.levelZip);
      
      // Add artist requests (similar to creator requests)
      const artistRequests = artists
        .filter(artist => artist.name)
        .map(artist => ({
          artistName: artist.name,
          artistId: artist.id,
          isNewRequest: artist.isNewRequest,
          requiresEvidence: artist.isNewRequest 
            ? (artist.verificationState === 'declined' || artist.verificationState === 'mostly_declined')
            : false,
          verificationState: artist.verificationState || null
        }));
      
      submissionForm.setDetail('artistRequests', artistRequests);
      
      // Add evidence files if present - FormManager will handle File objects
      // Evidence is required when new song/artist requests exist
      const requiresEvidence = requiresSongEvidence || requiresArtistEvidence;
      if (evidenceFiles.length > 0 || requiresEvidence) {
        if (evidenceFiles.length === 0 && requiresEvidence) {
          throw new Error('Evidence is required for new song/artist requests');
        }
        submissionForm.setDetail('evidence', evidenceFiles); // Pass as array
        submissionForm.setDetail('evidenceType', evidenceType);
      }
      
      // Encode the original filename using our UTF-8 to hex encoding
      if (form.levelZip) {
        submissionForm.setDetail('originalname', encodeFilename(form.levelZip.name));
        
        // Generate uploadId for progress tracking and show popup
        const generatedUploadId = crypto.randomUUID();
        setUploadId(generatedUploadId);
        setUploadProgress(null);
        submissionForm.setDetail('uploadId', generatedUploadId);
        setShowUploadProgress(true);
        
        // Small delay to ensure SSE connection is established before upload starts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const response = await submissionForm.submit({
        onUploadProgress: (percent) => setUploadProgress(percent)
      });
      
      if (response.requiresLevelSelection) {
        setShowUploadProgress(false);
        setUploadProgress(null);
        setLevelFiles(response.levelFiles);
        setSelectedFileId(response.fileId);
        setShowLevelSelection(true);
        setFinalSubmissionId(response.submissionId);
        setSubmission(false); // Reset submission state since we're waiting for level selection
        return;
      }
      
      if (response.success) {
        if (form.levelZip) {
          // Zip upload: wait for LevelUploadPopup onUploadComplete (SSE 'completed') to reset form and show toast
        } else {
          setShowUploadProgress(false);
          setUploadProgress(null);
          resetForm();
          toast.success(t('levelSubmission.alert.success'));
        }
      } else {
        setShowUploadProgress(false);
        setUploadProgress(null);
        throw new Error(response.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setShowUploadProgress(false);
      setUploadProgress(null);
      const errMsg = error.response?.data?.error || error.message || error.error || "Unknown error occurred";
      toast.error(`${t('levelSubmission.alert.error')} ${typeof errMsg === 'string' ? errMsg : errMsg?.message || ''}`);
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
        toast.success(t('levelSubmission.alert.success'));
      } else {
        throw new Error(response.data.error || 'Failed to select level');
      }
    } catch (error) {
      console.error('Level selection error:', error);
      toast.error(error.message || 'Failed to select level');
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
        toast.success(t('levelSubmission.alert.success'));
      } else {
        throw new Error(response.data.error || 'Failed to select level');
      }
    } catch (error) {
      console.error('Level selection error:', error);
      toast.error(error.message || 'Failed to select level');
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

  const addArtist = () => {
    if (!Array.isArray(artists)) {
      setArtists([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    setArtists([...artists, { name: '', id: null, isNewRequest: false }]);
  };

  const removeArtist = (index) => {
    if (!Array.isArray(artists)) {
      setArtists([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    if (artists.length === 1) {
      // Keep at least one empty entry
      setArtists([{ name: '', id: null, isNewRequest: false }]);
    } else {
      setArtists(artists.filter((_, i) => i !== index));
    }
    
    // Update form
    const updatedArtists = artists.filter((_, i) => i !== index);
    const artistDisplayName = updatedArtists.map(a => a.name).filter(Boolean).join(', ');
    const hasNewArtistRequest = updatedArtists.some(a => a.isNewRequest);
    setForm(prev => ({
      ...prev,
      artist: artistDisplayName,
      artistId: updatedArtists.length === 1 && updatedArtists[0].id ? updatedArtists[0].id : null,
      isNewArtistRequest: hasNewArtistRequest,
      requiresArtistEvidence: hasNewArtistRequest
    }));
  };

  const handleArtistChange = (index, value) => {
    if (!Array.isArray(artists)) {
      setArtists([{ name: '', id: null, isNewRequest: false }]);
      return;
    }
    const updatedArtists = artists.map((artist, i) => 
      i === index ? (value || { name: '', id: null, isNewRequest: false }) : artist
    );
    setArtists(updatedArtists);
    
    // Update form
    const artistDisplayName = updatedArtists.map(a => a.name).filter(Boolean).join(', ');
    const hasNewArtistRequest = updatedArtists.some(a => a.isNewRequest);
    setForm(prev => ({
      ...prev,
      artist: artistDisplayName,
      artistId: updatedArtists.length === 1 && updatedArtists[0].id ? updatedArtists[0].id : null,
      isNewArtistRequest: hasNewArtistRequest,
      requiresArtistEvidence: hasNewArtistRequest
    }));
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
        toast.error(t('levelSubmission.alert.invalidZipSize', { maxSize: 140 }));
        return;
      }

      // Prepare zip file for upload
      const preparedZip = prepareZipForUpload(file);
      if (!preparedZip) {
        toast.error(t('levelSubmission.alert.invalidZip'));
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
      toast.error(t('levelSubmission.alert.invalidZip'));
    }
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasAgreedToCdnTos()) {
      setPendingZipFile(file);
      setShowCdnTos(true);
      return;
    }

    processZipUpload(file);
    // Reset input so selecting the same file works again
    event.target.value = '';
  };

  const handleRemoveZip = () => {
    setLevelZipInfo(null);
    setForm(prev => ({
      ...prev,
      levelZip: null
    }));
  };

  // Drag and drop handlers for zip upload
  const handleZipDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleZipDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleZipDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the container entirely
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const handleZipDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    // Check if it's a zip file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error(t('levelSubmission.alert.invalidZip'));
      return;
    }

    if (!hasAgreedToCdnTos()) {
      setPendingZipFile(file);
      setShowCdnTos(true);
      return;
    }

    processZipUpload(file);
  };

  return (
    <div className="level-submission-page">
      
      <div className="form-container">
        {import.meta.env.MODE !== "production" && <StagingModeWarning />}

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

        {/* Level Upload Progress Popup */}
        {showUploadProgress && (
          <LevelUploadPopup
            isOpen={showUploadProgress}
            onClose={() => { setShowUploadProgress(false); setUploadProgress(null); }}
            fileName={levelZipInfo?.name}
            uploadId={uploadId}
            uploadProgress={uploadProgress}
            onUploadComplete={() => {
              setShowUploadProgress(false);
              setUploadProgress(null);
              resetForm();
              toast.success(t('levelSubmission.alert.success'));
            }}
          />
        )}

        {/* Song Selector Popup */}
        {showSongSelector && (
          <SongSelectorPopup
            onClose={() => setShowSongSelector(false)}
            onSelect={async (songData) => {
              // Force evidence requirement for new song requests
              const requiresEvidence = songData.isNewRequest ? true : (songData.requiresEvidence || false);
              const finalSongData = {
                ...songData,
                requiresEvidence: requiresEvidence
              };
              
              setSelectedSong(finalSongData);
              setForm(prev => ({
                ...prev,
                song: finalSongData.songName || prev.song,
                songId: finalSongData.songId || null,
                isNewSongRequest: finalSongData.isNewRequest || false,
                requiresSongEvidence: requiresEvidence
              }));
              
              // If a valid song is selected (not a new request), fetch artists and auto-assign them
              if (finalSongData.songId && !finalSongData.isNewRequest) {
                try {
                  const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/songs/${finalSongData.songId}`);
                  const songDetails = response.data;
                  
                  if (songDetails?.credits && songDetails.credits.length > 0) {
                    // Extract artists from credits and populate artists array
                    const songArtists = songDetails.credits
                      .map(credit => credit.artist)
                      .filter(Boolean)
                      .map(artist => ({
                        name: artist.name,
                        id: artist.id,
                        isNewRequest: false
                      }));
                    
                    if (songArtists.length > 0) {
                      setArtists(songArtists);
                      const artistDisplayName = songArtists.map(a => a.name).join(', ');
                      setForm(prev => ({
                        ...prev,
                        artist: artistDisplayName,
                        artistId: songArtists.length === 1 ? songArtists[0].id : null
                      }));
                    }
                  }
                } catch (error) {
                  console.error('Error fetching song details for artists:', error);
                  // Don't show error to user, just continue without auto-assigning artists
                }
              } else {
                // If it's a new song request or no songId, keep existing artists but don't reset them
                // Users can have artists selected before requesting a new song
                // Only reset if artists array is empty
                if (!artists || artists.length === 0 || artists.every(a => !a.name)) {
                  setArtists([{ name: '', id: null, isNewRequest: false }]);
                  setForm(prev => ({
                    ...prev,
                    artist: '',
                    artistId: null
                  }));
                } else {
                  // Keep existing artists, just update form with artist display name
                  const artistDisplayName = artists.map(a => a.name).filter(Boolean).join(', ');
                  const hasNewArtistRequest = artists.some(a => a.isNewRequest);
                  setForm(prev => ({
                    ...prev,
                    artist: artistDisplayName,
                    artistId: artists.length === 1 && artists[0].id ? artists[0].id : null,
                    isNewArtistRequest: hasNewArtistRequest,
                    requiresArtistEvidence: hasNewArtistRequest
                  }));
                }
              }
              
              setShowSongSelector(false);
            }}
            initialSong={selectedSong}
          />
        )}

        {/* Artist Selector Popup */}
        {showArtistSelector.show && (
          <ArtistSelectorPopup
            onClose={() => setShowArtistSelector({ show: false, index: 0 })}
            onSelect={(artistData) => {
              // Calculate requiresEvidence from verificationState for new requests
              const requiresEvidence = artistData.isNewRequest 
                ? (artistData.verificationState === 'declined' || artistData.verificationState === 'mostly_declined')
                : (artistData.requiresEvidence || false);
              const finalArtistData = {
                ...artistData,
                requiresEvidence: requiresEvidence,
                verificationState: artistData.verificationState || null
              };
              
              // Update the specific artist in the array
              const updatedArtists = [...artists];
              updatedArtists[showArtistSelector.index] = {
                name: finalArtistData.artistName || '',
                id: finalArtistData.artistId || null,
                isNewRequest: finalArtistData.isNewRequest || false,
                verificationState: finalArtistData.verificationState || null
              };
              setArtists(updatedArtists);
              
              // Update form with combined artist names
              const artistDisplayName = updatedArtists.map(a => a.name).filter(Boolean).join(', ');
              const hasNewArtistRequest = updatedArtists.some(a => a.isNewRequest);
              const requiresArtistEvidence = updatedArtists.some(a => 
                a.isNewRequest && (a.verificationState === 'declined' || a.verificationState === 'mostly_declined')
              );
              setForm(prev => ({
                ...prev,
                artist: artistDisplayName,
                artistId: updatedArtists.length === 1 && updatedArtists[0].id ? updatedArtists[0].id : null,
                isNewArtistRequest: hasNewArtistRequest,
                requiresArtistEvidence: requiresArtistEvidence
              }));
              
              setShowArtistSelector({ show: false, index: 0 });
            }}
            initialArtist={artists[showArtistSelector.index] || { name: '', id: null, isNewRequest: false }}
          />
        )}

        <form className={`main-form form-container ${videoDetail ? 'shadow' : ''}`}>
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
              <div 
                className="song-selector-field"
                onClick={() => setShowSongSelector(true)}
                style={{ 
                  borderColor: isFormValidDisplay.song ? "" : "red",
                  cursor: 'pointer'
                }}
              >
                <input
                  type="text"
                  autoComplete='level-song'
                  placeholder={t('levelSubmission.submInfo.song')}
                  name="song"
                  value={selectedSong?.songName || form.song}
                  readOnly
                  style={{ cursor: 'pointer' }}
                />
                {selectedSong && (
                  <span className="selector-badge">
                    {selectedSong.isNewRequest ? 'New Request' : 'Selected'}
                  </span>
                )}
              </div>
              <div className="suffix-input">
                <input 
                  type="text"
                  autoComplete='level-suffix'
                  placeholder={t('levelSubmission.submInfo.suffix')}
                  name="suffix"
                  value={form.suffix}
                  onChange={handleInputChange}
                />
                < QuestionmarkCircleIcon 
                style={{opacity: 0.7}}
                className="suffix-tooltip-icon" 
                data-tooltip-id="suffix-tooltip" 
                data-tooltip-place="bottom"
                />
                <Tooltip 
                id="suffix-tooltip" 
                style={{maxWidth: "400px", zIndex: 100}}>
                  <Trans 
                  ns={"pages"}
                  i18nKey="levelSubmission.suffixTooltip" 
                  components={{ bold: <b /> }} />
                </Tooltip>
              </div>
              <br/>
              <h3>{t('levelSubmission.submInfo.artists')}</h3>
              {Array.isArray(artists) && artists.map((artist, index) => (
                <div key={index} className="creator-row">
                  <div 
                    className="artist-selector-field"
                    onClick={() => {
                      // Only allow opening if artist selector is not disabled (when existing song is selected)
                      if (!selectedSong?.songId || selectedSong?.isNewRequest) {
                        setShowArtistSelector({ show: true, index });
                      }
                    }}
                    style={{ 
                      borderColor: isFormValidDisplay.artist ? "" : "red",
                      cursor: (selectedSong?.songId && !selectedSong?.isNewRequest) ? 'not-allowed' : 'pointer',
                      opacity: (selectedSong?.songId && !selectedSong?.isNewRequest) ? 0.6 : 1
                    }}
                  >
                    <input
                      type="text"
                      autoComplete='level-artist'
                      placeholder={t('levelSubmission.submInfo.artist')}
                      name={`artist-${index}`}
                      value={artist.name || ''}
                      readOnly
                      disabled={selectedSong?.songId && !selectedSong?.isNewRequest}
                      style={{ 
                        cursor: (selectedSong?.songId && !selectedSong?.isNewRequest) ? 'not-allowed' : 'pointer'
                      }}
                    />
                    {artist.name && (
                      <span className="selector-badge">
                        {artist.isNewRequest ? 'New Request' : selectedSong?.songId && !selectedSong?.isNewRequest ? 'Auto-assigned' : 'Selected'}
                      </span>
                    )}
                  </div>
                  {index > 0 && (
                    <button 
                      className="creator-action-btn remove-creator-btn"
                      onClick={() => removeArtist(index)}
                      type="button"
                      disabled={selectedSong?.songId && !selectedSong?.isNewRequest}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              {(!selectedSong?.songId || selectedSong?.isNewRequest) && (
                <button 
                  className="creator-action-btn add-creator-btn"
                  onClick={addArtist}
                  type="button"
                >
                  ➕ {t('levelSubmission.buttons.addArtist')}
                </button>
              )}
            </div>



            <div className="youtube-input">
              <input
                type="text"
                autoComplete='level-video-link'
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
                <div 
                  className={`zip-upload-container ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleZipDragOver}
                  onDragEnter={handleZipDragEnter}
                  onDragLeave={handleZipDragLeave}
                  onDrop={handleZipDrop}
                >
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    id="levelZip"
                    style={{ display: 'none' }}
                  />
                  {
                  <label htmlFor="levelZip" className={`zip-upload-button ${isDragOver ? 'drag-over' : ''}`}>
                    {t('levelSubmission.buttons.uploadZip')}
                  </label>
                  }
                  <p className="zip-drop-hint">{isDragOver ? t('levelSubmission.buttons.dropHere') : t('levelSubmission.buttons.orDragDrop')}</p>
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

            {/* Evidence Upload Section */}
            {(selectedSong?.isNewRequest || artists.some(artist => artist.isNewRequest)) && (
              <div className="evidence-upload-section">
                <h3>{t('levelSubmission.submInfo.evidence')}</h3>
                <div className="evidence-type-selector">
                  {selectedSong?.isNewRequest && (
                    <label>
                      <input
                        type="radio"
                        name="evidenceType"
                        value="song"
                        checked={evidenceType === 'song'}
                        onChange={(e) => setEvidenceType(e.target.value)}
                      />
                      {t('levelSubmission.submInfo.evidenceForSong')}
                    </label>
                  )}
                  {artists.some(artist => artist.isNewRequest) && (
                    <label>
                      <input
                        type="radio"
                        name="evidenceType"
                        value="artist"
                        checked={evidenceType === 'artist'}
                        onChange={(e) => setEvidenceType(e.target.value)}
                      />
                      {t('levelSubmission.submInfo.evidenceForArtist')}
                    </label>
                  )}
                </div>
                {evidenceFiles.length === 0 && (
                  <div className="evidence-required-warning" style={{ color: 'red', marginTop: '10px' }}>
                    {t('levelSubmission.alert.evidenceRequired')}
                  </div>
                )}
                <div className="evidence-files-container">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const MAX_EVIDENCE_SIZE_MB = 10;
                      const maxBytes = MAX_EVIDENCE_SIZE_MB * 1024 * 1024;
                      const files = Array.from(e.target.files || []);
                      const oversized = files.filter((f) => f.size > maxBytes);
                      if (oversized.length > 0) {
                        toast.error(t('levelSubmission.alert.evidenceFileTooLarge', { maxMb: MAX_EVIDENCE_SIZE_MB }));
                        return;
                      }
                      if (files.length + evidenceFiles.length > 10) {
                        toast.error(t('levelSubmission.alert.maxEvidenceFiles'));
                        return;
                      }
                      setEvidenceFiles(prev => [...prev, ...files].slice(0, 10));
                    }}
                    id="evidenceFiles"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="evidenceFiles" className="evidence-upload-button">
                    {t('levelSubmission.buttons.uploadEvidence')} ({evidenceFiles.length}/10)
                  </label>
                  {evidenceFiles.length > 0 && (
                    <div className="evidence-files-list">
                      {evidenceFiles.map((file, index) => (
                        <div key={index} className="evidence-file-item">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setEvidenceFiles(prev => prev.filter((_, i) => i !== index))}
                            className="remove-evidence-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  autoComplete='off'
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
                autoComplete='level-dl-link'
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
                autoComplete='level-workshop-link'
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
