import React, { useState, useEffect, useRef } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";

import { MetaTags, AccessDenied } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import api from '@/utils/api';
import './curationpage.css';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { LevelSelectionPopup } from '@/components/popups/Levels';
import { TypeManagementPopup, CurationEditPopup } from '@/components/popups/Curations';
import { UserManagementPopup } from '@/components/popups/Users';
import { DiscordRolesPopup } from '@/components/popups/DiscordRoles';
import { toast } from 'react-hot-toast';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { canAssignCurationType } from '@/utils/curationTypeUtils';
import { formatCreatorDisplay } from '@/utils/Utility';
import { FacetQueryBuilder } from '@/components/common/selectors';
import { buildFacetQueryParam } from '@/utils/facetQueryCodec';

const CurationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { curationTypes, reloadCurationTypes } = useDifficultyContext();
  const { t } = useTranslation(['pages', 'common']);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [levelInstances, setLevelInstances] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [filters, setFilters] = useState({
    curationFacet: null,
    search: '',
  });
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showLevelSelectionPopup, setShowLevelSelectionPopup] = useState(false);
  const [showTypeManagementPopup, setShowTypeManagementPopup] = useState(false);
  const [showCurationEditPopup, setShowCurationEditPopup] = useState(false);
  const [showCuratorManagementPopup, setShowCuratorManagementPopup] = useState(false);
  const [showDiscordRolesPopup, setShowDiscordRolesPopup] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);

  // Cancel token refs for request cancellation
  const fetchCurationsCancelTokenRef = useRef(null);
  const levelSelectCancelTokenRef = useRef(null);
  const deleteCurationCancelTokenRef = useRef(null);
  const verifyPasswordCancelTokenRef = useRef(null);


  const curationScrollLockActive =
    showPasswordPrompt ||
    showLevelSelectionPopup ||
    showTypeManagementPopup ||
    showCurationEditPopup ||
    showCuratorManagementPopup ||
    showDiscordRolesPopup;

  useBodyScrollLock(curationScrollLockActive);

  const verifyPassword = async (password) => {
    try {
      // Cancel any existing password verification request
      if (verifyPasswordCancelTokenRef.current) {
        verifyPasswordCancelTokenRef.current.cancel('New password verification initiated');
      }

      // Create new cancel token
      verifyPasswordCancelTokenRef.current = api.CancelToken.source();

      await api.head(`${import.meta.env.VITE_VERIFY_PASSWORD}?origin=curation`, {
        headers: {
          'X-Super-Admin-Password': password
        },
        cancelToken: verifyPasswordCancelTokenRef.current.token
      });
      setVerifiedPassword(password);
      setShowPasswordPrompt(false);
      return true;
    } catch (error) {
      if (api.isCancel(error)) {
        // Request was cancelled, don't show error
        return false;
      }
      toast.error('Invalid password');
      return false;
    }
  };

  const handlePasswordPromptSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      const { type } = pendingAction;
      if (type === 'manage') {
        handleOpenTypeManagement();
      } else if (type === 'discordRoles') {
        setShowDiscordRolesPopup(true);
      }
      setPendingAction(null);
    }
    setSuperAdminPassword('');
  };

  const handleManageTypes = () => {
    setPendingAction({ type: 'manage' });
    setShowPasswordPrompt(true);
  };

  const handleManageCurators = () => {
    setShowCuratorManagementPopup(true);
  };

  const handleOpenTypeManagement = () => {
    // Refetch curation types to ensure we have the latest data
    reloadCurationTypes();
    setShowTypeManagementPopup(true);
  };

  const handleAddNewLevel = () => {
    setEditingLevel(null);
    setShowLevelSelectionPopup(true);
  };

  const handleEditLevel = (row) => {
    if (!canEditLevelRow(row)) return;
    const level = row.level ?? row.curations[0]?.level;
    setEditingLevel({ level, curations: row.curations });
    setShowCurationEditPopup(true);
  };

  const handleLevelSelect = async (selection) => {
    try {
      // Cancel any existing level select request
      if (levelSelectCancelTokenRef.current) {
        levelSelectCancelTokenRef.current.cancel('New level selection initiated');
      }

      // Create new cancel token
      levelSelectCancelTokenRef.current = api.CancelToken.source();

      const response = await api.post(`${import.meta.env.VITE_CURATIONS}`, {
        levelId: selection.levelId
      }, {
        cancelToken: levelSelectCancelTokenRef.current.token
      });
      
      toast.success(t('curation.notifications.levelAdded'));
      
      // Add the new curation to the list manually
      const newCuration = response.data.curation;
      const levelId = newCuration.levelId ?? newCuration.level?.id;
      setLevelInstances((prev) => {
        const idx = prev.findIndex((row) => (row.level?.id ?? row.curations[0]?.levelId) === levelId);
        if (idx >= 0) {
          const next = [...prev];
          const curations = [...next[idx].curations, newCuration];
          next[idx] = { ...next[idx], level: next[idx].level ?? newCuration.level, curations };
          return next;
        }
        return [{ level: newCuration.level, curations: [newCuration] }, ...prev];
      });
      
      // Close popup and reset state
      setShowLevelSelectionPopup(false);
      setEditingLevel(null);
    } catch (error) {
      if (api.isCancel(error)) {
        // Request was cancelled, don't show error
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to add level curation');
    }
  };

  const handleLevelCurationsBulkUpdate = ({ levelId: lid, curations }) => {
    setLevelInstances((prev) =>
      prev.map((row) => {
        const id = row.level?.id ?? row.curations[0]?.levelId;
        if (id !== lid) return row;
        const lev = curations[0]?.level ?? row.level;
        return { level: lev, curations };
      })
    );
  };

  const handleCurationPatched = (partial) => {
    setLevelInstances((prev) =>
      prev.map((row) => {
        const lid = row.level?.id ?? row.curations[0]?.levelId;
        if (partial.levelId != null && lid !== partial.levelId) return row;
        return {
          ...row,
          curations: row.curations.map((c) =>
            c.id === partial.id ? { ...c, previewLink: partial.previewLink } : c
          ),
        };
      })
    );
  };

  const handleDeleteCuration = async (curation) => {
    if (!window.confirm(t('curation.confirmations.deleteCuration'))) {
      return;
    }

    try {
      // Cancel any existing delete request
      if (deleteCurationCancelTokenRef.current) {
        deleteCurationCancelTokenRef.current.cancel('New delete request initiated');
      }

      // Create new cancel token
      deleteCurationCancelTokenRef.current = api.CancelToken.source();

      await api.delete(`${import.meta.env.VITE_CURATIONS}/${curation.id}`, {
        cancelToken: deleteCurationCancelTokenRef.current.token
      });
      setLevelInstances((prev) =>
        prev
          .map((row) => ({
            ...row,
            curations: row.curations.filter((cur) => cur.id !== curation.id),
          }))
          .filter((row) => row.curations.length > 0)
      );
      toast.success(t('curation.notifications.deleted'));
    } catch (error) {
      if (api.isCancel(error)) {
        // Request was cancelled, don't show error
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to delete curation');
    }
  };

  /** Same rules as CurationEditPopup `canManageThisCuration`: every type must be assignable (strict); OR was wrong here. */
  const canManageCuration = (curation) => {
    if (!curation || !user) return false;
    if (hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR])) {
      return true;
    }
    const types = curation.types || (curation.type ? [curation.type] : []);
    if (types.length === 0) return true;
    return types.every((t) => {
      if (t.abilities == null) return false;
      return canAssignCurationType(user.permissionFlags, t.abilities);
    });
  };

  const canEditLevelRow = (row) =>
    row.curations.length > 0 && row.curations.every((c) => canManageCuration(c));

  const fetchCurations = async () => {
    try {
      // Cancel any existing fetch request
      if (fetchCurationsCancelTokenRef.current) {
        fetchCurationsCancelTokenRef.current.cancel('New fetch request initiated');
      }

      // Create new cancel token
      fetchCurationsCancelTokenRef.current = api.CancelToken.source();

      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        groupByLevel: 'true',
        ...(filters.search && { search: filters.search }),
      });
      const facetQuery = buildFacetQueryParam({
        curationTypes: filters.curationFacet,
        combine: 'and',
      });
      if (facetQuery) params.append('facetQuery', facetQuery);

      const response = await api.get(`${import.meta.env.VITE_CURATIONS}?${params}`, {
        cancelToken: fetchCurationsCancelTokenRef.current.token
      });
      setLevelInstances(response.data.levelInstances ?? []);
      const tp = response.data.totalPages;
      setTotalPages(typeof tp === 'number' ? tp : 0);
    } catch (error) {
      if (api.isCancel(error)) {
        // Request was cancelled, don't update state or show error
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to fetch curations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurations();
  }, [currentPage, filters]);

  // Cleanup effect to cancel all pending requests when component unmounts
  useEffect(() => {
    return () => {
      // Cancel all pending requests when component unmounts
      if (fetchCurationsCancelTokenRef.current) {
        fetchCurationsCancelTokenRef.current.cancel('Component unmounted');
      }
      if (levelSelectCancelTokenRef.current) {
        levelSelectCancelTokenRef.current.cancel('Component unmounted');
      }
      if (deleteCurationCancelTokenRef.current) {
        deleteCurationCancelTokenRef.current.cancel('Component unmounted');
      }
      if (verifyPasswordCancelTokenRef.current) {
        verifyPasswordCancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  // Handle state updates from preview page
  useEffect(() => {
    if (location.state?.updatedCuration) {
      const { updatedCuration, action } = location.state;
      
      // Update the curations list with the new data
      setLevelInstances((prev) => {
        let found = false;
        const next = prev.map((row) => {
          const has = row.curations.some((c) => c.id === updatedCuration.id);
          if (!has) return row;
          found = true;
          return {
            ...row,
            curations: row.curations.map((c) =>
              c.id === updatedCuration.id ? updatedCuration : c
            ),
          };
        });
        if (found) return next;
        const levelId = updatedCuration.levelId ?? updatedCuration.level?.id;
        const idx = next.findIndex((row) => (row.level?.id ?? row.curations[0]?.levelId) === levelId);
        if (idx >= 0) {
          const copy = [...next];
          copy[idx] = {
            ...copy[idx],
            curations: [...copy[idx].curations, updatedCuration],
          };
          return copy;
        }
        return [{ level: updatedCuration.level, curations: [updatedCuration] }, ...next];
      });

      // Show appropriate message
      if (action === 'discarded') {
        toast.success(t('curation.notifications.discarded'));
      } else if (action === 'backToEdit') {
        if (canManageCuration(updatedCuration)) {
          setEditingLevel({
            level: updatedCuration.level,
            curations: null,
            levelId: updatedCuration.levelId ?? updatedCuration.level?.id,
          });
          setShowCurationEditPopup(true);
        }
      }

      // Clear the state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, user]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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

  const handleClosePopup = () => {
    setShowLevelSelectionPopup(false);
    setEditingLevel(null);
  };

  const handleCloseCurationEditPopup = () => {
    setShowCurationEditPopup(false);
    setEditingLevel(null);
  };

  return (
    <div className="curation-page">
      <MetaTags 
        title={t('curation.meta.title')}
        description={t('curation.meta.description')}
        url={currentUrl}
      />
      
      
      
      <div className="curation-container page-content">
        <div className="curation-header">
          <h1>{t('curation.title')}</h1>
          <p>{t('curation.description')}</p>
        </div>

        {/* Filters */}
        <div className="curation-filters">
          <div className="curation-filter-group curation-filter-group--types">
            <label>{t('curation.filters.types')}</label>
            <p className="curation-type-filter-hint">{t('curation.filters.typesHint')}</p>
            <FacetQueryBuilder
              items={curationTypes}
              value={filters.curationFacet}
              onChange={(v) =>
                setFilters((prev) => ({ ...prev, curationFacet: v }))
              }
              title={t('curation.filters.selectedTypes')}
            />
          </div>

          <div className="curation-filter-group">
            <label>{t('curation.filters.search')}</label>
            <input
              name='curation-search'
              className="input-search"
              autoComplete='off'
              aria-autocomplete='none'
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={t('curation.filters.searchPlaceholder')}
            />
          </div>
          { hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR, permissionFlags.RATER, permissionFlags.CURATOR]) && (
          <button
            className="curation-add-level-btn"
            onClick={handleAddNewLevel}
            title={t('curation.actions.addLevel')}
          >
            🎵
            {t('curation.actions.addLevel')}
          </button>
          )}

          { hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR]) && (
          <div className="curation-buttons">
          { hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                      <button
                      className="curation-manage-types-btn"
                      onClick={handleManageTypes}
                      title={t('curation.actions.manageTypes')}
                    >
                      ⚙️
                      {t('curation.actions.manageTypes')}
                    </button>
          )}

          <button
            className="curation-manage-curators-btn"
            onClick={handleManageCurators}
            title={t('curation.actions.manageCurators')}
          >
            👥
            {t('curation.actions.manageCurators')}
          </button>
          <NavLink
            className="curation-schedule-btn"
            to="/admin/curations/schedules"
            title={t('curation.actions.manageSchedule')}
          >
            📅
            {t('curation.actions.manageSchedule')}
          </NavLink>
          { hasFlag(user, permissionFlags.SUPER_ADMIN) && (
            <button
              className="curation-discord-roles-btn"
              onClick={() => {
                if (!verifiedPassword) {
                  setPendingAction({ type: 'discordRoles' });
                  setShowPasswordPrompt(true);
                } else {
                  setShowDiscordRolesPopup(true);
                }
              }}
              title={t('components:discordRoles.title', { defaultValue: 'Discord Role Sync' })}
            >
              💬
              {t('components:discordRoles.title', { defaultValue: 'Discord Roles' })}
            </button>
          )}
        </div>
        )}
        </div>
        {/* Curations List */}
        <div className="curation-list">
          {isLoading ? (
            <div className="curation-loading">{t('curation.loading')}</div>
          ) : levelInstances.length === 0 ? (
            <div className="curation-empty">{t('curation.empty')}</div>
          ) : (
            levelInstances.map((row) => {
              const level = row.level ?? row.curations[0]?.level;
              const rowKey = level?.id ?? `row-${row.curations[0]?.id}`;
              return (
                <div key={rowKey} className="curation-item curation-item--level">
                  <div className="curation-item-wrapper curation-item-wrapper--level">
                    <div className="curation-song-wrapper">
                      <div className="curation-song-header">
                        <img
                          src={level?.difficulty?.icon || '/default-difficulty-icon.png'}
                          alt={level?.difficulty?.name || 'Difficulty'}
                          className="curation-difficulty-icon"
                        />
                        <h3>{level?.song || 'Unknown Level'}</h3>
                        <p className="curation-level-id">#{level?.id}</p>
                      </div>
                      <div className="curation-artist-creator">
                        <p className="curation-artist">{level?.artist || 'Unknown Artist'}</p>
                        <p className="curation-creator">{formatCreatorDisplay(level)}</p>
                      </div>
                    </div>
                    {canEditLevelRow(row) && (
                          <button
                            type="button"
                            className="curation-level-edit-btn"
                            onClick={() => handleEditLevel(row)}
                            title={t('curation.actions.editLevel')}
                          >
                            <EditIcon />
                          </button>
                        )}
                    <div className="curation-level-curations">
                      {row.curations.map((curation) => {
                        const types = curation.types || (curation.type ? [curation.type] : []);
                        return (
                          <div
                            key={curation.id}
                            className={`curation-type-slot ${canManageCuration(curation) ? '' : 'protected'}`}
                          >
                            <div className="curation-type-info curation-type-info--inline curation-type-info--multi">
                              {types.length === 0 ? (
                                <span className="curation-type-name curation-type-name--empty">—</span>
                              ) : (
                                types.map((typ) => (
                                  <span key={typ.id} className="curation-type-badge">
                                    <img
                                      src={typ.icon || '/default-curation-icon.png'}
                                      alt=""
                                      className="curation-type-slot-icon"
                                    />
                                    <span
                                      className="curation-type-name"
                                      style={{ color: typ.color }}
                                    >
                                      {typ.name}
                                    </span>
                                  </span>
                                ))
                              )}
                            </div>
                            {canManageCuration(curation) && (
                              <div className="curation-item-actions">
                                <button
                                  type="button"
                                  className="curation-action-btn curation-action-btn--delete"
                                  onClick={() => handleDeleteCuration(curation)}
                                  title={t('curation.actions.deleteCuration')}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="curation-pagination">
            <button 
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="curation-pagination-btn"
            >
              {t('pagination.previous', { ns: 'common' })}
            </button>
            <div className="curation-page-controls">
              <span>{t('curation.pagination.pageLabel')}</span>
              <input
                type="number"
                max={totalPages}
                value={inputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                className="curation-page-input"
                aria-label={t('pagination.page', { ns: 'common', page: currentPage, total: totalPages })}
              />
              <span>{t('curation.pagination.pageOf', { total: totalPages })}</span>
            </div>
            <button 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="curation-pagination-btn"
            >
              {t('pagination.next', { ns: 'common' })}
            </button>
          </div>
        )}
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>{t('curation.password.title')}</h3>
            <p>{t('curation.password.description')}</p>
            <input
              type="password"
              autoComplete='section-password-super-admin'
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              placeholder={t('curation.password.placeholder')}
            />
            <div className="password-modal-actions">
              <button 
                className="confirm-btn tuf-btn-fill-primary"
                onClick={handlePasswordPromptSubmit}
                disabled={!superAdminPassword}
              >
                {t('curation.password.submit')}
              </button>
              <button 
                className="cancel-btn tuf-btn-fill-neutral-dark"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setSuperAdminPassword('');
                  setPendingAction(null);
                }}
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
            </div>
          </div>
        </div>
      )}



                     {/* Level Selection Popup */}
        <LevelSelectionPopup
          isOpen={showLevelSelectionPopup}
          onClose={handleClosePopup}
          onLevelSelect={handleLevelSelect}
          curationTypes={curationTypes}
        />

        {/* Type Management Popup */}
        <TypeManagementPopup
          isOpen={showTypeManagementPopup}
          onClose={() => setShowTypeManagementPopup(false)}
          curationTypes={curationTypes}
          verifiedPassword={verifiedPassword}
        />

        {/* Curation Edit Popup */}
        <CurationEditPopup
          isOpen={showCurationEditPopup}
          onClose={handleCloseCurationEditPopup}
          levelId={
            editingLevel &&
            (editingLevel.levelId ??
              editingLevel.level?.id ??
              editingLevel.curations?.[0]?.levelId)
          }
          level={editingLevel?.level}
          curationTypes={curationTypes}
          onUpdate={handleLevelCurationsBulkUpdate}
          onCurationPatched={handleCurationPatched}
        />

        {/* Curator Management Popup */}
        {showCuratorManagementPopup && (
          <UserManagementPopup 
            onClose={() => setShowCuratorManagementPopup(false)}
            currentUser={user}
            managementType="curator"
          />
        )}

        {/* Discord Roles Popup */}
        <DiscordRolesPopup
          isOpen={showDiscordRolesPopup}
          onClose={() => setShowDiscordRolesPopup(false)}
          roleType="CURATION"
          curationTypes={curationTypes}
          verifiedPassword={verifiedPassword}
        />

      {/* Notifications */}
      <div className="curation-notifications">
        {/* The notifications state and display were removed, so this block is now empty */}
      </div>

      <ScrollButton />
    </div>
  );
};

export default CurationPage;
