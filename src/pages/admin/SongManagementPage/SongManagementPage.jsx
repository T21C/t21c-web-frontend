import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDenied, MetaTags } from '@/components/common/display';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import { SongActionPopup } from '@/components/popups';
import './songManagementPage.css';

const SongManagementPage = () => {
  const { t } = useTranslation('pages');
  const tSong = (key, params = {}) => t(`songManagement.${key}`, params);
  const { user } = useAuth();
  const currentUrl = window.location.origin + location.pathname;

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME_ASC');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSongData, setNewSongData] = useState({
    name: '',
    verificationState: 'unverified',
    aliases: []
  });
  const [newAlias, setNewAlias] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user && hasFlag(user, permissionFlags.SUPER_ADMIN)) {
      fetchSongs(true);
    }
  }, [searchQuery, sortBy, verificationFilter, user]);

  const fetchSongs = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setSongs([]);
      }

      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        search: searchQuery,
        sort: sortBy
      });

      if (verificationFilter) {
        params.append('verificationState', verificationFilter);
      }

      const response = await api.get(`/v2/admin/songs?${params}`);
      const data = response.data;
      
      if (reset) {
        setSongs(data.songs || []);
      } else {
        setSongs(prev => [...prev, ...(data.songs || [])]);
      }

      setHasMore(data.hasMore || false);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error fetching songs:', error);
      toast.error(tSong('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newSongData.name.trim()) {
      toast.error(tSong('errors.nameRequired'));
      return;
    }

    setIsCreating(true);
    try {
      await api.post('/v2/admin/songs', newSongData);
      toast.success(tSong('messages.created'));
      setShowAddForm(false);
      setNewSongData({
        name: '',
        verificationState: 'unverified',
        aliases: []
      });
      setNewAlias('');
      fetchSongs(true);
    } catch (error) {
      toast.error(error.response?.data?.error || tSong('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (songId) => {
    if (!window.confirm(tSong('confirmDelete'))) return;

    try {
      await api.delete(`/v2/admin/songs/${songId}`);
      toast.success(tSong('messages.deleted'));
      fetchSongs(true);
    } catch (error) {
      toast.error(error.response?.data?.error || tSong('errors.deleteFailed'));
    }
  };

  const getVerificationClass = (state) => {
    return `verification-chip ${state || 'unverified'}`;
  };

  const verificationStateLabels = {
    unverified: tSong('verification.unverified'),
    pending: tSong('verification.pending'),
    verified: tSong('verification.verified')
  };

  if (user?.permissionFlags === undefined) {
    return (
      <div className="song-management-page">
        <MetaTags
          title={tSong('meta.title')}
          description={tSong('meta.description')}
          url={currentUrl}
        />
        <div className="loader loader-level-detail"></div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={tSong('meta.title')}
        metaDescription={tSong('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  return (
    <div className="song-management-page">
      <MetaTags
        title={tSong('meta.title')}
        description={tSong('meta.description')}
        url={currentUrl}
      />

      <div className="song-management-container">
        <h1>{tSong('title')}</h1>

        <div className="controls">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder={tSong('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-container">
            <label>{tSong('filter.verification')}</label>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">{tSong('filter.all')}</option>
              <option value="verified">{tSong('verification.verified')}</option>
              <option value="pending">{tSong('verification.pending')}</option>
              <option value="unverified">{tSong('verification.unverified')}</option>
            </select>
          </div>

          <div className="sort-container">
            <label>{tSong('sort.label')}</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="NAME_ASC">{tSong('sort.nameAsc')}</option>
              <option value="NAME_DESC">{tSong('sort.nameDesc')}</option>
              <option value="ID_ASC">{tSong('sort.idAsc')}</option>
              <option value="ID_DESC">{tSong('sort.idDesc')}</option>
            </select>
          </div>

          <button className="add-button" onClick={() => setShowAddForm(true)}>
            {tSong('buttons.add')}
          </button>
        </div>

        {loading && songs.length === 0 ? (
          <div className="loader loader-level-page"></div>
        ) : (
          <div className="songs-list">
            {songs.length === 0 ? (
              <div className="no-results">{tSong('noSongs')}</div>
            ) : (
              songs.map((song) => (
                <div key={song.id} className="song-item">
                  <div className="song-info">
                    <div className="song-details">
                      <h3>
                        {song.name} (ID: {song.id})
                      </h3>
                      <div className="song-meta">
                        <span className={getVerificationClass(song.verificationState)}>
                          {verificationStateLabels[song.verificationState] || verificationStateLabels.unverified}
                        </span>
                        {song.aliases && song.aliases.length > 0 && (
                          <span className="aliases-count">
                            {song.aliases.length} {tSong('aliases')}
                          </span>
                        )}
                        {song.credits && song.credits.length > 0 && (
                          <span className="credits-count">
                            {song.credits.length} {tSong('artists')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="song-actions">
                    <button
                      className="edit-button"
                      onClick={() => setSelectedSong(song)}
                    >
                      {tSong('buttons.edit')}
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(song.id)}
                    >
                      {tSong('buttons.delete')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {hasMore && !loading && (
          <button className="load-more-button" onClick={() => fetchSongs(false)}>
            {tSong('buttons.loadMore')}
          </button>
        )}
      </div>

      {selectedSong && (
        <SongActionPopup
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
          onUpdate={() => {
            setSelectedSong(null);
            fetchSongs(true);
          }}
        />
      )}

      {showAddForm && (
        <div className="add-form-overlay" onClick={() => setShowAddForm(false)}>
          <div className="add-form" onClick={(e) => e.stopPropagation()}>
            <h3>{tSong('form.title')}</h3>
            <div className="form-group">
              <label>{tSong('form.name')}</label>
              <input
                type="text"
                value={newSongData.name}
                onChange={(e) => setNewSongData(prev => ({...prev, name: e.target.value}))}
                placeholder={tSong('form.namePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{tSong('form.verificationState')}</label>
              <select
                value={newSongData.verificationState}
                onChange={(e) => setNewSongData(prev => ({...prev, verificationState: e.target.value}))}
              >
                <option value="unverified">{tSong('verification.unverified')}</option>
                <option value="pending">{tSong('verification.pending')}</option>
                <option value="verified">{tSong('verification.verified')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{tSong('form.aliases')}</label>
              <div className="alias-input-group">
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder={tSong('form.aliasPlaceholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newAlias.trim()) {
                        setNewSongData(prev => ({
                          ...prev,
                          aliases: [...prev.aliases, newAlias.trim()]
                        }));
                        setNewAlias('');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newAlias.trim()) {
                      setNewSongData(prev => ({
                        ...prev,
                        aliases: [...prev.aliases, newAlias.trim()]
                      }));
                      setNewAlias('');
                    }
                  }}
                >
                  {tSong('form.addAlias')}
                </button>
              </div>
              <div className="aliases-list">
                {newSongData.aliases.map((alias, index) => (
                  <span key={index} className="alias-tag">
                    {alias}
                    <button
                      onClick={() => setNewSongData(prev => ({
                        ...prev,
                        aliases: prev.aliases.filter((_, i) => i !== index)
                      }))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button
                className="submit-button"
                onClick={handleCreate}
                disabled={isCreating || !newSongData.name.trim()}
              >
                {isCreating ? tSong('buttons.creating') : tSong('buttons.create')}
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSongData({
                    name: '',
                    verificationState: 'unverified',
                    aliases: []
                  });
                  setNewAlias('');
                }}
              >
                {tSong('buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongManagementPage;
