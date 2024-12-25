import React, { useState } from 'react';
import './adminplayerpopup.css';
import api from '../../utils/api';
import { CountrySelect } from '../PlayerComponents/CountrySelect';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

const AdminPlayerPopup = ({ player = {}, onClose, onUpdate }) => {
  if (!player) {
    console.error('Player prop is undefined');
    return null;
  }

  const [selectedCountry, setSelectedCountry] = useState(player.country || 'XX');
  const [isBanned, setIsBanned] = useState(player.isBanned || false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [pendingBanState, setPendingBanState] = useState(false);
  const [playerName, setPlayerName] = useState(player.name || '');
  const [discordId, setDiscordId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [discordInfo, setDiscordInfo] = useState({
    username: player.discordUsername || '',
    avatarUrl: player.discordAvatar || null,
    avatarId: player.discordAvatarId || null,
    id: player.discordId || null,
    isNewData: false
  });
  const [pendingDiscordInfo, setPendingDiscordInfo] = useState(null);
  const [showDiscordConfirm, setShowDiscordConfirm] = useState(false);

  const handleNameUpdate = async () => {
    if (!playerName.trim() || playerName === player.name) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/name`, {
        name: playerName
      });

      onUpdate?.({
        ...player,
        name: playerName
      });
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to update player name');
      setPlayerName(player.name); // Reset to original name on error
      console.error('Error updating player name:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryUpdate = async () => {
    if (selectedCountry === player.country) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/country`, {
        country: selectedCountry
      });

      onUpdate?.({
        ...player,
        country: selectedCountry
      });
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to update country');
      setSelectedCountry(player.country); // Reset on error
      console.error('Error updating country:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanChange = (newBanState) => {
    setPendingBanState(newBanState);
    setShowBanConfirm(true);
  };

  const handleBanUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowBanConfirm(false);
      setPendingBanState(isBanned);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/ban`, {
        isBanned: pendingBanState
      });

      setIsBanned(pendingBanState);
      onUpdate?.({
        ...player,
        isBanned: pendingBanState
      });
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to update ban status');
      setPendingBanState(isBanned); // Reset on error
      console.error('Error updating ban status:', err);
    } finally {
      setIsLoading(false);
      setShowBanConfirm(false);
    }
  };

  const handleDiscordIdSubmit = async () => {
    if (!discordId) return;

    try {
      setIsLoading(true);
      // First, fetch Discord user info
      const fetchResponse = await api.get(`${import.meta.env.VITE_PLAYERS}/${player.id}/discord/${discordId}`);
      
      if (fetchResponse.status !== 200) {
        const error = await fetchResponse.data;
        toast.error(error.details || 'Failed to fetch Discord user');
        return;
      }

      const discordUser = fetchResponse.data.discordUser;

      // Store fetched info and show confirmation
      setPendingDiscordInfo({
        username: discordUser.username,
        avatar: discordUser.avatar,
        id: discordUser.id,
        avatarUrl: discordUser.avatarUrl
      });
      setShowDiscordConfirm(true);
    } catch (error) {
      console.error('Error fetching Discord ID:', error);
      toast.error('Failed to fetch Discord ID');
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
      const updateResponse = await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/discord/${pendingDiscordInfo.id}`, {
        username: pendingDiscordInfo.username,
        avatar: pendingDiscordInfo.avatar,
      });

      if (updateResponse.status !== 200) {
        const error = await updateResponse.data;
        toast.error(error.details || 'Failed to update Discord info');
        return;
      }

      const updatedDiscordInfo = updateResponse.data.discordInfo;

      // Update local state and parent component
      setDiscordInfo({
        username: updatedDiscordInfo.username,
        avatarUrl: updatedDiscordInfo.avatarUrl,
        avatarId: updatedDiscordInfo.avatar,
        id: updatedDiscordInfo.id,
        isNewData: false
      });

      onUpdate({
        ...player,
        discordId: updatedDiscordInfo.id,
        discordUsername: updatedDiscordInfo.username,
        discordAvatar: updatedDiscordInfo.avatarUrl,
        discordAvatarId: updatedDiscordInfo.avatar
      });

      toast.success('Discord info updated successfully');
      setDiscordId(''); // Clear input
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
      const response = await api.delete(`${import.meta.env.VITE_PLAYERS}/${player.id}/discord`);
      
      if (response.status === 200) {
        setDiscordInfo({
          username: '',
          avatarUrl: null,
          avatarId: null,
          id: null,
          isNewData: false
        });
        
        onUpdate({
          ...player,
          discordId: null,
          discordUsername: null,
          discordAvatar: null,
          discordAvatarId: null
        });
        
        toast.success('Discord info removed successfully');
      }
    } catch (error) {
      console.error('Error removing Discord info:', error);
      toast.error('Failed to remove Discord info');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-player-popup-overlay">
      <div className="admin-player-popup">
        <div className="admin-player-popup-header">
          <h2>Edit Player</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="admin-form">
          <div className="form-group name-section">
            <label htmlFor="playerName">Player Name</label>
            <div className="name-input-group">
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
              {playerName !== player.name && (
                <button
                  type="button"
                  onClick={handleNameUpdate}
                  disabled={isLoading || !playerName.trim()}
                  className="update-name-button"
                >
                  Update
                </button>
              )}
            </div>
          </div>

          <div className="form-group country-section">
            <label htmlFor="country">Country</label>
            <div className="country-input-group">
              <CountrySelect
                value={selectedCountry}
                onChange={setSelectedCountry}
              />
              {selectedCountry !== player.country && (
                <button
                  type="button"
                  onClick={handleCountryUpdate}
                  disabled={isLoading}
                  className="update-country-button"
                >
                  Update
                </button>
              )}
            </div>
          </div>

          <div className="form-group ban-section">
            <div className="ban-checkbox-container">
              <label className="ban-label">
                <input
                  type="checkbox"
                  checked={showBanConfirm ? pendingBanState : isBanned}
                  onChange={(e) => handleBanChange(e.target.checked)}
                  disabled={isLoading || showBanConfirm}
                />
                Ban Player
              </label>
            </div>
            {showBanConfirm && (
              <div className="ban-confirm-container">
                <p className="ban-confirm-message">
                  Are you sure you want to {pendingBanState ? 'ban' : 'unban'} this player?
                </p>
                <div className="ban-confirm-buttons">
                  <button
                    type="button"
                    onClick={() => handleBanUpdate(true)}
                    disabled={isLoading}
                    className="ban-confirm-button"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBanUpdate(false)}
                    disabled={isLoading}
                    className="ban-cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-group discord-section">
            <label htmlFor="discordId">Discord ID</label>
            <div className="discord-input-group">
              <input
                type="text"
                id="discordId"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="Enter Discord ID to validate"
                disabled={isLoading || showDiscordConfirm}
              />
              <button
                type="button"
                onClick={handleDiscordIdSubmit}
                disabled={isLoading || showDiscordConfirm}
                className="fetch-discord-button"
              >
                Validate
              </button>
            </div>

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
                  Are you sure you want to update this player's Discord info?
                </p>
                <div className="ban-confirm-buttons">
                  <button
                    type="button"
                    onClick={() => handleDiscordConfirm(true)}
                    disabled={isLoading}
                    className="ban-confirm-button"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscordConfirm(false)}
                    disabled={isLoading}
                    className="ban-cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {discordInfo.username && !showDiscordConfirm && (
              <div className="discord-info">
                {discordInfo.avatarUrl && (
                  <img 
                    src={discordInfo.avatarUrl}
                    alt="Discord Avatar"
                    className="discord-avatar"
                  />
                )}
                <div className="discord-info-header">
                  <div>
                    <p className="discord-username">@{discordInfo.username}</p>
                    <p className="discord-id">ID: {discordInfo.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscordDelete}
                    disabled={isLoading}
                    className="discord-delete-button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="button" 
            className="done-button"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

AdminPlayerPopup.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    country: PropTypes.string,
    isBanned: PropTypes.bool,
    discordUsername: PropTypes.string,
    discordAvatar: PropTypes.string,
    discordAvatarId: PropTypes.string,
    discordId: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired
};

AdminPlayerPopup.defaultProps = {
  player: {
    name: '',
    country: 'XX',
    isBanned: false,
    discordUsername: '',
    discordAvatar: null,
    discordAvatarId: null,
    discordId: null
  }
};

export default AdminPlayerPopup; 