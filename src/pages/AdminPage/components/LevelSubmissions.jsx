import { getVideoDetails } from "../../../Repository/RemoteRepository";
import placeholder from "../../../assets/placeholder/1.png"
import "../css/adminsubmissionpage.css";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../../utils/api";
import { ProfileCreationModal } from './ProfileCreationModal';

const LevelSubmissions = () => {
  const { t } = useTranslation('components');
  const tLevel = (key, params = {}) => t(`levelSubmissions.${key}`, params);
  
  const [submissions, setSubmissions] = useState([]);
  const [videoEmbeds, setVideoEmbeds] = useState({});
  const [animatingCards, setAnimatingCards] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [profileCreation, setProfileCreation] = useState({
    show: false,
    submission: null,
    profiles: []
  });

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  useEffect(() => {
    // Add event listener for refresh button
    const handleRefresh = () => {
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
      const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/levels/pending`);
      const data = await response.data;
      
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
      // Dispatch event to notify parent that loading is complete
      window.dispatchEvent(new Event('submissionsLoadingComplete'));
    }
  };

  const handleSubmission = async (submissionId, action) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      // Check for profile creation requests
      const pendingProfiles = [];
      if (submission.charterRequest) {
        pendingProfiles.push({
          type: 'charter',
          name: submission.charter
        });
      }
      if (submission.vfxerRequest) {
        pendingProfiles.push({
          type: 'vfx',
          name: submission.vfxer
        });
      }
      if (submission.teamRequest) {
        pendingProfiles.push({
          type: 'team',
          name: submission.team
        });
      }

      // If there are pending profiles and trying to approve
      if (pendingProfiles.length > 0 && action === 'approve') {
        setProfileCreation({
          show: true,
          submission,
          profiles: pendingProfiles
        });
        return;
      }

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
        const response = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/${action}`);
        
        if (response.ok) {
          setSubmissions(prev => prev.filter(sub => sub._id !== submissionId));
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
      console.error(`Error ${action}ing submission:`, error);
      // Re-enable buttons on error
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
      // Update submission with created profile IDs
      const updateData = {};
      createdProfiles.forEach(profile => {
        switch (profile.type) {
          case 'charter':
            updateData.charterId = profile.id;
            break;
          case 'vfx':
            updateData.vfxerId = profile.id;
            break;
          case 'team':
            updateData.teamId = profile.id;
            break;
        }
      });

      await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`, updateData);

      // Now proceed with approval
      await handleSubmission(submission.id, 'approve');
    } catch (error) {
      console.error('Error updating submission with profiles:', error);
    } finally {
      setProfileCreation({
        show: false,
        submission: null,
        profiles: []
      });
    }
  };

  const handleProfileCreationCancel = () => {
    setProfileCreation({
      show: false,
      submission: null,
      profiles: []
    });
  };

  if (submissions?.length === 0 && !isLoading) {
    return <p className="no-submissions">{tLevel('noSubmissions')}</p>;
  }

  return (
    <>
      <div className="submissions-list">  
        {isLoading ? (  
          <div className="loader loader-submission-detail"/>
        ) : (
          submissions.map((submission) => (
            <div 
              key={submission.id} 
              className={`submission-card ${animatingCards[submission.id] || ''}`}
            >
              <div className="submission-header">
                <h3>{submission.song}</h3>
                <span className="submission-date">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="card-content">
                <div className="submission-details">
                  <div className="detail-row">
                    <span className="detail-label">{tLevel('details.artist')}</span>
                    <span className="detail-value">{submission.artist}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{tLevel('details.charter')}</span>
                    <span className={`detail-value ${submission.charterRequest ? 'pending-profile' : ''}`}>
                      {submission.charter}
                      {submission.charterRequest && (
                        <span className="profile-request-badge">
                          {tLevel('badges.newProfile')}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">{tLevel('details.difficulty')}</span>
                    <span className="detail-value">{submission.diff}</span>
                  </div>

                  {submission.directDL ? (
                    <div className="detail-row">
                      <span className="detail-label">{tLevel('details.download.label')}</span>
                      <a 
                        href={submission.directDL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        {tLevel('details.download.directLink')}
                      </a>
                    </div>
                  ) : (
                    <div className="detail-row">
                      <span className="detail-label">{tLevel('details.download.label')}</span>
                      <span className="detail-value" style={{color: "rgb(255, 100, 100)"}}>
                        {tLevel('details.download.notAvailable')}
                      </span>
                    </div>
                  )}

                  {submission.wsLink && (
                    <div className="detail-row">
                      <span className="detail-label">{tLevel('details.workshop.label')}</span>
                      <a 
                        href={submission.wsLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        {tLevel('details.workshop.link')}
                      </a>
                    </div>
                  )}

                  {(submission.team || submission.teamRequest) && (
                    <div className="detail-row">
                      <span className="detail-label">{tLevel('details.team')}</span>
                      <span className={`detail-value ${submission.teamRequest ? 'pending-profile' : ''}`}>
                        {submission.team}
                        {submission.teamRequest && (
                          <span className="profile-request-badge">
                            {tLevel('badges.newProfile')}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {(submission.vfxer || submission.vfxerRequest) && (
                    <div className="detail-row">
                      <span className="detail-label">{tLevel('details.vfxer')}</span>
                      <span className={`detail-value ${submission.vfxerRequest ? 'pending-profile' : ''}`}>
                        {submission.vfxer}
                        {submission.vfxerRequest && (
                          <span className="profile-request-badge">
                            {tLevel('badges.newProfile')}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  <div className="action-buttons">
                    <button 
                      onClick={() => handleSubmission(submission.id, 'approve')}
                      className="approve-btn"
                      disabled={disabledButtons[submission.id]}
                    >
                      {tLevel('buttons.allow')}
                    </button>
                    <button 
                      onClick={() => handleSubmission(submission.id, 'decline')}
                      className="decline-btn"
                      disabled={disabledButtons[submission.id]}
                    >
                      {tLevel('buttons.decline')}
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
          )))}
      </div>

      {profileCreation.show && (
        <ProfileCreationModal
          profiles={profileCreation.profiles}
          onComplete={handleProfileCreationComplete}
          onCancel={handleProfileCreationCancel}
        />
      )}
    </>
  );
};

export default LevelSubmissions;