import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { CompleteNav } from '@/components/layout';
import { MetaTags, AccessDenied } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import { DifficultyPopup } from '@/components/popups';
import api from '@/utils/api';
import './difficultypage.css';
import { EditIcon, RefreshIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';

const DifficultyPage = () => {
  const { user } = useAuth();
  const { difficulties, rawDifficulties, loading: contextLoading, reloadDifficulties } = useDifficultyContext();
  const { t } = useTranslation('pages');
  const tDiff = (key, params = {}) => t(`difficulty.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingDifficulty, setEditingDifficulty] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState({ type: '', data: null });
  const [notifications, setNotifications] = useState([]);
  const [newDifficulty, setNewDifficulty] = useState({
    id: '',
    name: '',
    type: 'PGU',
    icon: '',
    emoji: '',
    color: '#ffffff',
    baseScore: 0,
    sortOrder: 0,
    legacy: '',
    legacyIcon: '',
    legacyEmoji: ''
  });
  const [deletingDifficulty, setDeletingDifficulty] = useState(null);
  const [showDeleteInput, setShowDeleteInput] = useState(false);
  const [fallbackId, setFallbackId] = useState('');
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isAnyPopupOpen, setIsAnyPopupOpen] = useState(false);

  // Add effect to handle body scrolling
  useEffect(() => {
    const isAnyOpen = isCreating || editingDifficulty !== null || 
                          deletingDifficulty !== null || showPasswordPrompt;
    setIsAnyPopupOpen(isAnyOpen);
    if (isAnyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreating, editingDifficulty, deletingDifficulty, showPasswordPrompt]);

  const handlePasswordSubmit = async () => {
    try {
      const { type, data } = selectedAction;
      setError('');
      
      if (type === 'create') {
        await handleCreateDifficulty();
        addNotification(tDiff('notifications.created'));
      } else if (type === 'edit') {
        await handleUpdateDifficulty(data);
        addNotification(tDiff('notifications.updated'));
      } else if (type === 'delete') {
        await handleDeleteDifficulty(data.id, data.fallbackId);
        addNotification(tDiff('notifications.deleted'));
      }
      
      // Reset all states on success
      setShowPasswordModal(false);
      setSuperAdminPassword('');
      setSelectedAction({ type: '', data: null });
      setError('');
      setIsCreating(false);
      setEditingDifficulty(null);
      setDeletingDifficulty(null);
      setShowDeleteInput(false);
      setFallbackId('');
      
      // Reset form states
      setNewDifficulty({
        id: '',
        name: '',
        type: 'PGU',
        icon: '',
        emoji: '',
        color: '#ffffff',
        baseScore: 0,
        sortOrder: 0,
        legacy: '',
        legacyIcon: '',
        legacyEmoji: ''
      });

      // Reload difficulties in context
      await reloadDifficulties();
    } catch (err) {
      const errorMessage = err.response?.status === 403 
        ? tDiff('passwordModal.errors.invalid') 
        : tDiff('passwordModal.errors.generic');
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    }
  };

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleCancel = () => {
    setShowPasswordModal(false);
    setSuperAdminPassword('');
    setSelectedAction({ type: '', data: null });
    setError('');
  };

  const handleCloseCreateModal = () => {
    setIsCreating(false);
    setError('');
    setNewDifficulty({
      id: '',
      name: '',
      type: 'PGU',
      icon: '',
      emoji: '',
      color: '#ffffff',
      baseScore: 0,
      sortOrder: 0,
      legacy: '',
      legacyIcon: '',
      legacyEmoji: ''
    });
  };

  const handleCloseEditModal = () => {
    setEditingDifficulty(null);
    setError('');
  };

  const handleCloseDeleteModal = () => {
    setDeletingDifficulty(null);
    setShowDeleteInput(false);
    setFallbackId('');
    setError('');
  };

  const handleCreateDifficulty = async () => {
    try {
      const response = await api.post(`${import.meta.env.VITE_DIFFICULTIES}`, {
        ...newDifficulty,
        superAdminPassword
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateDifficulty = async (difficulty) => {
    try {
      const response = await api.put(`${import.meta.env.VITE_DIFFICULTIES}/${difficulty.id}`, {
        ...difficulty,
        superAdminPassword
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteDifficulty = async (difficultyId, fallbackId) => {
    try {
      await api.delete(`${import.meta.env.VITE_DIFFICULTIES}/${difficultyId}?fallbackId=${fallbackId}`, {
        data: { superAdminPassword }
      });
    } catch (err) {
      throw err;
    }
  };

  const verifyPassword = async (password) => {
    try {
      await api.head(`${import.meta.env.VITE_DIFFICULTIES}/verify-password`, {
        headers: {
          'X-Super-Admin-Password': password
        }
      });
      setVerifiedPassword(password);
      setShowPasswordPrompt(false);
      return true;
    } catch (error) {
      setError(tDiff('passwordModal.errors.invalid'));
      addNotification(tDiff('passwordModal.errors.invalid'), 'error');
      return false;
    }
  };

  const handlePasswordPromptSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      const { type, data } = pendingAction;
      switch (type) {
        case 'edit':
          const rawDifficulty = rawDifficulties.find(d => d.id === data.id);
          setEditingDifficulty(rawDifficulty);
          break;
        case 'create':
          setIsCreating(true);
          break;
        case 'delete':
          setDeletingDifficulty(data);
          break;
      }
      setPendingAction(null);
    }
    setSuperAdminPassword('');
  };

  const handleEditClick = (difficulty) => {
    setPendingAction({ type: 'edit', data: difficulty });
    setShowPasswordPrompt(true);
  };

  const handleCreateClick = () => {
    setPendingAction({ type: 'create' });
    setShowPasswordPrompt(true);
  };

  const handleDeleteClick = (difficulty) => {
    setPendingAction({ type: 'delete', data: difficulty });
    setShowPasswordPrompt(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isCreating) {
      setSelectedAction({ type: 'create', data: null });
    } else {
      setSelectedAction({ type: 'edit', data: editingDifficulty });
    }
    setShowPasswordModal(true);
  };

  if (user?.isSuperAdmin === undefined) {
    return (
      <div className="difficulty-page">
        <MetaTags
          title={tDiff('meta.title')}
          description={tDiff('meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        <CompleteNav />
        <div className="background-level"></div>
        <div className="difficulty-container">
          <div className="loader loader-level-detail"/>
        </div>
      </div>
    );
  }

  if (!user?.isSuperAdmin) {
    return (
      <AccessDenied 
        metaTitle={tDiff('meta.title')}
        metaDescription={tDiff('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  return (
    <>
      <MetaTags
        title={tDiff('meta.title')}
        description={tDiff('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="difficulty-page">
        {!isAnyPopupOpen && <ScrollButton />}
        <div className="difficulty-container">
          <div className="header-container">
            <h1>{tDiff('header.title')}</h1>
            <button
              className="refresh-button"
              onClick={reloadDifficulties}
              disabled={isLoading || contextLoading}
              aria-label={tDiff('header.refresh')}
            >
              <RefreshIcon color="#fff" size="36px" />
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="create-button"
            onClick={() => setIsCreating(true)}
            disabled={isLoading || contextLoading}
          >
            {tDiff('buttons.create')}
          </button>

          <div className="difficulties-list">
            {isLoading || contextLoading ? (
              <div className="loading-message">{tDiff('loading.difficulties')}</div>
            ) : difficulties.length === 0 ? (
              <div className="no-items-message">{tDiff('noItems.message')}</div>
            ) : (
              difficulties.map(difficulty => (
                <div key={difficulty.id} className="difficulty-item">
                  <div className="difficulty-info">
                    <img 
                      src={difficulty.icon} 
                      alt={difficulty.name} 
                      className="difficulty-icon"
                    />
                    <div className="difficulty-details">
                      <span className="difficulty-name">{difficulty.name}</span>
                      <span className="difficulty-type">{tDiff(`difficultyTypes.${difficulty.type}`)}</span>
                    </div>
                  </div>
                  <div className="difficulty-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEditClick(difficulty)}
                      disabled={isLoading}
                    >
                      <EditIcon color="#fff" size="24px" />
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => setDeletingDifficulty(difficulty)}
                      disabled={isLoading}
                    >
                      <TrashIcon color="#fff" size="24px"/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {deletingDifficulty && (
            <div 
              className="difficulty-modal"
              onClick={(e) => {
                if (e.target.className === 'difficulty-modal') {
                  handleCloseDeleteModal();
                }
              }}
            >
              <div className="difficulty-modal-content delete-modal">
                <button 
                  className="modal-close-button"
                  onClick={handleCloseDeleteModal}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <div className={`delete-warning ${showDeleteInput ? 'fade-out' : ''}`}>
                  <h2>{tDiff('modal.delete.warning.title')}</h2>
                  <div className="warning-content">
                    <p>{tDiff('modal.delete.warning.message', { name: deletingDifficulty?.name })}</p>
                    <p>{tDiff('modal.delete.warning.description')}</p>
                    <ul>
                      {tDiff('modal.delete.warning.points', { returnObjects: true }).map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                    <p className="warning-highlight">{tDiff('modal.delete.warning.highlight')}</p>
                  </div>
                  <button 
                    className="understand-button"
                    onClick={() => setShowDeleteInput(true)}
                  >
                    {tDiff('buttons.understand')}
                  </button>
                </div>

                <div className={`delete-input ${showDeleteInput ? 'fade-in' : ''}`} style={{height: showDeleteInput ? 'auto' : '0px'}}>
                  <h2>{tDiff('modal.delete.title')}</h2>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (fallbackId) {
                      setSelectedAction({ 
                        type: 'delete', 
                        data: { 
                          id: deletingDifficulty.id, 
                          fallbackId 
                        } 
                      });
                      setShowPasswordModal(true);
                    }
                  }}>
                    <div className="form-group">
                      <label>{tDiff('form.labels.fallbackId')}</label>
                      <input
                        type="number"
                        value={fallbackId}
                        onChange={(e) => setFallbackId(e.target.value)}
                        placeholder={tDiff('form.placeholders.fallbackId')}
                        required
                      />
                      <p className="help-text">
                        {tDiff('form.helpText.fallbackId', { name: deletingDifficulty?.name })}
                      </p>
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="delete-confirm-button">
                        {tDiff('buttons.delete')}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={handleCloseDeleteModal}
                      >
                        {tDiff('buttons.cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showPasswordPrompt && (
            <div className="password-modal">
              <div className="password-modal-content">
                <h3>{tDiff('passwordModal.title')}</h3>
                <p>{tDiff('passwordModal.message', { action: pendingAction?.type })}</p>
                <input
                  type="password"
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder={tDiff('passwordModal.placeholder')}
                />
                {error && <p className="error-message">{error}</p>}
                <div className="password-modal-actions">
                  <button 
                    className="confirm-btn"
                    onClick={handlePasswordPromptSubmit}
                    disabled={!superAdminPassword}
                  >
                    {tDiff('buttons.confirm')}
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => {
                      setShowPasswordPrompt(false);
                      setSuperAdminPassword('');
                      setPendingAction(null);
                    }}
                  >
                    {tDiff('buttons.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <DifficultyPopup
            isOpen={isCreating || editingDifficulty !== null}
            onClose={() => {
              if (isCreating) {
                handleCloseCreateModal();
              } else {
                handleCloseEditModal();
              }
            }}
            isCreating={isCreating}
            difficulty={isCreating ? newDifficulty : editingDifficulty || {}}
            onSubmit={handleSubmit}
            onChange={(updatedDifficulty) => {
              if (isCreating) {
                setNewDifficulty(updatedDifficulty);
              } else {
                setEditingDifficulty(updatedDifficulty);
              }
            }}
            error={error}
            verifiedPassword={verifiedPassword}
          />

          <div className="notifications">
            {notifications.map(({ id, message, type }) => (
              <div key={id} className={`notification ${type}`}>
                {message}
                <button
                  className="close-notification"
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default DifficultyPage; 