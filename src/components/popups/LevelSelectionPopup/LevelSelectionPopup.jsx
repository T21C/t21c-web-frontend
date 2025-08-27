import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './levelselectionpopup.css';
import toast from 'react-hot-toast';

const LIMIT = 20; 

const LevelSelectionPopup = ({
  isOpen,
  onClose,
  onLevelSelect,
  curationTypes
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`levelSelectionPopup.${key}`, params);

  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  const modalRef = useRef(null);

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

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
      fetchLevels();
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside]);

  useEffect(() => {
    if (isOpen) {
      fetchLevels();
    }
  }, [isOpen, currentPage, searchTerm]);

  const fetchLevels = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        offset: (currentPage - 1) * LIMIT,
        limit: LIMIT,
        query: searchTerm,
        curatedTypesFilter: "hide"
      });
      
      const response = await api.get(`${import.meta.env.VITE_LEVELS}?${params}`);
      setLevels(response.data.results || []);
      setTotalPages(Math.ceil(response.data.total / LIMIT) || 1);
    } catch (error) {
      console.error('Failed to fetch levels:', error);
      toast.error('Failed to fetch levels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelSelect = (level) => {
    // Just pass the level data for creating a new curation
    onLevelSelect({
      levelId: level.id,
      level: level
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setInputValue('1');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setInputValue(page.toString());
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      handlePageChange(newPage);
      if (newPage <= 2) {
        setInputValue('1');
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePageInputChange = (e) => {
    const input = e.target.value;
    setInputValue(input);
    
    // Allow empty input - don't immediately change page
    if (input === '') {
      return;
    }
    
    // Remove leading zeros and parse
    const cleanInput = input.replace(/^0+/, '') || '0';
    const page = parseInt(cleanInput);
    
    // Only change page if it's a valid number within bounds
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    }
  };

  const handlePageInputBlur = () => {
    // When user finishes typing, ensure we have a valid page
    if (inputValue === '' || inputValue === '0') {
      setInputValue('1');
      handlePageChange(1);
      return;
    }
    
    // Remove leading zeros and parse
    const cleanInput = inputValue.replace(/^0+/, '') || '0';
    const page = parseInt(cleanInput);
    
    // If invalid or out of bounds, default to page 1
    if (isNaN(page) || page < 1 || page > totalPages) {
      setInputValue('1');
      handlePageChange(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="level-selection-modal">
      <div className="level-selection-modal__content" ref={modalRef}>
        <button 
          className="level-selection-modal__close-button"
          onClick={onClose}
          type="button"
        >
          ✖
        </button>

        <div className="level-selection-modal__header">
          <h2>{tCur('titleAdd')}</h2>
          <p>{tCur('descriptionAdd')}</p>
        </div>

        <div className="level-selection-modal__filters">
          <div className="level-selection-modal__filter-group">
            <label htmlFor="search">{tCur('filters.search')}</label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={tCur('filters.searchPlaceholder')}
              className="level-selection-modal__input"
            />
          </div>
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="level-selection-modal__pagination">
            <button 
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="level-selection-modal__pagination-btn"
            >
              Previous
            </button>
            <div className="level-selection-modal__page-controls">
              <span>Page </span>
              <input
                type="number"
                max={totalPages}
                value={inputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                className="level-selection-modal__page-input"
              />
              <span> of {totalPages}</span>
            </div>
            <button 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="level-selection-modal__pagination-btn"
            >
              Next
            </button>
          </div>
        )}

        <div className="level-selection-modal__levels">
          {isLoading ? (
            <div className="level-selection-modal__loading"><div className="loader" /></div>
          ) : levels.length === 0 ? (
            <div className="level-selection-modal__empty">{tCur('empty')}</div>
          ) : (
            levels.map(level => (
              <div key={level.id} className="level-selection-modal__level-item">
                <div className="level-selection-modal__level-card-wrapper">
                  <div className="level-selection-modal__img-wrapper">
                    <img 
                      src={level.difficulty?.icon || '/default-difficulty-icon.png'} 
                      alt={level.difficulty?.name || 'Difficulty icon'} 
                      className="level-selection-modal__difficulty-icon" 
                    />
                  </div>

                  <div className="level-selection-modal__song-wrapper">
                    <div className="level-selection-modal__group">
                      <p className="level-selection-modal__level-exp">#{level.id} - {level.artist}</p>
                    </div>
                    <p className="level-selection-modal__level-desc">{level.song || 'Unknown Song'}</p>
                  </div>

                  <div className="level-selection-modal__creator-wrapper">
                    <p className="level-selection-modal__level-exp">{tCur('creator')}</p>
                    <div className="level-selection-modal__level-desc">{level.creator || 'Unknown Creator'}</div>
                  </div>

                  <button
                    className="level-selection-modal__select-btn"
                    onClick={() => handleLevelSelect(level)}
                    title={tCur('createLevel')}
                  >
                    {tCur('create')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LevelSelectionPopup; 