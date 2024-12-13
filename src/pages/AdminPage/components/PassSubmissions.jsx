import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import placeholder from '@/assets/placeholder/1.png';
import { getVideoDetails } from "@/Repository/RemoteRepository";
import "@/pages/AdminPage/css/adminsubmissionpage.css";
import api from "@/utils/api";
import { PlayerInput } from '@/components/PlayerComponents/PlayerInput';

const PassSubmissions = () => {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoEmbeds, setVideoEmbeds] = useState({});
  const [animatingCards, setAnimatingCards] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [playerSearchValues, setPlayerSearchValues] = useState({});
  const [showCreatePlayer, setShowCreatePlayer] = useState({});
  const [newPlayerData, setNewPlayerData] = useState({});
  const [discordAssignments, setDiscordAssignments] = useState({});
  const [discordAssignmentStatus, setDiscordAssignmentStatus] = useState({});
  const [discordAssignmentError, setDiscordAssignmentError] = useState({});
  const [pendingAssignments, setPendingAssignments] = useState({});

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  useEffect(() => {
    // Load video embeds when submissions change
    submissions.forEach(async (submission) => {
      if (submission.rawVideoId && !videoEmbeds[submission.id]) {
        try {
          const videoDetails = await getVideoDetails(submission.rawVideoId);
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
          console.log('[PassSubmissions] Auto-assigning player:', exactMatch.name, 'to submission:', submission.id);
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
      const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/passes/pending`);
      const data = await response.data;
      
      // Initialize player search values with passer names
      const initialSearchValues = {};
      data.forEach(submission => {
        initialSearchValues[submission.id] = submission.passer;
      });
      setPlayerSearchValues(initialSearchValues);
      
      setSubmissions(data);
      await autoAssignPlayers(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerSelect = async (submissionId, player) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) {
        console.error('[PassSubmissions] Submission not found:', submissionId);
        return;
      }

      console.log('[PassSubmissions] Assigning player:', player.name, 'to submission:', submissionId);
      await api.put(`${import.meta.env.VITE_SUBMISSION_API}/passes/${submissionId}/assign-player`, 
        { playerId: player.id },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Update submission with new player info
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId ? { 
          ...sub, 
          assignedPlayerId: player.id,
          assignedPlayerDiscordId: player.discordId,
          assignedPlayerName: player.name
        } : sub
      ));

      // Clear any existing discord assignment states
      setDiscordAssignmentStatus(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      setDiscordAssignmentError(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });

    } catch (error) {
      console.error('Error assigning player:', error);
      alert("Error assigning player");
    }
  };

  const handleDiscordAssignment = async (submissionId) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission.assignedPlayerId) return;

    console.log('[PassSubmissions] Starting discord assignment');
    setDiscordAssignmentStatus(prev => ({
      ...prev,
      [submissionId]: 'assigning'
    }));

    try {
      await api.put(`${import.meta.env.VITE_PLAYERS}/${submission.assignedPlayerId}/discord`, {
        discordId: submission.submitterDiscordId,
        discordUsername: submission.submitterDiscordUsername,
        discordAvatar: submission.submitterDiscordAvatar,
      });
      
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, assignedPlayerDiscordId: submission.submitterDiscordId }
          : sub
      ));
      
      setDiscordAssignmentStatus(prev => ({
        ...prev,
        [submissionId]: 'success'
      }));

      setTimeout(() => {
        setDiscordAssignmentStatus(prev => {
          const newState = { ...prev };
          delete newState[submissionId];
          return newState;
        });
      }, 1500);

    } catch (error) {
      console.error('[PassSubmissions] Discord assignment failed:', error);
      setDiscordAssignmentError(prev => ({
        ...prev,
        [submissionId]: error.response?.data?.details || 'Failed to assign discord info'
      }));
      setDiscordAssignmentStatus(prev => ({
        ...prev,
        [submissionId]: 'error'
      }));

      setTimeout(() => {
        setDiscordAssignmentStatus(prev => {
          const newState = { ...prev };
          delete newState[submissionId];
          return newState;
        });
        setDiscordAssignmentError(prev => {
          const newState = { ...prev };
          delete newState[submissionId];
          return newState;
        });
      }, 1500);
    }
  };

  const handleSubmission = async (submissionId, action) => {
    const submission = submissions.find(s => s.id === submissionId);
    
    if (action === 'approve' && !submission.assignedPlayerId) {
      alert("No player assigned");
      return;
    }

    try {
      // Disable buttons for this card
      setDisabledButtons(prev => ({
        ...prev,
        [submissionId]: true
      }));
      
      // Set animation state
      setAnimatingCards(prev => ({
        ...prev,
        [submissionId]: action
      }));
  
      // Wait for animation to complete before removing
      setTimeout(async () => {
        const response = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/passes/${submissionId}/${action}`);
        
        if (response.ok) {
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
          setAnimatingCards(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
          // Clean up states
          setDisabledButtons(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
        else {
          console.error('Error updating submission:', response.statusText);
          // Re-enable buttons on error
          setDisabledButtons(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
      }, 500);
  
    } catch (error) {
      console.error('Error processing submission:', error);
      alert("Error processing submission");
    }
  };

  const startDiscordAssignment = (submissionId) => {
    setPendingAssignments(prev => ({
      ...prev,
      [submissionId]: true
    }));
  };

  const cancelDiscordAssignment = (submissionId) => {
    setPendingAssignments(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
  };

  if (submissions?.length === 0 && !isLoading) {
    return <p className="no-submissions">No pending pass submissions to review</p>;
  }

  return (
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
                  <span className="detail-label">Level ID:</span>
                  <span className="detail-value">{submission.levelId}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Player:</span>
                  <span className="detail-value">{submission.passer}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Feeling Diff:</span>
                  <span className="detail-value">{submission.feelingDifficulty}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Judgements:</span>
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
                  <span className="detail-label">Flags:</span>
                  <div className="flags-details">
                    {submission.flags.is12k && <span>12K</span>}
                    {submission.flags.isNHT && <span>NHT</span>}
                    {submission.flags.is16k && <span>16K</span>}
                  </div>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Submitter:</span>
                  <span className="detail-value">{submission.submitterDiscordUsername}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Upload Time:</span>
                  <span className="detail-value">
                    {new Date(submission.rawTime).toLocaleString()}
                  </span>
                </div>

                <div className="player-assignment">
                  <h4 style={{marginBottom: "5px", fontSize: "0.95rem"}}>Assign player</h4>
                  <PlayerInput
                    value={playerSearchValues[submission.id] || ''}
                    onChange={(value) => setPlayerSearchValues(prev => ({
                      ...prev,
                      [submission.id]: value
                    }))}
                    onSelect={(player) => handlePlayerSelect(submission.id, player)}
                    currentPlayer={submissions.find(s => s.id === submission.id)?.assignedPlayerId}
                  />

                  <div className={`discord-assignment ${discordAssignmentStatus[submission.id] || ''}`}>
                    {discordAssignmentError[submission.id] && (
                      <div className="assignment-error">{discordAssignmentError[submission.id]}</div>
                    )}
                    
                    {submission.assignedPlayerId && !submission.assignedPlayerDiscordId && (
                      <div className="discord-buttons">
                        {pendingAssignments[submission.id] ? (
                          <div className="discord-buttons">
                            <span className="assignment-confirmation">
                              Will assign @{submission.submitterDiscordUsername} to {submission.assignedPlayerName}. Proceed?
                            </span>
                            <button 
                              className="confirm-discord-btn"
                              onClick={() => handleDiscordAssignment(submission.id)}
                              disabled={discordAssignmentStatus[submission.id] === 'assigning'}
                            >
                              Confirm
                            </button>
                            <button 
                              className="cancel-discord-btn"
                              onClick={() => cancelDiscordAssignment(submission.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="assign-discord-btn"
                            onClick={() => startDiscordAssignment(submission.id)}
                            disabled={discordAssignmentStatus[submission.id] === 'assigning'}
                          >
                            Assign Discord Info
                            <span className="assignment-tooltip">
                              {`${submission.submitterDiscordUsername} → ${submission.assignedPlayerName || 'Unknown Player'}`}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="action-buttons">
                    <button
                      onClick={() => handleSubmission(submission.id, 'approve')}
                      className="approve-btn"
                      disabled={disabledButtons[submission.id]}
                    >
                      Allow
                    </button>
                    <button
                      onClick={() => handleSubmission(submission.id, 'decline')}
                      className="decline-btn"
                      disabled={disabledButtons[submission.id]}
                    >
                      Decline
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
  );
};

export default PassSubmissions; 