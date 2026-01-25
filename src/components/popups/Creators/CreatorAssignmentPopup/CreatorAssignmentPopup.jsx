import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import api from '@/utils/api';
import './creatorAssignmentPopup.css';
import { toast } from 'react-hot-toast';

export const CreatorAssignmentPopup = ({ user, onClose, onUpdate }) => {
  const { t } = useTranslation('components');
  const popupRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const [selectedCreator, setSelectedCreator] = useState(null);
  const [creatorSearch, setCreatorSearch] = useState('');
  const [availableCreators, setAvailableCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [currentCreator, setCurrentCreator] = useState(user?.creator || null);

  // Update currentCreator when user prop changes
  useEffect(() => {
    setCurrentCreator(user?.creator || null);
  }, [user?.creator]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
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

  useEffect(() => {
    let cancelToken;

    const fetchCreators = async () => {
      try {
        // Cancel any in-flight request
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }

        // Create new cancel token
        cancelToken = api.CancelToken.source();
        
        // Clear current results while loading
        setAvailableCreators(null);
        
        const params = new URLSearchParams({
          page: 1,
          limit: 20,
          search: creatorSearch,
          sort: 'NAME_ASC'
        });

        const response = await api.get(`/v2/database/creators?${params}`, {
          cancelToken: cancelToken.token
        });

        setAvailableCreators(response.data.results);
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching creators:', error);
          toast.error('Failed to load creators');
          setAvailableCreators([]);
        }
      }
    };

    if (creatorSearch.trim()) {
      fetchCreators();
    } else {
      setAvailableCreators([]);
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [creatorSearch]);

  const handleAssignCreator = async () => {
    if (!selectedCreator) return;
    
    setIsLoading(true);

    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    try {
      // Use user.id (UUID) for the API call
      const response = await api.put(`/v2/database/creators/assign-creator-to-user/${user.id}/${selectedCreator.id}`);
      
      if (response.status === 200) {
        toast.success('Creator assigned successfully');
        onUpdate(); // Refresh the data to get updated creator information
      } else {
        const errorMsg = response.data?.error || response.data?.message || 'Failed to assign creator';
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to assign creator';
      toast.error(errorMsg);
      console.error('Error assigning creator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignCreator = async () => {
    setIsLoading(true);

    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    try {
      // Use user.id (UUID) for the API call
      const response = await api.delete(`/v2/database/creators/remove-creator-from-user/${user.id}`);
      
      if (response.status === 200) {
        toast.success('Creator unassigned successfully');
        onUpdate(); 
      } else {
        const errorMsg = response.data?.error || response.data?.message || 'Failed to unassign creator';
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to unassign creator';
      toast.error(errorMsg);
      console.error('Error unassigning creator:', error);
    } finally {
      setIsLoading(false);
      setShowUnassignConfirm(false);
    }
  };

  const handleUnassignConfirm = (confirmed) => {
    if (confirmed) {
      handleUnassignCreator();
    } else {
      setShowUnassignConfirm(false);
    }
  };

  return (
    <div className="creator-assignment-popup-overlay">
      <div className="creator-assignment-popup" ref={popupRef}>
        <button className="close-popup-btn" onClick={onClose}>
          ×
        </button>

        <div className="popup-header">
          <h2>Assign Creator to User</h2>
          <div className="user-info">
            <p><strong>User:</strong> {user?.username}</p>
            <p><strong>Current Creator:</strong> {currentCreator?.name || 'None'}</p>
          </div>
        </div>

        <div className="popup-content">
          {currentCreator ? (
            <div className="current-creator-section">
              <div className="current-creator-info">
                <h3>Current Creator</h3>
                <div className="creator-card">
                  <div className="creator-card-info">
                    <div className="creator-name">{currentCreator.name}</div>
                    <div className="creator-id">(ID: {currentCreator.id})</div>
                  </div>
                  
                  {currentCreator.isVerified && (
                      <div className="creator-verified">✓ Verified</div>
                  )}
                </div>
                <button
                  onClick={() => setShowUnassignConfirm(true)}
                  className="unassign-button"
                  disabled={isLoading}
                >
                  Unassign Creator
                </button>
              </div>
            </div>
          ) : (
            <div className="assign-creator-section">
              <div className="form-group">
                <label>Search and Select Creator</label>
                <CustomSelect
                  options={availableCreators === null ? [] : availableCreators.map(c => ({
                    value: c.id,
                    label: `${c.name} (ID: ${c.id}, Charts: ${c.createdLevels?.length || 0})${c.creatorAliases?.length > 0 ? ` [${c.creatorAliases.map(a => a.name).join(', ')}]` : ''}`
                  }))}
                  value={selectedCreator ? {
                    value: selectedCreator.id,
                    label: `${selectedCreator.name} (ID: ${selectedCreator.id})`
                  } : null}
                  onChange={(option) => {
                    const creator = availableCreators?.find(c => c.id === option?.value);
                    setSelectedCreator(creator);
                  }}
                  placeholder="Type to search creators..."
                  onInputChange={(value) => setCreatorSearch(value)}
                  isSearchable={true}
                  width="100%"
                  isLoading={availableCreators === null}
                  noOptionsMessage={() => availableCreators === null ? "Loading..." : "Type to search creators..."}
                />
              </div>

              <button 
                className={`action-button ${isLoading ? 'loading' : ''}`}
                onClick={handleAssignCreator}
                disabled={isLoading || !selectedCreator}
              >
                {isLoading ? (
                  <svg className="spinner spinner-svg" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                ) : (
                  'Assign Creator'
                )}
              </button>
            </div>
          )}

          {showUnassignConfirm && (
            <div className="confirm-dialog">
              <div className="confirm-content">
                <p>Are you sure you want to unassign this creator from the user?</p>
                <div className="confirm-buttons">
                  <button
                    onClick={() => handleUnassignConfirm(true)}
                    className="confirm-yes"
                    disabled={isLoading}
                  >
                    Yes, Unassign
                  </button>
                  <button
                    onClick={() => handleUnassignConfirm(false)}
                    className="confirm-no"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 