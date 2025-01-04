import React, { useState, useEffect, useCallback } from 'react';
import './ratermanagementpopup.css';
import api from '../../utils/api';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import DefaultAvatar from '../Icons/DefaultAvatar';

const RaterEntry = ({ rater, onUpdate, onDelete, superAdminPassword, onError }) => {
  const { t } = useTranslation('components');
  const tRater = (key, params) => t(`raterManagement.raterEntry.${key}`, params);
  const tError = (key) => t(`raterManagement.errors.${key}`);

  const [isExpanded, setIsExpanded] = useState(false);
  const [discordId, setDiscordId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDiscordInfo, setPendingDiscordInfo] = useState(null);
  const [showDiscordConfirm, setShowDiscordConfirm] = useState(false);

  const handleAdminStatusChange = async () => {
    if (!superAdminPassword) {
      onError(tError('passwordRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        discordId: rater.discordId,
        role: 'superadmin',
        superAdminPassword
      };

      if (rater.isSuperAdmin) {
        await api.post(`/v2/admin/users/revoke-role`, payload);
      } else {
        await api.post(`/v2/admin/users/grant-role`, payload);
      }
      onUpdate();
    } catch (error) {
      console.error('Error updating admin status:', error);
      if (error.response?.data?.message === 'Invalid super admin password') {
        onError(tError('invalidPassword'));
      } else {
        onError(error.response?.data?.error || tError('updateAdminFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(tError('deleteConfirm'))) {
      return;
    }

    if (!superAdminPassword) {
      onError(tError('passwordRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const payload = { 
        discordId: rater.discordId,
        role: rater.isSuperAdmin ? 'superadmin' : 'rater',
        superAdminPassword 
      };
      await api.post(`/v2/admin/users/revoke-role`, payload);
      onDelete();
    } catch (error) {
      console.error('Error deleting rater:', error);
      if (error.response?.data?.error === 'Invalid super admin password') {
        onError(tError('invalidPassword'));
      } else {
        onError(error.response?.data?.error || tError('deleteFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordIdSubmit = async () => {
    if (!discordId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/v2/discord/users/${discordId}`);
      const discordUser = response.data;

      setPendingDiscordInfo({
        username: discordUser.username,
        avatar: discordUser.avatar,
        id: discordUser.id,
        avatarUrl: discordUser.avatarUrl
      });
      setShowDiscordConfirm(true);
    } catch (error) {
      console.error('Error fetching Discord ID:', error);
      if (error.response?.status === 404) {
        onError(tError('userNotFound'));
      } else {
        onError(tError('discordFetchFailed'));
      }
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

    if (rater.isSuperAdmin && !superAdminPassword) {
      onError(tError('passwordRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        discordId: pendingDiscordInfo.id,
        role: rater.isSuperAdmin ? 'superadmin' : 'rater',
        superAdminPassword: rater.isSuperAdmin ? superAdminPassword : undefined
      };

      await api.post(`/v2/admin/users/grant-role`, payload);
      onUpdate();

      setDiscordId('');
    } catch (error) {
      console.error('Error updating Discord info:', error);
      onError(error.response?.data?.error || tError('updateDiscordFailed'));
    } finally {
      setIsLoading(false);
      setShowDiscordConfirm(false);
      setPendingDiscordInfo(null);
    }
  };

  return (
    <div className="rater-entry">
      <div className="rater-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="rater-info">
          {rater.discordAvatar ? (
            <img 
              src={rater.discordAvatar}
              alt="Discord Avatar"
              className="discord-avatar"
            />
          ) : (
            <DefaultAvatar />
          )}
          <div className="rater-text">
            <span className="rater-name">
              {rater.nickname || tRater('unknown')}
              {rater.isSuperAdmin && (
                <span className="super-admin-icon" title={tRater('adminBadge')}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 0L10.2 4.8L15.2 5.6L11.6 9.2L12.4 14.4L8 12L3.6 14.4L4.4 9.2L0.8 5.6L5.8 4.8L8 0Z" fill="#FFD700"/>
                  </svg>
                </span>
              )}
            </span>
            {rater.discordUsername && (
              <span className="discord-tag">@{rater.discordUsername}</span>
            )}
          </div>
        </div>
        <div className="rater-actions">
          {rater.isSuperAdmin ? (
            <button 
              className={`remove-admin-button ${!superAdminPassword ? 'hidden' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAdminStatusChange();
              }}
              disabled={!superAdminPassword}
            >
              {tRater('buttons.removeAdmin')}
            </button>
          ) : (
            <>
              <button 
                className={`make-admin-button ${!superAdminPassword ? 'hidden' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdminStatusChange();
                }}
                disabled={!superAdminPassword}
              >
                {tRater('buttons.makeAdmin')}
              </button>
              <button 
                className="delete-rater-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                {tRater('buttons.delete')}
              </button>
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="rater-details">
          <div className="discord-section">
            <div className="discord-input-group">
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder={tRater('discord.idInput')}
                disabled={isLoading || showDiscordConfirm}
              />
              <button
                onClick={handleDiscordIdSubmit}
                disabled={isLoading || showDiscordConfirm}
              >
                {tRater('discord.validateButton')}
              </button>
            </div>

            {showDiscordConfirm && pendingDiscordInfo && (
              <div className="discord-confirm">
                <div className="discord-preview">
                  {pendingDiscordInfo.avatarUrl ? (
                    <img 
                      src={pendingDiscordInfo.avatarUrl}
                      alt="Discord Avatar"
                      className="discord-avatar"
                    />
                  ) : (
                    <DefaultAvatar />
                  )}
                  <div>
                    <p className="discord-username">@{pendingDiscordInfo.username}</p>
                    <p className="discord-id">{tRater('discord.idLabel', { id: pendingDiscordInfo.id })}</p>
                  </div>
                </div>

                <div className="confirm-section">
                  <p className="confirm-message">
                    {tRater('discord.confirmMessage', { username: pendingDiscordInfo.username })}
                  </p>
                  <div className="confirm-buttons">
                    <button 
                      onClick={() => handleDiscordConfirm(true)}
                      disabled={rater.isSuperAdmin && !superAdminPassword}
                    >
                      {tRater('discord.confirmButton')}
                    </button>
                    <button onClick={() => handleDiscordConfirm(false)}>
                      {tRater('discord.cancelButton')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {rater.discordUsername && !showDiscordConfirm && (
              <div className="current-discord-info">
                {rater.discordAvatar ? (
                  <img 
                    src={rater.discordAvatar}
                    alt="Discord Avatar"
                    className="discord-avatar"
                  />
                ) : (
                  <DefaultAvatar />
                )}
                <div>
                  <p className="discord-username">@{rater.discordUsername}</p>
                  <p className="discord-id">{tRater('discord.idLabel', { id: rater.discordId })}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RaterManagementPopup = ({ onClose, currentUser }) => {
  const { t } = useTranslation('components');
  const tRater = (key) => t(`raterManagement.${key}`);
  const tError = (key) => t(`raterManagement.errors.${key}`);

  const [raters, setRaters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRaterDiscordId, setNewRaterDiscordId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClickOutside = useCallback((event) => {
    if (event.target.classList.contains('rater-management-overlay')) {
      onClose();
    }
  }, [onClose]);

  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleClickOutside, handleEscapeKey]);

  const fetchRaters = useCallback(async () => {
    try {
      const response = await api.get('/v2/admin/users');
      setRaters(response.data);
    } catch (error) {
      console.error('Error fetching raters:', error);
      setErrorMessage('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRaters();
  }, [fetchRaters]);

  const handleAddRater = async () => {
    if (!newRaterDiscordId.trim()) return;

    try {
      const payload = { 
        discordId: newRaterDiscordId,
        role: 'rater'
      };
      await api.post('/v2/admin/users/grant-role', payload);
      await fetchRaters();
      setNewRaterDiscordId('');
    } catch (error) {
      console.error('Error adding rater:', error);
      if (error.response?.data?.error?.includes('Failed to fetch Discord user info: Not Found')) {
        setErrorMessage(tError('userNotFound'));
      } else {
        setErrorMessage(error.response?.data?.error || tError('addFailed'));
      }
    }
  };

  const handleUpdateRater = useCallback(() => fetchRaters(), [fetchRaters]);

  const handleDeleteRater = useCallback(() => fetchRaters(), [fetchRaters]);

  const handleError = (message) => {
    setErrorMessage(message);
  };

  const filteredRaters = raters.filter(rater => {
    const searchLower = searchQuery.toLowerCase();
    return (
      rater.discordUsername?.toLowerCase().includes(searchLower) ||
      rater.discordId?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="rater-management-overlay">
      <div className="rater-management-popup">
        <div className="popup-header">
          <h2>{tRater('title')}</h2>
          <div className="header-password-input">
            <input
              type="password"
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              placeholder={tRater('superAdmin.password.placeholder')}
            />
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="search-section">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tRater('search.placeholder')}
            className="search-input"
          />
        </div>

        <div className="raters-list">
          {isLoading ? (
            <div className="loading">{tRater('loading')}</div>
          ) : (
            filteredRaters.map(rater => (
              <RaterEntry
                key={rater.id}
                rater={rater}
                onUpdate={handleUpdateRater}
                onDelete={handleDeleteRater}
                superAdminPassword={superAdminPassword}
                onError={handleError}
              />
            ))
          )}
        </div>

        <div className="add-rater-section">
          <input
            type="text"
            value={newRaterDiscordId}
            onChange={(e) => setNewRaterDiscordId(e.target.value)}
            placeholder={tRater('addRater.placeholder')}
          />
          <button onClick={handleAddRater}>{tRater('addRater.button')}</button>
        </div>
      </div>

      {errorMessage && (
        <div className="error-message-container">
          <p className="error-text">{errorMessage}</p>
          <button className="close-error" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}
    </div>
  );
};

RaterManagementPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    username: PropTypes.string.isRequired
  }).isRequired
};

export default RaterManagementPopup; 