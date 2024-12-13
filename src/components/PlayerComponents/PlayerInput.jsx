import { useState, useEffect } from 'react';
import api from '@/utils/api';
import "./playerinput.css";

export const PlayerInput = ({ value, onChange, onSelect, currentPlayer }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [creationStatus, setCreationStatus] = useState(null); // 'creating', 'success', 'error'
  const [creationError, setCreationError] = useState(null);

  const searchPlayers = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYERS}/search/${encodeURIComponent(searchTerm)}`);
      const players = await response.data;
      setSearchResults(players);
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openDropdown = () => {
    if (!showDropdown && !isOpening) {
      console.log('[PlayerInput] Opening dropdown');
      setIsOpening(true);
      setShowDropdown(true);
      setTimeout(() => {
        setIsOpening(false);
      }, 200);
    }
  };

  const closeDropdown = () => {
    if (showDropdown && !isClosing && !creationStatus) {
      console.log('[PlayerInput] Closing dropdown');
      setIsClosing(true);
      setTimeout(() => {
        setShowDropdown(false);
        setIsClosing(false);
      }, 200);
    }
  };

  const toggleDropdown = () => {
    if (showDropdown) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  const handleSelect = async (player) => {
    if (player.isNew) {
      console.log(`[PlayerInput] Starting player creation for "${player.name}"`);
      setCreationStatus('creating');
      try {
        console.log('[PlayerInput] Sending create player request');
        const response = await api.post(`${import.meta.env.VITE_PLAYERS}/create`, {
          name: player.name
        });
        
        const newPlayer = response.data;
        console.log('[PlayerInput] Player created successfully:', newPlayer);
        
        await onSelect(newPlayer);
        console.log('[PlayerInput] Player creation and selection complete');
        
        await searchPlayers(value);
        console.log('[PlayerInput] Refreshed player list');
        
        setCreationStatus('success');
        closeDropdown();
        setTimeout(() => {
          console.log('[PlayerInput] Clearing success status');
          setCreationStatus(null);
        }, 1500);
      } catch (error) {
        console.error('[PlayerInput] Player creation failed:', {
          error,
          playerData: player,
          errorMessage: error.response?.data?.details || error.message
        });
        setCreationError(error.response?.data?.details || 'Failed to create player');
        setCreationStatus('error');
        setTimeout(() => {
          console.log('[PlayerInput] Clearing error status');
          setCreationStatus(null);
          setCreationError(null);
        }, 1500);
      }
    } else {
      console.log('[PlayerInput] Selected existing player:', player);
      onChange(player.name);
      onSelect(player);
      closeDropdown();
    }
  };

  const getStatusClass = () => {
    switch (creationStatus) {
      case 'creating': return 'creating';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return '';
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
        closeDropdown();
      }
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.player-input-wrapper')) {
        closeDropdown();
      }
    };

    if (showDropdown && !creationStatus) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, creationStatus]);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlayers(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  return (
    <div className={`player-input-wrapper ${getStatusClass()}`}>
      <div className="player-input-container">
        <input
          type="text"
          value={creationStatus === 'creating' ? `Creating player "${value}"...` : value}
          onChange={(e) => {
            onChange(e.target.value);
            openDropdown();
          }}
          onFocus={() => !creationStatus && openDropdown()}
          onKeyDown={handleKeyDown}
          placeholder="Search player..."
          disabled={creationStatus === 'creating'}
        />
        <button 
          className="dropdown-toggle"
          onClick={toggleDropdown}
          type="button"
          disabled={creationStatus === 'creating'}
        >
          <div className={`dropdown-toggle-icon ${showDropdown ? 'open' : ''}`}>▼</div>
        </button>
      </div>
      
      {creationError && (
        <div className="creation-error">{creationError}</div>
      )}
      
      {((showDropdown || isClosing) || creationStatus === 'creating') && (
        <div className={`player-dropdown ${isClosing ? 'closing' : ''} ${isOpening ? 'opening' : ''}`}>
          {creationStatus === 'creating' ? (
            <div className="player-loading">Creating player "{value}"...</div>
          ) : (
            <>
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
                      
                      <img src={player.discordAvatar} alt={player.name} className="player-pfp" />
                      <div className="player-info-container">
                        <div className="player-info">
                          <span className="player-name">
                            {player.name} 
                          {player.discordUsername && (
                            <span className="player-handle">
                              (@{player.discordUsername})
                            </span>
                          )}
                        </span>
                        <span className="player-country">{player.country}</span>
                      </div>
                      <span className="player-score">{(player.rankedScore || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    className="player-option create-new"
                    onClick={() => handleSelect({ isNew: true, name: value })}
                  >
                    <span>Create new player "{value}"</span>
                  </div>
                </>
              ) : value.length >= 2 ? (
                <div className="no-results">
                  No players found
                  <div
                    className="player-option create-new"
                    onClick={() => handleSelect({ isNew: true, name: value })}
                  >
                    <span>Create new player "{value}"</span>
                  </div>
                </div>
              ) : (
                <div className="player-hint">Type at least 2 characters to search</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}; 