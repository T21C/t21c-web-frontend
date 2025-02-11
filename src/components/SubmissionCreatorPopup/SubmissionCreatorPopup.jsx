import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '../Select/Select';
import api from '../../utils/api';
import './submissionCreatorPopup.css';
import { toast } from 'react-hot-toast';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
};

const roleOptions = Object.entries(CreditRole).map(([key, value]) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1)
}));

export const SubmissionCreatorPopup = ({ submission, onClose, onUpdate, initialRole, initialRequest }) => {
  const { t } = useTranslation('components');
  const tCreator = (key, params = {}) => t(`submissionCreator.${key}`, params);
  const popupRef = useRef(null);

  // Core state
  const [selectedRole, setSelectedRole] = useState(initialRole || CreditRole.CHARTER);
  const [selectedCreatorId, setSelectedCreatorId] = useState(initialRequest?.creatorId || null);
  const [creatorDetails, setCreatorDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize with selected creator if one exists
  useEffect(() => {
    if (initialRequest?.creatorId) {
      setSelectedCreatorId(initialRequest.creatorId);
      fetchCreatorDetails(initialRequest.creatorId);
    }
  }, [initialRequest]);

  // Handle creator search
  useEffect(() => {
    const searchCreators = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.get(`${import.meta.env.VITE_CREATORS}/search/${encodeURIComponent(searchQuery)}`);
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error searching creators:', error);

        setError(tCreator('messages.error.searchFailed'));
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchCreators, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchCreatorDetails = async (creatorId) => {
    if (!creatorId) return;

    try {
      const response = await api.get(`${import.meta.env.VITE_CREATORS}/byId/${creatorId}`);
      const creator = response.data;
      
      if (!creator) {
        setError(tCreator('messages.error.creatorNotFound'));
        return;
      }

      setCreatorDetails(creator);
    } catch (error) {
      console.error('Error fetching creator details:', error);
      setError(tCreator('messages.error.loadDetailsFailed'));
    }
  };

  const handleSelectCreator = (creator) => {
    setSelectedCreatorId(creator.id);
    fetchCreatorDetails(creator.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAssignCreator = async () => {
    if (!selectedCreatorId) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const existingRequest = submission.creatorRequests?.find(
        request => request.role === selectedRole
      );

      if (!existingRequest) {
        setError(tCreator('messages.error.noCreditRequest'));
        return;
      }

      await api.put(`/v2/admin/submissions/levels/${submission.id}/assign-creator`, {
        creatorId: selectedCreatorId,
        role: selectedRole,
        creditRequestId: existingRequest.id
      });

      setSuccess(tCreator('messages.creatorAssigned'));
      onUpdate();
      setTimeout(onClose, 1500);
    } catch (error) {
      setError(tCreator('messages.error.assignFailed'));
      console.error('Error assigning creator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll lock management
  useEffect(() => {
    document.body.classList.add('body-scroll-lock');
    return () => document.body.classList.remove('body-scroll-lock');
  }, []);

  // Close handlers
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  console.log(creatorDetails);
  
  return (
    <div className="submission-creator-popup-overlay">
      <div className="submission-creator-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{tCreator('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="role-selector">
            <label>{tCreator('role.label')}</label>
            <Select
              options={roleOptions}
              value={roleOptions.find(opt => opt.value === selectedRole)}
              onChange={(selected) => setSelectedRole(selected.value)}
              className="role-select"
              width="100%"
            />
          </div>

          <div className="creator-selection">
            <div className="current-creator">
              <div className="current-creator-header">
                {tCreator('currentCreator.label')}
              </div>
              <div className="current-creator-info">
                <div className="creator-name-display">
                  {creatorDetails ? (
                    <>
                      {creatorDetails.name} (ID: {selectedCreatorId})
                      {creatorDetails.aliases?.length > 0 && (
                        <span className="aliases">
                          [{creatorDetails.aliases.join(', ')}]
                        </span>
                      )}
                      {creatorDetails.user && (
                        <span className="creator-discord">
                          ({creatorDetails.user.username})
                        </span>
                      )}
                      {creatorDetails.isVerified && (
                        <span className="verified-status">
                          {tCreator('status.verified')}
                        </span>
                      )}
                    </>
                  ) : (
                    tCreator('currentCreator.none')
                  )}
                </div>
              </div>
            </div>

            <div className="creator-search-section">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={tCreator('search.placeholder')}
                />
              </div>
              {isSearching ? (
                <div className="search-status">{tCreator('search.loading')}</div>
              ) : searchQuery && (!Array.isArray(searchResults) || searchResults.length === 0) ? (
                <div className="search-status">{tCreator('search.noResults')}</div>
              ) : (
                <div className="search-results">
                  {Array.isArray(searchResults) && searchResults.map((creator) => (
                    <div
                      key={creator.id}
                      className="creator-result"
                      onClick={() => handleSelectCreator(creator)}
                    >
                      <span className="creator-name">
                        {creator.name} (ID: {creator.id})
                      </span>
                      {creator.aliases?.length > 0 && (
                        <span className="creator-aliases">
                          [{creator.aliases.join(', ')}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {creatorDetails && (
              <div className="creator-stats">
                <h3>{tCreator('stats.title')}</h3>
                <div className="stats-content">
                  <p>{tCreator('stats.totalLevels')}: {creatorDetails.createdLevels?.length || 0}
                    &nbsp;({creatorDetails.createdLevels?.filter(level => level.isVerified).length || 0} {tCreator('stats.verifiedLevels')})
                  </p>
                  <p>{tCreator('stats.charterCount')}: {
                    creatorDetails.credits?.filter(credit => credit.role === 'charter').length || 0
                  }</p>
                  <p>{tCreator('stats.vfxerCount')}: {
                    creatorDetails.credits?.filter(credit => credit.role === 'vfxer').length || 0
                  }</p>
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className="action-button"
              onClick={handleAssignCreator}
              disabled={!selectedCreatorId || isLoading}
            >
              {tCreator('buttons.assign')}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default SubmissionCreatorPopup; 