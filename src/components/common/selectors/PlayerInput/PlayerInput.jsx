import { useState, useEffect } from 'react';
import api from '@/utils/api';
import "./playerinput.css";
import { useTranslation } from 'react-i18next';

export const PlayerInput = ({ value, onChange, onSelect }) => {
  const { t } = useTranslation(['components', 'common']);

  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [creationStatus, setCreationStatus] = useState(null);
  const [creationError, setCreationError] = useState(null);

  const searchPlayers = async (searchTerm) => {
    if (searchTerm.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYERS}/search/${encodeURIComponent(searchTerm)}`);
      const players = await response.data;
      setSearchResults(players);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openDropdown = () => {
    if (!showDropdown && !isOpening) {
      setIsOpening(true);
      setShowDropdown(true);
      setTimeout(() => {
        setIsOpening(false);
      }, 200);
    }
  };

  const closeDropdown = () => {
    if (showDropdown && !isClosing && !creationStatus) {
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
      setCreationStatus('creating');
      try {
        const response = await api.post(`${import.meta.env.VITE_PLAYERS}/create`, {
          name: player.name
        });
        const newPlayer = response.data;
        await onSelect(newPlayer);
        await searchPlayers(value);
        
        setCreationStatus('success');
        closeDropdown();
        setTimeout(() => {
          setCreationStatus(null);
        }, 1500);
      } catch (error) {
        setCreationError(error.response?.data?.details || t('player.playerInput.creation.error'));
        setCreationStatus('error');
        setTimeout(() => {
          setCreationStatus(null);
          setCreationError(null);
        }, 1500);
      }
    } else {
      onChange(player.player.user?.nickname || player.player.name);
      onSelect(player.player);
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
          autoComplete='player-input-name'
          value={creationStatus === 'creating' ? t('loading.creatingWithName', { ns: 'common', name: value }) : value}
          onChange={(e) => {
            onChange(e.target.value);
            openDropdown();
          }}
          onFocus={() => !creationStatus && openDropdown()}
          onKeyDown={handleKeyDown}
          placeholder={t('player.playerInput.placeholder')}
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
            <div className="player-loading">{t('loading.creatingWithName', { ns: 'common', name: value })}</div>
          ) : (
            <>
              {isLoading ? (
                <div className="player-loading">{t('loading.generic', { ns: 'common' })}</div>
              ) : searchResults.length > 0 ? (
                <>
                  {searchResults.map((player) => (
                    <div
                      key={player.id}
                      className="player-option"
                      onClick={() => handleSelect(player)}
                    >
                      <img src={player.player.user?.avatarUrl || player.player.pfp} alt={player.player.name} className="player-pfp" />
                      <div className="player-info-container">
                        <div className="player-info">
                          <span className="player-name">
                            {player.player.user?.nickname || player.player.name}
                          </span>
                          <span className="player-handle">
                            {player.player.user?.username && `@${player.player.user.username}`}
                          </span> 
                          <span className="player-country">{player.player.country}</span>
                        </div>
                        <span className="player-score">{(player.rankedScore || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    className="player-option create-new"
                    onClick={() => handleSelect({ isNew: true, name: value })}
                  >
                    <span>{t('player.playerInput.creation.button', { name: value })}</span>
                  </div>
                </>
              ) : value.length >= 2 ? (
                <div className="no-results">
                  {t('player.playerInput.noResults')}
                  <div
                    className="player-option create-new"
                    onClick={() => handleSelect({ isNew: true, name: value })}
                  >
                    <span>{t('player.playerInput.creation.button', { name: value })}</span>
                  </div>
                </div>
              ) : (
                <div className="player-hint">{t('player.playerInput.minChars')}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}; 