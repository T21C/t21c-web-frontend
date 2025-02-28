import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import placeholder from '@/assets/placeholder/1.png';
import { getVideoDetails } from "@/Repository/RemoteRepository";
import "@/pages/AdminPage/css/adminsubmissionpage.css";
import api from "@/utils/api";
import { PlayerInput } from '@/components/PlayerComponents/PlayerInput';
import { toast } from 'react-hot-toast';
import { ProfileCreationModal } from './ProfileCreationModal';
import AdminPlayerPopup from '../../../components/AdminPlayerPopup/AdminPlayerPopup';


const PassSubmissions = () => {
  const { t } = useTranslation('components');
  const tPass = (key, params = {}) => t(`passSubmissions.${key}`, params);

  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoEmbeds, setVideoEmbeds] = useState({});
  const [animatingCards, setAnimatingCards] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [playerSearchValues, setPlayerSearchValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [playerData, setPlayerData] = useState(null);

  const [profileCreation, setProfileCreation] = useState({
    show: false,
    submission: null,
    profiles: []
  });
  const [showPlayerPopup, setShowPlayerPopup] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

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

  const autoAssignPlayers = async (submissions) => {
    for (const submission of submissions) {
      try {
        // Search for player matching the passer name
        const response = await api.get(`${import.meta.env.VITE_PLAYERS}/search/${encodeURIComponent(submission.passer)}`);
        const players = await response.data;
        
        // Find exact match (case insensitive)
        const exactMatch = players.find(p => 
          p.name.toLowerCase() === submission.passer.toLowerCase()
        );

        if (exactMatch) {
          await handlePlayerSelect(submission.id, exactMatch);
        }
      } catch (error) {
        console.error('[PassSubmissions] Error auto-assigning player for submission:', submission.id, error);
      }
    }
  };

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

      toast.success(tPass('success.playerAssigned', { 
        playerName: player.name 
      }));

    } catch (error) {
      console.error('Error assigning player:', error);
      toast.error(tPass('errors.playerAssignment'));
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
        
        if (response.ok) {
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
      toast.error(tPass('errors.processing'));
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
      toast.error(tPass('errors.profileUpdate'));
    } finally {
      setProfileCreation({
        show: false,
        submission: null,
        profiles: []
      });
    }
  };

  const handleManagePlayer = async (submission) => {
    console.log(submission);
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
      toast.success(tPass('success.playerCreated', { 
        playerName: newPlayer.name 
      }));
    } catch (error) {
      console.error('Error assigning new player:', error);
      toast.error(tPass('errors.playerAssignment'));
    }
  };

  const handleAutoAllow = async () => {
    try {
      setLoading(true);
      const response = await api.post(`${import.meta.env.VITE_SUBMISSION_API}/auto-approve/passes`);
      
      if (response.data.results) {
        await fetchPendingSubmissions();
        toast.success(tPass('success.autoAllow', { 
          count: response.data.results.filter(r => r.success).length 
        }));
      }
    } catch (error) {
      console.error('Error auto-allowing submissions:', error);
      toast.error(tPass('errors.autoAllow'));
    } finally {
      setLoading(false);
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
    return <p className="no-submissions">{tPass('noSubmissions')}</p>;
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
                <h3>{submission.title}</h3>
                <span className="submission-date">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="card-content">
                <div className="submission-details">
                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.levelId')}</span>
                    <span className="detail-value">{submission.levelId}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.player')}</span>
                    <span className="detail-value">{submission.passer}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.feelingDiff')}</span>
                    <span className="detail-value">{submission.feelingDifficulty}</span>
                  </div>
                
                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.speed')}</span>
                    <span className="detail-value">{submission.speed}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.submitter')}</span>
                    <div className="submitter-details">
                      <span className="detail-value">@{submission.submitterDiscordUsername}</span>
                      <span className="detail-subvalue">{submission.submitterDiscordId}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.judgements.label')}</span>
                    <div className="judgements-details">
                      <span className="judgement early-double">{submission.judgements.earlyDouble}</span>
                      <span className="judgement early-single">{submission.judgements.earlySingle}</span>
                      <span className="judgement e-perfect">{submission.judgements.ePerfect}</span>
                      <span className="judgement perfect">{submission.judgements.perfect}</span>
                      <span className="judgement l-perfect">{submission.judgements.lPerfect}</span>
                      <span className="judgement late-single">{submission.judgements.lateSingle}</span>
                      <span className="judgement late-double">{submission.judgements.lateDouble}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.flags.label')}</span>
                    <div className="flags-details">
                      {submission.flags.is12K && <span>{tPass('details.flags.types.12k')}</span>}
                      {submission.flags.isNoHoldTap && <span>{tPass('details.flags.types.nht')}</span>}
                      {submission.flags.is16K && <span>{tPass('details.flags.types.16k')}</span>}
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{tPass('details.uploadTime')}</span>
                    <span className="detail-value">
                      {new Date(submission.rawTime).toLocaleString()}
                    </span>
                  </div>

                  <div className="player-assignment">
                    <h4>{tPass('playerAssignment.title')}</h4>
                      <div className="profile-request-section" style={{display: submission.passerRequest ? 'block' : 'none'}}>
                        <span className="profile-request-badge">
                          {tPass('playerAssignment.newProfile')}
                        </span>
                        
                      </div>
                     
                      <PlayerInput
                        value={playerSearchValues[submission.id] || ''}
                        onChange={(value) => setPlayerSearchValues(prev => ({
                          ...prev,
                          [submission.id]: value
                        }))}
                        onSelect={(player) => handlePlayerSelect(submission.id, player)}
                        currentPlayer={submission.assignedPlayerId}
                      />
                    

                    {submission.assignedPlayer && (
                      <div className="assigned-player-info">
                        <span className="assigned-player-label">{tPass('playerAssignment.current')}</span>
                        <span className="assigned-player-name">
                          {submission.assignedPlayer.name} (ID: {submission.assignedPlayerId})
                        </span>
                        <button
                          className="manage-profile-button"
                          onClick={() => handleManagePlayer(submission)}
                          disabled={!submission.assignedPlayerId}
                        >
                          {tPass('playerAssignment.manageProfile')}
                        </button>
                      </div>
                    )}

                    <div className="action-buttons">
                      <button
                        onClick={() => handleSubmission(submission.id, 'approve')}
                        className="approve-btn"
                        disabled={disabledButtons[submission.id] || !submission.assignedPlayerId || (submission.passerRequest && !submission.assignedPlayerId)}
                        title={!submission.assignedPlayerId ? tPass('errors.noPlayer') : 
                               (submission.passerRequest && !submission.assignedPlayerId) ? tPass('errors.needProfileCreation') : ''}
                      >
                        {tPass('buttons.allow')}
                      </button>
                      <button
                        onClick={() => handleSubmission(submission.id, 'decline')}
                        className="decline-btn"
                        disabled={disabledButtons[submission.id]}
                      >
                        {tPass('buttons.decline')}
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