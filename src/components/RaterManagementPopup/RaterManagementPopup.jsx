import React, { useState, useEffect } from 'react';
import './ratermanagementpopup.css';
import api from '../../utils/api';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
        isSuperAdmin: !rater.isSuperAdmin,
        superAdminPassword
      };

      await api.put(`${import.meta.env.VITE_RATERS}/${rater.id}/super-admin`, payload);
      onUpdate({
        ...rater,
        isSuperAdmin: !rater.isSuperAdmin
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      onError(error.response?.data?.error || tError('updateAdminFailed'));
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
      const payload = { superAdminPassword };
      await api.delete(`${import.meta.env.VITE_RATERS}/${rater.id}`, { data: payload });
      onDelete(rater.id);
    } catch (error) {
      console.error('Error deleting rater:', error);
      onError(error.response?.data?.error || tError('deleteFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordIdSubmit = async () => {
    if (!discordId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`${import.meta.env.VITE_DISCORD_API}/users/${discordId}`);
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
      onError(tError('discordFetchFailed'));
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
        discordUsername: pendingDiscordInfo.username,
        discordAvatar: pendingDiscordInfo.avatarUrl
      };

      if (rater.isSuperAdmin) {
        payload.superAdminPassword = superAdminPassword;
      }

      await api.put(`${import.meta.env.VITE_RATERS}/${rater.id}/discord`, payload);

      onUpdate({
        ...rater,
        discordId: pendingDiscordInfo.id,
        discordUsername: pendingDiscordInfo.username,
        discordAvatar: pendingDiscordInfo.avatarUrl
      });

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

  const DefaultAvatar = () => (
    <svg fill="#ffffff" width="42px" viewBox="-0.32 -0.32 32.64 32.64" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="0.32"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16.001-7.163 16.001-16s-7.163-16-16.001-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14.001 6.28 14.001 14-6.281 14.032-14.001 14.032zM14.53 25.015h2.516v-2.539h-2.516zM15.97 6.985c-1.465 0-2.672 0.395-3.62 1.184s-1.409 2.37-1.386 3.68l0.037 0.073h2.295c0-0.781 0.261-1.904 0.781-2.308s1.152-0.604 1.893-0.604c0.854 0 1.511 0.232 1.971 0.696s0.689 1.127 0.689 1.989c0 0.725-0.17 1.343-0.512 1.855-0.343 0.512-0.916 1.245-1.721 2.198-0.831 0.749-1.344 1.351-1.538 1.806s-0.297 1.274-0.305 2.454h2.405c0-0.74 0.047-1.285 0.14-1.636s0.36-0.744 0.799-1.184c0.945-0.911 1.703-1.802 2.277-2.674 0.573-0.87 0.86-1.831 0.86-2.881 0-1.465-0.443-2.607-1.331-3.424s-2.134-1.226-3.736-1.226z"></path> </g></svg>
  );

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
              {rater.discordUsername || tRater('unknown')}
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

  useEffect(() => {
    const fetchRaters = async () => {
      try {
        const response = await api.get(import.meta.env.VITE_RATERS);
        setRaters(response.data);
      } catch (error) {
        console.error('Error fetching raters:', error);
        setErrorMessage(tError('loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRaters();
  }, []);

  const handleAddRater = async () => {
    if (!newRaterDiscordId.trim()) return;

    try {
      const response = await api.post(import.meta.env.VITE_RATERS, { discordId: newRaterDiscordId });
      setRaters([...raters, response.data]);
      setNewRaterDiscordId('');
    } catch (error) {
      console.error('Error adding rater:', error);
      setErrorMessage(tError('addFailed'));
    }
  };

  const handleUpdateRater = (updatedRater) => {
    setRaters(raters.map(r => r.id === updatedRater.id ? updatedRater : r));
  };

  const handleDeleteRater = (raterId) => {
    setRaters(raters.filter(r => r.id !== raterId));
  };

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