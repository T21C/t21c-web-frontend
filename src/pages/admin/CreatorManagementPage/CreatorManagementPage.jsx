import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { CustomSelect } from '@/components/common/selectors';
import './creatorManagement.css';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { CreatorActionPopup } from '@/components/popups';
import { SortDescIcon, SortAscIcon } from '@/components/common/icons';
import { AccessDenied, MetaTags } from '@/components/common/display';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
const currentUrl = window.location.origin + location.pathname;


const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
};

const roleOptions = Object.entries(CreditRole).map(([key, value]) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1)
}));

const CreatorManagementPage = () => {
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newCreator, setNewCreator] = useState({ name: '', aliases: [] });
  const [newAlias, setNewAlias] = useState('');
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [searchQuery, setSearchQuery] = useState(decodeURIComponent(window.location.search.split('search=')[1]) || "");
  const [creatorListSearchQuery, setCreatorListSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [creatorPage, setCreatorPage] = useState(1);
  const [hideVerified, setHideVerified] = useState(false);
  const [hideVerifiedCreators, setHideVerifiedCreators] = useState(false);
  const [activeTab, setActiveTab] = useState('credits');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const levelsPerPage = 50;
  const creatorsPerPage = 100;
  const maxCreatorResults = 100;
  const [isUpdatingCredits, setIsUpdatingCredits] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [splitCreatorName, setSplitCreatorName] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [selectedCreatorForAction, setSelectedCreatorForAction] = useState(null);
  const { t } = useTranslation('pages');
  const tCreator = (key, params = {}) => t(`creatorManagement.${key}`, params);
  const [sort, setSort] = useState('NAME_ASC');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [showTeamSearch, setShowTeamSearch] = useState(false);
  const [pendingTeam, setPendingTeam] = useState(null);
  const [pendingCreators, setPendingCreators] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [inputValue, setInputValue] = useState('1');
  const [verifyingLevelId, setVerifyingLevelId] = useState(null);
  const [totalCreatorPages, setTotalCreatorPages] = useState(0);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const creatorsCancelTokenRef = useRef();
  const levelsCancelTokenRef = useRef();
  const scrollPositionRef = useRef(0);
  const [excludeAliases, setExcludeAliases] = useState(false);
  const [availableCreators, setAvailableCreators] = useState(null);
  const [showAddCreatorForm, setShowAddCreatorForm] = useState(false);
  const [newCreatorData, setNewCreatorData] = useState({
    name: '',
    aliases: []
  });
  const [newCreatorAlias, setNewCreatorAlias] = useState('');
  const [isCreatingCreator, setIsCreatingCreator] = useState(false);

  const fetchCreators = async (preserveScroll = false) => {
    try {
      // Only clear results when not preserving scroll (i.e. pagination changes)
      if (!preserveScroll) {
        setCreators([]);
      }
      setLoadingCreators(true);

      const params = new URLSearchParams({
        page: creatorPage,
        limit: creatorsPerPage,
        search: creatorListSearchQuery,
        hideVerified: hideVerifiedCreators,
        excludeAliases: excludeAliases,
        sort
      });

      // Cancel any in-flight creators request
      if (creatorsCancelTokenRef.current) {
        creatorsCancelTokenRef.current.cancel('New creators request initiated');
      }

      // Create new cancel token for creators
      creatorsCancelTokenRef.current = api.CancelToken.source();
      const response = await api.get(`/v2/database/creators?${params}`, {
        cancelToken: creatorsCancelTokenRef.current.token
      });

      if (response.status !== 200) throw new Error(response.data.error || 'Failed to fetch creators');
      
      setCreators(response.data.results);
      const totalPages = Math.ceil(response.data.count / creatorsPerPage);
      setTotalCreatorPages(totalPages);
      setLoadingCreators(false);

    } catch (err) {
      if (!api.isCancel(err)) {
        setError('Failed to load creators');
        console.error(err);
        setLoadingCreators(false);
      }
    }
  };

  const fetchLevelsAudit = async (preserveScroll = false) => {
    // Cancel any in-flight levels request
    if (levelsCancelTokenRef.current) {
      levelsCancelTokenRef.current.cancel('New levels request initiated');
    }

    // Create new cancel token for levels
    levelsCancelTokenRef.current = api.CancelToken.source();

    if (!preserveScroll) {
      setLevels([]);
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (currentPage - 1) * levelsPerPage,
        limit: levelsPerPage,
        search: searchQuery,
        hideVerified: hideVerified,
        excludeAliases: excludeAliases
      });

      const response = await api.get(`/v2/database/creators/levels-audit?${params}`, {
        cancelToken: levelsCancelTokenRef.current.token
      });
      if (response.data) {
        setLevels(response.data.results);
        const totalPages = Math.ceil(response.data.count / levelsPerPage);
        setTotalPages(totalPages);

        // Update selected level if one is selected
        if (selectedLevel) {
          const updatedLevel = response.data.results.find(l => l.id === selectedLevel.id);
          if (updatedLevel) {
            setSelectedLevel(updatedLevel);
            if (updatedLevel.team) {
              setTeamName(updatedLevel.team.name);
              setTeamDescription(updatedLevel.team.description || '');
              setTeamMembers(updatedLevel.team.members || []);
            }
          }
        }
      }
    } catch (error) {
      if (!api.isCancel(error)) {
        console.error('Error fetching levels:', error);
        setError('Failed to fetch levels');
      }
    } finally {
      if (!api.isCancel(error)) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchCreators();
    fetchLevelsAudit();
    fetchTeams();

    // Cleanup function to cancel any pending requests
    return () => {
      if (creatorsCancelTokenRef.current) {
        creatorsCancelTokenRef.current.cancel('Component unmounted');
      }
      if (levelsCancelTokenRef.current) {
        levelsCancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  // Fetch creators when params change
  useEffect(() => {
    fetchCreators();
  }, [creatorPage, creatorListSearchQuery, hideVerifiedCreators, sort]);

  useEffect(() => {
    fetchLevelsAudit();

    // Cleanup function to cancel any pending requests when dependencies change
    return () => {
      if (levelsCancelTokenRef.current) {
        levelsCancelTokenRef.current.cancel('Dependencies changed');
      }
    };
  }, [currentPage, searchQuery, hideVerified]);

  useEffect(() => {
    Promise.all([
      fetchCreators(),
      fetchLevelsAudit()
    ]).catch(console.error);
  }, [excludeAliases]);

  useEffect(() => {
    let cancelToken;

    const fetchAvailableCreators = async () => {
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
          limit: maxCreatorResults,
          search: creatorListSearchQuery,
          excludeAliases: excludeAliases
        });

        const response = await api.get(`/v2/database/creators?${params}`, {
          cancelToken: cancelToken.token
        });

        // Filter out creators that are already added
        setAvailableCreators(response.data.results.filter(
          creator => !pendingCreators.some(pc => pc.id === creator.id)
        ));
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching creators:', error);
          setAvailableCreators([]);
        }
      }
    };

    if (selectedLevel) {
      fetchAvailableCreators();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted or search changed');
      }
    };
  }, [creatorListSearchQuery, selectedLevel, pendingCreators, excludeAliases]);

  useEffect(() => {
    // Prevent scrolling when modals are open
    if (showMergeWarning || showSplitDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMergeWarning, showSplitDialog]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showMergeWarning) {
          setShowMergeWarning(false);
          setMergeSource(null);
          setMergeTarget(null);
        }
        if (showSplitDialog) {
          setShowSplitDialog(false);
          setSplitCreatorName('');
          setSelectedCreator(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMergeWarning, showSplitDialog]);

  const fetchTeams = async (search = '') => {
    try {
      const response = await api.get(`/v2/database/creators/teams${search ? `?search=${search}` : ''}`);
      if (response.status === 200) {
        setTeams(response.data);
        setFilteredTeams(response.data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleTeamSearch = async (value) => {
    setTeamSearchQuery(value);
    if (value.length >= 2) {
      await fetchTeams(value);
      setShowTeamSearch(true);
    } else {
      setShowTeamSearch(false);
    }
  };

  const handleTeamSelect = (team) => {
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setTeamMembers(team.members || []);
    setShowTeamSearch(false);
  };

  const handleCreateCreator = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/v2/database/creators', newCreator);
      const data = response.data;
      if (response.status !== 200) throw new Error(data.error || 'Failed to create creator');
      
      await fetchCreators();
      setSuccess('Creator created successfully');
      setNewCreator({ name: '', aliases: [] });
      setNewCreatorAlias('');
    } catch (err) {
      setError(err.message || 'Failed to create creator');
    }
  };

  const handleAddAlias = (e) => {
    e.preventDefault();
    if (newCreatorAlias && !newCreator.aliases.includes(newCreatorAlias)) {
      setNewCreator(prev => ({
        ...prev,
        aliases: [...prev.aliases, newCreatorAlias]
      }));
      setNewCreatorAlias('');
    }
  };

  const handleRemoveAlias = (alias) => {
    setNewCreator(prev => ({
      ...prev,
      aliases: prev.aliases.filter(a => a !== alias)
    }));
  };

  const handleUpdateLevelCreators = async (levelId) => {
    setError('');
    setSuccess('');
    setIsUpdatingCredits(true);

    try {
      const response = await api.put(`/v2/database/creators/level/${levelId}`, {
        creators: selectedCreators
      });
      const data = response.data;
      if (response.status !== 200) throw new Error(data.error || 'Failed to update level creators');

      await fetchLevelsAudit();
      setSuccess('Level creators updated successfully');
      setSelectedLevel(null);
      setSelectedCreators([]);
    } catch (err) {
      setError(err.message || 'Failed to update level creators');
    } finally {
      setIsUpdatingCredits(false);
    }
  };

  const handleSelectLevel = (level) => {
    setSelectedLevel(level);
    setPendingTeam(level.team ? {
      id: level.team.id,
      name: level.team.name
    } : null);
    setPendingCreators(level.currentCreators?.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role || CreditRole.CREATOR,
      isVerified: c.isVerified,
      levelCount: c.levelCount || 0,
      aliases: c.creatorAliases?.map(alias => alias.name) || []
    })) || []);
    setHasUnsavedChanges(false);
  };

  const handleTeamInputChange = (input, isUserInput = true) => {
    // If input is empty, it means we want to remove the team
    if (!input) {
      setPendingTeam(null);
      setHasUnsavedChanges(true);
      return;
    }

    const matchingTeam = teams.find(t => t.name.toLowerCase() === input?.toLowerCase());
    const newPendingTeam = matchingTeam ? { id: matchingTeam.id, name: matchingTeam.name } : { name: input };
    setPendingTeam(newPendingTeam);
    setHasUnsavedChanges(true);
  };

  const handleAddCreator = (creator) => {
    setPendingCreators(prev => [...prev, {
      id: creator.id,
      name: creator.name,
      role: CreditRole.CHARTER,
      isVerified: creator.isVerified,
      levelCount: creator.createdLevels?.length || 0,
      aliases: creator.creatorAliases?.map(alias => alias.name) || []
    }]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveCreator = (creatorId) => {
    setPendingCreators(prev => prev.filter(c => c.id !== creatorId));
    setHasUnsavedChanges(true);
  };

  const handleChangeRole = (creatorId, newRole) => {
    setPendingCreators(prev => prev.map(c => 
      c.id === creatorId ? { ...c, role: newRole } : c
    ));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedLevel) return;

    try {
      // Save team changes
      if (pendingTeam) {
        await api.put(`/v2/database/creators/level/${selectedLevel.id}/team`, {
          teamId: pendingTeam.id,
          name: pendingTeam.name,
          members: pendingCreators.map(c => c.id)
        });
      } else {
        // Remove team if none is selected
        await api.delete(`/v2/database/creators/level/${selectedLevel.id}/team`);
      }

      // Save creator changes - using the correct endpoint
      await api.put(`/v2/database/creators/level/${selectedLevel.id}`, {
        creators: pendingCreators.map(c => ({
          id: c.id,
          role: c.role
        }))
      });

      await fetchLevelsAudit();
      setSuccess('Changes saved successfully');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      setError('Failed to save changes');
    }
  };

  const handleCancelChanges = () => {
    if (hasUnsavedChanges) {
      if (selectedLevel) {
        setPendingTeam(selectedLevel.team ? {
          id: selectedLevel.team.id,
          name: selectedLevel.team.name
        } : null);
        setPendingCreators(selectedLevel.currentCreators?.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role || CreditRole.CREATOR,
          isVerified: c.isVerified,
          createdLevels: c.createdLevels,
          aliases: c.creatorAliases?.map(alias => alias.name) || []
        })) || []);
        setHasUnsavedChanges(false);
      }
    } else {
      // If no unsaved changes, deselect the level
      setSelectedLevel(null);
      setPendingTeam(null);
      setPendingCreators([]);
    }
  };


  const handleVerifyLevel = async (levelId, e) => {
    // Prevent the click from bubbling up to the level item
    e.stopPropagation();
    
    try {
      setVerifyingLevelId(levelId);
      await api.post(`/v2/database/creators/level/${levelId}/verify`);
      await fetchCreators(true);
      setShowSuccessMessage(true);
      await fetchLevelsAudit(true); // Refresh the levels list
    } catch (error) {
      console.error('Error verifying level credits:', error);
      setShowErrorMessage(true);
    } finally {
      setVerifyingLevelId(null);
    }
  };

  const handleUnverifyLevel = async (levelId, e) => {
    // Prevent the click from bubbling up to the level item
    e.stopPropagation();
    
    try {
      setVerifyingLevelId(levelId);
      await api.post(`/v2/database/creators/level/${levelId}/unverify`);
      await fetchCreators(true);
      setShowSuccessMessage(true);
      await fetchLevelsAudit(true); // Refresh the levels list
    } catch (error) {
      console.error('Error unverifying level credits:', error);
      setShowErrorMessage(true);
    } finally {
      setVerifyingLevelId(null);
    }
  };

  const clearTeamForm = () => {
    setTeamName('');
    setTeamDescription('');
    setTeamMembers([]);
  };

  // Pagination for levels

  // Pagination for creators
  const currentCreators = creators;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const paginateCreators = (pageNumber) => setCreatorPage(pageNumber);

  // Render a level item
  const renderLevelItem = (level) => {
    const levelClasses = `level-item ${level.isVerified ? 'verified' : ''} ${selectedLevel?.id === level.id ? 'selected' : ''}`;

    return (
      <div
        key={level.id}
        className={levelClasses}
        onClick={() => handleSelectLevel(level)}
      >
        <div className="level-header">
          <h3>{level.song}</h3>
          {renderVerificationStatus(level)}
        </div>
        <p>Artist: {level.artist}</p>
        <p>ID: {level.id}</p>
        {level.team && (
          <p className="team-info">
            Team: {level.team.name}
            {level.team.members?.length > 0 && ` (${level.team.members.length} members)`}
          </p>
        )}
        <div className="current-creators">
          {level.currentCreators?.map(creator => (
            <span key={creator.id} className="creator-tag">
              {creator.name} ({creator.role})
              {creator.aliases && creator.aliases.length > 0 && (
                <span className="creator-aliases"> [{creator.aliases.join(', ')}]</span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Render verification status for the entire level
  const renderVerificationStatus = (level) => {
    const isVerifying = verifyingLevelId === level.id;
    return (
      <div className="verification-status" onClick={e => e.stopPropagation()}>
        {level.isVerified ? (
          <div className="verification-buttons">
            <span className="verified-badge" title="All credits verified">✓</span>
            <button
              className={`unverify-button ${isVerifying ? 'loading' : ''}`}
              onClick={(e) => handleUnverifyLevel(level.id, e)}
              disabled={isVerifying}
              title="Click to unverify all credits"
            >
              {isVerifying ? (
                <svg className="spinner" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                </svg>
              ) : (
                'Unverify'
              )}
            </button>
          </div>
        ) : (
          <button
            className={`verify-button ${isVerifying ? 'loading' : ''}`}
            onClick={(e) => handleVerifyLevel(level.id, e)}
            disabled={isVerifying}
            title="Click to verify all credits"
          >
            {isVerifying ? (
              <svg className="spinner" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
              </svg>
            ) : (
              'Verify All'
            )}
          </button>
        )}
      </div>
    );
  };

  // Render team management section
  const renderTeamSection = () => {
    if (!selectedLevel) return null;

    return (
        <div className="team-header">
          <div className="team-input-group">
            <CustomSelect
              options={teams.map(team => ({
                value: team.name,
                label: team.name
              }))}
              value={pendingTeam ? { 
                value: pendingTeam.name, 
                label: pendingTeam.name 
              } : null}
              onChange={(selected) => {
                handleTeamInputChange(selected?.value || '');
              }}
              onInputChange={(input, { action }) => {
                if (action === 'input-change') {
                  handleTeamInputChange(input);
                }
              }}
              isCreatable={true}
              isClearable={true}
              placeholder="Enter or select team name..."
              className="team-select"
            />
            {pendingTeam && (
              <span className={pendingTeam.id ? 'existing-team' : 'new-team'}>
                {pendingTeam.id ? `ID: ${pendingTeam.id}` : 'New Team'}
              </span>
            )}
          </div>

        <div className="credits-section">
          <div className="creator-list">
            {pendingCreators.map(creator => {
              return (
              <div key={creator.id} className="creator-item">
                <span className="creator-name">
                  {creator.name.length > 25 ? `${creator.name.substring(0, 25)}...` : creator.name}
                  <span className="creator-details">
                    (ID: {creator.id} • {creator.levelCount} {creator.levelCount?.toString().endsWith('1') ? 'level' : 'levels'})
                    {creator.aliases && creator.aliases.length > 0 && (
                      <span className="creator-aliases"> • Aliases: {creator.aliases.join(', ')}</span>
                    )}
                  </span>
                </span>
                <div className="creator-controls">
                  <CustomSelect
                    value={roleOptions.find(opt => opt.value === creator.role)}
                    options={roleOptions.filter(opt => 
                      opt.value === CreditRole.CHARTER || 
                      opt.value === CreditRole.VFXER
                    )}
                    onChange={(selected) => handleChangeRole(creator.id, selected.value)}
                    className="role-select"
                  />
                  <button
                    className="remove-creator-button"
                    onClick={() => handleRemoveCreator(creator.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          
          <div className="add-creator">
            <CustomSelect
              options={availableCreators === null ? [] : availableCreators.map(creator => ({
                value: creator.id,
                label: `${creator.name} (ID: ${creator.id}, Charts: ${creator.createdLevels?.length || 0})${creator.creatorAliases?.length > 0 ? ` [${creator.creatorAliases.map(alias => alias.name).join(', ')}]` : ''}`
              }))}
              value={null}
              onChange={(option) => {
                const creator = availableCreators?.find(c => c.id === option?.value);
                if (creator) {
                  handleAddCreator(creator);
                }
              }}
              placeholder="Search and select creator..."
              onInputChange={(value) => setCreatorListSearchQuery(value)}
              isSearchable={true}
              className="creator-select"
              width="50%"
              isLoading={availableCreators === null}
              noOptionsMessage={() => availableCreators === null ? "Loading..." : "Type to search creators..."}
            />
          </div>

          <div className="management-actions">
            <button
              className="save-button"
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges}
            >
              Save Changes
            </button>
            <button
              className={hasUnsavedChanges ? "cancel-button" : "deselect-button"}
              onClick={handleCancelChanges}
            >
              {hasUnsavedChanges ? 'Cancel Changes' : 'Deselect Level'}
            </button>
          </div>
        </div>
      </div>
    );
  };


  const handleCreatorAction = (creator) => {
    setSelectedCreatorForAction(creator);
  };

  const handleCloseCreatorAction = () => {
    setSelectedCreatorForAction(null);
  };

  const handleCreatorUpdate = async () => {
    await fetchCreators(true);
    await fetchLevelsAudit();
  };

  const handleSort = (sortType) => {
    setSort(sortType);
    // Server will handle the sorting
  };

  if (user.permissionFlags === undefined) {
    return (
      <div className="creator-management-page">
        <MetaTags
          title="Creator Management"
          description="Manage creators and level credits"
          url={window.location.origin + location.pathname}
          image="/og-image.jpg"
          type="website"
        />
        
        <div className="creator-management-container">
          <div className="loader loader-level-detail"/>
        </div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied 
        metaTitle="Creator Management"
        metaDescription="Manage creators and level credits"
        currentUrl={window.location.origin + location.pathname}
      />
    );
  }

  return (
    <>
      <MetaTags
          title={tCreator('meta.title')}
          description={tCreator('meta.description')}
          url={currentUrl}
          image={''}
          type="article"
      />
      
      <div className="creator-management-page">
        <div className="creator-management-container">
          <h1>Creator Management</h1>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'credits' ? 'active' : ''}`}
              onClick={() => setActiveTab('credits')}
            >
              Credit Management
            </button>
            <button 
              className={`tab ${activeTab === 'creators' ? 'active' : ''}`}
              onClick={() => setActiveTab('creators')}
            >
              Creator Management
            </button>
          </div>

          {activeTab === 'credits' ? (
            <>

              <section className="manage-levels-section">
                <h2>Manage Level Credits</h2>
                
                <div className="levels-controls">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search levels by song, artist, or creator..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="filter-options">
                    <label className={hideVerified ? 'active' : ''}>
                      <input
                        type="checkbox"
                        checked={hideVerified}
                        onChange={(e) => setHideVerified(e.target.checked)}
                      />
                      Hide Verified Credits
                    </label>
                    <label className={excludeAliases ? 'active' : ''}>
                      <input
                        type="checkbox"
                        checked={excludeAliases}
                        onChange={(e) => setExcludeAliases(e.target.checked)}
                      />
                      Exclude Aliases from Search
                    </label>
                  </div>

                  <div className="pagination">
                    <button 
                      onClick={() => {
                        paginate(currentPage - 1)
                        if (currentPage <= 2) {
                          setInputValue('1')
                        }
                      }} 
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <div className="page-controls">
                      <span>Page </span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage === 1 && inputValue === '' ? '' : currentPage}
                        onChange={(e) => {
                          const input = e.target.value;
                          setInputValue(input);
                          if (input === '') {
                            paginate(1);
                            return;
                          }
                          const page = parseInt(input);
                          if (page >= 1 && page <= totalPages) {
                            paginate(page);
                          }
                        }}
                      />
                      <span> of {totalPages}</span>
                    </div>
                    <button 
                      onClick={() => paginate(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>


                {selectedLevel && (
                  <div className="edit-credits-panel">
                    <h3>Edit Credits for {selectedLevel.song}</h3>
                    
                    {/* Team Management Section */}
                    {renderTeamSection()}


                  </div>
                )}

                <div className="levels-list">
                  {levels.map(level => renderLevelItem(level))}
                </div>
                {loading  && (
                  <div className="new-loader" />
                )}

              </section>
            </>
          ) : (
            <>
            <div className="sort-controls">
              <button 
                className="add-creator-button"
                onClick={() => setShowAddCreatorForm(true)}
              >
                {tCreator('buttons.addCreator')}
              </button>

              <div className="sort-group">
                <p>{tCreator('sort.byName')}</p>
                <div className="sort-buttons">
                  <button 
                    className={`sort-button ${sort === 'NAME_ASC' ? 'active' : ''}`}
                    onClick={() => handleSort('NAME_ASC')}
                    title={tCreator('sort.byName')}
                  >
                    <SortAscIcon color="#aaa" />
                  </button>
                  <button 
                    className={`sort-button ${sort === 'NAME_DESC' ? 'active' : ''}`}
                    onClick={() => handleSort('NAME_DESC')}
                    title={tCreator('sort.byName')}
                  >
                    <SortDescIcon color="#aaa" />
                  </button>
                </div>
              </div>

              <div className="sort-group">
                <p>{tCreator('sort.byId')}</p>
                <div className="sort-buttons">
                  <button 
                    className={`sort-button ${sort === 'ID_ASC' ? 'active' : ''}`}
                    onClick={() => handleSort('ID_ASC')}
                    title="Sort by ID ascending"
                  >
                    <SortAscIcon color="#aaa" />
                  </button>
                  <button 
                    className={`sort-button ${sort === 'ID_DESC' ? 'active' : ''}`}
                    onClick={() => handleSort('ID_DESC')}
                    title="Sort by ID descending"
                  >
                    <SortDescIcon color="#aaa" />
                  </button>
                </div>
              </div>

              <div className="sort-group">
                <p>{tCreator('sort.byCharts')}</p>
                <div className="sort-buttons">
                  <button 
                    className={`sort-button ${sort === 'CHARTS_ASC' ? 'active' : ''}`}
                    onClick={() => handleSort('CHARTS_ASC')}
                    title="Sort by number of charts ascending"
                  >
                    <SortAscIcon color="#aaa" />
                  </button>
                  <button 
                    className={`sort-button ${sort === 'CHARTS_DESC' ? 'active' : ''}`}
                    onClick={() => handleSort('CHARTS_DESC')}
                    title="Sort by number of charts descending"
                  >
                    <SortDescIcon color="#aaa" />
                  </button>
                </div>
              </div>
            </div>
            <section className="manage-creators-section">

              <div className="creators-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder={tCreator('filters.searchPlaceholder')}
                    value={creatorListSearchQuery}
                    onChange={(e) => {
                      setCreatorListSearchQuery(e.target.value);
                      setCreatorPage(1);
                    }}
                  />
                </div>

                <div className="filter-options">
                  <label className={hideVerifiedCreators ? 'active' : ''}>
                    <input
                      type="checkbox"
                      checked={hideVerifiedCreators}
                      onChange={(e) => setHideVerifiedCreators(e.target.checked)}
                    />
                    {tCreator('filters.hideVerified')}
                  </label>
                  <label className={excludeAliases ? 'active' : ''}>
                    <input
                      type="checkbox"
                      checked={excludeAliases}
                      onChange={(e) => setExcludeAliases(e.target.checked)}
                    />
                    {tCreator('filters.excludeAliases')}
                  </label>
                </div>

                <div className="pagination">
                  <button 
                    onClick={() => paginateCreators(creatorPage - 1)} 
                    disabled={creatorPage === 1}
                  >
                    Previous
                  </button>
                  <div className="page-controls">
                    <span>Page </span>
                    <input
                      type="number"
                      min="1"
                      max={totalCreatorPages}
                      value={creatorPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalCreatorPages) {
                          paginateCreators(page);
                        }
                      }}
                    />
                    <span> of {totalCreatorPages}</span>
                  </div>
                  <button 
                    onClick={() => paginateCreators(creatorPage + 1)} 
                    disabled={creatorPage >= totalCreatorPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="creators-list">
                {!loadingCreators && currentCreators.length === 0 ? (
                  <div className="no-results-message">
                    {creatorListSearchQuery 
                      ? tCreator('messages.noResultsSearch', { query: creatorListSearchQuery })
                      : tCreator('messages.noResults')}
                  </div>
                ) : (
                  currentCreators.map(creator => (
                    <div key={creator.id} className={`creator-item ${creator.isVerified ? 'verified' : ''}`}>
                      <div className="creator-info">
                        <h3>
                          {creator.name} ({tCreator('creatorInfo.id')}: {creator.id})
                          {creator.isVerified && <span className="verified-badge" title={tCreator('creatorInfo.verifiedBadge')}>✓</span>}
                        </h3>
                        <p>{tCreator('creatorInfo.charts')}: {creator.createdLevels?.length || 0}</p>
                        {creator.creatorAliases?.length > 0 && (
                          <p>{tCreator('creatorInfo.aliases')}: {creator.creatorAliases.map(alias => alias.name).join(', ')}</p>
                        )}
                      </div>
                      <div className="creator-actions">
                        <button 
                          onClick={() => handleCreatorAction(creator)}
                          className="action-button"
                        >
                          {tCreator('buttons.manageCreator')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {loadingCreators && (
                <div className="new-loader" />
              )}
            </section>
          </>
          )}
        </div>
      </div>

      {selectedCreatorForAction && (
        <CreatorActionPopup
          creator={selectedCreatorForAction}
          onClose={handleCloseCreatorAction}
          onUpdate={handleCreatorUpdate}
        />
      )}

      {showAddCreatorForm && (
        <div className="add-creator-form-overlay">
          <div className="add-creator-form">
            <h3>{tCreator('form.title')}</h3>
            <div className="form-group">
              <label>{tCreator('form.labels.creatorName')}</label>
              <input
                type="text"
                value={newCreatorData.name}
                onChange={(e) => setNewCreatorData(prev => ({...prev, name: e.target.value}))}
                placeholder={tCreator('form.placeholders.enterName')}
              />
            </div>
            <div className="form-group">
              <label>{tCreator('form.labels.aliases')}</label>
              <div className="alias-input-group">
                <input
                  type="text"
                  value={newCreatorAlias}
                  onChange={(e) => setNewCreatorAlias(e.target.value)}
                  placeholder={tCreator('form.placeholders.enterAlias')}
                />
                <button 
                  onClick={() => {
                    if (newCreatorAlias.trim()) {
                      setNewCreatorData(prev => ({
                        ...prev,
                        aliases: [...prev.aliases, newCreatorAlias.trim()]
                      }));
                      setNewCreatorAlias('');
                    }
                  }}
                >
                  {tCreator('form.buttons.addAlias')}
                </button>
              </div>
              <div className="aliases-list">
                {newCreatorData.aliases.map((alias, index) => (
                  <div key={index} className="alias-tag">
                    {alias}
                    <button
                      onClick={() => setNewCreatorData(prev => ({
                        ...prev,
                        aliases: prev.aliases.filter((_, i) => i !== index)
                      }))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button
                className={`submit-button ${isCreatingCreator ? 'loading' : ''}`}
                onClick={async () => {
                  if (!newCreatorData.name.trim()) {
                    setError(tCreator('messages.nameRequired'));
                    return;
                  }
                  setIsCreatingCreator(true);
                  try {
                    await api.post('/v2/database/creators', newCreatorData);
                    await fetchCreators();
                    setShowAddCreatorForm(false);
                    setNewCreatorData({ name: '', aliases: [] });
                    setSuccess(tCreator('messages.creatorCreated'));
                  } catch (error) {
                    setError(error.response?.data?.error || tCreator('errors.createFailed'));
                  } finally {
                    setIsCreatingCreator(false);
                  }
                }}
                disabled={isCreatingCreator || !newCreatorData.name.trim()}
              >
                {isCreatingCreator ? tCreator('buttons.creating') : tCreator('buttons.create')}
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setShowAddCreatorForm(false);
                  setNewCreatorData({ name: '', aliases: [] });
                  setNewCreatorAlias('');
                }}
              >
                {tCreator('buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatorManagementPage; 