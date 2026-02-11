import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CrossIcon, PlusIcon, SearchIcon } from '@/components/common/icons';
import CreatePackPopup from './CreatePackPopup';
import './AddToPackPopup.css';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { useNavigate } from 'react-router-dom';
import { formatCreatorDisplay } from "@/utils/Utility";
import { createPortal } from 'react-dom';

const AddToPackPopup = ({ level, onClose, onSuccess }) => {
  const { t } = useTranslation('components');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [userPacks, setUserPacks] = useState([]);
  const [levelContainingPacks, setLevelContainingPacks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPacks, setTotalPacks] = useState(0);

  const LIMIT = 10;

  // Fetch user packs on mount
  const fetchUserPacks = async () => {
    if (!user?.username) return;
    
    try {
      setLoading(true);
      const params = {
        offset: (currentPage - 1) * LIMIT,
        limit: LIMIT,
        query: `owner:${user.username},${searchQuery}`,
      };

      const levelContainingParams = {
        offset: (currentPage - 1) * LIMIT,
        limit: 100,
        query: `owner:${user.username},levelId:${level.id},${searchQuery}`,
      };

      const [response, levelContainingResponse] = await Promise.all([api.get('/v2/database/levels/packs', { params }), api.get('/v2/database/levels/packs', { params: levelContainingParams })]);
      setUserPacks(response.data.packs || []);
      setTotalPacks(response.data.total || 0);
      setTotalPages(Math.ceil((response.data.total || 0) / LIMIT));
      setLevelContainingPacks(levelContainingResponse.data.packs || []);
    } catch (error) {
      console.error('Error fetching user packs:', error);
      setUserPacks([]);
      setTotalPacks(0);
      setTotalPages(1);
      setLevelContainingPacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserPacks();
    }
  }, [user?.id, currentPage, searchQuery]);

  // Handle search input changes
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Standalone pack operations
  const addLevelToPack = async (packId, levelId, parentId = 0) => {
    const response = await api.post(`/v2/database/levels/packs/${packId}/items`, {
      type: 'level',
      levelIds: levelId,
      parentId
    });
    return response.data;
  };

  const createPack = async (packData) => {
    const response = await api.post('/v2/database/levels/packs', packData);
    return response.data;
  };

  // Handle adding level to pack
  const handleAddToPack = async () => {
    if (!selectedPackId) {
      toast.error(t('packPopups.addToPack.errors.noPackSelected'));
      return;
    }

    setLoading(true);
    try {
      await addLevelToPack(selectedPackId, level.id);
      toast.success(t('packPopups.addToPack.success.added'));
      
      // Notify any listening PackDetailPage that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: selectedPackId }
      }));
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding level to pack:', error);
      if (error.response?.status === 400) {
        toast.error(t('packPopups.addToPack.errors.alreadyInPack'));
      } else if (error.response?.status === 400 && error.response?.data?.error?.includes('Maximum')) {
        toast.error(t('packPopups.addToPack.errors.packFull'));
      } else {
        toast.error(t('packPopups.addToPack.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle creating new pack
  const handleCreatePack = async (packData) => {
    try {
      const newPack = await createPack(packData);
      setShowCreatePopup(false);
      toast.success(t('packPopups.addToPack.success.packCreated'));
      // Auto-select the newly created pack
      setSelectedPackId(newPack.id);
      // Refresh user packs to include the new pack
      fetchUserPacks();
    } catch (error) {
      console.error('Error creating pack:', error);
      toast.error(t('packPopups.addToPack.errors.createFailed'));
    }
  };

  // Handle looking up level in packs
  const handleLookupInPacks = () => {
    onClose();
    // Use window context to pass the search query
    window.packSearchContext = {
      query: `levelId:${level.id}`,
      timestamp: Date.now()
    };
    navigate('/packs');
  };

  // Check if level is already in any pack
  const isLevelInPack = (packId) => {
    return levelContainingPacks.some(p => p.id.includes(packId));
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.classList.contains('add-to-pack-popup')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  let popupContent = null;
  if (!user) {
    popupContent = (
      <div className="add-to-pack-popup" onClick={onClose}>
        <div className="add-to-pack-popup__content" onClick={(e) => e.stopPropagation()}>
          <div className="add-to-pack-popup__header">
            <h2 className="add-to-pack-popup__title">{t('packPopups.addToPack.title')}</h2>
            <button className="add-to-pack-popup__close" onClick={onClose}>
              <CrossIcon />
            </button>
          </div>
          <div className="add-to-pack-popup__body">
            <p className="add-to-pack-popup__login-message">
              {t('packPopups.addToPack.loginRequired')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  popupContent = (
    <>
      <div className="add-to-pack-popup" onClick={onClose}>
        <div className="add-to-pack-popup__content" onClick={(e) => e.stopPropagation()}>
          <div className="add-to-pack-popup__header">
            <h2 className="add-to-pack-popup__title">{t('packPopups.addToPack.title')}</h2>
            <button className="add-to-pack-popup__close" onClick={onClose}>
              <CrossIcon />
            </button>
          </div>

          <div className="add-to-pack-popup__body">
            <div className="add-to-pack-popup__level-info">
              <h3 className="add-to-pack-popup__level-title">
                {level.song} - {level.artist}
              </h3>
              <p className="add-to-pack-popup__level-creator">
                {t('packPopups.addToPack.by')} {formatCreatorDisplay(level)}
              </p>
            </div>

            <div className="add-to-pack-popup__search">
              <div className="add-to-pack-popup__search-input-group">
                <SearchIcon className="add-to-pack-popup__search-icon" />
                <input
                  type="text"
                  className="add-to-pack-popup__search-input"
                  placeholder={t('packPopups.addToPack.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="add-to-pack-popup__packs">
              <div className="add-to-pack-popup__packs-header">
                <h4 className="add-to-pack-popup__packs-title">
                  {t('packPopups.addToPack.selectPack')}
                </h4>
                <button
                  className="add-to-pack-popup__create-btn"
                  onClick={() => setShowCreatePopup(true)}
                >
                  <PlusIcon />
                  <span>{t('packPopups.addToPack.createNew')}</span>
                </button>
              </div>

              <div className="add-to-pack-popup__packs-list">
                {loading ? (
                  <div className="add-to-pack-popup__loading">
                    <p className="add-to-pack-popup__loading-text">
                      {t('packPopups.addToPack.loading')}
                    </p>
                  </div>
                ) : userPacks.length === 0 ? (
                  <div className="add-to-pack-popup__empty">
                    <p className="add-to-pack-popup__empty-text">
                      {searchQuery ? t('packPopups.addToPack.noPacksFound') : t('packPopups.addToPack.noPacks')}
                    </p>
                    {!searchQuery && (
                      <button
                        className="add-to-pack-popup__create-first-btn"
                        onClick={() => setShowCreatePopup(true)}
                      >
                        <PlusIcon />
                        <span>{t('packPopups.addToPack.createFirst')}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  userPacks.map((pack) => {
                    const isAlreadyInPack = isLevelInPack(pack.id);
                    const isSelected = selectedPackId === pack.id;
                    
                    return (
                      <div
                        key={pack.id}
                        className={`add-to-pack-popup__pack-item ${
                          isSelected ? 'selected' : ''
                        } ${isAlreadyInPack ? 'already-in-pack' : ''}`}
                        onClick={() => !isAlreadyInPack && setSelectedPackId(pack.id)}
                      >
                        <div className="add-to-pack-popup__pack-icon">
                          {pack.iconUrl ? (
                            <img
                              src={pack.iconUrl}
                              alt={pack.name}
                              className="add-to-pack-popup__pack-icon-image"
                            />
                          ) : (
                            <div className="add-to-pack-popup__pack-icon-placeholder">
                              📦
                            </div>
                          )}
                        </div>
                        
                        <div className="add-to-pack-popup__pack-info">
                          <h5 className="add-to-pack-popup__pack-name">
                            {pack.name}
                          </h5>
                          <p className="add-to-pack-popup__pack-meta">
                            {pack.totalLevelCount || 0} {t('packPopups.addToPack.levels')}
                          </p>
                        </div>

                        {isAlreadyInPack && (
                          <div className="add-to-pack-popup__pack-status">
                            <span className="add-to-pack-popup__pack-status-text">
                              {t('packPopups.addToPack.alreadyInPack')}
                            </span>
                          </div>
                        )}

                        {isSelected && !isAlreadyInPack && (
                          <div className="add-to-pack-popup__pack-selected">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="add-to-pack-popup__pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="add-to-pack-popup__page-btn"
                  >
                    ←
                  </button>
                  
                  <span className="add-to-pack-popup__page-info">
                    {t('packPopups.addToPack.pagination.pageInfo', { current: currentPage, total: totalPages })}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="add-to-pack-popup__page-btn"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="add-to-pack-popup__footer">
          <button
                className="add-to-pack-popup__lookup-btn"
                onClick={handleLookupInPacks}
                type="button"
              >
                <SearchIcon />
                <span>{t('packPopups.addToPack.lookupInPacks')}</span>
              </button>
            <button
              className="add-to-pack-popup__cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              className="add-to-pack-popup__add-btn"
              onClick={handleAddToPack}
              disabled={!selectedPackId || loading}
            >
              {loading ? t('packPopups.addToPack.adding') : t('packPopups.addToPack.addToPack')}
            </button>
          </div>
        </div>
      </div>

      {showCreatePopup && (
        <CreatePackPopup
          onClose={() => setShowCreatePopup(false)}
          onCreate={handleCreatePack}
        />
      )}
    </>
  );
  return createPortal(popupContent, document.body);
};

export default AddToPackPopup;
