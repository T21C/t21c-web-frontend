import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './songSelectorPopup.css';
import { getVerificationClass } from '@/utils/Utility';
import { CustomSelect } from '@/components/common/selectors';

export const SongSelectorPopup = ({ onClose, onSelect, initialSong = null, selectedArtist = null, allowCreate = true }) => {
  const { t } = useTranslation(['components', 'common']);
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

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [verificationState, setVerificationState] = useState('pending');

  // Reset create form state when popup opens
  useEffect(() => {
    // Only show create form if we have an explicit new request (name but no id)
    // Otherwise, reset the create form state
    if (!initialSong || initialSong.id || !initialSong.name) {
      setShowCreateForm(false);
      setNewName('');
      setVerificationState('pending');
    } else {
      setVerificationState(initialSong.verificationState || 'pending');
    }
  }, [initialSong]);

  // Clear song selection when artist changes to a new request
  useEffect(() => {
    const hasNewRequest = Array.isArray(selectedArtist) 
      ? selectedArtist.some(a => a.isNewRequest)
      : selectedArtist?.isNewRequest;
    
    if (hasNewRequest && selectedSongId) {
      setSelectedSongId(null);
      setSongDetails(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [selectedArtist]);

  const handleCreateClick = () => {
    setShowCreateForm(true);
    setNewName(initialSong?.name || '');
    setVerificationState(initialSong?.verificationState || 'pending');
    // Clear any selected song when creating a new request
    setSelectedSongId(null);
    setSongDetails(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Load initial song details if they exist
  useEffect(() => {
    const loadInitialDetails = async () => {
      // Check if any artist is a new request
      const hasNewRequest = Array.isArray(selectedArtist) 
        ? selectedArtist.some(a => a.isNewRequest)
        : selectedArtist?.isNewRequest;
      
      // Check if initialSong is a new request (has name but no id)
      const isNewSongRequest = initialSong && !initialSong.id && initialSong.name;
      
      // If a new artist request is set, clear any existing song selection
      if (hasNewRequest && initialSong?.id) {
        setSelectedSongId(null);
        setSongDetails(null);
        return;
      }

      // If it's a new song request, don't load song details
      if (isNewSongRequest) {
        setSelectedSongId(null);
        setSongDetails(null);
        return;
      }

      if (initialSong?.id) {
        setSelectedSongId(initialSong.id);
        setIsLoadingDetails(true);
        try {
          const song = await fetchSongDetails(initialSong.id);
          
          // If existing artist(s) are selected, verify the song belongs to all of them
          if (selectedArtist && song) {
            const artistIds = Array.isArray(selectedArtist)
              ? selectedArtist.filter(a => a.id && !a.isNewRequest).map(a => a.id)
              : (selectedArtist.artistId && !selectedArtist.isNewRequest ? [selectedArtist.artistId] : []);
            
            if (artistIds.length > 0) {
              const songArtistIds = new Set(song?.credits?.map(credit => credit.artist?.id).filter(Boolean) || []);
              const hasAllArtists = artistIds.every(id => songArtistIds.has(id));
              
              if (!hasAllArtists) {
                // Song doesn't belong to all selected artists, clear selection
                setSelectedSongId(null);
                setSongDetails(null);
                setError(t('songSelector.messages.error.songNotByArtist'));
              }
            }
          }
        } catch (error) {
          console.error('Error loading initial details:', error);
          setError(t('songSelector.messages.error.loadDetailsFailed'));
        } finally {
          setIsLoadingDetails(false);
        }
      }
    };

    loadInitialDetails();
  }, [initialSong, selectedArtist]);

  // Handle search with pagination
  useEffect(() => {
    const searchSongs = async () => {
      if (!searchQuery?.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const params = {
          search: searchQuery,
          page: 1,
          limit: 20
        };

        // If existing artist(s) are selected AND we're not requesting a new song, filter songs by those artists
        // Don't filter when requesting a new song (initialSong has name but no id)
        const isNewSongRequest = initialSong && !initialSong.id && initialSong.name;
        if (selectedArtist && !isNewSongRequest) {
          if (Array.isArray(selectedArtist)) {
            // Multiple artists: filter by all of them
            const artistIds = selectedArtist
              .filter(artist => artist.id && !artist.isNewRequest)
              .map(artist => artist.id);
            if (artistIds.length > 0) {
              params.artistId = artistIds.join(',');
            }
          } else if (selectedArtist.artistId && !selectedArtist.isNewRequest) {
            // Single artist: use artistId directly
            params.artistId = selectedArtist.artistId;
          }
        }

        const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/songs`, {
          params
        });
        
        const data = response.data;
        const songs = Array.isArray(data) ? data : (data.songs || data.data || []);
        setSearchResults(songs);
      } catch (error) {
        console.error('Error searching songs:', error);
        setError(t('songSelector.messages.error.searchFailed'));
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchSongs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedArtist]);

  const fetchSongDetails = async (songId) => {
    if (!songId) return null;

    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/songs/${songId}`);
      const song = response.data;
      
      if (!song) {
        setError(t('songSelector.messages.error.songNotFound'));
        return null;
      }

      setSongDetails(song);
      return song;
    } catch (error) {
      console.error('Error fetching song details:', error);
      setError(t('songSelector.messages.error.loadDetailsFailed'));
      return null;
    }
  };

  const handleSelect = async (song) => {
    // Check if any artist is a new request
    const hasNewRequest = Array.isArray(selectedArtist) 
      ? selectedArtist.some(a => a.isNewRequest)
      : selectedArtist?.isNewRequest;
    
    // Don't allow selecting existing songs if a new artist request is set
    if (hasNewRequest) {
      return;
    }
    
    // If existing artist(s) are selected, verify the song belongs to all of them
    if (selectedArtist) {
      const artistIds = Array.isArray(selectedArtist)
        ? selectedArtist.filter(a => a.id && !a.isNewRequest).map(a => a.id)
        : (selectedArtist.artistId && !selectedArtist.isNewRequest ? [selectedArtist.artistId] : []);
      
      if (artistIds.length > 0) {
        setIsLoadingDetails(true);
        try {
          const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/songs/${song.id}`);
          const songData = response.data;
          const songArtistIds = new Set(songData?.credits?.map(credit => credit.artist?.id).filter(Boolean) || []);
          const hasAllArtists = artistIds.every(id => songArtistIds.has(id));
          
          if (!hasAllArtists) {
            setError(t('songSelector.messages.error.songNotByArtist'));
            setIsLoadingDetails(false);
            return;
          }
        } catch (error) {
          console.error('Error verifying song artist:', error);
          setError(t('songSelector.messages.error.loadDetailsFailed'));
          setIsLoadingDetails(false);
          return;
        }
        setIsLoadingDetails(false);
      }
    }
    
    setSelectedSongId(song.id);
    await fetchSongDetails(song.id);
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setError('');

    try {
      setSuccess('');
      setError('');

      // Return new song request data with verificationState
      // Explicitly ensure songId is not included for new requests
      const newSongData = {
        songName: (newName || '').trim(),
        isNewRequest: true,
        verificationState: verificationState || 'pending',
        songId: null // Explicitly null to ensure consistency
      };

      onSelect(newSongData);
      setSuccess(t('songSelector.messages.success.songCreated'));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Error creating song:', error);
      setError(error.response?.data?.error || t('songSelector.messages.error.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSongId) return;
    
    // Check if any artist is a new request
    const hasNewRequest = Array.isArray(selectedArtist) 
      ? selectedArtist.some(a => a.isNewRequest)
      : selectedArtist?.isNewRequest;
    
    // Don't allow assigning existing songs if a new artist request is set
    if (hasNewRequest) {
      setError(t('songSelector.messages.error.cannotAssignExistingWithNewArtist'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const songData = {
        songId: selectedSongId,
        songName: songDetails.name,
        isNewRequest: false
      };

      onSelect(songData);
      setSuccess(t('songSelector.messages.success.songAssigned'));
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error assigning song:', error);
      setError(t('songSelector.messages.error.assignFailed'));
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
          <h2>{t('songSelector.title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="song-selection">
            <div className="current-song">
              <div className="current-song-header">
                {t('songSelector.currentSong.label')}
              </div>
              <div className="current-song-info">
                {isLoadingDetails ? (
                  <div className="current-song-loading">
                    {t('songSelector.loading')}
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
                          <span className={getVerificationClass(songDetails.verificationState)}>
                            {t(`verification.${songDetails.verificationState}`, { ns: 'common' })}
                          </span>
                        )}
                      </>
                    ) : (
                      t('songSelector.currentSong.none')
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="song-search-section">
              {!showCreateForm ? (
                <>
                  {/* Show message when new artist is set */}
                  {(() => {
                    const hasNewRequest = Array.isArray(selectedArtist) 
                      ? selectedArtist.some(a => a.isNewRequest)
                      : selectedArtist?.isNewRequest;
                    return hasNewRequest && (
                      <div className="info-message">
                        {t('songSelector.messages.newArtistRestriction')}
                      </div>
                    );
                  })()}
                  
                  {/* Show message when existing artist(s) are selected */}
                  {(() => {
                    if (!selectedArtist) return null;
                    const existingArtists = Array.isArray(selectedArtist)
                      ? selectedArtist.filter(a => a.id && !a.isNewRequest)
                      : (selectedArtist.artistId && !selectedArtist.isNewRequest ? [selectedArtist] : []);
                    
                    if (existingArtists.length > 0) {
                      const artistNames = existingArtists.map(a => a.name || a.artistName).filter(Boolean).join(', ');
                      return (
                        <div className="info-message">
                          {t('songSelector.messages.filteredByArtist', { artistName: artistNames })}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('songSelector.search.placeholder')}
                      disabled={Array.isArray(selectedArtist) 
                        ? selectedArtist.some(a => a.isNewRequest)
                        : selectedArtist?.isNewRequest}
                    />
                    {allowCreate && (
                      <button 
                        className="create-song-button"
                        onClick={handleCreateClick}
                      >
                        {t('songSelector.buttons.createNew')}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const hasNewRequest = Array.isArray(selectedArtist) 
                      ? selectedArtist.some(a => a.isNewRequest)
                      : selectedArtist?.isNewRequest;
                    
                    if (hasNewRequest) {
                      return (
                        <div className="search-status">
                          {t('songSelector.messages.onlyNewSongsAllowed')}
                        </div>
                      );
                    }
                    
                    if (isSearching) {
                      return (
                        <div className="search-status">
                          {t('loading.searching', { ns: 'common' })}
                        </div>
                      );
                    }
                    
                    if (searchQuery && (!Array.isArray(searchResults) || searchResults.length === 0)) {
                      return (
                        <div className="search-status">
                          {t('songSelector.search.noResults')}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="search-results">
                        {Array.isArray(searchResults) && searchResults.map((song) => {
                          return (
                            <div
                              key={song.id}
                              className="song-result"
                              onClick={() => handleSelect(song)}
                              style={{
                                cursor: 'pointer',
                                opacity: 1
                              }}
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
                                <span className={getVerificationClass(song.verificationState)}>
                                  {t(`verification.${song.verificationState}`, { ns: 'common' })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <form onSubmit={handleCreate} className="create-song-form">
                  <h3>{t('songSelector.createForm.title')}</h3>
                  {t('songSelector.createForm.description') && (
                    <p className="form-description">{t('songSelector.createForm.description')}</p>
                  )}
                  <div className="form-group">
                    <label>{t('songSelector.createForm.name')}</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t('songSelector.createForm.namePlaceholder')}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="form-group">
                    <CustomSelect
                      label={t('verification.verificationState', { ns: 'common' })}
                      options={[
                        { value: 'pending', label: t('verification.pending', { ns: 'common' }) },
                        { value: 'allowed', label: t('verification.allowed', { ns: 'common' }) },
                        { value: 'conditional', label: t('verification.conditional', { ns: 'common' }) },
                        { value: 'tuf_verified', label: t('verification.tuf_verified', { ns: 'common' }) },
                        { value: 'ysmod_only', label: t('verification.ysmod_only', { ns: 'common' }) },
                        { value: 'declined', label: t('verification.declined', { ns: 'common' }) }
                      ].find(opt => opt.value === verificationState) || { value: 'pending', label: t('verification.pending', { ns: 'common' }) }}
                      onChange={(option) => setVerificationState(option?.value || 'pending')}
                      width="100%"
                    />
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewName('');
                        setVerificationState('pending');
                      }}
                      className="cancel-button"
                      disabled={isCreating}
                    >
                      {t('buttons.cancel', { ns: 'common' })}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newName?.trim()}
                      className={`submit-button ${isCreating ? 'loading' : ''}`}
                    >
                      {isCreating ? t('loading.creating', { ns: 'common' }) : t('songSelector.buttons.create')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {songDetails && (
              <div className="song-stats">
                <h3>{t('songSelector.stats.title')}</h3>
                <div className="stats-content">
                  <p>{t('songSelector.stats.levels')}: {songDetails.levels?.length || 0}</p>
                  {songDetails.credits && songDetails.credits.length > 0 && (
                    <p>{t('songSelector.stats.artists')}: {songDetails.credits.length}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className={`action-button ${isLoading || isLoadingDetails ? 'loading' : ''}`}
              onClick={handleAssign}
              disabled={(() => {
                const hasNewRequest = Array.isArray(selectedArtist) 
                  ? selectedArtist.some(a => a.isNewRequest)
                  : selectedArtist?.isNewRequest;
                return !selectedSongId || isLoading || isLoadingDetails || hasNewRequest;
              })()}
              title={(() => {
                const hasNewRequest = Array.isArray(selectedArtist) 
                  ? selectedArtist.some(a => a.isNewRequest)
                  : selectedArtist?.isNewRequest;
                return hasNewRequest ? t('songSelector.messages.error.cannotAssignExistingWithNewArtist') : '';
              })()}
            >
              {t('songSelector.buttons.assign')}
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
