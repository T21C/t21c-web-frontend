import { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import "./css/adminsubmissionpage.css";
import { CompleteNav, MetaTags } from '../../components';
import ScrollButton from '../../components/ScrollButton/ScrollButton';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';
import { RefreshIcon } from '../../components/Icons/RefreshIcon';

const SubmissionManagementPage = () => {
  const { t } = useTranslation('pages');
  const tSubmission = (key, params = {}) => t(`submission.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
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
      <MetaTags
        title={tSubmission('meta.title')}
        description={tSubmission('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="submission-admin-page">
        <ScrollButton />
        <div className="submissions-admin-container">
          <div className="header-container">
            <h1>{tSubmission('header.title')}</h1>
            <button 
              className="refresh-button" 
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label={tSubmission('header.refresh')}
            >
              <RefreshIcon color="#fff" size="40px" />
            </button>
          </div>
          
          <div className="submission-tabs">
            <button 
              className={`tab-button ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('levels')}
            >
              {tSubmission('tabs.levels')}
            </button>
            <button 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              {tSubmission('tabs.passes')}
            </button>
            {activeTab === 'passes' && (
              <button 
                className="auto-allow-button"
                onClick={() => window.dispatchEvent(new Event('autoAllowPasses'))}
              >
                {tSubmission('tabs.autoAllow')}
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