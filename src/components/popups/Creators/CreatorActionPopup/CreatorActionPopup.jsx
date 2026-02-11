import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import api from '@/utils/api';
import './creatorActionPopup.css';
import { toast } from 'react-hot-toast';

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
  const popupRef = useRef(null);

  const [mode, setMode] = useState('update'); // update, merge, split, discord, levels
  const [name, setName] = useState(creator?.name || '');
  const [aliases, setAliases] = useState(creator?.creatorAliases?.map(alias => alias.name) || []);
  const [newAlias, setNewAlias] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [isVerified, setIsVerified] = useState(creator?.isVerified || false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
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
    if (creator?.credits?.length === 1) {
      const singleCredit= creator.credits[0];
      setDefaultRole(singleCredit.role || CreditRole.CHARTER);
    }
  }, [creator]);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      // Only handle left mouse button clicks (button === 0)
      // Ignore right-clicks and other mouse buttons
      if (event.button !== 0 && event.button !== undefined) {
        return;
      }
      
      // Check if click is outside popup and not on a react-select menu
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        // Also check if click is on react-select menu (which is portaled to body)
        const isReactSelectMenu = event.target.closest('.custom-select-menu') || 
                                  event.target.closest('[class*="react-select"]') ||
                                  event.target.closest('[id*="react-select"]');
        if (!isReactSelectMenu) {
          onClose();
        }
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
          setError(t('creatorActionPopup.actionPopup.errors.loadCreatorsFailed'));
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
          setError(t('creatorActionPopup.actionPopup.errors.invalidDiscordId'));
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
        setSuccess(t('creatorActionPopup.actionPopup.success.updated'));
        onUpdate();
      } else {
        setError(response.data?.error || t('creatorActionPopup.actionPopup.errors.updateFailed'));
      }
    } catch (error) {
      setError(t('creatorActionPopup.actionPopup.errors.updateFailed'));
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
      setSuccess(t('creatorActionPopup.actionPopup.success.merged'));
      onUpdate();
      setTimeout(onClose, 1500);
    } catch (error) {
      setError(t('creatorActionPopup.actionPopup.errors.mergeFailed'));
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
        roles: validNames.map((_, i) => splitRoles?.[i] || defaultRole)
      });
      setSuccess(t('creatorActionPopup.actionPopup.success.split'));
      onUpdate();
      setTimeout(onClose, 1500);
    } catch (error) {
      setError(t('creatorActionPopup.actionPopup.errors.splitFailed'));
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
        toast.error(response.data.details || t('creatorActionPopup.actionPopup.errors.fetchDiscordFailed'));
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
      toast.error(t('creatorActionPopup.actionPopup.errors.fetchDiscordFailed'));
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
        
        onUpdate();
        toast.success(t('creatorActionPopup.actionPopup.success.discordUpdated'));
        setDiscordId('');
      }
    } catch (error) {
      console.error('Error updating Discord info:', error);
      toast.error(t('creatorActionPopup.actionPopup.errors.updateDiscordFailed'));
    } finally {
      setIsLoading(false);
      setShowDiscordConfirm(false);
      setPendingDiscordInfo(null);
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
        onUpdate();
        toast.success(t('creatorActionPopup.actionPopup.success.userUnlinked'));
      }
    } catch (error) {
      console.error('Error unlinking user:', error);
      toast.error(t('creatorActionPopup.actionPopup.errors.unlinkFailed'));
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
            aria-label={t('creatorActionPopup.actionPopup.close')}
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
                {t('creatorActionPopup.actionPopup.modes.update')}
              </button>
              <button 
                className={`mode-btn ${mode === 'discord' ? 'active' : ''}`}
                onClick={() => setMode('discord')}
              >
                {t('creatorActionPopup.actionPopup.modes.discord')}
              </button>
              <button 
                className={`mode-btn ${mode === 'merge' ? 'active' : ''}`}
                onClick={() => setMode('merge')}
              >
                {t('creatorActionPopup.actionPopup.modes.merge')}
              </button>
              <button 
                className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
                onClick={() => setMode('split')}
              >
                {t('creatorActionPopup.actionPopup.modes.split')}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="popup-content">
            {mode === 'update' && (
              <div className="update-form">
                <div className="form-group">
                  <label>{t('creatorActionPopup.actionPopup.update.name.label')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('creatorActionPopup.actionPopup.update.name.placeholder')}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                    />
                    {t('creatorActionPopup.actionPopup.update.verifyCreator')}
                  </label>
                </div>

                <div className="form-group">
                  <label>{t('creatorActionPopup.actionPopup.update.aliases.label')}</label>
                  <div className="alias-input-group">
                    <input
                      type="text"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      placeholder={t('creatorActionPopup.actionPopup.update.aliases.placeholder')}
                    />
                    <button onClick={handleAddAlias}>{t('creatorActionPopup.actionPopup.update.aliases.add')}</button>
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
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    t('creatorActionPopup.actionPopup.update.updateButton')
                  )}
                </button>
              </div>
            )}

            {mode === 'merge' && (
              <div className="merge-form">
                <div className="warning-notice">
                  <div className="warning-notice-icon">⚠️</div>
                  <div className="warning-notice-content">
                    <strong>{t('creatorActionPopup.actionPopup.merge.warning.title')}</strong> {t('creatorActionPopup.actionPopup.merge.warning.message', { creatorName: creator?.name || '' })}
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('creatorActionPopup.actionPopup.merge.selectTarget.label')}</label>
                  <CustomSelect
                    options={availableCreators === null ? [] : availableCreators.map(c => ({
                      value: c.id,
                      label: t('creatorActionPopup.actionPopup.merge.creatorLabel', {
                        name: c.name,
                        id: c.id,
                        count: c.credits?.length || 0,
                        aliases: c.aliases?.length > 0 ? ` [${c.aliases.join(', ')}]` : ''
                      })
                    }))}
                    value={mergeTarget ? {
                      value: mergeTarget.id,
                      label: `${mergeTarget.name} (ID: ${mergeTarget.id})`
                    } : null}
                    onChange={(option) => {
                      const target = availableCreators?.find(c => c.id === option?.value);
                      setMergeTarget(target);
                    }}
                    placeholder={t('creatorActionPopup.actionPopup.merge.selectTarget.placeholder')}
                    onInputChange={(value) => setMergeTargetSearch(value)}
                    isSearchable={true}
                    width="100%"
                    isLoading={availableCreators === null}
                    noOptionsMessage={() => availableCreators === null ? t('loading.generic', { ns: 'common' }) : t('creatorActionPopup.actionPopup.merge.selectTarget.noOptions')}
                  />
                </div>

                <button 
                  className={`action-button warning ${isLoading ? 'loading' : ''}`}
                  onClick={handleMerge}
                  disabled={isLoading || !mergeTarget}
                >
                  {isLoading ? (
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    t('creatorActionPopup.actionPopup.merge.mergeButton')
                  )}
                </button>
              </div>
            )}

            {mode === 'split' && (
              <div className="split-form">
                <div className="form-group">
                  <label>{t('creatorActionPopup.actionPopup.split.newNamesAndRoles.label')}</label>
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
                            placeholder={t('creatorActionPopup.actionPopup.split.newNamesAndRoles.namePlaceholder', { index: index + 1 })}
                          />
                          <CustomSelect
                            options={roleOptions}
                            value={roleOptions.find(option => option.value === (splitRoles?.[index] || defaultRole))}
                            onChange={(option) => {
                              const newRoles = [...(splitRoles || splitNames.map(() => defaultRole))];
                              newRoles[index] = option ? option.value : defaultRole;
                              setSplitRoles(newRoles);
                            }}
                            placeholder={t('creatorActionPopup.actionPopup.split.newNamesAndRoles.rolePlaceholder')}
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
                      {t('creatorActionPopup.actionPopup.split.newNamesAndRoles.addAnother')}
                    </button>
                  </div>
                </div>

                <button 
                  className={`action-button ${isLoading ? 'loading' : ''}`}
                  onClick={handleSplit}
                  disabled={isLoading || splitNames.filter(name => name.trim()).length < 1}
                >
                  {isLoading ? (
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    t('creatorActionPopup.actionPopup.split.splitButton')
                  )}
                </button>
              </div>
            )}

            {mode === 'discord' && (
              <div className="discord-form">
                {creator?.user ? (
                  <div className="form-group">
                    <label>{t('creatorActionPopup.actionPopup.discord.currentUser.label')}</label>
                    <div className="linked-user-info">
                      {creator.user.avatarUrl && (
                        <img 
                          src={creator.user.avatarUrl}
                          alt={t('creatorActionPopup.actionPopup.discord.currentUser.avatarAlt')}
                          className="user-avatar"
                        />
                      )}
                      <div className="user-info-content">
                        <p className="user-username">@{creator.user.username}</p>
                        <p className="user-id">{t('creatorActionPopup.actionPopup.discord.currentUser.idLabel')} {creator.user.id}</p>
                        <button
                          onClick={() => setShowUnlinkConfirm(true)}
                          className="unlink-button"
                          type="button"
                        >
                          {t('creatorActionPopup.actionPopup.discord.currentUser.unlinkButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>{t('creatorActionPopup.actionPopup.discord.discordId.label')}</label>
                    <div className="discord-input-group">
                      <input
                        type="text"
                        value={discordId}
                        onChange={(e) => setDiscordId(e.target.value)}
                        placeholder={t('creatorActionPopup.actionPopup.discord.discordId.placeholder')}
                        disabled={isLoading || showDiscordConfirm}
                      />
                      <button
                        onClick={handleDiscordIdSubmit}
                        disabled={isLoading || showDiscordConfirm || !discordId}
                        className="fetch-discord-button"
                      >
                        {t('creatorActionPopup.actionPopup.discord.discordId.validateButton')}
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
                          alt={t('creatorActionPopup.actionPopup.discord.confirm.avatarAlt')}
                          className="discord-avatar"
                        />
                      )}
                      <div>
                        <p className="discord-username">@{pendingDiscordInfo.username}</p>
                        <p className="discord-id">{t('creatorActionPopup.actionPopup.discord.currentUser.idLabel')} {pendingDiscordInfo.id}</p>
                      </div>
                    </div>
                    <p className="discord-confirm-message">
                      {t('creatorActionPopup.actionPopup.discord.confirm.message')}
                    </p>
                    <div className="discord-confirm-buttons">
                      <button
                        onClick={() => handleDiscordConfirm(true)}
                        disabled={isLoading}
                        className="discord-confirm-button"
                      >
                        {t('creatorActionPopup.actionPopup.discord.confirm.confirmButton')}
                      </button>
                      <button
                        onClick={() => handleDiscordConfirm(false)}
                        disabled={isLoading}
                        className="discord-cancel-button"
                      >
                        {t('creatorActionPopup.actionPopup.discord.confirm.cancelButton')}
                      </button>
                    </div>
                  </div>
                )}

                {showUnlinkConfirm && (
                  <div className="confirm-dialog">
                    <div className="confirm-content">
                      <p>{t('creatorActionPopup.actionPopup.discord.unlinkConfirm.message')}</p>
                      <div className="confirm-buttons">
                        <button
                          onClick={() => handleUnlinkConfirm(true)}
                          className="confirm-yes"
                          disabled={isLoading}
                        >
                          {t('creatorActionPopup.actionPopup.discord.unlinkConfirm.yesButton')}
                        </button>
                        <button
                          onClick={() => handleUnlinkConfirm(false)}
                          className="confirm-no"
                          disabled={isLoading}
                        >
                          {t('creatorActionPopup.actionPopup.discord.unlinkConfirm.cancelButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 