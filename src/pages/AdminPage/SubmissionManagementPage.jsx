import { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import "./css/adminsubmissionpage.css";
import { CompleteNav } from '../../components';
import { getVideoDetails } from '../../Repository/RemoteRepository';
import placeholder from "../../assets/placeholder/3.png";

const SubmissionManagementPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [videoEmbeds, setVideoEmbeds] = useState({});

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  useEffect(() => {
    // Load video embeds when submissions change
    submissions.forEach(async (submission) => {
      if (submission.videoLink && !videoEmbeds[submission._id]) {
        try {
          const videoDetails = await getVideoDetails(submission.videoLink);
          setVideoEmbeds(prev => ({
            ...prev,
            [submission._id]: videoDetails
          }));
        } catch (error) {
          console.error('Error fetching video details:', error);
        }
      }
    });
  }, [submissions]);

  const fetchPendingSubmissions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_SUBMISSION_API}/pending`);
      const data = await response.json();
      console.log(data);
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleSubmission = async (submissionId, action) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_SUBMISSION_API}/${submissionId}/${action}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        // Refresh the submissions list
        fetchPendingSubmissions();
      }
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
    }
  };

  return (
    <>
    
    <CompleteNav />
    <div className="background-level"></div>
    <div className="submission-admin-page">
      <div className="submissions-admin-list">
      <h1>Submission Moderation</h1>
        {submissions.map((submission) => (
          <div key={submission._id} className="submission-card">
            <div className="submission-header">
              <h3>{submission.song}</h3>
              <span className="submission-date">
                {new Date(submission.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="card-content">
              <div className="submission-details">
                <div className="detail-row">
                  <span className="detail-label">Artist:</span>
                  <span className="detail-value">{submission.artist}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Charter:</span>
                  <span className="detail-value">{submission.charter}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Difficulty:</span>
                  <span className="detail-value">{submission.diff}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Direct Download:</span>
                  <a 
                    href={submission.directDL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    Download Link
                  </a>
                </div>

                {submission.team && (
                  <div className="detail-row">
                    <span className="detail-label">Team:</span>
                    <span className="detail-value">{submission.team}</span>
                  </div>
                )}

                {submission.vfxer && (
                  <div className="detail-row">
                    <span className="detail-label">VFXer:</span>
                    <span className="detail-value">{submission.vfxer}</span>
                  </div>
                )}

                {submission.wsLink && (
                  <div className="detail-row">
                    <span className="detail-label">Workshop Link:</span>
                    <a 
                      href={submission.wsLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="detail-link"
                    >
                      Workshop Link
                    </a>
                  </div>
                )}

                <div className="action-buttons">
                  <button 
                    onClick={() => handleSubmission(submission._id, 'approve')}
                    className="approve-btn"
                  >
                    Allow
                  </button>
                  <button 
                    onClick={() => handleSubmission(submission._id, 'decline')}
                    className="decline-btn"
                  >
                    Decline
                  </button>
                </div>
              </div>

              <div className="embed-container">
                {videoEmbeds[submission._id] ? (
                  <iframe
                    src={videoEmbeds[submission._id].embed}
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
                      backgroundImage: `url(${videoEmbeds[submission._id]?.image || placeholder})`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

export default SubmissionManagementPage;