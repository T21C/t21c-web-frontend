import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '../../common/selectors/Select/Select';
import api from '../../../utils/api';
import './submissionCreatorPopup.css';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer'
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
  const [selectedTeamId, setSelectedTeamId] = useState(initialRequest?.teamId || null);
  const [creatorDetails, setCreatorDetails] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Track if we're in team mode
  const isTeamMode = initialRole === CreditRole.TEAM;

  // Track the request being edited
  const [editingRequestId, setEditingRequestId] = useState(initialRequest?.id || null);

  // Load initial creator/team details if they exist
  useEffect(() => {
    const loadInitialDetails = async () => {
      if (initialRequest) {
        setEditingRequestId(initialRequest.id);
        
        if (initialRequest.creatorId || initialRequest.teamId) {
          setIsLoadingDetails(true);
          try {
            if (initialRequest.creatorId) {
              setSelectedCreatorId(initialRequest.creatorId);
              await fetchCreatorDetails(initialRequest.creatorId);
            } else if (initialRequest.teamId) {
              setSelectedTeamId(initialRequest.teamId);
              await fetchTeamDetails(initialRequest.teamId);
            }
          } catch (error) {
            console.error('Error loading initial details:', error);
            setError(tCreator('messages.error.loadDetailsFailed'));
          } finally {
            setIsLoadingDetails(false);
          }
        } else if (initialRequest.isNewRequest) {
          setNewName(initialRequest.creatorName || initialRequest.teamName || '');
          setShowCreateForm(true);
        }
      }
    };

    loadInitialDetails();
  }, [initialRequest]);

  // Handle search
  useEffect(() => {
    const searchEntities = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        let response;
        if (selectedRole === CreditRole.TEAM) {
          response = await api.get(`${import.meta.env.VITE_TEAMS}/search/${encodeURIComponent(searchQuery)}`);
        } else {
          response = await api.get(`${import.meta.env.VITE_CREATORS}/search/${encodeURIComponent(searchQuery)}`);
        }
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error searching:', error);
        setError(tCreator('messages.error.searchFailed'));
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchEntities, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedRole]);

  const fetchCreatorDetails = async (creatorId) => {
    if (!creatorId) return null;

    try {
      const response = await api.get(`${import.meta.env.VITE_CREATORS}/byId/${creatorId}`);
      const creator = response.data;
      
      if (!creator) {
        setError(tCreator('messages.error.creatorNotFound'));
        return null;
      }

      setCreatorDetails(creator);
      return creator;
    } catch (error) {
      console.error('Error fetching creator details:', error);
      setError(tCreator('messages.error.loadDetailsFailed'));
      return null;
    }
  };

  const fetchTeamDetails = async (teamId) => {
    if (!teamId) return;

    try {
      const response = await api.get(`${import.meta.env.VITE_TEAMS}/byId/${teamId}`);
      const team = response.data;
      
      if (!team) {
        setError(tCreator('messages.error.teamNotFound'));
        return;
      }

      setTeamDetails(team);
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError(tCreator('messages.error.teamLoadFailed'));
    }
  };

  const handleSelect = async (entity) => {
    if (selectedRole === CreditRole.TEAM) {
      setSelectedTeamId(entity.id);
      await fetchTeamDetails(entity.id);
    } else {
      setSelectedCreatorId(entity.id);
      await fetchCreatorDetails(entity.id);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isCreating) return; // Prevent multiple simultaneous submissions
    setIsCreating(true);
    setError('');

    try {
      // Add loading state to UI
      setSuccess('');
      setError('');

      // Wait for any pending state updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Ensure we have the credit request ID
      if (!initialRequest?.id) {
        throw new Error('Credit request ID is missing');
      }

      const response = await api.post(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/creators`,
        {
          name: newName.trim(),
          aliases: newAliases
            .split(',')
            .map(alias => alias.trim())
            .filter(alias => alias.length > 0),
          role: selectedRole,
          creditRequestId: initialRequest.id // Ensure this is passed correctly
        }
      );

      // Wait for response to be fully processed
      await new Promise(resolve => setTimeout(resolve, 100));

      setShowCreateForm(false);
      setNewName('');
      setNewAliases('');
      setSuccess(selectedRole === CreditRole.TEAM
        ? tCreator('messages.success.teamCreatedAndAssigned')
        : tCreator('messages.success.creatorCreatedAndAssigned'));

      // Notify parent with complete updated data
      onUpdate(response.data);
      
      // Add delay before closing to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Error in creation process:', error);
      if (error.message === 'Credit request ID is missing') {
        setError(tCreator('messages.error.creditRequestIdMissing'));
      } else {
        setError(error.response?.data?.error ||
          (selectedRole === CreditRole.TEAM
            ? tCreator('messages.error.teamCreateFailed')
            : tCreator('messages.error.createFailed')));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssign = async () => {
    if ((!selectedCreatorId && selectedRole !== CreditRole.TEAM) || 
        (!selectedTeamId && selectedRole === CreditRole.TEAM)) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Ensure we have the credit request ID for creator assignments
      if (selectedRole !== CreditRole.TEAM && !initialRequest?.id) {
        throw new Error('Credit request ID is missing');
      }

      // Step 1: Update the submission
      const updateData = selectedRole === CreditRole.TEAM
        ? {
            teamRequestData: {
              ...submission.teamRequestData,
              teamId: selectedTeamId,
              teamName: teamDetails.name,
              isNewRequest: false
            }
          }
        : {
            creatorRequests: submission.creatorRequests.map(request => 
              request.id === initialRequest.id
                ? {
                    ...request,
                    creatorId: selectedCreatorId,
                    creatorName: creatorDetails.name,
                    isNewRequest: false
                  }
                : request
            )
          };

      const finalSubmission = await api.put(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`,
        updateData
      );

      setSuccess(selectedRole === CreditRole.TEAM 
        ? tCreator('messages.success.teamAssigned')
        : tCreator('messages.success.creatorAssigned'));

      // Notify parent with complete updated data
      onUpdate(finalSubmission.data);
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error assigning:', error);
      if (error.message === 'Credit request ID is missing') {
        setError(tCreator('messages.error.creditRequestIdMissing'));
      } else {
        setError(selectedRole === CreditRole.TEAM 
          ? tCreator('messages.error.teamAssignFailed')
          : tCreator('messages.error.assignFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedEntity || !submissionId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.put(`/v2/admin/submissions/levels/${submissionId}/profiles`, {
        creatorRequests: [{
          id: creditRequestId,
          creatorId: selectedEntity.id,
          creatorName: selectedEntity.name,
          isNewRequest: false
        }]
      });

      // Pass the updated submission data back to the parent
      onUpdate(response.data);
      setIsLoading(false);
      setSelectedEntity(null);
      setShowConfirmation(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update submission');
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

  const selectedDetails = isTeamMode ? teamDetails : creatorDetails;
  
  return (
    <div className="submission-creator-popup-overlay">
      <div className="submission-creator-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{tCreator('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          {!isTeamMode && (
            <div className="role-selector">
              <label>{tCreator('role.label')}</label>
              <Select
                options={roleOptions}
                value={roleOptions.find(opt => opt.value === selectedRole)}
                onChange={(selected) => {
                  setSelectedRole(selected.value);
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowCreateForm(false);
                  setError('');
                }}
                className="role-select"
                width="100%"
                isDisabled={isLoadingDetails}
              />
            </div>
          )}

          <div className="creator-selection">
            <div className="current-creator">
              <div className="current-creator-header">
                {isTeamMode ? tCreator('currentTeam.label') : tCreator('currentCreator.label')}
              </div>
              <div className="current-creator-info">
                {isLoadingDetails ? (
                  <div className="current-creator-loading">
                    {tCreator('loading')}
                    <div className="loading-spinner" />
                  </div>
                ) : (
                  <div className="creator-name-display">
                    {selectedDetails ? (
                      <>
                        {selectedDetails.name} (ID: {isTeamMode ? selectedTeamId : selectedCreatorId})
                        {selectedDetails.aliases?.length > 0 && (
                          <span className="aliases">
                            [{selectedDetails.aliases.join(', ')}]
                          </span>
                        )}
                        {!isTeamMode && selectedDetails.user && (
                          <span className="creator-discord">
                            ({selectedDetails.user.username})
                          </span>
                        )}
                        {selectedDetails.isVerified && (
                          <span className="verified-status">
                            {isTeamMode ? tCreator('status.verifiedTeam') : tCreator('status.verified')}
                          </span>
                        )}
                      </>
                    ) : (
                      isTeamMode ? tCreator('currentTeam.none') : tCreator('currentCreator.none')
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="creator-search-section">
              {!showCreateForm ? (
                <>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isTeamMode ? tCreator('search.teamPlaceholder') : tCreator('search.placeholder')}
                    />
                    <button 
                      className="create-creator-button"
                      onClick={() => setShowCreateForm(true)}
                    >
                      {tCreator('buttons.createNew')}
                    </button>
                  </div>
                  {isSearching ? (
                    <div className="search-status">
                      {isTeamMode ? tCreator('search.noTeamsFound') : tCreator('search.loading')}
                    </div>
                  ) : searchQuery && (!Array.isArray(searchResults) || searchResults.length === 0) ? (
                    <div className="search-status">
                      {isTeamMode ? tCreator('search.noTeamsFound') : tCreator('search.noResults')}
                    </div>
                  ) : (
                    <div className="search-results">
                      {Array.isArray(searchResults) && searchResults.map((entity) => (
                        <div
                          key={entity.id}
                          className="creator-result"
                          onClick={() => handleSelect(entity)}
                        >
                          <span className="creator-name">
                            {entity.name} (ID: {entity.id})
                          </span>
                          {entity.aliases?.length > 0 && (
                            <span className="creator-aliases">
                              [{entity.aliases.join(', ')}]
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleCreate} className="create-creator-form">
                  <h3>{isTeamMode ? tCreator('teamForm.title') : tCreator('createForm.title')}</h3>
                  <div className="form-group">
                    <label>{isTeamMode ? tCreator('teamForm.name') : tCreator('createForm.name')}</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={isTeamMode ? tCreator('teamForm.namePlaceholder') : tCreator('createForm.namePlaceholder')}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="form-group">
                    <label>{isTeamMode ? tCreator('teamForm.aliases') : tCreator('createForm.aliases')}</label>
                    <input
                      type="text"
                      value={newAliases}
                      onChange={(e) => setNewAliases(e.target.value)}
                      placeholder={isTeamMode ? tCreator('teamForm.aliasesPlaceholder') : tCreator('createForm.aliasesPlaceholder')}
                      disabled={isCreating}
                    />
                    <small>{isTeamMode ? tCreator('teamForm.aliasesHelp') : tCreator('createForm.aliasesHelp')}</small>
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="cancel-button"
                      disabled={isCreating}
                    >
                      {tCreator('buttons.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newName.trim()}
                      className={`submit-button ${isCreating ? 'loading' : ''}`}
                    >
                      {isCreating ? tCreator('buttons.creating') : 
                        (isTeamMode ? tCreator('buttons.createTeam') : tCreator('buttons.create'))}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {selectedDetails && (
              <div className="creator-stats">
                <h3>{isTeamMode ? tCreator('teamStats.title') : tCreator('stats.title')}</h3>
                <div className="stats-content">
                  {isTeamMode ? (
                    <>
                      <p>{tCreator('teamStats.totalLevels')}: {selectedDetails.levels?.length || 0}
                        &nbsp;({selectedDetails.levels?.filter(level => level.isVerified).length || 0} {tCreator('teamStats.verifiedLevels')})
                      </p>
                      <p>{tCreator('teamStats.memberCount')}: {selectedDetails.members?.length || 0}</p>
                    </>
                  ) : (
                    <>
                      <p>{tCreator('stats.totalLevels')}: {selectedDetails.createdLevels?.length || 0}
                        &nbsp;({selectedDetails.createdLevels?.filter(level => level.isVerified).length || 0} {tCreator('stats.verifiedLevels')})
                      </p>
                      <p>{tCreator('stats.charterCount')}: {
                        selectedDetails.credits?.filter(credit => credit.role === 'charter').length || 0
                      }</p>
                      <p>{tCreator('stats.vfxerCount')}: {
                        selectedDetails.credits?.filter(credit => credit.role === 'vfxer').length || 0
                      }</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className={`action-button ${isLoading || isLoadingDetails ? 'loading' : ''}`}
              onClick={handleAssign}
              disabled={(!selectedCreatorId && !isTeamMode) || (!selectedTeamId && isTeamMode) || isLoading || isLoadingDetails}
            >
              {isTeamMode ? tCreator('buttons.assignTeam') : tCreator('buttons.assign')}
              {(isLoading || isLoadingDetails) && <div className="loading-spinner" />}
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