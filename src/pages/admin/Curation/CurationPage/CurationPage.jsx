import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { CustomSelect } from '@/components/common/selectors';

const CurationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { curationTypes, reloadCurationTypes } = useDifficultyContext();
  const { t } = useTranslation(['pages', 'common']);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [curations, setCurations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [filters, setFilters] = useState({
    typeId: '',
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
  const [editingCuration, setEditingCuration] = useState(null);

  // Cancel token refs for request cancellation
  const fetchCurationsCancelTokenRef = useRef(null);
  const levelSelectCancelTokenRef = useRef(null);
  const deleteCurationCancelTokenRef = useRef(null);
  const verifyPasswordCancelTokenRef = useRef(null);


  // Add effect to handle body scrolling
  useEffect(() => {
    const isAnyOpen = showPasswordPrompt || showLevelSelectionPopup || showTypeManagementPopup || showCurationEditPopup || showCuratorManagementPopup || showDiscordRolesPopup;
    if (isAnyOpen) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }

    return () => {
      document.body.style.overflowY = '';
    };
  }, [showPasswordPrompt, showLevelSelectionPopup, showTypeManagementPopup, showCurationEditPopup, showCuratorManagementPopup, showDiscordRolesPopup]);

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
    setEditingCuration(null);
    setShowLevelSelectionPopup(true);
  };

  const handleEditCuration = (curation) => {
    setEditingCuration(curation);
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
      setCurations(prev => [newCuration, ...prev]);
      
      // Close popup and reset state
      setShowLevelSelectionPopup(false);
      setEditingCuration(null);
    } catch (error) {
      if (api.isCancel(error)) {
        // Request was cancelled, don't show error
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to add level curation');
    }
  };

  const handleCurationUpdate = (updatedCuration) => {
    setCurations(prev => prev.map(cur => 
      cur.id === updatedCuration.id ? updatedCuration : cur
    ));
  };

  const handleTypeManagementUpdate = () => {
    // Reload curation types from the context to get the latest data after modifications
    reloadCurationTypes();
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
      setCurations(prev => prev.filter(cur => cur.id !== curation.id));
      toast.success(t('curation.notifications.deleted'));
    } catch (error) {
      if (api.isCancel(error)) {
        // Request was cancelled, don't show error
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to delete curation');
    }
  };



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
        ...(filters.typeId && { typeId: filters.typeId }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await api.get(`${import.meta.env.VITE_CURATIONS}?${params}`, {
        cancelToken: fetchCurationsCancelTokenRef.current.token
      });
      setCurations(response.data.curations);
      setTotalPages(response.data.totalPages);
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
      setCurations(prev => {
        const existingIndex = prev.findIndex(cur => cur.id === updatedCuration.id);
        if (existingIndex >= 0) {
          // Update existing curation
          const updated = [...prev];
          updated[existingIndex] = updatedCuration;
          return updated;
        } else {
          // Add new curation (shouldn't happen from preview, but just in case)
          return [updatedCuration, ...prev];
        }
      });

      // Show appropriate message
      if (action === 'saved') {
        toast.success(t('curation.notifications.updated'));
      } else if (action === 'discarded') {
        toast.success(t('curation.notifications.discarded'));
      } else if (action === 'backToEdit') {
        // Open the CurationEditPopup with the updated curation
        setEditingCuration(updatedCuration);
        setShowCurationEditPopup(true);
      }

      // Clear the state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
    setEditingCuration(null);
  };

  const handleCloseCurationEditPopup = () => {
    setShowCurationEditPopup(false);
    setEditingCuration(null);
  };

  const isAccessibleCuration = (curation) => {
    if (!curation || !user) return false;
    
    // Super admins and head curators can access all curations
    if (hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR])) {
      return true;
    }
    
    // Check if user can assign this curation type
    if (curation.type && curation.type.abilities) {
      return canAssignCurationType(user.permissionFlags, curation.type.abilities);
    }
    
    return false;
  };

  // Prepare options for CustomSelect
  const curationTypeOptions = useMemo(() => [
    { value: '', label: t('curation.filters.allTypes') },
    ...curationTypes.map(type => ({
      value: type.id.toString(),
      label: type.name
    }))
  ], [curationTypes]);

  return (
    <div className="curation-page">
      <MetaTags 
        title={t('curation.meta.title')}
        description={t('curation.meta.description')}
        url={currentUrl}
      />
      
      
      
      <div className="curation-container">
        <div className="curation-header">
          <h1>{t('curation.title')}</h1>
          <p>{t('curation.description')}</p>
        </div>

        {/* Filters */}
        <div className="curation-filters">
          <div className="curation-filter-group">
            <CustomSelect
              label={t('curation.filters.type')}
              options={curationTypeOptions}
              value={curationTypeOptions.find(opt => opt.value === (filters.typeId ? filters.typeId.toString() : ''))}
              onChange={(selected) => handleFilterChange('typeId', selected.value)}
              width="100%"
            />
          </div>
          
          <div className="curation-filter-group">
            <label>{t('curation.filters.search')}</label>
            <input
              name='curation-search'
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
          ) : curations.length === 0 ? (
            <div className="curation-empty">{t('curation.empty')}</div>
          ) : (
            curations.map(curation => (
              <div key={curation.id} className={`curation-item ${isAccessibleCuration(curation) ? '' : 'protected'}`}>
                <div className="curation-item-wrapper">
                  <div className="curation-song-wrapper">
                    
                    <div className="curation-song-header">
                    <div className="curation-icon-wrapper">
                    <img 
                      src={curation.type?.icon || '/default-curation-icon.png'} 
                      alt={curation.type?.name || 'Curation type'} 
                      className="curation-icon" 
                    />
                  </div>
                      <img 
                        src={curation.level?.difficulty?.icon || '/default-difficulty-icon.png'} 
                        alt={curation.level?.difficulty?.name || 'Difficulty'} 
                        className="curation-difficulty-icon" 
                      />
                      <h3>{curation.level?.song || 'Unknown Level'}</h3>
                      <p className="curation-level-id">#{curation.level?.id}</p>
                    </div>
                    <div className="curation-artist-creator">
                    <p className="curation-artist">{curation.level?.artist || 'Unknown Artist'}</p>
                    <p className="curation-creator">{formatCreatorDisplay(curation.level)}</p>
                  </div>
                  </div>

                  <div className="curation-type-info">
                    <span className="curation-type-name" style={{ color: curation.type?.color }}>
                      {curation.type?.name}
                    </span>
                  </div>

                  { 
                  isAccessibleCuration(curation)
                  && (
                  <div className="curation-item-actions">
                    <button 
                      className="curation-action-btn curation-action-btn--edit"
                      onClick={() => handleEditCuration(curation)}
                      title={t('curation.actions.editCuration')}
                    >
                      <EditIcon />
                    </button>
                    <button 
                      className="curation-action-btn curation-action-btn--delete"
                      onClick={() => handleDeleteCuration(curation)}
                      title={t('curation.actions.deleteCuration')}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  )}
                </div>
              </div>
            ))
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
              Previous
            </button>
            <div className="curation-page-controls">
              <span>Page </span>
              <input
                type="number"
                max={totalPages}
                value={inputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                className="curation-page-input"
              />
              <span> of {totalPages}</span>
            </div>
            <button 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="curation-pagination-btn"
            >
              Next
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
                className="confirm-btn"
                onClick={handlePasswordPromptSubmit}
                disabled={!superAdminPassword}
              >
                {t('curation.password.submit')}
              </button>
              <button 
                className="cancel-btn"
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
          onTypeUpdate={handleTypeManagementUpdate}
          verifiedPassword={verifiedPassword}
        />

        {/* Curation Edit Popup */}
        <CurationEditPopup
          isOpen={showCurationEditPopup}
          onClose={handleCloseCurationEditPopup}
          curation={editingCuration}
          curationTypes={curationTypes}
          onUpdate={handleCurationUpdate}
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
