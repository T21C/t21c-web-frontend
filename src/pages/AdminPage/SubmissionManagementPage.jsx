import { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import "./css/adminsubmissionpage.css";
import { CompleteNav } from '../../components';
import ScrollButton from '../../components/ScrollButton/ScrollButton';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';

const SubmissionManagementPage = () => {
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' or 'passes'


  return (
    <>
      <CompleteNav />
      <div className="background-level"></div>
      <div className="submission-admin-page">
        <ScrollButton />
        <div className="submissions-admin-container">
          <h1>Submission Moderation</h1>
          
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