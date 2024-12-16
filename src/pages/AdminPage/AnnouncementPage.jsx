import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './announcementpage.css';
import api from '../../utils/api';

const AnnouncementPage = () => {
  const [newLevels, setNewLevels] = useState([]);
  const [rerates, setRerates] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [newLevelsResponse, reratesResponse] = await Promise.all([
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/new`),
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/rerates`)
      ]);
      setNewLevels(newLevelsResponse.data);
      setRerates(reratesResponse.data);
    } catch (err) {
      setError('Failed to fetch levels. Please try again.');
      console.error('Error fetching levels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (levelId) => {
    setSelectedLevels(prev => {
      if (prev.includes(levelId)) {
        return prev.filter(id => id !== levelId);
      } else {
        return [...prev, levelId];
      }
    });
  };

  const handleAnnounce = async () => {
    if (selectedLevels.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      // First send webhook
      await api.post(`${process.env.VITE_WEBHOOKS}/testhook/levels`, {
        levelIds: selectedLevels
      });

      // Then mark levels as announced
      await api.post(`${process.env.VITE_LEVELS}/announce`, {
        levelIds: selectedLevels
      });

      // Refresh the lists
      await fetchLevels();
      setSelectedLevels([]);
    } catch (err) {
      setError('Failed to announce levels. Please try again.');
      console.error('Error announcing levels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLevelItem = (level, isRerate = false) => (
    <div key={level.id} className="announcement-item">
      <label className="checkbox-container">
        <input
          type="checkbox"
          checked={selectedLevels.includes(level.id)}
          onChange={() => handleCheckboxChange(level.id)}
          disabled={isLoading}
        />
        <span className="checkmark"></span>
        <div className="item-details">
          <div className="item-title">
            {level.song} - {level.artist}
          </div>
          <div className="item-subtitle">
            {isRerate ? (
              <>
                {level.previousDifficulty?.name} ➔ {level.difficulty?.name}
              </>
            ) : (
              level.difficulty?.name
            )}
            {level.team && ` • ${level.team}`}
          </div>
        </div>
      </label>
    </div>
  );

  if (error) {
    return (
      <div className="announcement-page">
        <div className="announcement-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchLevels} className="announce-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="announcement-page">
      <div className="announcement-container">
        <h1>Level Announcements</h1>

        {newLevels.length > 0 && (
          <div className="announcement-section">
            <h2>New Levels</h2>
            <div className="items-list">
              {newLevels.map(level => renderLevelItem(level))}
            </div>
          </div>
        )}

        {rerates.length > 0 && (
          <div className="announcement-section">
            <h2>Rerates</h2>
            <div className="items-list">
              {rerates.map(level => renderLevelItem(level, true))}
            </div>
          </div>
        )}

        {newLevels.length === 0 && rerates.length === 0 && !isLoading && (
          <div className="announcement-section">
            <h2>No levels to announce</h2>
          </div>
        )}

        <div className="announcement-actions">
          <button
            className="announce-button"
            onClick={handleAnnounce}
            disabled={selectedLevels.length === 0 || isLoading}
          >
            {isLoading ? 'Announcing...' : 'Announce Selected'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPage; 