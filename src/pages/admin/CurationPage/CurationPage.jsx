import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { CompleteNav } from '@/components/layout';
import { MetaTags, AccessDenied } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import api from '@/utils/api';
import './curationpage.css';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { LevelSelectionPopup, TypeManagementPopup, CurationEditPopup } from '@/components/popups';
import { toast } from 'react-hot-toast';
import { NavLink, useNavigate } from 'react-router-dom';

const CurationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const tCur = (key, params = {}) => t(`curation.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [curations, setCurations] = useState([]);
  const [curationTypes, setCurationTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [editingCuration, setEditingCuration] = useState(null);


  // Add effect to handle body scrolling
  useEffect(() => {
    const isAnyOpen = showPasswordPrompt || showLevelSelectionPopup || showTypeManagementPopup || showCurationEditPopup;
    if (isAnyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPasswordPrompt, showLevelSelectionPopup, showTypeManagementPopup, showCurationEditPopup]);

  const verifyPassword = async (password) => {
    try {
      await api.head(`${import.meta.env.VITE_VERIFY_PASSWORD}`, {
        headers: {
          'X-Super-Admin-Password': password
        }
      });
      setVerifiedPassword(password);
      setShowPasswordPrompt(false);
      return true;
    } catch (error) {
      toast.error('Invalid password');
      return false;
    }
  };

  const handlePasswordPromptSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      const { type } = pendingAction;
      if (type === 'manage') {
        setShowTypeManagementPopup(true);
      }
      setPendingAction(null);
    }
    setSuperAdminPassword('');
  };

  const handleManageTypes = () => {
    setPendingAction({ type: 'manage' });
    setShowPasswordPrompt(true);
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
      // Create a default curation with the first available type
      const defaultType = curationTypes[0];
      if (!defaultType) {
        toast.error('No curation types available');
        return;
      }

      const response = await api.post(`${import.meta.env.VITE_CURATIONS}`, {
        levelId: selection.levelId,
        typeId: defaultType.id,
        assignedBy: user?.id
      });
      
      toast.success(tCur('notifications.levelAdded'));
      
      // Add the new curation to the list manually
      const newCuration = response.data.curation;
      setCurations(prev => [newCuration, ...prev]);
      
      // Close popup and reset state
      setShowLevelSelectionPopup(false);
      setEditingCuration(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add level curation');
    }
  };

  const handleCurationUpdate = (updatedCuration) => {
    setCurations(prev => prev.map(cur => 
      cur.id === updatedCuration.id ? updatedCuration : cur
    ));
  };

  const handleTypeManagementUpdate = () => {
    fetchCurationTypes();
  };

  const handleDeleteCuration = async (curation) => {
    if (!window.confirm(tCur('confirmations.deleteCuration'))) {
      return;
    }

    try {
      await api.delete(`${import.meta.env.VITE_CURATIONS}/${curation.id}`);
      setCurations(prev => prev.filter(cur => cur.id !== curation.id));
      toast.success(tCur('notifications.deleted'));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete curation');
    }
  };

  const fetchCurations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters
      });
      
      const response = await api.get(`${import.meta.env.VITE_CURATIONS}?${params}`);
      setCurations(response.data.curations);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch curations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurationTypes = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_CURATIONS}/types`);
      setCurationTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch curation types:', error);
    }
  };

  useEffect(() => {
    fetchCurations();
    fetchCurationTypes();
  }, [currentPage, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleClosePopup = () => {
    setShowLevelSelectionPopup(false);
    setEditingCuration(null);
  };

  const handleCloseCurationEditPopup = () => {
    setShowCurationEditPopup(false);
    setEditingCuration(null);
  };


  return (
    <div className="curation-page">
      <MetaTags 
        title={tCur('meta.title')}
        description={tCur('meta.description')}
        url={currentUrl}
      />
      
      <div className="background-level" />
      <CompleteNav />
      
      <div className="curation-container">
        <div className="curation-header">
          <h1>{tCur('title')}</h1>
          <p>{tCur('description')}</p>
        </div>

        {/* Filters */}
        <div className="curation-filters">
          <div className="curation-filter-group">
            <label>{tCur('filters.type')}</label>
            <select 
              value={filters.typeId} 
              onChange={(e) => handleFilterChange('typeId', e.target.value)}
            >
              <option value="">{tCur('filters.allTypes')}</option>
              {curationTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <div className="curation-filter-group">
            <label>{tCur('filters.search')}</label>
            <input
              name='curation-search'
              autoComplete='off'
              aria-autocomplete='none'
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={tCur('filters.searchPlaceholder')}
            />
          </div>
          <button
            className="curation-add-level-btn"
            onClick={handleAddNewLevel}
            title={tCur('actions.addLevel')}
          >
            🎵
            {tCur('actions.addLevel')}
          </button>
          <button
            className="curation-manage-types-btn"
            onClick={handleManageTypes}
            title={tCur('actions.manageTypes')}
          >
            ⚙️
            {tCur('actions.manageTypes')}
          </button>
          <NavLink
            className="curation-schedule-btn"
            to="/admin/curation/schedules"
            title={tCur('actions.manageSchedule')}
          >
            📅
            {tCur('actions.manageSchedule')}
          </NavLink>
        </div>

        {/* Curations List */}
        <div className="curation-list">
          {isLoading ? (
            <div className="curation-loading">{tCur('loading')}</div>
          ) : curations.length === 0 ? (
            <div className="curation-empty">{tCur('empty')}</div>
          ) : (
            curations.map(curation => (
              <div key={curation.id} className="curation-item">
                <div className="curation-item-wrapper">
                  <div className="curation-icon-wrapper">
                    <img 
                      src={curation.type?.icon || '/default-curation-icon.png'} 
                      alt={curation.type?.name || 'Curation type'} 
                      className="curation-icon" 
                    />
                  </div>

                  <div className="curation-song-wrapper">
                    <div className="curation-song-header">
                      <img 
                        src={curation.level?.difficulty?.icon || '/default-difficulty-icon.png'} 
                        alt={curation.level?.difficulty?.name || 'Difficulty'} 
                        className="curation-difficulty-icon" 
                      />
                      <h3>{curation.level?.song || 'Unknown Level'}</h3>
                    </div>
                    <p className="curation-artist">{curation.level?.artist || 'Unknown Artist'}</p>
                    <p className="curation-creator">{curation.level?.creator || 'Unknown Creator'}</p>
                  </div>

                  <div className="curation-type-info">
                    <span className="curation-type-name" style={{ color: curation.type?.color }}>
                      {curation.type?.name}
                    </span>
                  </div>

                  <div className="curation-item-actions">
                    <button 
                      className="curation-action-btn curation-action-btn--edit"
                      onClick={() => handleEditCuration(curation)}
                      title={tCur('actions.editCuration')}
                    >
                      <EditIcon />
                    </button>
                    <button 
                      className="curation-action-btn curation-action-btn--delete"
                      onClick={() => handleDeleteCuration(curation)}
                      title={tCur('actions.deleteCuration')}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="curation-pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`curation-page-btn ${page === currentPage ? 'curation-page-btn--active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>{tCur('password.title')}</h3>
            <p>{tCur('password.description')}</p>
            <input
              type="password"
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              placeholder={tCur('password.placeholder')}
            />
            <div className="password-modal-actions">
              <button 
                className="confirm-btn"
                onClick={handlePasswordPromptSubmit}
                disabled={!superAdminPassword}
              >
                {tCur('password.submit')}
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setSuperAdminPassword('');
                  setPendingAction(null);
                }}
              >
                {tCur('password.cancel')}
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

      {/* Notifications */}
      <div className="curation-notifications">
        {/* The notifications state and display were removed, so this block is now empty */}
      </div>

      <ScrollButton />
    </div>
  );
};

export default CurationPage;
