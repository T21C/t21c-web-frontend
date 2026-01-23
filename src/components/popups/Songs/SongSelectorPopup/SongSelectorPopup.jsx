import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './songSelectorPopup.css';
import axios from 'axios';

export const SongSelectorPopup = ({ onClose, onSelect, initialSong = null }) => {
  const { t } = useTranslation('components');
  const tSong = (key, params = {}) => t(`songSelector.${key}`, params) || key;
  const popupRef = useRef(null);

  // Core state
  const [selectedSongId, setSelectedSongId] = useState(initialSong?.id || null);
  const [songDetails, setSongDetails] = useState(initialSong || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isNewRequest, setIsNewRequest] = useState(false);
  const [requiresEvidence, setRequiresEvidence] = useState(false);

  // Load initial song details if they exist
  useEffect(() => {
    const loadInitialDetails = async () => {
      if (initialSong?.id) {
        setSelectedSongId(initialSong.id);
        setIsLoadingDetails(true);
        try {
          await fetchSongDetails(initialSong.id);
        } catch (error) {
          console.error('Error loading initial details:', error);
          setError(tSong('messages.error.loadDetailsFailed'));
        } finally {
          setIsLoadingDetails(false);
        }
      } else if (initialSong?.name && !initialSong.id) {
        setNewName(initialSong.name);
        setIsNewRequest(true);
        setShowCreateForm(true);
      }
    };

    loadInitialDetails();
  }, [initialSong]);

  // Handle search with pagination
  useEffect(() => {
    const searchSongs = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setHasMoreResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.get(`${import.meta.env.VITE_API_URL}/songs`, {
          params: {
            search: searchQuery,
            page: 1,
            limit: 20
          }
        });
        
        const data = response.data;
        const songs = Array.isArray(data) ? data : (data.songs || data.data || []);
        setSearchResults(songs);
        setHasMoreResults(songs.length >= 20);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error searching songs:', error);
        setError(tSong('messages.error.searchFailed'));
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchSongs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchSongDetails = async (songId) => {
    if (!songId) return null;

    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/songs/${songId}`);
      const song = response.data;
      
      if (!song) {
        setError(tSong('messages.error.songNotFound'));
        return null;
      }

      setSongDetails(song);
      return song;
    } catch (error) {
      console.error('Error fetching song details:', error);
      setError(tSong('messages.error.loadDetailsFailed'));
      return null;
    }
  };

  const handleSelect = async (song) => {
    setSelectedSongId(song.id);
    await fetchSongDetails(song.id);
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
    setIsNewRequest(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setError('');

    try {
      setSuccess('');
      setError('');

      // Return new song request data
      const newSongData = {
        songName: newName.trim(),
        isNewRequest: true,
        requiresEvidence: requiresEvidence
      };

      onSelect(newSongData);
      setSuccess(tSong('messages.success.songCreated'));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Error creating song:', error);
      setError(error.response?.data?.error || tSong('messages.error.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSongId) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const songData = {
        songId: selectedSongId,
        songName: songDetails.name,
        isNewRequest: false,
        requiresEvidence: false
      };

      onSelect(songData);
      setSuccess(tSong('messages.success.songAssigned'));
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error assigning song:', error);
      setError(tSong('messages.error.assignFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll lock management
  useEffect(() => {
    document.body.classList.add('body-scroll-lock');
    return () => document.body.classList.remove('body-scroll-lock');
  }, []);

  // Close handlers
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="song-selector-popup-overlay">
      <div className="song-selector-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{tSong('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="song-selection">
            <div className="current-song">
              <div className="current-song-header">
                {tSong('currentSong.label')}
              </div>
              <div className="current-song-info">
                {isLoadingDetails ? (
                  <div className="current-song-loading">
                    {tSong('loading')}
                    <div className="loading-spinner" />
                  </div>
                ) : (
                  <div className="song-name-display">
                    {songDetails ? (
                      <>
                        {songDetails.name}
                        {songDetails.aliases?.length > 0 && (
                          <span className="aliases">
                            [{songDetails.aliases.map(a => a.alias).join(', ')}]
                          </span>
                        )}
                        {songDetails.verificationState && (
                          <span className={`verification-status ${songDetails.verificationState}`}>
                            {songDetails.verificationState === 'verified' ? tSong('status.verified') : 
                             songDetails.verificationState === 'pending' ? tSong('status.pending') : 
                             tSong('status.unverified')}
                          </span>
                        )}
                      </>
                    ) : (
                      tSong('currentSong.none')
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="song-search-section">
              {!showCreateForm ? (
                <>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={tSong('search.placeholder')}
                    />
                    <button 
                      className="create-song-button"
                      onClick={() => setShowCreateForm(true)}
                    >
                      {tSong('buttons.createNew')}
                    </button>
                  </div>
                  {isSearching ? (
                    <div className="search-status">
                      {tSong('search.loading')}
                    </div>
                  ) : searchQuery && (!Array.isArray(searchResults) || searchResults.length === 0) ? (
                    <div className="search-status">
                      {tSong('search.noResults')}
                    </div>
                  ) : (
                    <div className="search-results">
                      {Array.isArray(searchResults) && searchResults.map((song) => (
                        <div
                          key={song.id}
                          className="song-result"
                          onClick={() => handleSelect(song)}
                        >
                          <span className="song-name">
                            {song.name}
                          </span>
                          {song.aliases?.length > 0 && (
                            <span className="song-aliases">
                              [{song.aliases.map(a => a.alias).join(', ')}]
                            </span>
                          )}
                          {song.verificationState && (
                            <span className={`verification-badge ${song.verificationState}`}>
                              {song.verificationState}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleCreate} className="create-song-form">
                  <h3>{tSong('createForm.title')}</h3>
                  <div className="form-group">
                    <label>{tSong('createForm.name')}</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={tSong('createForm.namePlaceholder')}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={requiresEvidence}
                        onChange={(e) => setRequiresEvidence(e.target.checked)}
                        disabled={isCreating}
                      />
                      {tSong('createForm.requiresEvidence')}
                    </label>
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewName('');
                        setRequiresEvidence(false);
                      }}
                      className="cancel-button"
                      disabled={isCreating}
                    >
                      {tSong('buttons.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newName.trim()}
                      className={`submit-button ${isCreating ? 'loading' : ''}`}
                    >
                      {isCreating ? tSong('buttons.creating') : tSong('buttons.create')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {songDetails && (
              <div className="song-stats">
                <h3>{tSong('stats.title')}</h3>
                <div className="stats-content">
                  <p>{tSong('stats.levels')}: {songDetails.levels?.length || 0}</p>
                  {songDetails.credits && songDetails.credits.length > 0 && (
                    <p>{tSong('stats.artists')}: {songDetails.credits.length}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className={`action-button ${isLoading || isLoadingDetails ? 'loading' : ''}`}
              onClick={handleAssign}
              disabled={!selectedSongId || isLoading || isLoadingDetails}
            >
              {tSong('buttons.assign')}
              {(isLoading || isLoadingDetails) && <div className="loading-spinner" />}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default SongSelectorPopup;
