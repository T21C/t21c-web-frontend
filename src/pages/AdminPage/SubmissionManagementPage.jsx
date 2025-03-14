import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import "./css/adminsubmissionpage.css";
import { AccessDenied, MetaTags } from '@/components/common/display';
import { CompleteNav } from '@/components/layout';
import { ScrollButton } from '@/components/common/buttons';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';
import { RefreshIcon } from '@/components/common/icons';
import { useNotification } from '@/contexts/NotificationContext';

const SubmissionManagementPage = () => {
  const { t } = useTranslation('pages');
  const tSubmission = (key, params = {}) => t(`submissionManagement.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
  const { user } = useAuth();
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

  if (user?.isSuperAdmin === undefined) {
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

  if (!user?.isSuperAdmin) {
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
            <div 
              className={`tab-button ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('levels')}
            >
              {tSubmission('tabs.levels')}
              <span className="notification-badge" style={{visibility: pendingLevelSubmissions > 0 ? 'visible' : 'hidden'}}>
                {pendingLevelSubmissions || pendingLevelSubmissions > 0 && (
                  pendingLevelSubmissions > 99 ? "99+" : pendingLevelSubmissions
                )}
              </span>
            </div>
            
            <div 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              {tSubmission('tabs.passes')}
              <span className="notification-badge" style={{visibility: pendingPassSubmissions > 0 ? 'visible' : 'hidden'}}>
                {pendingPassSubmissions || pendingPassSubmissions > 0 && (
                  pendingPassSubmissions > 99 ? "99+" : pendingPassSubmissions
                )}
              </span>
            </div>
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