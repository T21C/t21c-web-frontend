import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDenied, MetaTags } from '@/components/common/display';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { CustomSelect } from '@/components/common/selectors';
import { EntityActionPopup } from '@/components/popups';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroll-component';
import './entityManagementPage.css';
import { Link } from 'react-router-dom';
import { getVerificationClass } from '@/utils/Utility';
import { EvidenceGalleryPopup } from '@/components/popups/Evidence/EvidenceGalleryPopup/EvidenceGalleryPopup';

const EntityManagementPage = ({ type = 'artist' }) => {
  const { t } = useTranslation(['pages', 'common']);
  const tEntity = (key, params = {}) => {
    const translationKey = type === 'song' ? `songManagement.${key}` : `artistManagement.${key}`;
    return t(translationKey, params);
  };
  const { user } = useAuth();
  const currentUrl = window.location.origin + location.pathname;

  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME_ASC');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntityData, setNewEntityData] = useState({
    name: '',
    verificationState: type === 'song' ? 'pending' : 'unverified',
    aliases: []
  });
  const [newAlias, setNewAlias] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);

  useEffect(() => {
    if (user && hasFlag(user, permissionFlags.SUPER_ADMIN)) {
      fetchEntities(true);
    }
  }, [searchQuery, sortBy, verificationFilter, user, type]);

  const fetchEntities = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setEntities([]);
      }

      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 50,
        search: searchQuery,
        sort: sortBy
      };

      if (verificationFilter) {
        params.verificationState = verificationFilter;
      }

      const endpoint = type === 'song' ? '/v2/database/songs' : '/v2/database/artists';
      const response = await api.get(endpoint, { params });
      const data = response.data;
      const items = type === 'song' ? (data.songs || []) : (data.artists || []);
      
      if (reset) {
        setEntities(items);
      } else {
        setEntities(prev => [...prev, ...items]);
      }

      // If no items returned, there's no more data regardless of hasMore flag
      setHasMore(items.length > 0 && (data.hasMore || false));
      setPage(currentPage + 1);
    } catch (error) {
      console.error(`Error fetching ${type}s:`, error);
      toast.error(tEntity('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchEntities(false);
    }
  };

  const handleCreate = async () => {
    if (!newEntityData.name.trim()) {
      toast.error(tEntity('errors.nameRequired'));
      return;
    }

    setIsCreating(true);
    try {
      const endpoint = type === 'song' ? '/v2/database/songs' : '/v2/database/artists';
      
      if (type === 'artist') {
        const formData = new FormData();
        formData.append('name', newEntityData.name.trim());
        formData.append('verificationState', newEntityData.verificationState);
        
        if (avatarFile) {
          formData.append('avatar', avatarFile);
        }
        
        if (newEntityData.aliases.length > 0) {
          formData.append('aliases', JSON.stringify(newEntityData.aliases));
        }

        await api.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post(endpoint, newEntityData);
      }
      
      toast.success(tEntity('messages.created'));
      setShowAddForm(false);
      setNewEntityData({
        name: '',
        verificationState: type === 'song' ? 'pending' : 'unverified',
        aliases: []
      });
      setNewAlias('');
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchEntities(true);
    } catch (error) {
      toast.error(error.response?.data?.error || tEntity('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };


  const openEvidenceGallery = (entity) => {
    setShowEvidenceGallery(entity.evidences);
  };
  const handleDelete = async (entityId) => {
    if (!window.confirm(tEntity('confirmDelete'))) return;

    try {
      const endpoint = type === 'song' ? `/v2/database/songs/${entityId}` : `/v2/database/artists/${entityId}`;
      await api.delete(endpoint);
      toast.success(tEntity('messages.deleted'));
      fetchEntities(true);
    } catch (error) {
      toast.error(error.response?.data?.error || tEntity('errors.deleteFailed'));
    }
  };

  const verificationStateLabels = type === 'song'
    ? {
        allowed: t('verification.allowed', { ns: 'common' }),
        'ysmod_only': t('verification.ysmod_only', { ns: 'common' }),
        conditional: t('verification.conditional', { ns: 'common' }),
        pending: t('verification.pending', { ns: 'common' }),
        declined: t('verification.declined', { ns: 'common' })
      }
    : {
        allowed: t('verification.allowed', { ns: 'common' }),
        'mostly_allowed': t('verification.mostly_allowed', { ns: 'common' }),
        'mostly_declined': t('verification.mostly_declined', { ns: 'common' }),
        declined: t('verification.declined', { ns: 'common' }),
        'ysmod_only': t('verification.ysmod_only', { ns: 'common' }),
        pending: t('verification.pending', { ns: 'common' }),
        unverified: t('verification.unverified', { ns: 'common' })
      };



  const verificationStateFormOptions = type === 'song'
    ? [
        { value: 'allowed', label: t('verification.allowed', { ns: 'common' }) },
        { value: 'ysmod_only', label: t('verification.ysmod_only', { ns: 'common' }) },
        { value: 'conditional', label: t('verification.conditional', { ns: 'common' }) },
        { value: 'pending', label: t('verification.pending', { ns: 'common' }) },
        { value: 'declined', label: t('verification.declined', { ns: 'common' }) }
      ]
    : [
        { value: 'allowed', label: t('verification.allowed', { ns: 'common' }) },
        { value: 'mostly_allowed', label: t('verification.mostly_allowed', { ns: 'common' }) },
        { value: 'mostly_declined', label: t('verification.mostly_declined', { ns: 'common' }) },
        { value: 'declined', label: t('verification.declined', { ns: 'common' }) },
        { value: 'ysmod_only', label: t('verification.ysmod_only', { ns: 'common' }) },
        { value: 'pending', label: t('verification.pending', { ns: 'common' }) },
        { value: 'unverified', label: t('verification.unverified', { ns: 'common' }) }
      ];
      
    const verificationStateOptions = [...verificationStateFormOptions, { value: '', label: tEntity('filter.all') }]; 

  const sortOptions = [
    { value: 'NAME_ASC', label: tEntity('sort.nameAsc') },
    { value: 'NAME_DESC', label: tEntity('sort.nameDesc') },
    { value: 'ID_ASC', label: tEntity('sort.idAsc') },
    { value: 'ID_DESC', label: tEntity('sort.idDesc') }
  ];

  const noResultsKey = type === 'song' ? 'noSongs' : 'noArtists';

  if (user?.permissionFlags === undefined) {
    return (
      <div className="entity-management-page">
        <MetaTags
          title={tEntity('meta.title')}
          description={tEntity('meta.description')}
          url={currentUrl}
        />
        <div className="loader loader-level-detail"></div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={tEntity('meta.title')}
        metaDescription={tEntity('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  return (
    <div className="entity-management-page">
      <MetaTags
        title={tEntity('meta.title')}
        description={tEntity('meta.description')}
        url={currentUrl}
      />

      <div className="entity-management-container">
        <h1>{tEntity('title')}</h1>

        <div className="controls">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder={tEntity('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-container">
            <CustomSelect
              label={tEntity('filter.verification')}
              options={verificationStateOptions}
              value={verificationStateOptions.find(opt => opt.value === verificationFilter) || verificationStateOptions[0]}
              onChange={(option) => setVerificationFilter(option?.value || '')}
              width="12rem"
            />
          </div>

          <div className="sort-container">
            <CustomSelect
              label={tEntity('sort.label')}
              options={sortOptions}
              value={sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]}
              onChange={(option) => setSortBy(option?.value || 'NAME_ASC')}
              width="12rem"
            />
          </div>

          <button className="add-button" onClick={() => setShowAddForm(true)}>
            {t('buttons.add', { ns: 'common' })}
          </button>
        </div>

        {loading && entities.length === 0 ? (
          <div className="loader loader-level-page"></div>
        ) : (
          <InfiniteScroll
            style={{ paddingBottom: "7rem", minHeight: "100vh", overflow: "visible" }}
            dataLength={entities.length}
            next={handleLoadMore}
            hasMore={hasMore}
            loader={<div className="loader loader-level-page"></div>}
            endMessage={
              entities.length > 0 && (
                <p className="end-message">
                  <b>{tEntity('infScroll.end')}</b>
                </p>
              )
            }
          >
            <div className="entities-list">
              {entities.length === 0 ? (
                <div className="no-results">{tEntity(noResultsKey)}</div>
              ) : (
                entities.map((entity) => (
                  <div key={entity.id} className="entity-item">
                    <div className="entity-info">
                      {type === 'artist' && entity.avatarUrl && (
                        <img src={entity.avatarUrl} alt={entity.name} className="entity-avatar" />
                      )}
                      <div className="entity-details">
                        <Link to={`/${type}s/${entity.id}`} className="entity-name-link">
                          {entity.name} (ID: {entity.id})
                        </Link>
                        <div className="entity-meta">
                          <span className={getVerificationClass(entity.verificationState)}>
                            {t(`verification.${entity.verificationState}`, { ns: 'common' })}
                          </span>
                          {entity.aliases && entity.aliases.length > 0 && (
                            <span className="aliases-count">
                              {entity.aliases.length} {tEntity('aliases')}
                            </span>
                          )}
                          {type === 'song' && entity.credits && entity.credits.length > 0 && (
                            <div className="entity-credits">
                              {entity.credits.map((credit, index) => (
                                <span key={credit.id} className="entity-credit-tag">
                                  {credit.artist?.name || 'Unknown'}
                                  {index < entity.credits.length - 1 && <span className="entity-credit-separator">, </span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="evidence-list">
                      {entity.evidences && entity.evidences.length > 0 && (
                        <div className="evidence-list" onClick={() => openEvidenceGallery(entity)}>
                          {entity.evidences.map((evidence) => (
                            <div key={evidence.id} className="evidence-item">
                              <img src={evidence.link.replace("original", "small")} alt="Evidence" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="entity-actions">
                      <button
                        className="edit-button"
                        onClick={() => setSelectedEntity(entity)}
                      >
                        {t('buttons.edit', { ns: 'common' })}
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(entity.id)}
                      >
                        {t('buttons.delete', { ns: 'common' })}
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </InfiniteScroll>
        )}

      {selectedEntity && (
        <EntityActionPopup
          {...(type === 'song' ? { song: selectedEntity } : { artist: selectedEntity })}
          onClose={() => setSelectedEntity(null)}
          onUpdate={() => {
            fetchEntities(true);
          }}
          type={type}
        />
      )}

      {showEvidenceGallery && (
        <EvidenceGalleryPopup
          evidence={showEvidenceGallery}
          onClose={() => setShowEvidenceGallery(null)}
        />
      )}

      {showAddForm && (
        <div className="add-form-overlay" onClick={() => setShowAddForm(false)}>
          <div className="add-form" onClick={(e) => e.stopPropagation()}>
            <h3>{tEntity('form.title')}</h3>
            <div className="form-group">
              <label>{tEntity('form.name')}</label>
              <input
                type="text"
                value={newEntityData.name}
                onChange={(e) => setNewEntityData(prev => ({...prev, name: e.target.value}))}
                placeholder={tEntity('form.namePlaceholder')}
              />
            </div>
            {type === 'artist' && (
              <div className="form-group">
                <label>{tEntity('form.avatarUrl')}</label>
                <div className="avatar-section">
                  {avatarPreview && (
                    <div className="avatar-preview">
                      <img src={avatarPreview} alt="Avatar preview" />
                      <button 
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="delete-avatar-btn"
                      >
                        {tEntity('form.removeAvatar')}
                      </button>
                    </div>
                  )}
                  <div className="avatar-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setAvatarFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAvatarPreview(reader.result);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setAvatarPreview(null);
                        }
                      }}
                      id="avatar-upload-create"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="avatar-upload-create" className="upload-label">
                      {tEntity('form.selectAvatarFile')}
                    </label>
                  </div>
                </div>
              </div>
            )}
            <div className="form-group">
              <CustomSelect
                label={tEntity('form.verificationState')}
                options={verificationStateFormOptions}
                value={verificationStateFormOptions.find(opt => opt.value === newEntityData.verificationState) || verificationStateFormOptions[0]}
                onChange={(option) => setNewEntityData(prev => ({...prev, verificationState: option?.value || (type === 'song' ? 'pending' : 'unverified')}))}
                width="100%"
              />
            </div>
            <div className="form-group">
              <label>{tEntity('form.aliases')}</label>
              <div className="alias-input-group">
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder={tEntity('form.aliasPlaceholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newAlias.trim()) {
                        setNewEntityData(prev => ({
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
                      setNewEntityData(prev => ({
                        ...prev,
                        aliases: [...prev.aliases, newAlias.trim()]
                      }));
                      setNewAlias('');
                    }
                  }}
                >
                  {tEntity('form.addAlias')}
                </button>
              </div>
              <div className="aliases-list">
                {newEntityData.aliases.map((alias, index) => (
                  <span key={index} className="alias-tag">
                    {alias}
                    <button
                      onClick={() => setNewEntityData(prev => ({
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
                disabled={isCreating || !newEntityData.name.trim()}
              >
                {isCreating ? t('loading.creating', { ns: 'common' }) : tEntity('buttons.create')}
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewEntityData({
                    name: '',
                    verificationState: type === 'song' ? 'pending' : 'unverified',
                    aliases: []
                  });
                  setNewAlias('');
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default EntityManagementPage;
