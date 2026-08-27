// tuf-search: #AddToPackPopup #addToPackPopup #popups #packs #addToPack
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CrossIcon, PlusIcon, SearchIcon } from '@/components/common/icons';
import CreatePackPopup from './CreatePackPopup';
import './AddToPackPopup.css';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useNavigate } from 'react-router-dom';
import { formatCreatorDisplay } from "@/utils/Utility";
import { Portal } from '@/components/common/Portal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  normalizePackSearchQuery,
  parseHashtagPackQuery,
} from '@/utils/normalizeEntitySearchQuery';
import { getPackLinkCode } from '@/utils/packRefUtils';
import { validatePackLevelInsert, executePackLevelInsert } from '@/utils/packLevelInsert';

const LIMIT = 10;
const CONTAINING_PACKS_LIMIT = 100;

function packContainsLevel(pack, levelId) {
  const targetId = Number(levelId);
  if (!Number.isFinite(targetId) || targetId <= 0) return false;

  const visit = (nodes) => {
    if (!Array.isArray(nodes)) return false;
    return nodes.some((item) => {
      if (Number(item?.levelId) === targetId) return true;
      return visit(item?.children);
    });
  };

  return visit(pack?.items) || visit(pack?.packItems);
}

function getInsertInvalidEntries(source) {
  const invalid = source?.invalid
    ?? source?.details?.invalid
    ?? source?.response?.data?.details?.invalid
    ?? [];
  return Array.isArray(invalid) ? invalid : [];
}

function isCanceledRequest(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';
}

