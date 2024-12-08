import { useState, useEffect } from 'react';
import api from '@/utils/api';
import "./playerinput.css";

export const PlayerInput = ({ value, onChange, onSelect }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchPlayers = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYER_SEARCH}${encodeURIComponent(searchTerm)}`);
      const players = await response.data;
      setSearchResults(players);
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (showDropdown) {
      e.stopPropagation();
      
      if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        handleSelect(searchResults[0]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
      }
    }
  };

  const handleSelect = (player) => {
    onChange(player.name);
    onSelect(player);
    setShowDropdown(false);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.player-input-wrapper')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlayers(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  return (
    <div className="player-input-wrapper">
      <div className="player-input-container">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search player..."
        />
        <button 
          className="dropdown-toggle"
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
        >
          <div className={`dropdown-toggle-icon ${showDropdown ? 'open' : ''}`}>▼</div>
        </button>
      </div>
      
      {showDropdown && (
        <div className="player-dropdown">
          {isLoading ? (
            <div className="player-loading">Loading...</div>
          ) : searchResults.length > 0 ? (
            <>
              {searchResults.map((player) => (
                <div
                  key={player.id}
                  className="player-option"
                  onClick={() => handleSelect(player)}
                >
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-country">{player.country}</span>
                  </div>
                  <span className="player-score">{(player.rankedScore || 0).toFixed(2)}</span>
                </div>
              ))}
              <div
                className="player-option create-new"
                onClick={() => {
                  onSelect({ isNew: true, name: value });
                  setShowDropdown(false);
                }}
              >
                <span>Create new player "{value}"</span>
              </div>
            </>
          ) : value.length >= 2 ? (
            <div className="no-results">
              No players found
              <div
                className="player-option create-new"
                onClick={() => {
                  onSelect({ isNew: true, name: value });
                  setShowDropdown(false);
                }}
              >
                <span>Create new player "{value}"</span>
              </div>
            </div>
          ) : (
            <div className="player-hint">Type at least 2 characters to search</div>
          )}
        </div>
      )}
    </div>
  );
}; 