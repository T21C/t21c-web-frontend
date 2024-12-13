import React, { useState } from 'react';
import './adminplayerpopup.css';
import api from '../../utils/api';
import { CountrySelect } from '../PlayerComponents/CountrySelect';

const AdminPlayerPopup = ({ player, onClose, onUpdate }) => {
  const [selectedCountry, setSelectedCountry] = useState(player.country || '');
  const [isBanned, setIsBanned] = useState(player.isBanned || false);
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

  const handleFetchDiscord = async () => {
    if (!discordId.trim()) {
      setError('Please enter a Discord ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYERS}/${player.id}/discord/${discordId}`);
      const { discordUser } = response.data;
      
      setDiscordInfo({
        username: discordUser.username,
        avatarId: discordUser.avatar,
        avatarUrl: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        id: discordUser.id,
        isNewData: true
      });
      setDiscordId('');
    } catch (err) {
      setError('Failed to fetch Discord user');
      console.error('Error fetching Discord user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDiscord = () => {
    if (!discordInfo.isNewData) return;

    onUpdate?.({
      ...player,
      discordId: discordInfo.id,
      discordUsername: discordInfo.username,
      discordAvatarId: discordInfo.avatarId,
      discordAvatar: discordInfo.avatarUrl
    });

    setDiscordInfo(prev => ({...prev, isNewData: false}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (selectedCountry !== player.country) {
        await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/country`, {
          country: selectedCountry
        });
      }

      if (isBanned !== player.isBanned) {
        await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/ban`, {
          isBanned
        });
      }

      onUpdate?.({
        ...player,
        country: selectedCountry,
        isBanned
      });
      onClose();
    } catch (err) {
      setError('Failed to update player settings');
      console.error('Error updating player:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-player-popup-overlay">
      <div className="admin-player-popup">
        <div className="admin-player-popup-header">
          <h2>Edit Player: {player.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <CountrySelect
              value={selectedCountry}
              onChange={setSelectedCountry}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isBanned}
                onChange={(e) => setIsBanned(e.target.checked)}
              />
              Ban Player
            </label>
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
              />
              <button
                type="button"
                onClick={handleFetchDiscord}
                disabled={isLoading}
                className="fetch-discord-button"
              >
                Validate
              </button>
            </div>
            {discordInfo.username && (
              <div className="discord-info">
                <div className="discord-info-header">
                  <div>
                    <p className="discord-username">{discordInfo.username}</p>
                    <p className="discord-id">ID: {discordInfo.id}</p>
                  </div>
                  {discordInfo.isNewData && (
                    <button
                      type="button"
                      onClick={handleApplyDiscord}
                      className="apply-discord-button"
                    >
                      Apply Changes
                    </button>
                  )}
                </div>
                {discordInfo.avatarUrl && (
                  <img 
                    src={discordInfo.avatarUrl}
                    alt="Discord Avatar"
                    className="discord-avatar"
                  />
                )}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button 
              type="submit" 
              className="save-button"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPlayerPopup; 