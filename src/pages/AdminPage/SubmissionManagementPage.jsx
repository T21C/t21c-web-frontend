import { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import "./css/adminsubmissionpage.css";
import { AccessDenied, CompleteNav, MetaTags } from '../../components';
import ScrollButton from '../../components/ScrollButton/ScrollButton';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';
import { RefreshIcon } from '../../components/Icons/RefreshIcon';
import { useNotification } from '../../contexts/NotificationContext';

const SubmissionManagementPage = () => {
  const { t } = useTranslation('pages');
  const tSubmission = (key, params = {}) => t(`submissionManagement.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' or 'passes'
  const [isLoading, setIsLoading] = useState(false);
  const { pendingLevelSubmissions, pendingPassSubmissions } = useNotification();
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

  if (isSuperAdmin === undefined) {
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
          <div className="submissions-admin-container">
            <div className="loader loader-level-detail"/>
          </div>
        </div>
      </>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AccessDenied 
        metaTitle={tSubmission('meta.title')}
        metaDescription={tSubmission('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

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
              {pendingLevelSubmissions > 0 && (
                          <span className="notification-badge">
                            {pendingLevelSubmissions > 9 ? tNav('notifications.moreThanNine') : pendingSubmissions}
                          </span>
                        )}
            </button>
            <button 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              {tSubmission('tabs.passes')}
              {pendingPassSubmissions > 0 && (
                <span className="notification-badge">
                  {pendingPassSubmissions > 9 ? tNav('notifications.moreThanNine') : pendingPassSubmissions}
                </span>
              )}
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