import { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import "./css/adminsubmissionpage.css";
import { CompleteNav } from '../../components';
import ScrollButton from '../../components/ScrollButton/ScrollButton';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';
import { RefreshIcon } from '../../components/Icons/RefreshIcon';

const SubmissionManagementPage = () => {
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' or 'passes'
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    // Dispatch a custom event to trigger refresh in child components
    window.dispatchEvent(new Event('refreshSubmissions'));
    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 1000);
  };

  // Add event listener for when child components finish loading
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoading(false);
    };
    window.addEventListener('submissionsLoadingComplete', handleLoadingComplete);
    
    return () => {
      window.removeEventListener('submissionsLoadingComplete', handleLoadingComplete);
    };
  }, []);

  return (
    <>
      <CompleteNav />
      <div className="background-level"></div>
      <div className="submission-admin-page">
        <ScrollButton />
        <div className="submissions-admin-container">
          <div className="header-container">
            <h1>Submission Moderation</h1>
            <button 
              className="refresh-button" 
              onClick={handleRefresh}
              disabled={isLoading}
              >
                <RefreshIcon color="#fff" size="40px" />
               </button>
          </div>
          
          <div className="submission-tabs">
            <button 
              className={`tab-button ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('levels')}
            >
              Levels
            </button>
            <button 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              Passes
            </button>
            {activeTab === 'passes' && (
              <button 
                className="auto-allow-button"
                onClick={() => window.dispatchEvent(new Event('autoAllowPasses'))}
              >
                Auto-allow
              </button>
            )}
          </div>

          {activeTab === 'levels' ? (
              <LevelSubmissions />
            ) : (
              <PassSubmissions />
            )}
        </div>
      </div>
    </>
  );
}

export default SubmissionManagementPage;