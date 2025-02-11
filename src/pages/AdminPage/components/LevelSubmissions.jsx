import { getVideoDetails } from "../../../Repository/RemoteRepository";
import placeholder from "../../../assets/placeholder/1.png"
import "../css/adminsubmissionpage.css";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../../utils/api";
import { ProfileCreationModal } from './ProfileCreationModal';
import { SubmissionCreatorPopup } from '../../../components/SubmissionCreatorPopup/SubmissionCreatorPopup';
import { toast } from "react-hot-toast";

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
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedCreatorRequest, setSelectedCreatorRequest] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

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
      // Reset animation and disabled states when fetching new data
      setAnimatingCards({});
      setDisabledButtons({});
      
      const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/levels/pending`);
      const data = await response.data;
      
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event('submissionsLoadingComplete'));
    }
  };

  const handleSubmission = async (submissionId, action) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      // Check for profile creation requests when approving
      if (action === 'approve') {
        const pendingProfiles = [];
        
        // Check for pending creator requests
        submission.creatorRequests?.forEach(request => {
          if (request.isNewRequest && !request.creatorId) {
            pendingProfiles.push({
              type: request.role,
              name: request.creatorName
            });
          }
        });

        // Check for pending team request
        if (submission.teamRequestData?.isNewRequest && !submission.teamRequestData.teamId) {
          pendingProfiles.push({
            type: 'team',
            name: submission.teamRequestData.teamName
          });
        }

        // If there are pending profiles and trying to approve
        if (pendingProfiles.length > 0) {
          setProfileCreation({
            show: true,
            submission,
            profiles: pendingProfiles
          });
          return;
        }
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
      const updateData = {
        creatorRequests: submission.creatorRequests.map(request => {
          const createdProfile = createdProfiles.find(
            profile => profile.type === request.role && profile.name === request.creatorName
          );
          return {
            ...request,
            creatorId: createdProfile?.id || request.creatorId
          };
        }),
        teamRequestData: submission.teamRequestData && {
          ...submission.teamRequestData,
          teamId: createdProfiles.find(
            profile => profile.type === 'team' && profile.name === submission.teamRequestData.teamName
          )?.id || submission.teamRequestData.teamId
        }
      };

      await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`, updateData);

      // Now proceed with approval
      await handleSubmission(submission.id, 'approve');
    } catch (error) {
      console.error('Error updating submission with profiles:', error);
      toast.error(tLevel('errors.profileUpdate'));
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

  const handleCreatorAction = (submission, request, role) => {
    // Ensure we have the correct credit stats format
    if (request?.creator?.credits) {
      const credits = request.creator.credits;
      request.creator.credits = {
        charterCount: credits.charterCount || 0,
        vfxerCount: credits.vfxerCount || 0,
        totalCredits: credits.totalCredits || 0
      };
    }
    setSelectedSubmission(submission);
    setSelectedCreatorRequest(request);
    setSelectedRole(role);
    setShowCreatorPopup(true);
  };

  const handleCreatorPopupClose = () => {
    setSelectedSubmission(null);
    setSelectedCreatorRequest(null);
    setSelectedRole(null);
    setShowCreatorPopup(false);
  };

  const handleCreatorUpdate = async () => {
    await fetchPendingSubmissions();
    setShowCreatorPopup(false);
    setSelectedSubmission(null);
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

                  {/* Group Creator Requests by Role */}
                  {(() => {
                    // Group creators by role
                    const creatorsByRole = submission.creatorRequests?.reduce((acc, request) => {
                      if (!acc[request.role]) {
                        acc[request.role] = [];
                      }
                      acc[request.role].push(request);
                      return acc;
                    }, {});

                    return Object.entries(creatorsByRole || {}).map(([role, creators]) => (
                      <div key={role} className="creator-group">
                        <div className="creator-group-header">
                          {tLevel(`details.${role}`)}
                        </div>
                        <div className="creator-list">
                          {creators.map((request, index) => (
                            <div key={index} className="creator-item">
                              <span className={`creator-name ${request.isNewRequest ? 'pending' : ''}`}>
                                {request.creatorName}
                                {request.isNewRequest && (
                                  <span className="profile-request-badge">
                                    {tLevel('badges.newRequest')}
                                  </span>
                                )}
                              </span>
                              <button
                                className="manage-creator-button"
                                onClick={() => handleCreatorAction(submission, request, request.role)}
                              >
                                {tLevel('buttons.manageCreator')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Team Request */}
                  {submission.teamRequestData && (
                    <div className="creator-group">
                      <div className="creator-group-header">
                        {tLevel('details.team')}
                      </div>
                      <div className="creator-list">
                        <div className="creator-item">
                          <span className={`creator-name ${submission.teamRequestData.isNewRequest ? 'pending' : ''}`}>
                            {submission.teamRequestData.teamName}
                            {submission.teamRequestData.isNewRequest && (
                              <span className="profile-request-badge">
                                {tLevel('badges.newRequest')}
                              </span>
                            )}
                          </span>
                          <button
                            className="manage-creator-button"
                            onClick={() => handleCreatorAction(submission, null, null)}
                          >
                            {tLevel('buttons.manageCreator')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="action-buttons">
                    <button 
                      onClick={() => handleSubmission(submission.id, 'approve')}
                      className="approve-btn"
                      disabled={disabledButtons[submission.id] || 
                        submission.creatorRequests?.some(r => r.isNewRequest && !r.creatorId) ||
                        (submission.teamRequestData?.isNewRequest && !submission.teamRequestData.teamId)}
                      title={tLevel('errors.needProfiles')}
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

      {showCreatorPopup && selectedSubmission && (
        <SubmissionCreatorPopup
          submission={selectedSubmission}
          onClose={handleCreatorPopupClose}
          onUpdate={handleCreatorUpdate}
          initialRole={selectedRole}
          initialRequest={selectedCreatorRequest}
        />
      )}

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