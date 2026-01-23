import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDenied, MetaTags } from '@/components/common/display';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { CustomSelect } from '@/components/common/selectors';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import { ArtistActionPopup } from '@/components/popups';
import './artistManagementPage.css';

const ArtistManagementPage = () => {
  const { t } = useTranslation('pages');
  const tArtist = (key, params = {}) => t(`artistManagement.${key}`, params);
  const { user } = useAuth();
  const currentUrl = window.location.origin + location.pathname;

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME_ASC');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newArtistData, setNewArtistData] = useState({
    name: '',
    avatarUrl: '',
    verificationState: 'unverified',
    aliases: []
  });
  const [newAlias, setNewAlias] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user && hasFlag(user, permissionFlags.SUPER_ADMIN)) {
      fetchArtists(true);
    }
  }, [searchQuery, sortBy, verificationFilter, user]);

  const fetchArtists = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setArtists([]);
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

      const response = await api.get(`/v2/admin/artists?${params}`);
      const data = response.data;
      
      if (reset) {
        setArtists(data.artists || []);
      } else {
        setArtists(prev => [...prev, ...(data.artists || [])]);
      }

      setHasMore(data.hasMore || false);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast.error(tArtist('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newArtistData.name.trim()) {
      toast.error(tArtist('errors.nameRequired'));
      return;
    }

    setIsCreating(true);
    try {
      await api.post('/v2/admin/artists', newArtistData);
      toast.success(tArtist('messages.created'));
      setShowAddForm(false);
      setNewArtistData({
        name: '',
        avatarUrl: '',
        verificationState: 'unverified',
        aliases: []
      });
      setNewAlias('');
      fetchArtists(true);
    } catch (error) {
      toast.error(error.response?.data?.error || tArtist('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (artistId) => {
    if (!window.confirm(tArtist('confirmDelete'))) return;

    try {
      await api.delete(`/v2/admin/artists/${artistId}`);
      toast.success(tArtist('messages.deleted'));
      fetchArtists(true);
    } catch (error) {
      toast.error(error.response?.data?.error || tArtist('errors.deleteFailed'));
    }
  };

  const getVerificationClass = (state) => {
    return `verification-chip ${state || 'unverified'}`;
  };

  const verificationStateLabels = {
    unverified: tArtist('verification.unverified'),
    pending: tArtist('verification.pending'),
    declined: tArtist('verification.declined'),
    'mostly declined': tArtist('verification.mostlyDeclined'),
    'mostly allowed': tArtist('verification.mostlyAllowed'),
    allowed: tArtist('verification.allowed')
  };

  const verificationStateOptions = [
    { value: '', label: tArtist('filter.all') },
    { value: 'unverified', label: tArtist('verification.unverified') },
    { value: 'pending', label: tArtist('verification.pending') },
    { value: 'declined', label: tArtist('verification.declined') },
    { value: 'mostly declined', label: tArtist('verification.mostlyDeclined') },
    { value: 'mostly allowed', label: tArtist('verification.mostlyAllowed') },
    { value: 'allowed', label: tArtist('verification.allowed') }
  ];

  const verificationStateFormOptions = [
    { value: 'unverified', label: tArtist('verification.unverified') },
    { value: 'pending', label: tArtist('verification.pending') },
    { value: 'declined', label: tArtist('verification.declined') },
    { value: 'mostly declined', label: tArtist('verification.mostlyDeclined') },
    { value: 'mostly allowed', label: tArtist('verification.mostlyAllowed') },
    { value: 'allowed', label: tArtist('verification.allowed') }
  ];

  const sortOptions = [
    { value: 'NAME_ASC', label: tArtist('sort.nameAsc') },
    { value: 'NAME_DESC', label: tArtist('sort.nameDesc') },
    { value: 'ID_ASC', label: tArtist('sort.idAsc') },
    { value: 'ID_DESC', label: tArtist('sort.idDesc') }
  ];

  if (user?.permissionFlags === undefined) {
    return (
      <div className="artist-management-page">
        <MetaTags
          title={tArtist('meta.title')}
          description={tArtist('meta.description')}
          url={currentUrl}
        />
        <div className="loader loader-level-detail"></div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={tArtist('meta.title')}
        metaDescription={tArtist('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  return (
    <div className="artist-management-page">
      <MetaTags
        title={tArtist('meta.title')}
        description={tArtist('meta.description')}
        url={currentUrl}
      />

      <div className="artist-management-container">
        <h1>{tArtist('title')}</h1>

        <div className="controls">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder={tArtist('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-container">
            <CustomSelect
              label={tArtist('filter.verification')}
              options={verificationStateOptions}
              value={verificationStateOptions.find(opt => opt.value === verificationFilter) || verificationStateOptions[0]}
              onChange={(option) => setVerificationFilter(option?.value || '')}
              width="12rem"
            />
          </div>

          <div className="sort-container">
            <CustomSelect
              label={tArtist('sort.label')}
              options={sortOptions}
              value={sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]}
              onChange={(option) => setSortBy(option?.value || 'NAME_ASC')}
              width="12rem"
            />
          </div>

          <button className="add-button" onClick={() => setShowAddForm(true)}>
            {tArtist('buttons.add')}
          </button>
        </div>

        {loading && artists.length === 0 ? (
          <div className="loader loader-level-page"></div>
        ) : (
          <div className="artists-list">
            {artists.length === 0 ? (
              <div className="no-results">{tArtist('noArtists')}</div>
            ) : (
              artists.map((artist) => (
                <div key={artist.id} className="artist-item">
                  <div className="artist-info">
                    {artist.avatarUrl && (
                      <img src={artist.avatarUrl} alt={artist.name} className="artist-avatar" />
                    )}
                    <div className="artist-details">
                      <h3>
                        {artist.name} (ID: {artist.id})
                      </h3>
                      <div className="artist-meta">
                        <span className={getVerificationClass(artist.verificationState)}>
                          {verificationStateLabels[artist.verificationState] || verificationStateLabels.unverified}
                        </span>
                        {artist.aliases && artist.aliases.length > 0 && (
                          <span className="aliases-count">
                            {artist.aliases.length} {tArtist('aliases')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="artist-actions">
                    <button
                      className="edit-button"
                      onClick={() => setSelectedArtist(artist)}
                    >
                      {tArtist('buttons.edit')}
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(artist.id)}
                    >
                      {tArtist('buttons.delete')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {hasMore && !loading && (
          <button className="load-more-button" onClick={() => fetchArtists(false)}>
            {tArtist('buttons.loadMore')}
          </button>
        )}
      </div>

      {selectedArtist && (
        <ArtistActionPopup
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onUpdate={() => {
            setSelectedArtist(null);
            fetchArtists(true);
          }}
        />
      )}

      {showAddForm && (
        <div className="add-form-overlay" onClick={() => setShowAddForm(false)}>
          <div className="add-form" onClick={(e) => e.stopPropagation()}>
            <h3>{tArtist('form.title')}</h3>
            <div className="form-group">
              <label>{tArtist('form.name')}</label>
              <input
                type="text"
                value={newArtistData.name}
                onChange={(e) => setNewArtistData(prev => ({...prev, name: e.target.value}))}
                placeholder={tArtist('form.namePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{tArtist('form.avatarUrl')}</label>
              <input
                type="text"
                value={newArtistData.avatarUrl}
                onChange={(e) => setNewArtistData(prev => ({...prev, avatarUrl: e.target.value}))}
                placeholder={tArtist('form.avatarUrlPlaceholder')}
              />
            </div>
            <div className="form-group">
              <CustomSelect
                label={tArtist('form.verificationState')}
                options={verificationStateFormOptions}
                value={verificationStateFormOptions.find(opt => opt.value === newArtistData.verificationState) || verificationStateFormOptions[0]}
                onChange={(option) => setNewArtistData(prev => ({...prev, verificationState: option?.value || 'unverified'}))}
                width="100%"
              />
            </div>
            <div className="form-group">
              <label>{tArtist('form.aliases')}</label>
              <div className="alias-input-group">
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder={tArtist('form.aliasPlaceholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newAlias.trim()) {
                        setNewArtistData(prev => ({
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
                      setNewArtistData(prev => ({
                        ...prev,
                        aliases: [...prev.aliases, newAlias.trim()]
                      }));
                      setNewAlias('');
                    }
                  }}
                >
                  {tArtist('form.addAlias')}
                </button>
              </div>
              <div className="aliases-list">
                {newArtistData.aliases.map((alias, index) => (
                  <span key={index} className="alias-tag">
                    {alias}
                    <button
                      onClick={() => setNewArtistData(prev => ({
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
                disabled={isCreating || !newArtistData.name.trim()}
              >
                {isCreating ? tArtist('buttons.creating') : tArtist('buttons.create')}
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewArtistData({
                    name: '',
                    avatarUrl: '',
                    verificationState: 'unverified',
                    aliases: []
                  });
                  setNewAlias('');
                }}
              >
                {tArtist('buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistManagementPage;
