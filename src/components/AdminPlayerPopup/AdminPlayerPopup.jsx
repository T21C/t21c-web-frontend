import React, { useState } from 'react';
import './adminplayerpopup.css';
import api from '../../utils/api';
import { CountrySelect } from '../PlayerComponents/CountrySelect';

const AdminPlayerPopup = ({ player, onClose, onUpdate }) => {
  const [selectedCountry, setSelectedCountry] = useState(player.country || '');
  const [isBanned, setIsBanned] = useState(player.isBanned || false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Update country
      if (selectedCountry !== player.country) {
        await api.put(`${import.meta.env.VITE_INDIVIDUAL_PLAYER}${player.id}/country`, {
          country: selectedCountry
        });
      }

      // Update ban status
      if (isBanned !== player.isBanned) {
        await api.put(`${import.meta.env.VITE_INDIVIDUAL_PLAYER}${player.id}/ban`, {
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
          <h2>Edit Player: {player.player}</h2>
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