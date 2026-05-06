// tuf-search: #CurationSelectionPopup #curationSelectionPopup #popups #curations #curationSelection
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import './curationselectionpopup.css';
import { CloseButton } from '@/components/common/buttons';
import toast from 'react-hot-toast';
import { FacetQueryBuilder } from '@/components/common/selectors';
import { buildFacetQueryParam } from '@/utils/facetQueryCodec';

function makeEmptyCurationFacet() {
  return {
    mode: 'advanced',
    groups: [{ quantifier: 'all', ids: [] }],
    betweenPairs: [],
    betweenGroups: 'and',
    excludeIds: [],
  };
}

const CurationSelectionPopup = ({
  isOpen,
  onClose,
  onCurationSelect,
  onSelectMultiple,
  excludeIds = [],
  multiSelect = false,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const { curationTypes, difficultyDict } = useDifficultyContext();

  const [curations, setCurations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [curationFacetFilter, setCurationFacetFilter] = useState(makeEmptyCurationFacet);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  /** id -> curation (persists across pages while filters unchanged) */
  const [selectedCurationsMap, setSelectedCurationsMap] = useState(() => new Map());
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
      });

      const facetQuery = buildFacetQueryParam({
        curationTypes: curationFacetFilter,
        combine: 'and',
      });
      if (facetQuery) params.append('facetQuery', facetQuery);

      if (excludeIds && excludeIds.length > 0) {
        excludeIds.forEach((id) => params.append('excludeIds', id));
      }

      const response = await api.get(`${import.meta.env.VITE_CURATIONS}?${params}`);

      setCurations(response.data.curations);
      setTotalPages(Math.ceil(response.data.total / LIMIT) || 0);
    } catch (error) {
      console.error('Failed to fetch curations:', error);
      toast.error(t('curationSelectionPopup.errors.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, curationFacetFilter, excludeIds, t]);

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

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setCurationFacetFilter(makeEmptyCurationFacet());
      setCurrentPage(1);
      setSelectedCurationsMap(new Map());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCurationsMap(new Map());
  }, [isOpen, curationFacetFilter, searchTerm]);

  const toggleCurationSelected = (curation) => {
    setSelectedCurationsMap((prev) => {
      const next = new Map(prev);
      if (next.has(curation.id)) next.delete(curation.id);
      else next.set(curation.id, curation);
      return next;
    });
  };

  const handleRowActivate = (curation) => {
    if (multiSelect) {
      toggleCurationSelected(curation);
      return;
    }
    onCurationSelect(curation);
  };

  const handleConfirmMultiple = () => {
    if (!onSelectMultiple) return;
    const chosen = [...selectedCurationsMap.values()];
    if (chosen.length === 0) {
      toast.error(t('curationSelectionPopup.errors.noneSelected'));
      return;
    }
    onSelectMultiple(chosen);
    onClose();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="curation-selection-modal">
      <div className="curation-selection-modal__content" ref={modalRef}>
        <CloseButton
          variant="floating"
          type="button"
          className="curation-selection-modal__close-button"
          onClick={onClose}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="curation-selection-modal__header">
          <h2>{t('curationSelectionPopup.title')}</h2>
          <p>{multiSelect ? t('curationSelectionPopup.descriptionMulti') : t('curationSelectionPopup.description')}</p>
        </div>

        <div className="curation-selection-modal__type-filters">
          <p className="curation-selection-modal__type-filter-hint">
            {t('curationSelectionPopup.filters.mustIncludeHint')}
          </p>
          <FacetQueryBuilder
            items={curationTypes}
            value={curationFacetFilter}
            onChange={(v) => {
              setCurationFacetFilter(v || makeEmptyCurationFacet());
              setCurrentPage(1);
            }}
            title={t('curationSelectionPopup.filters.facetBuilderTitle')}
          />
        </div>

        <div className="curation-selection-modal__filters">
          <div className="curation-selection-modal__filter-group curation-selection-modal__filter-group--full">
            <label>{t('curationSelectionPopup.filters.search')}</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('curationSelectionPopup.filters.searchPlaceholder')}
              className="curation-selection-modal__search-input"
            />
          </div>
        </div>

        {multiSelect && (
          <div className="curation-selection-modal__multi-hint">
            {t('curationSelectionPopup.multiSelectHint')}
          </div>
        )}

        <div className="curation-selection-modal__list">
          {isLoading ? (
            <div className="curation-selection-modal__loading">{t('curationSelectionPopup.loading')}</div>
          ) : curations.length === 0 ? (
            <div className="curation-selection-modal__empty">{t('curationSelectionPopup.empty')}</div>
          ) : (
            curations.map((curation) => {
              const isChecked = selectedCurationsMap.has(curation.id);
              return (
                <div
                  key={curation.id}
                  role="button"
                  tabIndex={0}
                  className={`curation-selection-modal__item ${multiSelect && isChecked ? 'curation-selection-modal__item--selected' : ''}`}
                  onClick={() => handleRowActivate(curation)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowActivate(curation);
                    }
                  }}
                >
                  {multiSelect && (
                    <div className="curation-selection-modal__item-check" aria-hidden>
                      <input
                        type="checkbox"
                        readOnly
                        checked={isChecked}
                        tabIndex={-1}
                        className="curation-selection-modal__checkbox"
                      />
                    </div>
                  )}
                  <div className="curation-selection-modal__item-preview">
                    {curation.previewLink ? (
                      <img
                        src={curation.previewLink}
                        alt=""
                        className="curation-selection-modal__thumbnail"
                      />
                    ) : (
                      <div className="curation-selection-modal__no-thumbnail">🎵</div>
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
                        {t('curationSelectionPopup.creator')}: {curation.level?.creator || 'Unknown'}
                      </p>
                    </div>

                    <div className="curation-selection-modal__curation-info">
                      <div className="curation-selection-modal__type-badges">
                        {(curation.types || (curation.type ? [curation.type] : [])).map((typ) => (
                          <div
                            key={typ.id}
                            className="curation-selection-modal__type-badge"
                            style={{
                              backgroundColor: `${typ.color || '#606060'}80`,
                              color: '#ffffff',
                            }}
                          >
                            {typ.name}
                          </div>
                        ))}
                      </div>
                      {curation.level?.diffId != null && difficultyDict[curation.level.diffId] && (
                        <div className="curation-selection-modal__difficulty">
                          <img
                            src={difficultyDict[curation.level.diffId].icon}
                            alt={difficultyDict[curation.level.diffId].name}
                            className="curation-selection-modal__difficulty-icon"
                          />
                          <span>{difficultyDict[curation.level.diffId].name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!multiSelect && (
                    <span className="curation-selection-modal__select-btn">
                      {t('curationSelectionPopup.actions.select')}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {multiSelect && (
          <div className="curation-selection-modal__multi-actions">
            <button
              type="button"
              className="curation-selection-modal__confirm-multi-btn"
              onClick={handleConfirmMultiple}
              disabled={selectedCurationsMap.size === 0}
            >
              {t('curationSelectionPopup.actions.applySelected', { count: selectedCurationsMap.size })}
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="curation-selection-modal__pagination">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="curation-selection-modal__page-btn"
            >
              ← {t('curationSelectionPopup.pagination.previous')}
            </button>

            <span className="curation-selection-modal__page-info">
              {t('curationSelectionPopup.pagination.pageInfo', { current: currentPage, total: totalPages })}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="curation-selection-modal__page-btn"
            >
              {t('curationSelectionPopup.pagination.next')} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurationSelectionPopup;
