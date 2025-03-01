import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '../Select/Select';
import api from '../../utils/api';
import './submissionCreatorPopup.css';
import { toast } from 'react-hot-toast';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
  TEAM: 'team'
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Initialize with selected entity if one exists
  useEffect(() => {
    if (initialRequest?.creatorId) {
      setSelectedCreatorId(initialRequest.creatorId);
      fetchCreatorDetails(initialRequest.creatorId);
    } else if (initialRequest?.teamId) {
      setSelectedTeamId(initialRequest.teamId);
      fetchTeamDetails(initialRequest.teamId);
    } else if (initialRequest?.isNewRequest) {
      // Pre-fill name and show create form for new requests
      setNewName(initialRequest.creatorName || initialRequest.teamName || '');
      setShowCreateForm(true);
    }
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

  const handleSelect = (entity) => {
    if (selectedRole === CreditRole.TEAM) {
      setSelectedTeamId(entity.id);
      fetchTeamDetails(entity.id);
    } else {
      setSelectedCreatorId(entity.id);
      fetchCreatorDetails(entity.id);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      const aliases = newAliases
        .split(',')
        .map(alias => alias.trim())
        .filter(alias => alias.length > 0);

      let response;
      if (selectedRole === CreditRole.TEAM) {
        response = await api.post(`${import.meta.env.VITE_TEAMS}`, {
          name: newName.trim(),
          aliases,
          description: ''  // Include empty description for new teams
        });
        toast.success(tCreator('messages.success.teamCreated'));
      } else {
        response = await api.post(`${import.meta.env.VITE_CREATORS}`, {
          name: newName.trim(),
          aliases
        });
        toast.success(tCreator('messages.success.creatorCreated'));
      }

      const newEntity = response.data;

      // Update submission with the new entity ID
      try {
        const updateData = selectedRole === CreditRole.TEAM
          ? {
              teamRequestData: {
                teamId: newEntity.id,
                teamName: newEntity.name,
                isNewRequest: false,
                team: {
                  id: newEntity.id,
                  name: newEntity.name,
                  aliases: newEntity.aliases || [],
                  description: newEntity.description || '',
                  members: newEntity.members || [],
                  createdAt: newEntity.createdAt,
                  updatedAt: newEntity.updatedAt
                }
              }
            }
          : {
              creatorRequests: submission.creatorRequests.map(request => 
                request.role === selectedRole
                  ? { 
                      ...request, 
                      creatorId: newEntity.id, 
                      creatorName: newEntity.name,
                      isNewRequest: false,
                      creator: {
                        id: newEntity.id,
                        name: newEntity.name,
                        aliases: newEntity.aliases || []
                      }
                    }
                  : request
              )
            };

        const updatedSubmission = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`, updateData);

        // Update local state
        if (selectedRole === CreditRole.TEAM) {
          setSelectedTeamId(newEntity.id);
          setTeamDetails({
            ...newEntity,
            members: newEntity.members || [],
            description: newEntity.description || ''
          });
        } else {
          setSelectedCreatorId(newEntity.id);
          setCreatorDetails(newEntity);
        }

        setShowCreateForm(false);
        setNewName('');
        setNewAliases('');
        setSuccess(selectedRole === CreditRole.TEAM 
          ? tCreator('messages.success.teamAssigned')
          : tCreator('messages.success.creatorAssigned'));

        // Notify parent component with the updated entity
        onUpdate(updatedSubmission.data);

        // Close after a delay
        setTimeout(onClose, 1500);
      } catch (error) {
        console.error('Error updating submission:', error);
        setError(tCreator('messages.error.assignFailed'));
      }
    } catch (error) {
      console.error('Error creating:', error);
      setError(error.response?.data?.error || 
        (selectedRole === CreditRole.TEAM ? 
          tCreator('messages.error.teamCreateFailed') : 
          tCreator('messages.error.createFailed')));
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
      const updateData = selectedRole === CreditRole.TEAM
        ? {
            teamRequestData: {
              ...submission.teamRequestData,
              teamId: selectedTeamId,
              isNewRequest: false,
              teamName: teamDetails.name,
              team: {
                id: selectedTeamId,
                name: teamDetails.name,
                aliases: teamDetails.aliases,
                members: teamDetails.members
              }
            }
          }
        : {
            creatorRequests: submission.creatorRequests.map(request => 
              request.role === selectedRole
                ? { 
                    ...request, 
                    creatorId: selectedCreatorId, 
                    isNewRequest: false,
                    creatorName: creatorDetails.name,
                    creator: {
                      id: selectedCreatorId,
                      name: creatorDetails.name,
                      aliases: creatorDetails.aliases
                    }
                  }
                : request
            )
          };

      await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`, updateData);

      setSuccess(selectedRole === CreditRole.TEAM 
        ? tCreator('messages.success.teamAssigned')
        : tCreator('messages.success.creatorAssigned'));

      // Notify parent component with the updated entity
      onUpdate({
        type: selectedRole,
        id: selectedRole === CreditRole.TEAM ? selectedTeamId : selectedCreatorId,
        name: selectedRole === CreditRole.TEAM ? teamDetails.name : creatorDetails.name,
        aliases: selectedRole === CreditRole.TEAM ? teamDetails.aliases : creatorDetails.aliases,
        isNewRequest: false,
        ...(selectedRole === CreditRole.TEAM ? {
          members: teamDetails.members || []
        } : {})
      });

      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error assigning:', error);
      setError(selectedRole === CreditRole.TEAM 
        ? tCreator('messages.error.teamAssignFailed')
        : tCreator('messages.error.assignFailed'));
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

  const isTeamMode = selectedRole === CreditRole.TEAM;
  console.log(teamDetails);
  console.log(creatorDetails);
  const selectedDetails = isTeamMode ? teamDetails : creatorDetails;
  
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
              onChange={(selected) => {
                setSelectedRole(selected.value);
                setSearchQuery('');
                setSearchResults([]);
                setShowCreateForm(false);
                setError('');
              }}
              className="role-select"
              width="100%"
            />
          </div>

          <div className="creator-selection">
            <div className="current-creator">
              <div className="current-creator-header">
                {isTeamMode ? tCreator('currentTeam.label') : tCreator('currentCreator.label')}
              </div>
              <div className="current-creator-info">
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
                    />
                  </div>
                  <div className="form-group">
                    <label>{isTeamMode ? tCreator('teamForm.aliases') : tCreator('createForm.aliases')}</label>
                    <input
                      type="text"
                      value={newAliases}
                      onChange={(e) => setNewAliases(e.target.value)}
                      placeholder={isTeamMode ? tCreator('teamForm.aliasesPlaceholder') : tCreator('createForm.aliasesPlaceholder')}
                    />
                    <small>{isTeamMode ? tCreator('teamForm.aliasesHelp') : tCreator('createForm.aliasesHelp')}</small>
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="cancel-button"
                    >
                      {tCreator('buttons.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newName.trim()}
                      className="submit-button"
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
              className="action-button"
              onClick={handleAssign}
              disabled={(!selectedCreatorId && !isTeamMode) || (!selectedTeamId && isTeamMode) || isLoading}
            >
              {isTeamMode ? tCreator('buttons.assignTeam') : tCreator('buttons.assign')}
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