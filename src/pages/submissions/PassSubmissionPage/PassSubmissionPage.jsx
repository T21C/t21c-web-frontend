
import "./passsubmission.css";
import placeholder from "@/assets/placeholder/3.png";
import { FormManager } from "@/components/misc/FormManager/FormManager";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FetchIcon } from "@/components/common/icons";
import { hasAnyFlag, hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import { StagingModeWarning } from "@/components/common/display";
import { PlayerInput } from "@/components/common/selectors";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { useNavigate } from "react-router-dom";
import RulePopup from "./RulePopup";
import { formatCreatorDisplay } from "@/utils/Utility";
import { getCookie, setCookie } from "@/utils/cookieUtils";
import toast from "react-hot-toast";
import { PassCoreForm } from "@/components/common/cores/PassCoreForm/PassCoreForm";
import { usePassCoreForm } from "@/components/common/cores/PassCoreForm/usePassCoreForm";
import { truncateString } from "@/utils/Utility";


const PassSubmissionPage = () => {
  const initialFormState = {
    levelId: '',
    videoLink: '',
    playerId: '',
    leaderboardName: '',
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
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasAnyFlag(user, [permissionFlags.SUBMISSIONS_PAUSED, permissionFlags.BANNED]) || !hasFlag(user, permissionFlags.EMAIL_VERIFIED)) {
      navigate('/submission')
    }
  }, [user]);


  const [formStateKey, setFormStateKey] = useState(0);
  const [submission, setSubmission] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const searchCancelTokenRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  // PlayerInput on this page does not offer creating new players; select an existing profile only.

  const [searchInput, setSearchInput] = useState('');
  const searchTimeoutRef = useRef(null);

  // Add state for rules checkbox and popup
  const [hasReadPassRules, setHasReadRules] = useState(() => {
    // Initialize from cookie if available
    const savedRulesState = getCookie('hasReadPassRules');
    return savedRulesState === 'true';
  });
  const [showRulesPopup, setShowRulesPopup] = useState(false);

  // Add color logic for FetchIcon
  const getIconColor = () => {
    if (!form.levelId) return "#ffc107";
    if (levelLoading) return "#ffc107";
    if (!level) return "#dc3545";
    return "#28a745";
  };

  const {
    form,
    setForm,
    submitAttempt,
    setSubmitAttempt,
    isFormValid,
    isFormValidDisplay,
    isValidFeelingRating,
    isValidSpeed,
    level,
    setLevel,
    levelLoading,
    videoDetail,
    accuracy,
    score,
    isUDiff,
    handleInputChange,
  } = usePassCoreForm({
    mode: "submit",
    initialForm: initialFormState,
    rejectDeletedLevel: true,
    isUDiffLevel: (lvl) =>
      difficultyDict[lvl?.difficulty?.id]?.name?.[0] === "U" || difficultyDict[lvl?.difficulty?.id]?.name?.[0] === "Q",
    requireKeyModeWhenUDiff: true,
    extraValidation: ({ form: nextForm }) => ({
      playerId: Boolean(nextForm.playerId),
      rulesAccepted: hasReadPassRules,
    }),
  });

  // Save hasReadPassRules state to cookie whenever it changes
  useEffect(() => {
    if (hasReadPassRules) {
      setCookie('hasReadPassRules', 'true', 30); // Save for 30 days
    }
  }, [hasReadPassRules]);

  // Add cleanup for search requests when component unmounts
  useEffect(() => {
    return () => {
      if (searchCancelTokenRef.current) {
        searchCancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { username } = user;
      try {
        // Search for profiles matching the channel name
        const searchUrl = `${import.meta.env.VITE_PLAYERS}/search/${encodeURIComponent(username)}`;

        const response = await api.get(searchUrl);
        const body = response.data;
        const profiles = Array.isArray(body) ? body : (body?.results ?? []);

        // Find exact match (case insensitive)
        const exactMatchResult = profiles.find(p => 
          p.player.name.toLowerCase() === user.nickname.toLowerCase()
        );

        // Directly set the form state with the profile data
        if (exactMatchResult?.player?.id) {
          setForm((prev) => ({
            ...prev,
            playerId: exactMatchResult.player.id,
            leaderboardName: exactMatchResult.player.name,
          }));
        } else {
          // Pre-fill name only; user must select an existing player from the dropdown
          setForm((prev) => ({
            ...prev,
            playerId: "",
            leaderboardName: username,
          }));
        }
      } catch (error) {
        console.error('[Profile Search] Error searching profiles:', error);
        setForm((prev) => ({
          ...prev,
          playerId: "",
          leaderboardName: username,
        }));
      }
    };

    fetchProfile();
  }, []);

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
    
    if(!user){
      console.error("No user logged in");
      toast.error(t('passSubmission.alert.login'));
      return;
    }

    
    const validityEntries =
      isFormValid && typeof isFormValid === 'object' ? Object.entries(isFormValid) : [];
    const invalidKeys = validityEntries.filter(([, ok]) => !ok).map(([k]) => k);

    if (invalidKeys.length > 0) {
      setSubmitAttempt(true);

      const labelForKey = (k) => {
        const fallback = {
          levelId: 'Level ID',
          videoLink: 'Video link',
          player: 'Player',
          speed: 'Speed',
          feelingRating: 'Feeling difficulty',
          ePerfect: 'Early Perfect',
          perfect: 'Perfect',
          lPerfect: 'Late Perfect',
          tooEarly: 'Too Early',
          early: 'Early',
          late: 'Late',
          rulesAccepted: 'Rules accepted',
          keyMode: '12K/16K',
        };
        return t(`passSubmission.fieldShort.${k}`, { defaultValue: fallback[k] || k });
      };

      const shownCount = 3;
      const invalidFieldsText = invalidKeys.map(labelForKey).slice(0, shownCount).join(', ');
      const remainingCount = invalidKeys.length - shownCount;
      const moreText = remainingCount > 0 ? ` ${t('passSubmission.alert.more', { count: remainingCount })}` : '';
      toast.error(`${t('passSubmission.alert.form')}: ${invalidFieldsText}${moreText}`);
      return;
    }

    setSubmission(true);

    try {
      // Clean the video URL before submission
      const cleanedVideoUrl = cleanVideoUrl(form.videoLink);

      submissionForm.setDetail('levelId', form.levelId);
      submissionForm.setDetail('videoLink', cleanedVideoUrl);
      submissionForm.setDetail('passer', form.leaderboardName || '');
      submissionForm.setDetail('passerId', form.playerId || null);
      submissionForm.setDetail('passerRequest', false);
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
      submissionForm.setDetail('is12K', isUDiff && form.is12K);
      submissionForm.setDetail('isNoHoldTap', form.isNoHold);
      submissionForm.setDetail('is16K', isUDiff && form.is16K);

      const result = await submissionForm.submit();
      toast.success(t('passSubmission.alert.success'));
      setFormStateKey(prevKey => prevKey + 1);
      setForm(initialFormState);
      setSearchInput('');

    } catch (err) {
      console.error("Submission error:", err);
      const errMsg = err.response?.data?.error || err.message || err.error || "Unknown error occurred";
      toast.error(`${t('passSubmission.alert.error')} ${truncateString(errMsg?.message || errMsg?.toString?.() || errMsg, 120)}`);
    } finally {
      setSubmission(false);
      setSubmitAttempt(false);
    }
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

  // Profile selection is handled by PlayerInput now.

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
      
      <div className="form-container">
        {import.meta.env.MODE !== "production" && <StagingModeWarning />}
        <PassCoreForm
          mode="submit"
          placeholderImage={placeholder}
          form={form}
          isFormValidDisplay={isFormValidDisplay}
          isValidSpeed={isValidSpeed}
          isValidFeelingRating={isValidFeelingRating}
          isValidTimestamp={true}
          submitAttempt={submitAttempt}
          isFormValid={isFormValid}
          holdCheckboxVisibility={
            !level?.tags || level?.tags?.some((tag) => tag.name === "Hold") ? "visible" : "hidden"
          }
          keyModeError={isUDiff && submitAttempt && !isFormValid.keyMode}
          level={level}
          levelLoading={levelLoading}
          videoDetail={videoDetail}
          accuracy={accuracy}
          score={score}
          onInputChange={handleInputChange}
          levelIdValue={searchInput}
          onLevelIdChange={handleLevelInputChange}
          renderLevelIdInput={() => (
            <>
              <div className="search-container" ref={searchContainerRef}>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={t("passSubmission.submInfo.levelId")}
                  name="levelId"
                  value={searchInput}
                  onChange={handleLevelInputChange}
                  style={{ borderColor: isFormValidDisplay.levelId ? "" : "red" }}
                />
                {searchResults.length > 0 && (
                  <button
                    type="button"
                    className={`expand-button btn-fill-primary ${isExpanded ? "expanded" : ""}`}
                    onClick={toggleExpand}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                )}
              </div>

              <div className={`level-dropdown ${isExpanded ? "expanded" : ""}`} ref={dropdownRef}>
                {searchResults.map((result) => (
                  <div key={result.id} className="level-option" onClick={() => handleLevelSelect(result)}>
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
                        <span>{formatCreatorDisplay(result)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          renderLevelInfoLeading={() =>
            level && form.levelId ? (
              <img
                src={difficultyDict[level.difficulty.id]?.icon}
                alt={difficultyDict[level.difficulty.id]?.name}
                className="level-icon"
              />
            ) : null
          }
          renderVerified={() => <FetchIcon form={form} levelLoading={levelLoading} level={level} color={getIconColor()} />}
          renderGotoLink={() => (
            <a
              href={level ? (level["id"] == form.levelId ? `/levels/${level["id"]}` : "#") : "#"}
              onClick={(e) => {
                if (!level || (level && level["id"] != form.levelId)) {
                  e.preventDefault();
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="button-goto"
              style={{
                backgroundColor: getIconColor(),
                cursor: !form.levelId ? "not-allowed" : levelLoading ? "wait" : level ? "pointer" : "not-allowed",
                textShadow: "0 0 5px #0009",
              }}
            >
              {!form.levelId
                ? t("passSubmission.levelFetching.input")
                : levelLoading
                  ? t("passSubmission.levelFetching.fetching")
                  : level
                    ? t("passSubmission.levelFetching.goto")
                    : t("passSubmission.levelFetching.notfound")}
            </a>
          )}
          renderPrimarySelector={() => (
            <PlayerInput
              allowCreatePlayer={false}
              value={form.leaderboardName || ""}
              onChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  leaderboardName: value,
                  playerId: "",
                }));
              }}
              onSelect={(player) => {
                setForm((prev) => ({
                  ...prev,
                  leaderboardName: player.name,
                  playerId: player.id,
                }));
              }}
            />
          )}
          renderBelowJudgements={() => (
            <>
              <div className="rules-checkbox-container">
                <div className="rules-checkbox">
                  <input
                    type="checkbox"
                    id="rules-checkbox"
                    checked={hasReadPassRules}
                    onChange={(e) => setHasReadRules(e.target.checked)}
                    style={{ outline: submitAttempt && !isFormValid.rulesAccepted ? "2px solid red" : "none" }}
                  />
                  <label htmlFor="rules-checkbox">
                    {t("passSubmission.rules.checkbox")}{" "}
                    <button type="button" className="rules-link" onClick={() => setShowRulesPopup(true)}>
                      {t("passSubmission.rules.rulesLink")}
                    </button>
                  </label>
                </div>
              </div>
            </>
          )}
          renderSubmitActions={() => (
            <button className="submit btn-fill-primary alt" onClick={handleSubmit} disabled={submission}>
              {submission
                ? t("loading.submitting", { ns: "common" })
                : t("buttons.submit", { ns: "common" })}
            </button>
          )}
          formatCreatorDisplay={formatCreatorDisplay}
          truncateString={truncateString}
        />
      </div>

      {showRulesPopup && <RulePopup setShowRulesPopup={setShowRulesPopup} />}
    </div>
  );
};

export default PassSubmissionPage;
