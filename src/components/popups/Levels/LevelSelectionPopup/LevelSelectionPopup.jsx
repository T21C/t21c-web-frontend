import { routes } from '@/api/routes';
// tuf-search: #LevelSelectionPopup #levelSelectionPopup #popups #levels #levelSelection
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './levelselectionpopup.css';
import toast from 'react-hot-toast';
import { formatCreatorDisplay } from '@/utils/Utility';
import ZipLevelFilesList from '@/components/popups/Levels/ZipLevelFilesList/ZipLevelFilesList';
import { CloseButton } from '@/components/common/buttons';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { normalizeLevelSearchQuery } from '@/utils/normalizeEntitySearchQuery';

const LIMIT = 20;

const LevelSelectionPopup = ({
  isOpen,
  onClose,
  onLevelSelect,
  onSelect,
  levelFiles,
  curationTypes: _curationTypes,
  variant = 'curation',
  curatedTypesFilter = variant === 'pick' ? 'show' : 'hide',
}) => {
  const { t } = useTranslation(['components', 'common']);
  const { difficultyDict } = useDifficultyContext();

  const isPickVariant = variant === 'pick';
  const titleKey = isPickVariant ? 'levelSelectionPopup.pick.title' : 'levelSelectionPopup.titleAdd';
  const descriptionKey = isPickVariant
    ? 'levelSelectionPopup.pick.description'
    : 'levelSelectionPopup.descriptionAdd';
  const selectLabelKey = isPickVariant ? 'levelSelectionPopup.pick.select' : 'levelSelectionPopup.create';
  const selectTitleKey = isPickVariant
    ? 'levelSelectionPopup.pick.selectTitle'
    : 'levelSelectionPopup.createLevel';

  const zipPickerMode =
    Boolean(isOpen) &&
    Array.isArray(levelFiles) &&
    levelFiles.length > 0 &&
    typeof onSelect === 'function';

  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [selectedZipKey, setSelectedZipKey] = useState(null);
  const [isConfirmingZip, setIsConfirmingZip] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) {
      return;
    }
    e.stopPropagation();
    onClose();
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  async function fetchLevels() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        offset: (currentPage - 1) * LIMIT,
        limit: LIMIT,
        query: searchTerm,
        curatedTypesFilter,
      });

      const response = await api.get(`${routes.database.levels.root()}?${params}`);
      setLevels(response.data.results || []);
      setTotalPages(Math.ceil(response.data.total / LIMIT) || 1);
    } catch (error) {
      console.error('Failed to fetch levels:', error);
      toast.error('Failed to fetch levels');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    if (!zipPickerMode) {
      void fetchLevels();
    }
    return undefined;
  }, [isOpen, zipPickerMode]);

  useEffect(() => {
    if (!isOpen || zipPickerMode) {
      return;
    }
    void fetchLevels();
  }, [isOpen, currentPage, searchTerm, zipPickerMode]);

  useEffect(() => {
    if (isOpen && zipPickerMode) {
      setSelectedZipKey(null);
      setIsConfirmingZip(false);
    }
  }, [isOpen, zipPickerMode, levelFiles]);

  const handleConfirmZipSelection = async () => {
    if (!selectedZipKey || isConfirmingZip) {
      return;
    }
    setIsConfirmingZip(true);
    try {
      await Promise.resolve(onSelect(selectedZipKey));
    } finally {
      setIsConfirmingZip(false);
    }
  };

  const handleLevelSelect = (level) => {
    onLevelSelect({
      levelId: level.id,
      level: level,
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(normalizeLevelSearchQuery(e.target.value));
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

    if (input === '') {
      return;
    }

    const cleanInput = input.replace(/^0+/, '') || '0';
    const page = parseInt(cleanInput, 10);

    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    }
  };

  const handlePageInputBlur = () => {
    if (inputValue === '' || inputValue === '0') {
      setInputValue('1');
      handlePageChange(1);
      return;
    }

    const cleanInput = inputValue.replace(/^0+/, '') || '0';
    const page = parseInt(cleanInput, 10);

    if (isNaN(page) || page < 1 || page > totalPages) {
      setInputValue('1');
      handlePageChange(1);
    }
  };

  if (!isOpen) {
    return null;
  }

  if (zipPickerMode) {
    return (
      <div className="level-selection-modal" onClick={handleBackdropClick}>
        <div
          className="level-selection-modal__content submission-zip-level-modal"
          ref={modalRef}
          onClick={handleContentClick}
        >
          <CloseButton
            variant="floating"
            className="level-selection-modal__close-button"
            onClick={onClose}
            type="button"
            disabled={isConfirmingZip}
            aria-label={t('buttons.close', { ns: 'common' })}
          />

          <div className="level-selection-modal__header">
            <h2>{t('levelSelectionPopup.zipPicker.title')}</h2>
            <p>{t('levelSelectionPopup.zipPicker.description')}</p>
          </div>

          <ZipLevelFilesList
            levelFiles={levelFiles}
            selectedKey={selectedZipKey}
            onSelectKey={setSelectedZipKey}
            selectionDisabled={isConfirmingZip}
          />

          <div className="submission-zip-level-modal__actions">
            <button
              type="button"
              className={`submission-zip-level-modal__confirm${isConfirmingZip ? ' submission-zip-level-modal__confirm--loading' : ''}`}
              disabled={!selectedZipKey || isConfirmingZip}
              aria-busy={isConfirmingZip}
              onClick={() => void handleConfirmZipSelection()}
            >
              {isConfirmingZip
                ? t('levelSelectionPopup.zipPicker.confirmLoading')
                : t('levelSelectionPopup.zipPicker.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="level-selection-modal" onClick={handleBackdropClick}>
      <div
        className="level-selection-modal__content"
        ref={modalRef}
        onClick={handleContentClick}
      >
        <CloseButton
          variant="floating"
          className="level-selection-modal__close-button"
          onClick={onClose}
          type="button"
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="level-selection-modal__header">
          <h2>{t(titleKey)}</h2>
          <p>{t(descriptionKey)}</p>
        </div>

        <div className="level-selection-modal__filters">
          <div className="level-selection-modal__filter-group">
            <label htmlFor="search">{t('levelSelectionPopup.filters.search')}</label>
            <input
              id="search"
              type="text"
              autoComplete="off"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={t('levelSelectionPopup.filters.searchPlaceholder')}
              className="level-selection-modal__input"
            />
          </div>
        </div>

        <div className="level-selection-modal__levels">
          {isLoading ? (
            <div className="level-selection-modal__loading">
              <div className="loader" />
            </div>
          ) : levels.length === 0 ? (
            <div className="level-selection-modal__empty">{t('levelSelectionPopup.empty')}</div>
          ) : (
            levels.map((level) => (
              <div key={level.id} className="level-selection-modal__level-item">
                <div className="level-selection-modal__level-card-wrapper">
                  <div className="level-selection-modal__img-wrapper">
                    <img
                      src={difficultyDict[level.diffId]?.icon || '/default-difficulty-icon.png'}
                      alt={difficultyDict[level.diffId]?.name || 'Difficulty icon'}
                      className="level-selection-modal__difficulty-icon"
                    />
                  </div>

                  <div className="level-selection-modal__song-wrapper">
                    <div className="level-selection-modal__group">
                      <p className="level-selection-modal__level-exp">
                        #{level.id} - {level.artist}
                      </p>
                    </div>
                    <p className="level-selection-modal__level-desc">{level.song || 'Unknown Song'}</p>
                  </div>

                  <div className="level-selection-modal__creator-wrapper">
                    <p className="level-selection-modal__level-exp">{t('levelSelectionPopup.creator')}</p>
                    <div className="level-selection-modal__level-desc">{formatCreatorDisplay(level)}</div>
                  </div>

                  <button
                    className="level-selection-modal__select-btn"
                    onClick={() => handleLevelSelect(level)}
                    title={t(selectTitleKey)}
                  >
                    {t(selectLabelKey)}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="level-selection-modal__pagination">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="level-selection-modal__pagination-btn"
              type="button"
            >
              {t('levelSelectionPopup.pagination.previous')}
            </button>
            <div className="level-selection-modal__page-controls">
              <span>{t('levelSelectionPopup.pagination.page')} </span>
              <input
                type="number"
                max={totalPages}
                value={inputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                className="level-selection-modal__page-input"
              />
              <span> {t('levelSelectionPopup.pagination.of', { total: totalPages })}</span>
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="level-selection-modal__pagination-btn"
              type="button"
            >
              {t('levelSelectionPopup.pagination.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelSelectionPopup;
