import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { CustomSelect } from '@/components/common/selectors';
import './artistSelectorPopup.css';

export const ArtistSelectorPopup = ({ onClose, onSelect, initialArtist = null }) => {
  const { t } = useTranslation(['components', 'common']);
  const tArtist = (key, params = {}) => t(`artistSelector.${key}`, params) || key;
  const popupRef = useRef(null);

  // Verification state options for CustomSelect
  const verificationStateOptions = [
    { value: 'unverified', label: t('common.verification.unverified') },
    { value: 'pending', label: t('common.verification.pending') },
    { value: 'declined', label: t('common.verification.declined') },
    { value: 'mostly declined', label: t('common.verification.mostlyDeclined') },
    { value: 'mostly allowed', label: t('common.verification.mostlyAllowed') },
    { value: 'allowed', label: t('common.verification.allowed') }
  ];

  // Core state
  const [selectedArtistId, setSelectedArtistId] = useState(initialArtist?.id || null);
  const [artistDetails, setArtistDetails] = useState(initialArtist || null);
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
  const [verificationState, setVerificationState] = useState('unverified');

  // Reset create form state when popup opens
  useEffect(() => {
    // Only show create form if we have an explicit new request (name but no id)
    // Otherwise, reset the create form state
    if (!initialArtist || initialArtist.id || !initialArtist.name) {
      setShowCreateForm(false);
      setNewName('');
      setVerificationState('unverified');
    } else {
      setVerificationState(initialArtist.verificationState || 'unverified');
    }
  }, [initialArtist]);

  // Load initial artist details if they exist
  useEffect(() => {
    const loadInitialDetails = async () => {
      if (initialArtist?.id) {
        setSelectedArtistId(initialArtist.id);
        setIsLoadingDetails(true);
        try {
          await fetchArtistDetails(initialArtist.id);
        } catch (error) {
          console.error('Error loading initial details:', error);
          setError(tArtist('messages.error.loadDetailsFailed'));
        } finally {
          setIsLoadingDetails(false);
        }
      }
    };

    loadInitialDetails();
  }, [initialArtist]);

  const handleCreateClick = () => {
    setShowCreateForm(true);
    setNewName(initialArtist.name);
    setVerificationState(initialArtist?.verificationState || 'unverified');
  };

  // Handle search with pagination
  useEffect(() => {
    const searchArtists = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/artists`, {
          params: {
            search: searchQuery,
            page: 1,
            limit: 20
          }
        });
        
        const data = response.data;
        const artists = Array.isArray(data) ? data : (data.artists || data.data || []);
        setSearchResults(artists);
      } catch (error) {
        console.error('Error searching artists:', error);
        setError(tArtist('messages.error.searchFailed'));
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchArtists, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchArtistDetails = async (artistId) => {
    if (!artistId) return null;

    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/artists/${artistId}`);
      const artist = response.data;
      
      if (!artist) {
        setError(tArtist('messages.error.artistNotFound'));
        return null;
      }

      setArtistDetails(artist);
      return artist;
    } catch (error) {
      console.error('Error fetching artist details:', error);
      setError(tArtist('messages.error.loadDetailsFailed'));
      return null;
    }
  };

  const handleSelect = async (artist) => {
    setSelectedArtistId(artist.id);
    await fetchArtistDetails(artist.id);
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

      // Return new artist request data
      const newArtistData = {
        artistName: newName.trim(),
        isNewRequest: true,
        verificationState: verificationState,
        requiresEvidence: verificationState === 'declined' || verificationState === 'mostly declined'
      };

      onSelect(newArtistData);
      setSuccess(tArtist('messages.success.artistCreated'));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Error creating artist:', error);
      setError(error.response?.data?.error || tArtist('messages.error.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedArtistId) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const artistData = {
        artistId: selectedArtistId,
        artistName: artistDetails.name,
        isNewRequest: false,
        requiresEvidence: false
      };

      onSelect(artistData);
      setSuccess(tArtist('messages.success.artistAssigned'));
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error assigning artist:', error);
      setError(tArtist('messages.error.assignFailed'));
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
    <div className="artist-selector-popup-overlay">
      <div className="artist-selector-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{tArtist('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="artist-selection">
            <div className="current-artist">
              <div className="current-artist-header">
                {tArtist('currentArtist.label')}
              </div>
              <div className="current-artist-info">
                {isLoadingDetails ? (
                  <div className="current-artist-loading">
                    {tArtist('loading')}
                    <div className="loading-spinner" />
                  </div>
                ) : (
                  <div className="artist-name-display">
                    {artistDetails ? (
                      <>
                        {artistDetails.avatarUrl && (
                          <img
                            src={artistDetails.avatarUrl}
                            alt={artistDetails.name}
                            className="artist-avatar-small"
                          />
                        )}
                        <span>{artistDetails.name}</span>
                        {artistDetails.aliases?.length > 0 && (
                          <span className="aliases">
                            [{artistDetails.aliases.map(a => a.alias).join(', ')}]
                          </span>
                        )}
                        {artistDetails.verificationState && (
                          <span className={`verification-status ${artistDetails.verificationState}`}>
                            {artistDetails.verificationState === 'allowed' ? t('common.verification.allowed') :
                             artistDetails.verificationState === 'mostly allowed' ? t('common.verification.mostlyAllowed') :
                             artistDetails.verificationState === 'mostly declined' ? t('common.verification.mostlyDeclined') :
                             artistDetails.verificationState === 'declined' ? t('common.verification.declined') :
                             artistDetails.verificationState === 'pending' ? t('common.verification.pending') : 
                             t('common.verification.unverified')}
                          </span>
                        )}
                      </>
                    ) : (
                      tArtist('currentArtist.none')
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="artist-search-section">
              {!showCreateForm ? (
                <>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={tArtist('search.placeholder')}
                    />
                    <button 
                      className="create-artist-button"
                      onClick={handleCreateClick}
                    >
                      {tArtist('buttons.createNew')}
                    </button>
                  </div>
                  {isSearching ? (
                    <div className="search-status">
                      {tArtist('search.loading')}
                    </div>
                  ) : searchQuery && (!Array.isArray(searchResults) || searchResults.length === 0) ? (
                    <div className="search-status">
                      {tArtist('search.noResults')}
                    </div>
                  ) : (
                    <div className="search-results">
                      {Array.isArray(searchResults) && searchResults.map((artist) => (
                        <div
                          key={artist.id}
                          className="artist-result"
                          onClick={() => handleSelect(artist)}
                        >
                          {artist.avatarUrl && (
                            <img
                              src={artist.avatarUrl}
                              alt={artist.name}
                              className="artist-avatar-small"
                            />
                          )}
                          <span className="artist-name">
                            {artist.name}
                          </span>
                          {artist.aliases?.length > 0 && (
                            <span className="artist-aliases">
                              [{artist.aliases.map(a => a.alias).join(', ')}]
                            </span>
                          )}
                          {artist.verificationState && (
                            <span className={`verification-badge ${artist.verificationState}`}>
                              {artist.verificationState === 'allowed' ? t('common.verification.allowed') :
                               artist.verificationState === 'mostly allowed' ? t('common.verification.mostlyAllowed') :
                               artist.verificationState === 'mostly declined' ? t('common.verification.mostlyDeclined') :
                               artist.verificationState === 'declined' ? t('common.verification.declined') :
                               artist.verificationState === 'pending' ? t('common.verification.pending') : 
                               t('common.verification.unverified')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleCreate} className="create-artist-form">
                  <h3>{tArtist('createForm.title')}</h3>
                  <div className="form-group">
                    <label>{tArtist('createForm.name')}</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={tArtist('createForm.namePlaceholder')}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="form-group">
                    <CustomSelect
                      label={tArtist('createForm.verificationState')}
                      options={verificationStateOptions}
                      value={verificationStateOptions.find(opt => opt.value === verificationState) || verificationStateOptions[0]}
                      onChange={(option) => setVerificationState(option?.value || 'unverified')}
                      isDisabled={isCreating}
                      width="100%"
                    />
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewName('');
                        setVerificationState('unverified');
                      }}
                      className="cancel-button"
                      disabled={isCreating}
                    >
                      {t('buttons.cancel', { ns: 'common' })}
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newName.trim()}
                      className={`submit-button ${isCreating ? 'loading' : ''}`}
                    >
                      {isCreating ? t('loading.creating', { ns: 'common' }) : tArtist('buttons.create')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {artistDetails && (
              <div className="artist-stats">
                <h3>{tArtist('stats.title')}</h3>
                <div className="stats-content">
                  <p>{tArtist('stats.levels')}: {artistDetails.levels?.length || 0}</p>
                  {artistDetails.songCredits && artistDetails.songCredits.length > 0 && (
                    <p>{tArtist('stats.songs')}: {artistDetails.songCredits.length}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className={`action-button ${isLoading || isLoadingDetails ? 'loading' : ''}`}
              onClick={handleAssign}
              disabled={!selectedArtistId || isLoading || isLoadingDetails}
            >
              {tArtist('buttons.assign')}
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

export default ArtistSelectorPopup;