const AddToPackPopup = ({ level, onClose, onSuccess }) => {
  const { t } = useTranslation('components');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchAbortRef = useRef(null);
  
  const [userPacks, setUserPacks] = useState([]);
  const [levelContainingPackIds, setLevelContainingPackIds] = useState(() => new Set());
  const [fullPackIds, setFullPackIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const selectedPackUnavailable = Boolean(
    selectedPackId
    && (levelContainingPackIds.has(selectedPackId) || fullPackIds.has(selectedPackId)),
  );

  const ownerQuery = user?.username ? `owner:${user.username}` : '';

  const markPackIds = (setter, packId) => {
    if (!packId) return;
    setter((prev) => {
      if (prev.has(packId)) return prev;
      const next = new Set(prev);
      next.add(packId);
      return next;
    });
  };

  const applyInsertFailure = (packId, invalidEntries, fallbackMessage) => {
    const reasons = invalidEntries.map((entry) => entry.reason);
    if (reasons.includes('already_in_pack')) {
      markPackIds(setLevelContainingPackIds, packId);
      setSelectedPackId((current) => (current === packId ? null : current));
      toast.error(t('packPopups.addToPack.errors.alreadyInPack'));
      return;
    }
    if (reasons.includes('quota_exceeded')) {
      markPackIds(setFullPackIds, packId);
      setSelectedPackId((current) => (current === packId ? null : current));
      toast.error(t('packPopups.addToPack.errors.packFull'));
      return;
    }

    const apiMessage = fallbackMessage
      || invalidEntries[0]?.reason;
    if (typeof apiMessage === 'string' && apiMessage.toLowerCase().includes('maximum')) {
      markPackIds(setFullPackIds, packId);
      setSelectedPackId((current) => (current === packId ? null : current));
      toast.error(t('packPopups.addToPack.errors.packFull'));
      return;
    }

    toast.error(t('packPopups.addToPack.errors.generic'));
  };

  const fetchUserPacks = async () => {
    if (!user?.username) return;

    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const { signal } = controller;

    const packLookupId = parseHashtagPackQuery(searchQuery.trim());
    if (packLookupId) {
      try {
        setListLoading(true);
        const response = await api.get(routes.database.levels.packs.byId(packLookupId), { signal });
        const pack = response.data;
        const isOwner = pack?.packOwner?.username === user.username;
        const ownedPack = pack && isOwner ? [pack] : [];
        const packId = ownedPack[0] ? getPackLinkCode(ownedPack[0]) : '';
        setUserPacks(ownedPack);
        setTotalPages(ownedPack.length > 0 ? 1 : 0);
        setLevelContainingPackIds(
          packId && packContainsLevel(pack, level.id) ? new Set([packId]) : new Set(),
        );
        return;
      } catch (error) {
        if (isCanceledRequest(error) || signal.aborted) return;
        if (error.response?.status !== 404) {
          console.error('Error fetching pack by id:', error);
        }
        setUserPacks([]);
        setTotalPages(1);
        setLevelContainingPackIds(new Set());
        return;
      } finally {
        if (!signal.aborted) setListLoading(false);
      }
    }
    
    try {
      setListLoading(true);
      const params = {
        offset: (currentPage - 1) * LIMIT,
        limit: LIMIT,
        query: searchQuery ? `${ownerQuery},${searchQuery}` : ownerQuery,
      };

      // Membership is pack-wide and must not reuse the visible list's page offset.
      // A later list page would otherwise skip containing packs that still appear in the UI.
      const levelContainingParams = {
        offset: 0,
        limit: CONTAINING_PACKS_LIMIT,
        query: `${ownerQuery},levelId:${level.id}`,
      };

      const [response, levelContainingResponse] = await Promise.all([
        api.get(routes.database.levels.packs.root(), { params, signal }),
        api.get(routes.database.levels.packs.root(), { params: levelContainingParams, signal }),
      ]);
      if (signal.aborted) return;

      const packs = response.data.packs || [];
      const containingPacks = levelContainingResponse.data.packs || [];
      setUserPacks(packs);
      setTotalPages(Math.ceil((response.data.total || 0) / LIMIT));
      setLevelContainingPackIds(new Set(
        containingPacks.map((pack) => getPackLinkCode(pack)).filter(Boolean),
      ));
    } catch (error) {
      if (isCanceledRequest(error) || signal.aborted) return;
      console.error('Error fetching user packs:', error);
      setUserPacks([]);
      setTotalPages(1);
      setLevelContainingPackIds(new Set());
    } finally {
      if (!signal.aborted) setListLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserPacks();
    }
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, [user?.id, user?.username, currentPage, searchQuery, level?.id]);

  const handleSearchChange = (value) => {
    setSearchQuery(normalizePackSearchQuery(value));
    setCurrentPage(1);
    setSelectedPackId(null);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedPackId(null);
  };

  const createPack = async (packData) => {
    const response = await api.post(routes.database.levels.packs.root(), packData);
    return response.data;
  };

  const handleAddToPack = async () => {
    if (!selectedPackId) {
      toast.error(t('packPopups.addToPack.errors.noPackSelected'));
      return;
    }
    if (levelContainingPackIds.has(selectedPackId)) {
      toast.error(t('packPopups.addToPack.errors.alreadyInPack'));
      return;
    }
    if (fullPackIds.has(selectedPackId)) {
      toast.error(t('packPopups.addToPack.errors.packFull'));
      return;
    }

    const targetPackId = selectedPackId;
    setSubmitting(true);
    try {
      const validation = await validatePackLevelInsert(targetPackId, [level.id], 0);
      const invalid = getInsertInvalidEntries(validation);
      if (invalid.length > 0 || !validation.validLevelIds?.length) {
        applyInsertFailure(targetPackId, invalid, validation?.error);
        return;
      }

      const result = await executePackLevelInsert(targetPackId, validation.validLevelIds, 0);
      const createdList = Array.isArray(result) ? result : result?.items ?? [];
      if (createdList.length === 0) {
        applyInsertFailure(targetPackId, [{ reason: 'already_in_pack' }]);
        return;
      }
      toast.success(t('packPopups.addToPack.success.added'));
      
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: targetPackId }
      }));
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding level to pack:', error);
      applyInsertFailure(
        targetPackId,
        getInsertInvalidEntries(error),
        error.response?.data?.error,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePack = async (packData) => {
    const newPack = await createPack(packData);
    setSelectedPackId(getPackLinkCode(newPack) || newPack.id);
    return newPack;
  };

  const handleLookupInPacks = () => {
    onClose();
    navigate('/packs', {
      state: { packSearchQuery: `levelId:${level.id}` },
    });
  };

  const isLevelInPack = (packId) => levelContainingPackIds.has(packId);
  const isPackFull = (packId) => fullPackIds.has(packId);

  const handleSelectPack = (packId) => {
    if (isLevelInPack(packId) || isPackFull(packId) || submitting) return;
    setSelectedPackId(packId);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.classList.contains('add-to-pack-popup')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  useBodyScrollLock(true);

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
  } else {
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
                    type="button"
                  >
                    <PlusIcon />
                    <span>{t('packPopups.addToPack.createNew')}</span>
                  </button>
                </div>

                <div className="add-to-pack-popup__packs-list">
                  {listLoading ? (
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
                          type="button"
                        >
                          <PlusIcon />
                          <span>{t('packPopups.addToPack.createFirst')}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    userPacks.map((pack) => {
                      const packId = getPackLinkCode(pack);
                      const isAlreadyInPack = isLevelInPack(packId);
                      const packFull = isPackFull(packId);
                      const isUnavailable = isAlreadyInPack || packFull;
                      const isSelected = selectedPackId === packId && !isUnavailable;
                      
                      return (
                        <div
                          key={packId}
                          className={`add-to-pack-popup__pack-item ${
                            isSelected ? 'selected' : ''
                          } ${isAlreadyInPack ? 'already-in-pack' : ''} ${packFull ? 'pack-full' : ''}`}
                          onClick={() => handleSelectPack(packId)}
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

                          {packFull && !isAlreadyInPack && (
                            <div className="add-to-pack-popup__pack-status">
                              <span className="add-to-pack-popup__pack-status-text add-to-pack-popup__pack-status-text--full">
                                {t('packPopups.addToPack.packFull')}
                              </span>
                            </div>
                          )}

                          {isSelected && (
                            <div className="add-to-pack-popup__pack-selected">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="add-to-pack-popup__pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || submitting}
                      className="add-to-pack-popup__page-btn"
                      type="button"
                    >
                      ←
                    </button>
                    
                    <span className="add-to-pack-popup__page-info">
                      {t('packPopups.addToPack.pagination.pageInfo', { current: currentPage, total: totalPages })}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || submitting}
                      className="add-to-pack-popup__page-btn"
                      type="button"
                    >
                      ➔
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
                disabled={submitting}
                type="button"
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                className="add-to-pack-popup__add-btn"
                onClick={handleAddToPack}
                disabled={!selectedPackId || selectedPackUnavailable || listLoading || submitting}
                type="button"
              >
                {submitting ? t('packPopups.addToPack.adding') : t('packPopups.addToPack.addToPack')}
              </button>
            </div>
          </div>
        </div>

        {showCreatePopup && (
          <CreatePackPopup
            onClose={() => {
              setShowCreatePopup(false);
              fetchUserPacks();
            }}
            onCreate={handleCreatePack}
          />
        )}
      </>
    );
  }
  return <Portal>{popupContent}</Portal>;
};

export default AddToPackPopup;
