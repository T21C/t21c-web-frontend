import { getVideoDetails } from "../../../Repository/RemoteRepository";
import placeholder from "../../../assets/placeholder/1.png"
import "../css/adminsubmissionpage.css";
import { useState, useEffect } from "react";
import api from "../../../utils/api";

const PassSubmissions = () => {
  
  
      
    
    const [submissions, setSubmissions] = useState([]);
    const [videoEmbeds, setVideoEmbeds] = useState({});
    const [animatingCards, setAnimatingCards] = useState({});
    const [disabledButtons, setDisabledButtons] = useState({});
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        fetchPendingSubmissions();
      }, []);
    
      useEffect(() => {
        // Load video embeds when submissions change
        submissions.forEach(async (submission) => {
          if (submission.rawVideoId && !videoEmbeds[submission._id]) {
            try {
              const videoDetails = await getVideoDetails(submission.rawVideoId);
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
          setIsLoading(true);
          const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/passes/pending`);
          const data = await response.json();
          console.log(data);
          setSubmissions(data);
        } catch (error) {
          console.error('Error fetching submissions:', error);
        } finally {
          setIsLoading(false);
        }
      };
    
      const handleSubmission = async (submissionId, action) => {
        try {
          console.log('Starting animation for:', submissionId, 'with action:', action);
          
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
  
  
  
  
    if (submissions?.length === 0 && !isLoading) {
    return <p className="no-submissions">No pending pass submissions to review</p>;
  }

  return (
    <div className="submissions-list">
      {isLoading ? (  
          <div className="loader loader-submission-detail"/>
        ) : (
          submissions.map((submission) => (
        <div 
          key={submission._id} 
          className={`submission-card pass-submission-card ${animatingCards[submission._id] || ''}`}
        >
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
              <span className="detail-value">{submission.submitter.discordUsername}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Upload Time:</span>
              <span className="detail-value">
                {new Date(submission.rawTime).toLocaleString()}
              </span>
            </div>

            <div className="action-buttons">
              <button 
                onClick={() => handleSubmission(submission._id, 'approve')}
                className="approve-btn"
                disabled={disabledButtons[submission._id]}
              >
                Allow
              </button>
              <button 
                onClick={() => handleSubmission(submission._id, 'decline')}
                className="decline-btn"
                disabled={disabledButtons[submission._id]}
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
      )))}
    </div>
  );
};

export default PassSubmissions; 