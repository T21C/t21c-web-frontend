import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import api from '@/utils/api';
import './submissionCreatorPopup.css';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
  TEAM: 'team'
};

const roleOptions = Object.entries(CreditRole).map(([key, value]) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1)
}));

// Helper function to get unique level count from credits
const getUniqueLevelCount = (credits) => {
  if (!credits || !Array.isArray(credits)) return 0;
  
  // Extract unique level IDs using Set for better performance
  const uniqueLevelIds = new Set(credits.map(credit => credit.levelId));
  return uniqueLevelIds.size;
};

// Helper function to get role-specific credit count
const getRoleCreditCount = (credits, role) => {
  if (!credits || !Array.isArray(credits)) return 0;
  return credits.filter(credit => credit.role === role).length;
};

export const SubmissionCreatorPopup = ({ submission, onClose, onUpdate, initialRole, initialRequest }) => {
  const { t } = useTranslation('components');
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
  const isTeamMode = selectedRole === CreditRole.TEAM;

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
            setError(t('submissionCreator.messages.error.loadDetailsFailed'));
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
        if (isTeamMode) {
          response = await api.get(`${import.meta.env.VITE_TEAMS}/search/${encodeURIComponent(searchQuery)}`);
        } else {
          response = await api.get(`${import.meta.env.VITE_CREATORS}/search/${encodeURIComponent(searchQuery)}`);
        }
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error searching:', error);
        setError(t('submissionCreator.messages.error.searchFailed'));
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchEntities, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isTeamMode]);

  const fetchCreatorDetails = async (creatorId) => {
    if (!creatorId) return null;

    try {
      const response = await api.get(`${import.meta.env.VITE_CREATORS}/byId/${creatorId}`);
      const creator = response.data;
      
      if (!creator) {
        setError(t('submissionCreator.messages.error.creatorNotFound'));
        return null;
      }

      setCreatorDetails(creator);
      return creator;
    } catch (error) {
      console.error('Error fetching creator details:', error);
      setError(t('submissionCreator.messages.error.loadDetailsFailed'));
      return null;
    }
  };

  const fetchTeamDetails = async (teamId) => {
    if (!teamId) return;

    try {
      const response = await api.get(`${import.meta.env.VITE_TEAMS}/byId/${teamId}`);
      const team = response.data;
      
      if (!team) {
        setError(t('submissionCreator.messages.error.teamNotFound'));
        return;
      }

      setTeamDetails(team);
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError(t('submissionCreator.messages.error.teamLoadFailed'));
    }
  };

  const handleSelect = async (entity) => {
    if (isTeamMode) {
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
      setSuccess(isTeamMode
        ? t('submissionCreator.messages.success.teamCreatedAndAssigned')
        : t('submissionCreator.messages.success.creatorCreatedAndAssigned'));

      // Notify parent with complete updated data
      onUpdate(response.data);
      
      // Add delay before closing to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Error in creation process:', error);
      if (error.message === 'Credit request ID is missing') {
        setError(t('submissionCreator.messages.error.creditRequestIdMissing'));
      } else {
        setError(error.response?.data?.error ||
          (isTeamMode
            ? t('submissionCreator.messages.error.teamCreateFailed')
            : t('submissionCreator.messages.error.createFailed')));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssign = async () => {
    if ((!selectedCreatorId && !isTeamMode) || 
        (!selectedTeamId && isTeamMode)) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Ensure we have the credit request ID for creator assignments
      if (!initialRequest?.id) {
        throw new Error('Credit request ID is missing');
      }

      // Step 1: Update the submission
      const updateData = isTeamMode
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
                    role: selectedRole,
                    isNewRequest: false
                  }
                : request
            )
          };

      const finalSubmission = await api.put(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`,
        updateData
      );

      setSuccess(isTeamMode 
        ? t('submissionCreator.messages.success.teamAssigned')
        : t('submissionCreator.messages.success.creatorAssigned'));

      // Notify parent with complete updated data
      onUpdate(finalSubmission.data);
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error assigning:', error);
      if (error.message === 'Credit request ID is missing') {
        setError(t('submissionCreator.messages.error.creditRequestIdMissing'));
      } else {
        setError(isTeamMode 
          ? t('submissionCreator.messages.error.teamAssignFailed')
          : t('submissionCreator.messages.error.assignFailed'));
      }
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

  const selectedDetails = isTeamMode ? teamDetails : creatorDetails;
  
  return (
    <div className="submission-creator-popup-overlay">
      <div className="submission-creator-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{t('submissionCreator.title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="role-selector">
            <label>{t('submissionCreator.role.label')}</label>
            <CustomSelect
              options={roleOptions}
              value={roleOptions.find(opt => opt.value === selectedRole)}
              onChange={(selected) => {
                setSelectedRole(selected.value);
                setSearchQuery('');
                setSearchResults([]);
                setShowCreateForm(false);
                setError('');
                // Clear selected entities when switching roles
                setSelectedCreatorId(null);
                setSelectedTeamId(null);
                setCreatorDetails(null);
                setTeamDetails(null);
              }}
              className="role-select"
              width="100%"
              isDisabled={isLoadingDetails}
            />
          </div>

          <div className="creator-selection">
            <div className="current-creator">
              <div className="current-creator-header">
                {isTeamMode ? t('submissionCreator.currentTeam.label') : t('submissionCreator.currentCreator.label')}
              </div>
              <div className="current-creator-info">
                {isLoadingDetails ? (
                  <div className="current-creator-loading">
                    {t('submissionCreator.loading')}
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
                        {isTeamMode && selectedDetails.members && (
                          <span className="team-members">
                            ({selectedDetails.members.length} {t('submissionCreator.teamStats.members')})
                          </span>
                        )}
                        {selectedDetails.isVerified && (
                          <span className="verified-status">
                            {isTeamMode ? t('submissionCreator.status.verifiedTeam') : t('submissionCreator.status.verified')}
                          </span>
                        )}
                      </>
                    ) : (
                      isTeamMode ? t('submissionCreator.currentTeam.none') : t('submissionCreator.currentCreator.none')
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
                      placeholder={isTeamMode ? t('submissionCreator.search.teamPlaceholder') : t('submissionCreator.search.placeholder')}
                    />
                    <button 
                      className="create-creator-button"
                      onClick={() => setShowCreateForm(true)}
                    >
                      {t('submissionCreator.buttons.createNew')}
                    </button>
                  </div>
                  {isSearching ? (
                    <div className="search-status">
                      {t('loading.searching', { ns: 'common' })}
                    </div>
                  ) : searchQuery && (!Array.isArray(searchResults) || searchResults.length === 0) ? (
                    <div className="search-status">
                      {isTeamMode ? t('submissionCreator.search.noTeamsFound') : t('submissionCreator.search.noResults')}
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
                  <h3>{isTeamMode ? t('submissionCreator.teamForm.title') : t('submissionCreator.createForm.title')}</h3>
                  <div className="form-group">
                    <label>{isTeamMode ? t('submissionCreator.teamForm.name') : t('submissionCreator.createForm.name')}</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={isTeamMode ? t('submissionCreator.teamForm.namePlaceholder') : t('submissionCreator.createForm.namePlaceholder')}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="form-group">
                    <label>{isTeamMode ? t('submissionCreator.teamForm.aliases') : t('submissionCreator.createForm.aliases')}</label>
                    <input
                      type="text"
                      value={newAliases}
                      onChange={(e) => setNewAliases(e.target.value)}
                      placeholder={isTeamMode ? t('submissionCreator.teamForm.aliasesPlaceholder') : t('submissionCreator.createForm.aliasesPlaceholder')}
                      disabled={isCreating}
                    />
                    <small>{isTeamMode ? t('submissionCreator.teamForm.aliasesHelp') : t('submissionCreator.createForm.aliasesHelp')}</small>
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="cancel-button"
                      disabled={isCreating}
                    >
                      {t('buttons.cancel', { ns: 'common' })}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newName.trim()}
                      className={`submit-button ${isCreating ? 'loading' : ''}`}
                    >
                      {isCreating ? t('loading.creating', { ns: 'common' }) : 
                        (isTeamMode ? t('submissionCreator.buttons.createTeam') : t('submissionCreator.buttons.create'))}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {selectedDetails && (
              <div className="creator-stats">
                <h3>{isTeamMode ? t('submissionCreator.teamStats.title') : t('submissionCreator.stats.title')}</h3>
                <div className="stats-content">
                  {isTeamMode ? (
                    <>
                      <p>{t('submissionCreator.teamStats.totalLevels')}: {selectedDetails.levels?.length || 0}</p>
                      <p>{t('submissionCreator.teamStats.memberCount')}: {selectedDetails.members?.length || 0}</p>
                    </>
                  ) : (
                    <>
                      <p>{t('submissionCreator.stats.totalLevels')}: {getUniqueLevelCount(selectedDetails.credits)}</p>
                      <p>{t('submissionCreator.stats.charterCount')}: {getRoleCreditCount(selectedDetails.credits, 'charter')}</p>
                      <p>{t('submissionCreator.stats.vfxerCount')}: {getRoleCreditCount(selectedDetails.credits, 'vfxer')}</p>
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
              {isTeamMode ? t('submissionCreator.buttons.assignTeam') : t('submissionCreator.buttons.assign')}
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