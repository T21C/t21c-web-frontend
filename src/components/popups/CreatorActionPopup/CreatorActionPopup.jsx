import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import api from '@/utils/api';
import './creatorActionPopup.css';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ExternalLinkIcon } from '@/components/common/icons';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
};

const roleOptions = Object.entries(CreditRole).map(([key, value]) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1)
}));

export const CreatorActionPopup = ({ creator, onClose, onUpdate }) => {
  const { t } = useTranslation('components');
  const tCreator = (key) => t(`creator.actionPopup.${key}`) || key;
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const { difficultyDict } = useDifficultyContext();

  const [mode, setMode] = useState('update'); // update, merge, split, discord, levels
  const [name, setName] = useState(creator?.name || '');
  const [aliases, setAliases] = useState(creator?.creatorAliases?.map(alias => alias.name) || []);
  const [newAlias, setNewAlias] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [isVerified, setIsVerified] = useState(creator?.isVerified || false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [discordInfo, setDiscordInfo] = useState({
    username: creator?.user?.username || '',
    avatarUrl: creator?.user?.avatarUrl || null,
    id: creator?.user?.id || null,
    isNewData: false
  });
  const [pendingDiscordInfo, setPendingDiscordInfo] = useState(null);
  const [showDiscordConfirm, setShowDiscordConfirm] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeTargetSearch, setMergeTargetSearch] = useState('');
  const [splitNames, setSplitNames] = useState(['', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableCreators, setAvailableCreators] = useState([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [splitRoles, setSplitRoles] = useState([]);
  const [defaultRole, setDefaultRole] = useState(CreditRole.CHARTER);

  useEffect(() => {
    // Determine default role if creator has exactly one level
    if (creator?.createdLevels?.length === 1) {
      const singleLevel = creator.createdLevels[0];
      setDefaultRole(singleLevel.LevelCredit?.role || CreditRole.CHARTER);
    }
  }, [creator]);

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
          search: mergeTargetSearch,
          sort: 'NAME_ASC'
        });

        const response = await api.get(`/v2/database/creators?${params}`, {
          cancelToken: cancelToken.token
        });

        setAvailableCreators(response.data.results.filter(c => c.id !== creator?.id));
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching creators:', error);
          setError('Failed to load creators');
          setAvailableCreators([]);
        }
      }
    };

    if (mode === 'merge') {
      fetchCreators();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [creator?.id, mode, mergeTargetSearch]);

  const handleAddAlias = () => {
    if (newAlias && !aliases.includes(newAlias)) {
      setAliases([...aliases, newAlias]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (alias) => {
    setAliases(aliases.filter(a => a !== alias));
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let userId = null;
      if (discordId) {
        try {
          const userResponse = await api.get(`/v2/admin/users/discord/${discordId}`);
          if (userResponse.data) {
            userId = userResponse.data.id;
          }
        } catch (err) {
          console.error('Error looking up user by Discord ID:', err);
          setError('Invalid Discord ID or user not found');
          setIsLoading(false);
          return;
        }
      }

      const response = await api.put(`/v2/database/creators/${creator.id}`, {
        name,
        aliases,
        userId,
        isVerified
      });

      if (response.status === 200) {
        setSuccess('Creator updated successfully');
        onUpdate();
      } else {
        setError(response.data?.error || 'Failed to update creator');
      }
    } catch (error) {
      setError('Failed to update creator');
      console.error('Error updating creator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeTarget) return;
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/v2/database/creators/merge', {
        sourceId: creator.id,
        targetId: mergeTarget.id
      });
      setSuccess('Creators merged successfully');
      onUpdate();
      setTimeout(onClose, 1500);
    } catch (error) {
      setError('Failed to merge creators');
      console.error('Error merging creators:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplit = async () => {
    const validNames = splitNames.filter(name => name.trim());
    if (validNames.length < 1) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/v2/database/creators/split', {
        creatorId: creator.id,
        newNames: validNames,
        roles: validNames.map((_, i) => splitRoles?.[i] || CreditRole.CREATOR)
      });
      setSuccess('Creator split successfully');
      onUpdate();
      setTimeout(onClose, 1500);
    } catch (error) {
      setError('Failed to split creator');
      console.error('Error splitting creator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordIdSubmit = async () => {
    if (!discordId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/v2/admin/users/discord/${discordId}`);
      
      if (response.status !== 200) {
        toast.error(response.data.details || 'Failed to fetch Discord user');
        return;
      }

      const user = response.data;
      setPendingDiscordInfo({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl
      });
      setShowDiscordConfirm(true);
    } catch (error) {
      console.error('Error fetching Discord ID:', error);
      toast.error('Failed to fetch Discord user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordConfirm = async (confirmed) => {
    if (!confirmed || !pendingDiscordInfo) {
      setShowDiscordConfirm(false);
      setPendingDiscordInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.put(`/v2/database/creators/${creator.id}/discord/${pendingDiscordInfo.id}`);
      
      if (response.status === 200) {
        setDiscordInfo({
          ...pendingDiscordInfo,
          isNewData: false
        });
        
        onUpdate();
        toast.success('Discord info updated successfully');
        setDiscordId('');
      }
    } catch (error) {
      console.error('Error updating Discord info:', error);
      toast.error('Failed to update Discord info');
    } finally {
      setIsLoading(false);
      setShowDiscordConfirm(false);
      setPendingDiscordInfo(null);
    }
  };

  const handleDiscordDelete = async () => {
    try {
      setIsLoading(true);
      const response = await api.delete(`/v2/database/creators/${creator.id}/discord`);
      
      if (response.status === 200) {
        setDiscordInfo({
          username: '',
          avatarUrl: null,
          id: null,
          isNewData: false
        });
        
        onUpdate();
        toast.success('Discord info removed successfully');
      }
    } catch (error) {
      console.error('Error removing Discord info:', error);
      toast.error('Failed to remove Discord info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkConfirm = async (confirmed) => {
    if (!confirmed) {
      setShowUnlinkConfirm(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.delete(`/v2/database/creators/${creator.id}/discord`);
      
      if (response.status === 200) {
        setDiscordInfo({
          username: '',
          avatarUrl: null,
          id: null,
          isNewData: false
        });
        
        onUpdate();
        toast.success('User unlinked successfully');
      }
    } catch (error) {
      console.error('Error unlinking user:', error);
      toast.error('Failed to unlink user');
    } finally {
      setIsLoading(false);
      setShowUnlinkConfirm(false);
    }
  };

  useEffect(() => {
    const nameChanged = name !== creator?.name;
    const aliasesChanged = JSON.stringify(aliases) !== JSON.stringify(creator?.creatorAliases?.map(alias => alias.name) || []);
    const verificationChanged = isVerified !== creator?.isVerified;
    setHasPendingChanges(nameChanged || aliasesChanged || verificationChanged);
  }, [name, aliases, creator, isVerified]);

  useEffect(() => {
    // Lock body scroll when popup opens
    document.body.style.overflowY = 'hidden';
    
    // Cleanup: restore body scroll when popup closes
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  return (
    <div className="creator-action-popup-container">
      <div className="creator-action-popup-overlay">
        <div className="creator-action-popup" ref={popupRef}>
          <button 
            className="close-popup-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M6 6L18 18M6 18L18 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="popup-header">
            <h2>{creator?.name}</h2>
            <div className="mode-selector">
              <button 
                className={`mode-btn ${mode === 'update' ? 'active' : ''}`}
                onClick={() => setMode('update')}
              >
                Update
              </button>
              <button 
                className={`mode-btn ${mode === 'discord' ? 'active' : ''}`}
                onClick={() => setMode('discord')}
              >
                Discord
              </button>
              <button 
                className={`mode-btn ${mode === 'merge' ? 'active' : ''}`}
                onClick={() => setMode('merge')}
              >
                Merge
              </button>
              <button 
                className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
                onClick={() => setMode('split')}
              >
                Split
              </button>
              <button 
                className={`mode-btn ${mode === 'levels' ? 'active' : ''}`}
                onClick={() => setMode('levels')}
              >
                Levels
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="popup-content">
            {mode === 'update' && (
              <div className="update-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter creator name"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                    />
                    Verify Creator
                  </label>
                </div>

                <div className="form-group">
                  <label>Aliases</label>
                  <div className="alias-input-group">
                    <input
                      type="text"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      placeholder="Add alias"
                    />
                    <button onClick={handleAddAlias}>Add</button>
                  </div>
                  <div className="aliases-list">
                    {aliases.map((alias, index) => (
                      <div key={index} className="alias-tag">
                        {alias}
                        <button onClick={() => handleRemoveAlias(alias)}>&times;</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  className={`action-button ${isLoading ? 'loading' : ''}`}
                  onClick={handleUpdate}
                  disabled={isLoading || !name.trim() || !hasPendingChanges}
                >
                  {isLoading ? (
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    'Update Creator'
                  )}
                </button>
              </div>
            )}

            {mode === 'merge' && (
              <div className="merge-form">
                <div className="warning-notice">
                  <div className="warning-notice-icon">⚠️</div>
                  <div className="warning-notice-content">
                    <strong>Warning:</strong> This will delete <strong>{creator?.name}</strong> and reassign all credits to the selected creator. This action cannot be undone.
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Target Creator</label>
                  <CustomSelect
                    options={availableCreators === null ? [] : availableCreators.map(c => ({
                      value: c.id,
                      label: `${c.name} (ID: ${c.id}, Charts: ${c.createdLevels?.length || 0})${c.aliases?.length > 0 ? ` [${c.aliases.join(', ')}]` : ''}`
                    }))}
                    value={mergeTarget ? {
                      value: mergeTarget.id,
                      label: `${mergeTarget.name} (ID: ${mergeTarget.id})`
                    } : null}
                    onChange={(option) => {
                      const target = availableCreators?.find(c => c.id === option?.value);
                      setMergeTarget(target);
                    }}
                    placeholder="Search and select target creator..."
                    onInputChange={(value) => setMergeTargetSearch(value)}
                    isSearchable={true}
                    width="100%"
                    isLoading={availableCreators === null}
                    noOptionsMessage={() => availableCreators === null ? "Loading..." : "Type to search creators..."}
                  />
                </div>

                <button 
                  className={`action-button warning ${isLoading ? 'loading' : ''}`}
                  onClick={handleMerge}
                  disabled={isLoading || !mergeTarget}
                >
                  {isLoading ? (
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    'Merge Creators'
                  )}
                </button>
              </div>
            )}

            {mode === 'split' && (
              <div className="split-form">
                <div className="form-group">
                  <label>New Creator Names and Roles</label>
                  <div className="split-names-list">
                    {splitNames.map((name, index) => (
                      <div key={index} className="split-name-input">
                        <div className="split-name-role-container">
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              const newNames = [...splitNames];
                              newNames[index] = e.target.value;
                              setSplitNames(newNames);
                            }}
                            placeholder={`Enter creator name ${index + 1}`}
                          />
                          <CustomSelect
                            options={roleOptions}
                            value={roleOptions.find(option => option.value === (splitRoles?.[index] || defaultRole))}
                            onChange={(option) => {
                              const newRoles = [...(splitRoles || splitNames.map(() => defaultRole))];
                              newRoles[index] = option ? option.value : defaultRole;
                              setSplitRoles(newRoles);
                            }}
                            placeholder="Select role"
                            width="100%"
                          />
                        </div>
                        {splitNames.length > 2 && (
                          <button
                            onClick={() => {
                              setSplitNames(splitNames.filter((_, i) => i !== index));
                              setSplitRoles((prevRoles) => {
                                const newRoles = [...(prevRoles || splitNames.map(() => defaultRole))];
                                newRoles.splice(index, 1);
                                return newRoles;
                              });
                            }}
                            className="remove-name-button"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSplitNames([...splitNames, '']);
                        setSplitRoles((prevRoles) => [...(prevRoles || splitNames.map(() => defaultRole)), defaultRole]);
                      }}
                      className="add-name-button"
                    >
                      + Add Another Name
                    </button>
                  </div>
                </div>

                <button 
                  className={`action-button ${isLoading ? 'loading' : ''}`}
                  onClick={handleSplit}
                  disabled={isLoading || splitNames.filter(name => name.trim()).length < 1}
                >
                  {isLoading ? (
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    'Split Creator'
                  )}
                </button>
              </div>
            )}

            {mode === 'discord' && (
              <div className="discord-form">
                {creator?.user ? (
                  <div className="form-group">
                    <label>Current User</label>
                    <div className="linked-user-info">
                      {creator.user.avatarUrl && (
                        <img 
                          src={creator.user.avatarUrl}
                          alt="User Avatar"
                          className="user-avatar"
                        />
                      )}
                      <div className="user-info-content">
                        <p className="user-username">@{creator.user.username}</p>
                        <p className="user-id">ID: {creator.user.id}</p>
                        <button
                          onClick={() => setShowUnlinkConfirm(true)}
                          className="unlink-button"
                          type="button"
                        >
                          Unlink User
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Discord ID</label>
                    <div className="discord-input-group">
                      <input
                        type="text"
                        value={discordId}
                        onChange={(e) => setDiscordId(e.target.value)}
                        placeholder="Enter Discord ID"
                        disabled={isLoading || showDiscordConfirm}
                      />
                      <button
                        onClick={handleDiscordIdSubmit}
                        disabled={isLoading || showDiscordConfirm || !discordId}
                        className="fetch-discord-button"
                      >
                        Validate
                      </button>
                    </div>
                  </div>
                )}

                {showDiscordConfirm && pendingDiscordInfo && (
                  <div className="discord-confirm-container">
                    <div className="discord-preview">
                      {pendingDiscordInfo.avatarUrl && (
                        <img 
                          src={pendingDiscordInfo.avatarUrl}
                          alt="Discord Avatar"
                          className="discord-avatar"
                        />
                      )}
                      <div>
                        <p className="discord-username">@{pendingDiscordInfo.username}</p>
                        <p className="discord-id">ID: {pendingDiscordInfo.id}</p>
                      </div>
                    </div>
                    <p className="discord-confirm-message">
                      Is this the correct Discord user?
                    </p>
                    <div className="discord-confirm-buttons">
                      <button
                        onClick={() => handleDiscordConfirm(true)}
                        disabled={isLoading}
                        className="discord-confirm-button"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleDiscordConfirm(false)}
                        disabled={isLoading}
                        className="discord-cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showUnlinkConfirm && (
                  <div className="confirm-dialog">
                    <div className="confirm-content">
                      <p>Are you sure you want to unlink this user?</p>
                      <div className="confirm-buttons">
                        <button
                          onClick={() => handleUnlinkConfirm(true)}
                          className="confirm-yes"
                          disabled={isLoading}
                        >
                          Yes, Unlink
                        </button>
                        <button
                          onClick={() => handleUnlinkConfirm(false)}
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
            )}

            {mode === 'levels' && (
              <div className="levels-list">
                {creator.createdLevels?.map(level => {
                  const difficultyInfo = difficultyDict[level.diffId];
                  return (
                    <div 
                      key={level.id}
                      className="level-item"
                      onClick={() => {
                        window.open(`/levels/${level.id}`, '_blank');
                      }}
                    >
                      <div className="level-item-icon">
                        <img 
                          src={difficultyDict[difficultyInfo?.id]?.icon} 
                          alt={difficultyInfo?.name || 'Difficulty'} 
                          className="difficulty-icon"
                        />
                      </div>
                      <div className="level-item-info">
                        <div className="level-id">#{level.id}</div>
                        <div className="level-title">{level.song}</div>
                        <div className="level-artist">{level.artist}</div>
                        <div className="level-legacy-creators">
                          {
                            level.charter && <span>Charter: <b>{level.charter}</b></span>
                          }
                          <br/>
                          {
                            level.vfxer && <span>VFX: <b>{level.vfxer}</b></span>
                          }
                        </div>
                      </div>
                      <div className="level-item-role">
                        {level.LevelCredit?.role}
                      </div>
                      <ExternalLinkIcon color="#fff" size={32} className="external-link-icon"/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 