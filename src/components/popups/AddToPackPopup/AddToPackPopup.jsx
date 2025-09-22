import { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { PackContext } from '@/contexts/PackContext';
import { useAuth } from '@/contexts/AuthContext';
import { CrossIcon, PlusIcon, SearchIcon } from '@/components/common/icons';
import CreatePackPopup from './CreatePackPopup';
import './AddToPackPopup.css';
import toast from 'react-hot-toast';

const AddToPackPopup = ({ level, onClose, onSuccess }) => {
  const { t } = useTranslation('components');
  const tPopup = (key) => t(`packPopups.addToPack.${key}`) || key;
  
  const { userPacks, addLevelToPack, fetchUserPacks, createPack } = useContext(PackContext);
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  // Filter packs based on search query
  const filteredPacks = userPacks.filter(pack =>
    pack.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle adding level to pack
  const handleAddToPack = async () => {
    if (!selectedPackId) {
      toast.error(tPopup('errors.noPackSelected'));
      return;
    }

    setLoading(true);
    try {
      await addLevelToPack(selectedPackId, level.id);
      toast.success(tPopup('success.added'));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding level to pack:', error);
      if (error.response?.status === 400) {
        toast.error(tPopup('errors.alreadyInPack'));
      } else if (error.response?.status === 400 && error.response?.data?.error?.includes('Maximum')) {
        toast.error(tPopup('errors.packFull'));
      } else {
        toast.error(tPopup('errors.generic'));
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
      toast.success(tPopup('success.packCreated'));
      // Auto-select the newly created pack
      setSelectedPackId(newPack.id);
    } catch (error) {
      console.error('Error creating pack:', error);
      toast.error(tPopup('errors.createFailed'));
    }
  };

  // Check if level is already in any pack
  const isLevelInPack = (packId) => {
    const pack = userPacks.find(p => p.id === packId);
    return pack?.packItems?.some(item => item.levelId === level.id);
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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!user) {
    return (
      <div className="add-to-pack-popup" onClick={onClose}>
        <div className="add-to-pack-popup__content" onClick={(e) => e.stopPropagation()}>
          <div className="add-to-pack-popup__header">
            <h2 className="add-to-pack-popup__title">{tPopup('title')}</h2>
            <button className="add-to-pack-popup__close" onClick={onClose}>
              <CrossIcon />
            </button>
          </div>
          <div className="add-to-pack-popup__body">
            <p className="add-to-pack-popup__login-message">
              {tPopup('loginRequired')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="add-to-pack-popup" onClick={onClose}>
        <div className="add-to-pack-popup__content" onClick={(e) => e.stopPropagation()}>
          <div className="add-to-pack-popup__header">
            <h2 className="add-to-pack-popup__title">{tPopup('title')}</h2>
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
                {tPopup('by')} {level.creator}
              </p>
            </div>

            <div className="add-to-pack-popup__search">
              <div className="add-to-pack-popup__search-input-group">
                <SearchIcon className="add-to-pack-popup__search-icon" />
                <input
                  type="text"
                  className="add-to-pack-popup__search-input"
                  placeholder={tPopup('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="add-to-pack-popup__packs">
              <div className="add-to-pack-popup__packs-header">
                <h4 className="add-to-pack-popup__packs-title">
                  {tPopup('selectPack')}
                </h4>
                <button
                  className="add-to-pack-popup__create-btn"
                  onClick={() => setShowCreatePopup(true)}
                >
                  <PlusIcon />
                  <span>{tPopup('createNew')}</span>
                </button>
              </div>

              <div className="add-to-pack-popup__packs-list">
                {filteredPacks.length === 0 ? (
                  <div className="add-to-pack-popup__empty">
                    <p className="add-to-pack-popup__empty-text">
                      {searchQuery ? tPopup('noPacksFound') : tPopup('noPacks')}
                    </p>
                    {!searchQuery && (
                      <button
                        className="add-to-pack-popup__create-first-btn"
                        onClick={() => setShowCreatePopup(true)}
                      >
                        <PlusIcon />
                        <span>{tPopup('createFirst')}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredPacks.map((pack) => {
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
                            {pack.packItems?.length || 0} {tPopup('levels')}
                          </p>
                        </div>

                        {isAlreadyInPack && (
                          <div className="add-to-pack-popup__pack-status">
                            <span className="add-to-pack-popup__pack-status-text">
                              {tPopup('alreadyInPack')}
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
            </div>
          </div>

          <div className="add-to-pack-popup__footer">
            <button
              className="add-to-pack-popup__cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              {tPopup('cancel')}
            </button>
            <button
              className="add-to-pack-popup__add-btn"
              onClick={handleAddToPack}
              disabled={!selectedPackId || loading}
            >
              {loading ? tPopup('adding') : tPopup('addToPack')}
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
};

export default AddToPackPopup;
