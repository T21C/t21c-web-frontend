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

  const fetchPendingSubmissions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/passes/pending`);
      const data = await response.data;
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerSelect = async (submissionId, player) => {
    if (player.isNew) {
      setShowCreatePlayer(prev => ({ ...prev, [submissionId]: true }));
      setNewPlayerData(prev => ({ ...prev, [submissionId]: { name: player.name } }));
    } else {
      try {
        await api.put(`${import.meta.env.VITE_SUBMISSION_API}/passes/${submissionId}/assign-player`, 
          { playerId: player.id },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        setSubmissions(prev => prev.map(sub => 
          sub.id === submissionId ? { ...sub, assignedPlayerId: player.id } : sub
        ));
      } catch (error) {
        console.error('Error assigning player:', error);
        alert("Error assigning player");
      }
    }
  };

  const handleCreatePlayer = async (submissionId) => {
    try {
      const { name, country } = newPlayerData[submissionId] || {};
      if (!name || !country) {
        alert("Please fill in all fields");
        return;
      }

      const response = await api.post(`${import.meta.env.VITE_PLAYERS}/create`, {
        name,
        country
      });

      if (!response.ok) {
        throw new Error('Failed to create player');
      }

      const player = await response.json();
      await handlePlayerSelect(submissionId, player);
      setShowCreatePlayer(prev => ({ ...prev, [submissionId]: false }));
      setNewPlayerData(prev => ({ ...prev, [submissionId]: {} }));
    } catch (error) {
      console.error('Error creating player:', error);
      alert("Error creating player: " + error);
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
        // Comment out API call for now
        const response = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/passes/${submissionId}/${action}`);
        
        if (response.ok) {
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
          setAnimatingCards(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
          // Clean up disabled state
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
                  <span className="detail-label">Feeling Difficulty:</span>
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
                  <h4 style={{marginBottom: "5px"}}>Assign player</h4>
                  <PlayerInput
                    value={playerSearchValues[submission.id] != null ? playerSearchValues[submission.id] : submission.passer}
                    onChange={(value) => setPlayerSearchValues(prev => ({ ...prev, [submission.id]: value }))}
                    onSelect={(player) => handlePlayerSelect(submission.id, player)}
                    currentPlayer={submission.assignedPlayerId}
                  />

                  {showCreatePlayer[submission.id] && (
                    <div className="create-player-form">
                      <input
                        type="text"
                        placeholder="Player Country"
                        onChange={(e) => setNewPlayerData(prev => ({
                          ...prev,
                          [submission.id]: { ...prev[submission.id], country: e.target.value }
                        }))}
                      />
                      <button onClick={() => handleCreatePlayer(submission.id)}>
                        Create Player
                      </button>
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