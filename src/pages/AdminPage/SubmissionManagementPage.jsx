import { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import "./css/adminsubmissionpage.css";
import { CompleteNav } from '../../components';
import ChartSubmissions from './components/ChartSubmissions';
import PassSubmissions from './components/PassSubmissions';

const SubmissionManagementPage = () => {
  const [activeTab, setActiveTab] = useState('charts'); // 'charts' or 'passes'


  return (
    <>
      <CompleteNav />
      <div className="background-level"></div>
      <div className="submission-admin-page">
        <div className="submissions-admin-container">
          <h1>Submission Moderation</h1>
          
          <div className="submission-tabs">
            <button 
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              Charts
            </button>
            <button 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              Passes
            </button>
          </div>

          {activeTab === 'charts' ? (
              <ChartSubmissions />
            ) : (
              <PassSubmissions />
            )}
        </div>
      </div>
    </>
  );
}

export default SubmissionManagementPage;