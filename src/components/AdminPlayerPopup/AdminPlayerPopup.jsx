import React, { useState } from 'react';
import './adminplayerpopup.css';
import api from '../../utils/api';
import { encodeToBase32 } from '@/Repository/RemoteRepository';


const COUNTRY_CODES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  // ... add more countries as needed
  { code: 'DE', name: 'Germany' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }
];

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
        await api.put(`${import.meta.env.VITE_INDIVIDUAL_PLAYER}${encodeToBase32(player.player)}/country`, {
          country: selectedCountry
        });
      }

      // Update ban status
      if (isBanned !== player.isBanned) {
        await api.put(`${import.meta.env.VITE_INDIVIDUAL_PLAYER}${encodeToBase32(player.player)}/ban`, {
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
            <select
              id="country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              <option value="">Select Country</option>
              {COUNTRY_CODES.sort((a, b) => a.name.localeCompare(b.name)).map(country => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
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