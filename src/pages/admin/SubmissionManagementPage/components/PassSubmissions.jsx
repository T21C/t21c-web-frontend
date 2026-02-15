import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import placeholder from '@/assets/placeholder/1.png';
import { getVideoDetails } from "@/utils";
import "../adminsubmissionpage.css";
import api from "@/utils/api";
import { PlayerInput } from '@/components/common/selectors';
import { toast } from 'react-hot-toast';
import { ProfileCreationModal } from './ProfileCreationModal';
import { AdminPlayerPopup } from '@/components/popups/Users';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';


const PassSubmissions = ({ setIsAutoAllowing }) => {
  const { t } = useTranslation('components');

  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoEmbeds, setVideoEmbeds] = useState({});
  const [animatingCards, setAnimatingCards] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [playerSearchValues, setPlayerSearchValues] = useState({});
  const [playerData, setPlayerData] = useState(null);

  const [profileCreation, setProfileCreation] = useState({
    show: false,
    submission: null,
    profiles: []
  });
  const [showPlayerPopup, setShowPlayerPopup] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const { difficultyDict } = useDifficultyContext();

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);


  const getPlayerData = async (playerId) => {
    const response = await api.get(`${import.meta.env.VITE_PLAYERS}/${playerId}`);
    return response.data;
  };




  useEffect(() => {
    // Add event listener for refresh button
    const handleRefresh = () => {;
      fetchPendingSubmissions();
    };
    window.addEventListener('refreshSubmissions', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshSubmissions', handleRefresh);
    };
  }, []);

  useEffect(() => {
    // Load video embeds when submissions change
    submissions.forEach(async (submission) => {
      if (submission.videoLink && !videoEmbeds[submission.id]) {
        try {
          const videoDetails = await getVideoDetails(submission.videoLink);
          setVideoEmbeds(prev => ({
            ...prev,
            [submission.id]: videoDetails
          }));
        } catch (error) {
          console.error('Error fetching video details:', error);
        }
      }
    });
  }, [submissions]);

  const fetchPendingSubmissions = async () => {
    try {
      setIsLoading(true);
      // Reset animation and disabled states when fetching new data
      setAnimatingCards({});
      setDisabledButtons({});
      
      const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/passes/pending`);
      const data = await response.data;
      
      // Initialize player search values with passer names
      const initialSearchValues = {};
      data.forEach(submission => {
        initialSearchValues[submission.id] = submission.passer;
      });
      setPlayerSearchValues(initialSearchValues);
      
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
      // Dispatch event to notify parent that loading is complete
      window.dispatchEvent(new Event('submissionsLoadingComplete'));
    }
  };

  const handlePlayerSelect = async (submissionId, player) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) {
        console.error('[PassSubmissions] Submission not found:', submissionId);
        return;
      }

      const response = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/passes/${submissionId}/assign-player`, 
        { playerId: player.id },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Update submission with new player info from response
      if (response.data.submission) {
        setSubmissions(prev => prev.map(sub => 
          sub.id === submissionId ? response.data.submission : sub
        ));
      }

      toast.success(t('passSubmissions.success.playerAssigned', { 
        playerName: player.name 
      }));

    } catch (error) {
      console.error('Error assigning player:', error);
      toast.error(t('passSubmissions.errors.playerAssignment'));
    }
  };


  const handleSubmission = async (submissionId, action) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) {
        console.error('[PassSubmissions] Submission not found:', submissionId);
        return;
      }

      if (action === 'approve') {
        // Check if this is a new profile request that hasn't been created yet
        if (submission.passerRequest && !submission.assignedPlayerId) {
          // Show profile creation modal
          setProfileCreation({
            show: true,
            submission,
            profiles: [{
              type: 'player',
              name: submission.passer
            }]
          });
          return;
        }
      }

      setDisabledButtons(prev => ({
        ...prev,
        [submissionId]: true
      }));
      
      setAnimatingCards(prev => ({
        ...prev,
        [submissionId]: action
      }));

      setTimeout(async () => {
        const response = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/passes/${submissionId}/${action}`);
        
        if (response.status === 200) {
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
          setAnimatingCards(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
          setDisabledButtons(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
        else {
          console.error('Error updating submission:', response.statusText);
          setDisabledButtons(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
      }, 500);

    } catch (error) {
      console.error('Error processing submission:', error);
      toast.error(t('passSubmissions.errors.processing'));
      setDisabledButtons(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
    }
  };

  const handleProfileCreationComplete = async (createdProfiles) => {
    const { submission } = profileCreation;
    if (!submission) return;

    try {
      // Get the created player profile
      const playerProfile = createdProfiles.find(p => p.type === 'player');
      if (!playerProfile) {
        throw new Error('No player profile created');
      }

      // Assign the created profile to the submission
      await handlePlayerSelect(submission.id, {
        id: playerProfile.id,
        name: playerProfile.name
      });

      // Now proceed with approval
      await handleSubmission(submission.id, 'approve');
    } catch (error) {
      console.error('Error updating submission with profile:', error);
      toast.error(t('passSubmissions.errors.profileUpdate'));
    } finally {
      setProfileCreation({
        show: false,
        submission: null,
        profiles: []
      });
    }
  };

  const handleManagePlayer = async (submission) => {
    const playerData = await getPlayerData(submission.assignedPlayerId);
    setPlayerData(playerData);

    setSelectedSubmission(submission);
    setShowPlayerPopup(true);
  };

  const handlePlayerCreated = async (newPlayer) => {
    if (!selectedSubmission) return;

    try {
      // Use the existing player assignment endpoint
      await handlePlayerSelect(selectedSubmission.id, newPlayer);
      setShowPlayerPopup(false);
      setSelectedSubmission(null);
      toast.success(t('passSubmissions.success.playerCreated', { 
        playerName: newPlayer.name 
      }));
    } catch (error) {
      console.error('Error assigning new player:', error);
      toast.error(t('passSubmissions.errors.playerAssignment'));
    }
  };

  const handleAutoAllow = async () => {
    try {
      setIsAutoAllowing(true);
      const response = await api.post(`${import.meta.env.VITE_SUBMISSION_API}/auto-approve/passes`);
      
      if (response.data.results) {
        const successCount = response.data.results.filter(r => r.success).length || 0;
        await fetchPendingSubmissions();
        
        // Dispatch completion event with count
        window.dispatchEvent(new CustomEvent('autoAllowComplete', {
          detail: { count: successCount }
        }));
        toast.success(t('passSubmissions.success.autoAllow', { 
          count: successCount 
        }));
      }
    } catch (error) {
      console.error('Error auto-allowing submissions:', error);
      toast.error(t('passSubmissions.errors.autoAllow'));
      
      // Dispatch completion event with error
      window.dispatchEvent(new CustomEvent('autoAllowComplete', {
        detail: { count: 0 }
      }));
    } finally {
      setIsAutoAllowing(false);
    }
  };

  useEffect(() => {
    // Add event listener for auto-allow button
    const handleAutoAllowEvent = () => handleAutoAllow();
    window.addEventListener('autoAllowPasses', handleAutoAllowEvent);
    
    return () => {
      window.removeEventListener('autoAllowPasses', handleAutoAllowEvent);
    };
  }, []);

  if (submissions?.length === 0 && !isLoading) {
    return <p className="no-submissions">{t('passSubmissions.noSubmissions')}</p>;
  }

  return (
    <>
      <div className="submissions-list">
        {isLoading ? (
          <div className="loader loader-submission-detail"/>
        ) : (
          submissions.map((submission) => (
            <div key={submission.id} className={`submission-card pass-submission-card ${animatingCards[submission.id] || ''}`}>
              <div className="submission-header">
                <h3>{submission.title || "Null"}</h3>
                <span className="submission-date">
                  {formatDate(submission.createdAt || Date.now(), i18next?.language)}
                </span>
              </div>
              
              <div className="card-content">
                <div className="submission-details">
                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.level')}</span>
                    <div
                      className="level-info"
                      onClick={() => {
                        if (submission.level?.id) {
                          window.open(`/levels/${submission.level.id}`, '_blank');
                        }
                      }}
                    >
                      <img src={difficultyDict[submission.level?.diffId]?.icon} alt={submission.level?.song?.name} className="diff-icon" />
                      <span className="detail-value">{submission.level?.song || "Null"}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.player')}</span>
                    <span className="detail-value">{submission.passer || "Null"}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.feelingDiff')}</span>
                    <span className="detail-value">{submission.feelingDifficulty || "Null"}</span>
                  </div>
                
                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.speed')}</span>
                    <span className="detail-value">{submission.speed || "1.0"}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.submitter')}</span>
                    <div className="submitter-details">
                      <span className="detail-value">{submission.submitterDiscordUsername? `@${submission.submitterDiscordUsername}` : submission.passSubmitter?.username || "Null"}</span>
                      <span className="detail-subvalue">#{submission.passSubmitter?.playerId || "Null"}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.judgements.label')}</span>
                    <div className="judgements-details">
                      <span className="judgement early-double">{submission.judgements?.earlyDouble !== null ? submission.judgements?.earlyDouble : "0"}</span>
                      <span className="judgement early-single">{submission.judgements?.earlySingle !== null ? submission.judgements?.earlySingle : "0"}</span>
                      <span className="judgement e-perfect">{submission.judgements?.ePerfect !== null ? submission.judgements?.ePerfect : "0"}</span>
                      <span className="judgement perfect">{submission.judgements?.perfect !== null ? submission.judgements?.perfect : "0"}</span>
                      <span className="judgement l-perfect">{submission.judgements?.lPerfect !== null ? submission.judgements?.lPerfect : "0"}</span>
                      <span className="judgement late-single">{submission.judgements?.lateSingle !== null ? submission.judgements?.lateSingle : "0"}</span>
                      <span className="judgement late-double">{submission.judgements?.lateDouble !== null ? submission.judgements?.lateDouble : "0"}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.flags.label')}</span>
                    <div className="flags-details">
                      {submission.flags?.is12K && <span>{t('passSubmissions.details.flags.types.12k')}</span>}
                      {submission.flags?.isNoHoldTap && <span>{t('passSubmissions.details.flags.types.nht')}</span>}
                      {submission.flags?.is16K && <span>{t('passSubmissions.details.flags.types.16k')}</span>}
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('passSubmissions.details.uploadTime')}</span>
                    <span className="detail-value">
                      {formatDate(submission.rawTime || Date.now(), i18next?.language)}
                    </span>
                  </div>

                  <div className="player-assignment">
                    <h4>{t('passSubmissions.playerAssignment.title')}</h4>
                      <div className="profile-request-section" style={{display: submission.passerRequest ? 'block' : 'none'}}>
                        <span className="profile-request-badge">
                          {t('passSubmissions.playerAssignment.newProfile')}
                        </span>
                        
                      </div>
                     
                      <PlayerInput
                        value={playerSearchValues[submission.id] || ''}
                        onChange={(value) => setPlayerSearchValues(prev => ({
                          ...prev,
                          [submission.id]: value
                        }))}
                        onSelect={(player) => handlePlayerSelect(submission.id, player)}
                      />
                    

                    {submission.assignedPlayer && (
                      <div className="assigned-player-info">
                        <span className="assigned-player-label">{t('passSubmissions.playerAssignment.current')}</span>
                        {(submission.assignedPlayerId ?? submission.assignedPlayer?.id) != null ? (
                          <Link
                            to={`/profile/${submission.assignedPlayerId ?? submission.assignedPlayer?.id}`}
                            className="assigned-player-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {submission.assignedPlayer.name || "Null"} (ID: {submission.assignedPlayerId ?? submission.assignedPlayer?.id})
                          </Link>
                        ) : (
                          <span className="assigned-player-name">
                            {submission.assignedPlayer.name || "Null"} (ID: Null)
                          </span>
                        )}
                        <button
                          className="manage-profile-button"
                          onClick={() => handleManagePlayer(submission)}
                          disabled={!submission.assignedPlayerId}
                        >
                          {t('passSubmissions.playerAssignment.manageProfile')}
                        </button>
                      </div>
                    )}

                    <div className="action-buttons">
                      <button
                        onClick={() => handleSubmission(submission.id, 'approve')}
                        className="approve-btn"
                        disabled={disabledButtons[submission.id] || !submission.assignedPlayerId || (submission.passerRequest && !submission.assignedPlayerId)}
                        title={!submission.assignedPlayerId ? t('passSubmissions.errors.noPlayer') : 
                               (submission.passerRequest && !submission.assignedPlayerId) ? t('passSubmissions.errors.needProfileCreation') : ''}
                      >
                        {t('passSubmissions.buttons.allow')}
                      </button>
                      <button
                        onClick={() => handleSubmission(submission.id, 'decline')}
                        className="decline-btn"
                        disabled={disabledButtons[submission.id]}
                      >
                        {t('passSubmissions.buttons.decline')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="embed-container">
                  {videoEmbeds[submission.id] ? (
                    <iframe
                      src={videoEmbeds[submission.id].embed}
                      title="Video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div
                      className="thumbnail-container"
                      style={{
                        backgroundImage: `url(${videoEmbeds[submission.id]?.image || placeholder})`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showPlayerPopup && selectedSubmission && (
        <AdminPlayerPopup
          player={playerData}
          onClose={() => {
            setShowPlayerPopup(false);
            setSelectedSubmission(null);
          }}
          onUpdate={handlePlayerCreated}
          isNewProfile={true}
        />
      )}

      {profileCreation.show && (
        <ProfileCreationModal
          profiles={profileCreation.profiles}
          onComplete={handleProfileCreationComplete}
          onCancel={() => setProfileCreation({ show: false, submission: null, profiles: [] })}
        />
      )}
    </>
  );
};

export default PassSubmissions; 