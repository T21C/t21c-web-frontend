import React, { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { CompleteNav } from '../../components';
import ScrollButton from '../../components/ScrollButton/ScrollButton';
import api from '../../utils/api';
import './announcementpage.css';

// Tab Components
const NewLevelsTab = ({ levels, selectedLevels, onCheckboxChange, isLoading, onRemove }) => (
  <div className="announcement-section">
    <div className="items-list">
      {levels.length > 0 ? (
        levels.map(level => (
          <div key={level.id} className="announcement-item">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={selectedLevels.includes(level.id)}
                onChange={() => onCheckboxChange(level.id)}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              <div className="item-details">
                <div className="item-title">
                  {level.song} - {level.artist}
                </div>
                <div className="item-subtitle">
                  {level.difficulty?.name}
                  {level.team && ` • ${level.team}`}
                </div>
              </div>
            </label>
            <button 
              className="trash-button"
              onClick={async () => {
                try {
                  await api.post(`${import.meta.env.VITE_LEVELS}/markAnnounced/${level.id}`);
                  onRemove(level.id);
                } catch (err) {
                  throw err;
                }
              }}
              disabled={isLoading}
            >
              🗑️
            </button>
          </div>
        ))
      ) : (
        <div className="no-items-message">No new levels to announce</div>
      )}
    </div>
  </div>
);

const ReratesTab = ({ levels, selectedLevels, onCheckboxChange, isLoading, onRemove }) => (
  <div className="announcement-section">
    <div className="items-list">
      {levels.length > 0 ? (
        levels.map(level => (
          <div key={level.id} className="announcement-item">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={selectedLevels.includes(level.id)}
                onChange={() => onCheckboxChange(level.id)}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              <div className="item-details">
                <div className="item-title">
                  {level.song} - {level.artist}
                </div>
                <div className="item-subtitle">
                  {level.previousDifficulty?.name} ➔ {level.difficulty?.name}
                  {level.team && ` • ${level.team}`}
                </div>
              </div>
            </label>
            <button 
              className="trash-button"
              onClick={async () => {
                try {
                  await api.post(`${import.meta.env.VITE_LEVELS}/markAnnounced/${level.id}`);
                  onRemove(level.id);
                } catch (err) {
                  throw err;
                }
              }}
              disabled={isLoading}
            >
              🗑️
            </button>
          </div>
        ))
      ) : (
        <div className="no-items-message">No rerates to announce</div>
      )}
    </div>
  </div>
);

const PassesTab = ({ passes, selectedPasses, onCheckboxChange, isLoading, onRemove }) => (
  <div className="announcement-section">
    <div className="items-list">
      {Array.isArray(passes) && passes.length > 0 ? (
        passes.map(pass => {
          // Skip invalid passes
          if (!pass?.id || !pass?.player?.name || !pass?.level?.song) {
            console.warn('Invalid pass data:', pass);
            return null;
          }

          return (
            <div key={pass.id} className="announcement-item">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={selectedPasses.includes(pass.id)}
                  onChange={() => onCheckboxChange(pass.id)}
                  disabled={isLoading}
                />
                <span className="checkmark"></span>
                <div className="item-details">
                  <div className="item-title">
                    {pass.player?.name}'s clear of {pass.level?.song}
                  </div>
                  <div className="item-subtitle">
                    Score: {pass.scoreV2?.toFixed(2) || 'N/A'} | Accuracy: {((pass.accuracy || 0) * 100).toFixed(2)}%
                    {pass.level?.difficulty?.name && ` • ${pass.level.difficulty.name}`}
                  </div>
                </div>
              </label>
              <button 
                className="trash-button"
                onClick={async () => {
                  if (!pass.id || isNaN(pass.id) || pass.id <= 0) {
                    console.error('Invalid pass ID:', pass.id);
                    return;
                  }
                  try {
                    await api.post(`${import.meta.env.VITE_PASSES}/markAnnounced/${pass.id}`);
                    onRemove(pass.id);
                  } catch (err) {
                    console.error('Error marking pass as announced:', err);
                    throw err;
                  }
                }}
                disabled={isLoading}
              >
                🗑️
              </button>
            </div>
          );
        }).filter(Boolean)
      ) : (
        <div className="no-items-message">No passes to announce</div>
      )}
    </div>
  </div>
);

const AnnouncementPage = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('newLevels');
  const [newLevels, setNewLevels] = useState([]);
  const [rerates, setRerates] = useState([]);
  const [passes, setPasses] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedPasses, setSelectedPasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [newLevelsResponse, reratesResponse, passesResponse] = await Promise.all([
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/new`),
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/rerates`),
        api.get(`${import.meta.env.VITE_PASSES}/unannounced/new`)
      ]);
      setNewLevels(newLevelsResponse.data);
      setRerates(reratesResponse.data);
      setPasses(passesResponse.data);
    } catch (err) {
      setError('Failed to fetch items. Please try again.');
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelCheckboxChange = (levelId) => {
    setSelectedLevels(prev => {
      if (prev.includes(levelId)) {
        return prev.filter(id => id !== levelId);
      } else {
        return [...prev, levelId];
      }
    });
  };

  const handlePassCheckboxChange = (passId) => {
    setSelectedPasses(prev => {
      if (prev.includes(passId)) {
        return prev.filter(id => id !== passId);
      } else {
        return [...prev, passId];
      }
    });
  };

  const handleRemoveLevel = (levelId) => {
    setNewLevels(prev => prev.filter(level => level.id !== levelId));
    setRerates(prev => prev.filter(level => level.id !== levelId));
    setSelectedLevels(prev => prev.filter(id => id !== levelId));
  };

  const handleRemovePass = (passId) => {
    setPasses(prev => prev.filter(pass => pass.id !== passId));
    setSelectedPasses(prev => prev.filter(id => id !== passId));
  };

  const handleAnnounce = async () => {
    const hasSelectedItems = selectedLevels.length > 0 || selectedPasses.length > 0;
    if (!hasSelectedItems) return;

    // Validate selected IDs
    const validPassIds = selectedPasses.filter(id => !isNaN(id) && id > 0);
    const validLevelIds = selectedLevels.filter(id => !isNaN(id) && id > 0);

    if (validPassIds.length !== selectedPasses.length || validLevelIds.length !== selectedLevels.length) {
      setError('Some selected items have invalid IDs');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (validLevelIds.length > 0) {
        // Mark levels as announced
        await api.post(`${import.meta.env.VITE_LEVELS}/announce`, {
          levelIds: validLevelIds
        });
        
        // Send webhook for levels/rerates
        await api.post(`${import.meta.env.VITE_WEBHOOK}/${activeTab === 'newLevels' ? 'levels' : 'rerates'}`, {
          levelIds: validLevelIds
        });
        
        // Remove announced levels from the lists
        setNewLevels(prev => prev.filter(level => !validLevelIds.includes(level.id)));
        setRerates(prev => prev.filter(level => !validLevelIds.includes(level.id)));
      }

      if (validPassIds.length > 0) {
        // Mark passes as announced
        await api.post(`${import.meta.env.VITE_PASSES}/announce`, {
          passIds: validPassIds
        });

        // Send webhook for passes
        await api.post(`${import.meta.env.VITE_WEBHOOK}/passes`, {
          passIds: validPassIds
        });
        
        // Remove announced passes from the list
        setPasses(prev => prev.filter(pass => !validPassIds.includes(pass.id)));
      }

      // Reset selections
      setSelectedLevels([]);
      setSelectedPasses([]);
    } catch (err) {
      setError('Failed to announce items. Please try again.');
      console.error('Error announcing items:', err);
      // Refetch items to ensure consistency
      await fetchItems();
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <>
        <CompleteNav />
        <div className="background-level"></div>
        <div className="announcement-page">
          <ScrollButton />
          <div className="announcement-container">
            <div className="error-message">{error}</div>
            <button onClick={fetchItems} className="announce-button">
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CompleteNav />
      <div className="background-level"></div>
      <div className="announcement-page">
        <ScrollButton />
        <div className="announcement-container">
          <h1>Announcements</h1>

          <div className="submission-tabs">
            <button 
              className={`tab-button ${activeTab === 'newLevels' ? 'active' : ''}`}
              onClick={() => setActiveTab('newLevels')}
            >
              New Levels
            </button>
            <button 
              className={`tab-button ${activeTab === 'rerates' ? 'active' : ''}`}
              onClick={() => setActiveTab('rerates')}
            >
              Rerates
            </button>
            <button 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              Passes
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {activeTab === 'newLevels' && (
            <NewLevelsTab
              levels={newLevels}
              selectedLevels={selectedLevels}
              onCheckboxChange={handleLevelCheckboxChange}
              onRemove={handleRemoveLevel}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'rerates' && (
            <ReratesTab
              levels={rerates}
              selectedLevels={selectedLevels}
              onCheckboxChange={handleLevelCheckboxChange}
              onRemove={handleRemoveLevel}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'passes' && (
            <PassesTab
              passes={passes}
              selectedPasses={selectedPasses}
              onCheckboxChange={handlePassCheckboxChange}
              onRemove={handleRemovePass}
              isLoading={isLoading}
            />
          )}

          <div className="announcement-actions">
            <button
              className="announce-button"
              onClick={handleAnnounce}
              disabled={
                isLoading || 
                (activeTab === 'passes' ? selectedPasses.length === 0 : selectedLevels.length === 0)
              }
            >
              {isLoading ? 'Announcing...' : 'Announce Selected'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnnouncementPage; 