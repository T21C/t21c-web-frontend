import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { CompleteNav } from '@/components';
import ScrollButton from '@/components/ScrollButton/ScrollButton';
import api from '@/utils/api';
import './css/difficultypage.css';

const DifficultyPage = () => {
  const { isSuperAdmin } = useAuth();
  const { difficulties, loading: contextLoading, reloadDifficulties } = useDifficultyContext();
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

  const handlePasswordSubmit = async () => {
    try {
      const { type, data } = selectedAction;
      setError('');
      
      if (type === 'create') {
        await handleCreateDifficulty();
        addNotification('Difficulty created successfully');
      } else if (type === 'edit') {
        await handleUpdateDifficulty(data);
        addNotification('Difficulty updated successfully');
      } else if (type === 'delete') {
        await handleDeleteDifficulty(data.id, data.fallbackId);
        addNotification('Difficulty deleted successfully');
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
      const errorMessage = err.response?.status === 403 ? 'Invalid password' : (err.response?.data?.error || 'An error occurred while performing the action');
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

  if (!isSuperAdmin) {
    return (
      <>
        <CompleteNav />
        <div className="background-level"></div>
        <div className="difficulty-page">
          <div className="difficulty-container">
            <h1>Access Denied</h1>
            <p>You need super admin privileges to access this page.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CompleteNav />
      <div className="background-level"></div>
      <div className="difficulty-page">
        <ScrollButton />
        <div className="difficulty-container">
          <div className="header-container">
            <h1>Manage Difficulties</h1>
            <button
              className="refresh-button"
              onClick={reloadDifficulties}
              disabled={isLoading || contextLoading}
            >
            <svg fill="#ffffff" height="30px" width="30px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 489.698 489.698" xml:space="preserve">
              <g>
                <g>
                  <path d="M468.999,227.774c-11.4,0-20.8,8.3-20.8,19.8c-1,74.9-44.2,142.6-110.3,178.9c-99.6,54.7-216,5.6-260.6-61l62.9,13.1 c10.4,2.1,21.8-4.2,23.9-15.6c2.1-10.4-4.2-21.8-15.6-23.9l-123.7-26c-7.2-1.7-26.1,3.5-23.9,22.9l15.6,124.8 c1,10.4,9.4,17.7,19.8,17.7c15.5,0,21.8-11.4,20.8-22.9l-7.3-60.9c101.1,121.3,229.4,104.4,306.8,69.3 c80.1-42.7,131.1-124.8,132.1-215.4C488.799,237.174,480.399,227.774,468.999,227.774z"></path>
                  <path d="M20.599,261.874c11.4,0,20.8-8.3,20.8-19.8c1-74.9,44.2-142.6,110.3-178.9c99.6-54.7,216-5.6,260.6,61l-62.9-13.1 c-10.4-2.1-21.8,4.2-23.9,15.6c-2.1,10.4,4.2,21.8,15.6,23.9l123.8,26c7.2,1.7,26.1-3.5,23.9-22.9l-15.6-124.8 c-1-10.4-9.4-17.7-19.8-17.7c-15.5,0-21.8,11.4-20.8,22.9l7.2,60.9c-101.1-121.2-229.4-104.4-306.8-69.2 c-80.1,42.6-131.1,124.8-132.2,215.3C0.799,252.574,9.199,261.874,20.599,261.874z"></path>
                </g>
              </g>
            </svg>
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="create-button"
            onClick={() => setIsCreating(true)}
            disabled={isLoading || contextLoading}
          >
            Create New Difficulty
          </button>

          <div className="difficulties-list">
            {isLoading || contextLoading ? (
              <div className="loading-message">Loading difficulties...</div>
            ) : difficulties.length === 0 ? (
              <div className="no-items-message">No difficulties found.</div>
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
                      <span className="difficulty-type">{difficulty.type}</span>
                    </div>
                  </div>
                  <div className="difficulty-actions">
                    <button
                      className="edit-button"
                      onClick={() => setEditingDifficulty(difficulty)}
                      disabled={isLoading}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.474,5.408L18.592,7.526L6.936,19.183L4.818,17.065L16.474,5.408Z" fill="currentColor"/>
                        <path d="M19.479,7.092L21.597,4.974L19.479,2.856L17.361,4.974L19.479,7.092Z" fill="currentColor"/>
                        <path d="M4,20H6.118L4,17.882V20Z" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => setDeletingDifficulty(difficulty)}
                      disabled={isLoading}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" fill="currentColor"/>
                      </svg>
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
                  <h2>⚠️ Warning: Destructive Action ⚠️</h2>
                  <div className="warning-content">
                    <p>You are about to delete the difficulty: <strong>{deletingDifficulty?.name}</strong></p>
                    <p>This action:</p>
                    <ul>
                      <li>Cannot be undone</li>
                      <li>Will affect all levels using this difficulty</li>
                      <li>Requires a backup before proceeding</li>
                    </ul>
                    <p className="warning-highlight">Make sure you have created a backup before proceeding!</p>
                  </div>
                  <button 
                    className="understand-button"
                    onClick={() => setShowDeleteInput(true)}
                  >
                    I understand the risks
                  </button>
                </div>

                <div className={`delete-input ${showDeleteInput ? 'fade-in' : ''}`} style={{height: showDeleteInput ? 'auto' : '0px'}}>
                  <h2>Delete Difficulty</h2>
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
                      <label>Enter Fallback Difficulty ID:</label>
                      <input
                        type="number"
                        value={fallbackId}
                        onChange={(e) => setFallbackId(e.target.value)}
                        placeholder="Enter the ID of the replacement difficulty"
                        required
                      />
                      <p className="help-text">All levels using {deletingDifficulty?.name} will be updated to use this difficulty instead.</p>
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="delete-confirm-button">
                        Delete Difficulty
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={handleCloseDeleteModal}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {(isCreating || editingDifficulty) && (
            <div 
              className="difficulty-modal"
              onClick={(e) => {
                if (e.target.className === 'difficulty-modal') {
                  if (isCreating) {
                    handleCloseCreateModal();
                  } else {
                    handleCloseEditModal();
                  }
                }
              }}
            >
              <div className="difficulty-modal-content">
                <button 
                  className="modal-close-button"
                  onClick={() => {
                    if (isCreating) {
                      handleCloseCreateModal();
                    } else {
                      handleCloseEditModal();
                    }
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h2>{isCreating ? 'Create New Difficulty' : 'Edit Difficulty'}</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (isCreating) {
                    setSelectedAction({ type: 'create', data: null });
                  } else {
                    setSelectedAction({ type: 'edit', data: editingDifficulty });
                  }
                  setShowPasswordModal(true);
                }}>
                  <div className="form-group">
                    <label>ID:</label>
                    <input
                      type="number"
                      value={isCreating ? newDifficulty.id : editingDifficulty.id}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, id: parseInt(e.target.value) }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, id: parseInt(e.target.value) }));
                        }
                      }}
                      disabled={!isCreating}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={isCreating ? newDifficulty.name : editingDifficulty.name}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, name: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, name: e.target.value }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Type:</label>
                    <select
                      value={isCreating ? newDifficulty.type : editingDifficulty.type}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, type: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, type: e.target.value }));
                        }
                      }}
                      required
                    >
                      <option value="PGU">PGU</option>
                      <option value="SPECIAL">SPECIAL</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Icon URL:</label>
                    <input
                      type="text"
                      value={isCreating ? newDifficulty.icon : editingDifficulty.icon}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, icon: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, icon: e.target.value }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Legacy Icon URL:</label>
                    <input
                      type="text"
                      value={isCreating ? newDifficulty.legacyIcon : editingDifficulty.legacyIcon}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, legacyIcon: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, legacyIcon: e.target.value }));
                        }
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Emoji:</label>
                    <input
                      type="text"
                      value={isCreating ? newDifficulty.emoji : editingDifficulty.emoji}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, emoji: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, emoji: e.target.value }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Legacy Emoji:</label>
                    <input
                      type="text"
                      value={isCreating ? newDifficulty.legacyEmoji : editingDifficulty.legacyEmoji}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, legacyEmoji: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, legacyEmoji: e.target.value }));
                        }
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Color:</label>
                    <div className="color-input-container">
                      <input
                        type="color"
                        value={isCreating ? newDifficulty.color : editingDifficulty.color}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewDifficulty(prev => ({ ...prev, color: e.target.value }));
                          } else {
                            setEditingDifficulty(prev => ({ ...prev, color: e.target.value }));
                          }
                        }}
                        required
                      />
                      <input
                        type="text"
                        value={isCreating ? newDifficulty.color : editingDifficulty.color}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewDifficulty(prev => ({ ...prev, color: e.target.value }));
                          } else {
                            setEditingDifficulty(prev => ({ ...prev, color: e.target.value }));
                          }
                        }}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#RRGGBB"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Base Score:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={isCreating ? newDifficulty.baseScore : editingDifficulty.baseScore}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, baseScore: parseFloat(e.target.value) }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, baseScore: parseFloat(e.target.value) }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sort Order:</label>
                    <input
                      type="number"
                      value={isCreating ? newDifficulty.sortOrder : editingDifficulty.sortOrder}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Legacy:</label>
                    <input
                      type="text"
                      value={isCreating ? newDifficulty.legacy : editingDifficulty.legacy}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewDifficulty(prev => ({ ...prev, legacy: e.target.value }));
                        } else {
                          setEditingDifficulty(prev => ({ ...prev, legacy: e.target.value }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="save-button">
                      {isCreating ? 'Create' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => {
                        if (isCreating) {
                          handleCloseCreateModal();
                        } else {
                          handleCloseEditModal();
                        }
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showPasswordModal && (
            <div className="password-modal">
              <div className="password-modal-content">
                <h3>Super Admin Password Required</h3>
                <p>Please enter your super admin password to {selectedAction.type} the difficulty.</p>
                <input
                  type="password"
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder="Enter password"
                />
                {error && <p className="error-message">{error}</p>}
                <div className="password-modal-actions">
                  <button 
                    className="confirm-btn"
                    onClick={handlePasswordSubmit}
                    disabled={!superAdminPassword}
                  >
                    Confirm
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

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