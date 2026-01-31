import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import './curationselectionpopup.css';
import toast from 'react-hot-toast';
import { CustomSelect } from '@/components/common/selectors';

const CurationSelectionPopup = ({
  isOpen,
  onClose,
  onCurationSelect,
  excludeIds = [] // Array of curation IDs to exclude from selection
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`curationSelectionPopup.${key}`, params);
  const { curationTypes } = useDifficultyContext();

  // Prepare options for CustomSelect
  const curationTypeOptions = useMemo(() => [
    { value: '', label: tCur('filters.allTypes') },
    ...curationTypes.map(type => ({
      value: type.id.toString(),
      label: type.name
    }))
  ], [curationTypes, tCur]);

  const [curations, setCurations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  const modalRef = useRef(null);

  const LIMIT = 10;

  const handleMouseDown = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setMouseDownOutside(true);
    }
  };

  const handleMouseUp = (e) => {
    if (mouseDownOutside && modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
    setMouseDownOutside(false);
  };

  const fetchCurations = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: LIMIT,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedType && { typeId: selectedType })
      });

      // Add excludeIds to the query parameters if provided
      if (excludeIds && excludeIds.length > 0) {
        excludeIds.forEach(id => params.append('excludeIds', id));
      }

      const response = await api.get(`${import.meta.env.VITE_CURATIONS}?${params}`);
      
      setCurations(response.data.curations);
      setTotalPages(Math.ceil(response.data.total / LIMIT));
    } catch (error) {
      console.error('Failed to fetch curations:', error);
      toast.error('Failed to fetch curations');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, selectedType, excludeIds]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
      fetchCurations();
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, fetchCurations, mouseDownOutside]);

  const handleCurationSelect = (curation) => {
    onCurationSelect(curation);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (typeId) => {
    setSelectedType(typeId);
    setCurrentPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="curation-selection-modal">
      <div className="curation-selection-modal__content" ref={modalRef}>
        <button 
          className="curation-selection-modal__close-button"
          onClick={onClose}
          type="button"
        >
          ✖
        </button>

        <div className="curation-selection-modal__header">
          <h2>{tCur('title')}</h2>
          <p>{tCur('description')}</p>
        </div>

        {/* Filters */}
        <div className="curation-selection-modal__filters">
          <div className="curation-selection-modal__filter-group">
            <label>{tCur('filters.search')}</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={tCur('filters.searchPlaceholder')}
              className="curation-selection-modal__search-input"
            />
          </div>
          
          <div className="curation-selection-modal__filter-group">
            <CustomSelect
              label={tCur('filters.type')}
              options={curationTypeOptions}
              value={curationTypeOptions.find(opt => opt.value === (selectedType ? selectedType.toString() : ''))}
              onChange={(selected) => handleTypeFilter(selected.value)}
              width="100%"
            />
          </div>
        </div>

        {/* Curations List */}
        <div className="curation-selection-modal__list">
          {isLoading ? (
            <div className="curation-selection-modal__loading">{tCur('loading')}</div>
          ) : curations.length === 0 ? (
            <div className="curation-selection-modal__empty">{tCur('empty')}</div>
          ) : (
            curations.map(curation => (
              <div 
                key={curation.id} 
                className="curation-selection-modal__item"
                onClick={() => handleCurationSelect(curation)}
              >
                <div className="curation-selection-modal__item-preview">
                  {curation.previewLink ? (
                    <img 
                      src={curation.previewLink} 
                      alt="Level thumbnail"
                      className="curation-selection-modal__thumbnail"
                    />
                  ) : (
                    <div className="curation-selection-modal__no-thumbnail">
                      🎵
                    </div>
                  )}
                </div>
                
                <div className="curation-selection-modal__item-details">
                  <div className="curation-selection-modal__level-info">
                    <h3 className="curation-selection-modal__level-title">
                      {curation.level?.song || 'Unknown Song'}
                    </h3>
                    <p className="curation-selection-modal__level-artist">
                      {curation.level?.artist || 'Unknown Artist'}
                    </p>
                    <p className="curation-selection-modal__level-creator">
                      {tCur('creator')}: {curation.level?.creator || 'Unknown'}
                    </p>
                  </div>
                  
                  <div className="curation-selection-modal__curation-info">
                    <div 
                      className="curation-selection-modal__type-badge"
                      style={{ 
                        backgroundColor: curation.type?.color + '80' || '#60606080',
                        color: '#ffffff'
                      }}
                    >
                      {curation.type?.name || 'Unknown Type'}
                    </div>
                    {curation.level?.difficulty && (
                      <div className="curation-selection-modal__difficulty">
                        <img 
                          src={curation.level.difficulty.icon} 
                          alt={curation.level.difficulty.name}
                          className="curation-selection-modal__difficulty-icon"
                        />
                        <span>{curation.level.difficulty.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button className="curation-selection-modal__select-btn">
                  {tCur('actions.select')}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="curation-selection-modal__pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="curation-selection-modal__page-btn"
            >
              ← {tCur('pagination.previous')}
            </button>
            
            <span className="curation-selection-modal__page-info">
              {tCur('pagination.pageInfo', { current: currentPage, total: totalPages })}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="curation-selection-modal__page-btn"
            >
              {tCur('pagination.next')} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurationSelectionPopup;
