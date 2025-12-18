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
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { RatingInput } from '@/components/common/selectors';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

const DifficultyPage = () => {
  const { user } = useAuth();
  const { difficulties, loading: contextLoading, reloadDifficulties, setDifficulties } = useDifficultyContext();
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
    legacy: '',
    legacyIcon: '',
    legacyEmoji: ''
  });
  const [deletingDifficulty, setDeletingDifficulty] = useState(null);
  const [showDeleteInput, setShowDeleteInput] = useState(false);
  const [fallbackDiff, setFallbackDiff] = useState('');
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isAnyPopupOpen, setIsAnyPopupOpen] = useState(false);
  const [showInitialPasswordPrompt, setShowInitialPasswordPrompt] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [activeTab, setActiveTab] = useState('difficulties'); // 'difficulties' or 'tags'
  
  // Tag management state
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [originalTag, setOriginalTag] = useState(null); // Store original tag data for comparison
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [deletingTag, setDeletingTag] = useState(null);
  const [newTag, setNewTag] = useState({
    name: '',
    iconFile: null,
    icon: null, // For preview only
    color: '#FF5733',
    group: ''
  });

  // Fetch tags when tags tab is active
  useEffect(() => {
    if (activeTab === 'tags' && verifiedPassword) {
      fetchTags();
    }
  }, [activeTab, verifiedPassword]);

  const fetchTags = async () => {
    setTagsLoading(true);
    try {
      const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/tags`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      setTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
      addNotification('Failed to fetch tags', 'error');
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    try {
      const formData = new FormData();
      formData.append('name', newTag.name);
      formData.append('color', newTag.color);
      if (newTag.group) {
        formData.append('group', newTag.group);
      }
      
      // If iconFile exists, append it (Priority 1: file attached -> update icon)
      if (newTag.iconFile) {
        formData.append('icon', newTag.iconFile);
      } else if (newTag.icon === null) {
        // Priority 2: null explicitly -> remove icon
        formData.append('icon', 'null');
      }
      // Otherwise: no iconUrl field, server will use default (null for new tags)

      const response = await api.post(`${import.meta.env.VITE_DIFFICULTIES}/tags`, formData, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTags(prev => [...prev, response.data]);
      // Clean up preview URL if exists
      if (newTag.icon && newTag.icon.startsWith('blob:')) {
        URL.revokeObjectURL(newTag.iconUrl);
      }
      setIsCreatingTag(false);
      setNewTag({ name: '', iconFile: null, icon: null, color: '#FF5733', group: '' });
      addNotification('Tag created successfully');
    } catch (error) {
      console.error('Error creating tag:', error);
      addNotification(error.response?.data?.error || 'Failed to create tag', 'error');
    }
  };

  const handleUpdateTag = async () => {
    try {
      const formData = new FormData();
      formData.append('name', editingTag.name);
      formData.append('color', editingTag.color);
      if (editingTag.group !== undefined) {
        formData.append('group', editingTag.group || '');
      }
      
      // Priority logic:
      // Priority 1: iconFile exists -> update icon
      // Priority 2: iconUrl is null -> remove icon
      // Otherwise: no change (don't send iconUrl field)
      if (editingTag.iconFile) {
        formData.append('icon', editingTag.iconFile);
      } else if (editingTag.icon === null && editingTag.icon !== undefined) {
        // Explicitly null (removed) -> send null
        formData.append('icon', 'null');
      }
      // Otherwise: don't send iconUrl, server will keep existing

      const response = await api.put(`${import.meta.env.VITE_DIFFICULTIES}/tags/${editingTag.id}`, formData, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTags(prev => prev.map(tag => tag.id === editingTag.id ? response.data : tag));
      // Clean up preview URL if it was a blob URL
      if (editingTag.icon && editingTag.icon.startsWith('blob:')) {
        URL.revokeObjectURL(editingTag.icon);
      }
      setEditingTag(null);
      setOriginalTag(null);
      addNotification('Tag updated successfully');
    } catch (error) {
      console.error('Error updating tag:', error);
      addNotification(error.response?.data?.error || 'Failed to update tag', 'error');
    }
  };

  // Check if there are unsaved changes in the editing tag
  const hasUnsavedChanges = () => {
    if (!editingTag || !originalTag) return false;
    
    // Compare name
    if (editingTag.name !== originalTag.name) return true;
    
    // Compare color
    if (editingTag.color !== originalTag.color) return true;
    
    // Compare group (handle null/undefined/empty string)
    const editingGroup = (editingTag.group || '').trim();
    const originalGroup = (originalTag.group || '').trim();
    if (editingGroup !== originalGroup) return true;
    
    // Check if icon was changed
    // New file uploaded
    if (editingTag.iconFile) return true;
    
    // Icon removed (explicitly set to null when it wasn't null before)
    if (editingTag.icon === null && originalTag.icon !== null) return true;
    
    // If icon is a blob URL (preview), it means a new file was selected
    // We don't need to compare URLs since blob URLs are temporary previews
    // The presence of iconFile or explicit null is already checked above
    
    return false;
  };

  // Handle closing the edit tag modal with confirmation if needed
  const handleCloseEditTag = () => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    
    // Clean up preview URL if it was a blob URL
    if (editingTag?.icon && editingTag.icon.startsWith('blob:')) {
      URL.revokeObjectURL(editingTag.icon);
    }
    setEditingTag(null);
    setOriginalTag(null);
  };

  const handleDeleteTag = async () => {
    try {
      await api.delete(`${import.meta.env.VITE_DIFFICULTIES}/tags/${deletingTag.id}`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      setTags(prev => prev.filter(tag => tag.id !== deletingTag.id));
      setDeletingTag(null);
      addNotification('Tag deleted successfully');
    } catch (error) {
      console.error('Error deleting tag:', error);
      addNotification(error.response?.data?.error || 'Failed to delete tag', 'error');
    }
  };


  // Add effect to handle body scrolling
  useEffect(() => {
    const isAnyOpen = isCreating || editingDifficulty !== null || 
                          deletingDifficulty !== null || showPasswordPrompt || showInitialPasswordPrompt ||
                          isCreatingTag || editingTag !== null || deletingTag !== null;
    setIsAnyPopupOpen(isAnyOpen);
    if (isAnyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreating, editingDifficulty, deletingDifficulty, showPasswordPrompt, showInitialPasswordPrompt]);

  // Initial password verification
  useEffect(() => {
    if (hasFlag(user, permissionFlags.SUPER_ADMIN) && showInitialPasswordPrompt) {
      // Show initial password prompt
      setShowInitialPasswordPrompt(true);
    }
  }, [user]);

  const handlePasswordSubmit = async () => {
    try {
      const { type, data } = selectedAction;
      setError('');
      
      if (type === 'create') {
        const response = await api.post(`${import.meta.env.VITE_DIFFICULTIES}`, {
          ...data,
          superAdminPassword: verifiedPassword
        });
        
        // Update context state directly
        const newDifficulty = response.data;
        setDifficulties(prev => [...prev, newDifficulty]);
        
        addNotification(tDiff('notifications.created'));
      } else if (type === 'edit') {
        const response = await api.put(`${import.meta.env.VITE_DIFFICULTIES}/${data.id}`, {
          ...data,
          superAdminPassword: verifiedPassword
        });
        
        // Update context state directly
        const updatedDifficulty = response.data;
        setDifficulties(prev => prev.map(diff => diff.id === updatedDifficulty.id ? updatedDifficulty : diff));
        
        addNotification(tDiff('notifications.updated'));
      } else if (type === 'delete') {
        await api.delete(`${import.meta.env.VITE_DIFFICULTIES}/${data.id}?fallbackId=${difficulties.find(d => d.name === data.fallbackDiff)?.id}`, {
          data: { superAdminPassword: verifiedPassword }
        });
        
        // Update context state directly
        setDifficulties(prev => prev.filter(diff => diff.id !== data.id));
        
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
      setFallbackDiff('');
      
      // Reset form states
      setNewDifficulty({
        id: '',
        name: '',
        type: 'PGU',
        icon: '',
        emoji: '',
        color: '#ffffff',
        baseScore: 0,
        legacy: '',
        legacyIcon: '',
        legacyEmoji: ''
      });
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
    setFallbackDiff('');
    setError('');
  };

  const handleCreateDifficulty = async () => {
    try {
      const response = await api.post(`${import.meta.env.VITE_DIFFICULTIES}`, {
        ...newDifficulty,
        superAdminPassword: verifiedPassword
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
        superAdminPassword: verifiedPassword
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const verifyPassword = async (password) => {
    try {
      await api.head(`${import.meta.env.VITE_VERIFY_PASSWORD}?origin=difficulty`, {
        headers: {
          'X-Super-Admin-Password': password
        }
      });
      setVerifiedPassword(password);
      setShowPasswordPrompt(false);
      setShowInitialPasswordPrompt(false);
      return true;
    } catch (error) {
      setError(tDiff('passwordModal.errors.invalid'));
      addNotification(tDiff('passwordModal.errors.invalid'), 'error');
      return false;
    }
  };

  const handleInitialPasswordSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      setSuperAdminPassword('');
    }
  };

  const handlePasswordPromptSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      const { type, data } = pendingAction;
      switch (type) {
        case 'edit':
          const rawDifficulty = difficulties.find(d => d.id === data.id);
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
    // Directly set the editing difficulty without showing password prompt
    setEditingDifficulty(difficulty);
  };

  const handleCreateClick = () => {
    setPendingAction({ type: 'create' });
    setShowPasswordPrompt(true);
  };

  const handleDeleteClick = (difficulty) => {
    setPendingAction({ type: 'delete', data: difficulty });
    setShowPasswordPrompt(true);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    setIsReordering(true);
    
    try {      
      const items = Array.from(sortedDifficulties);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      const updatedItems = items.map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      
      setDifficulties(updatedItems);
      
      const response = await api.put(`${import.meta.env.VITE_DIFFICULTIES}/sort-orders`, {
        sortOrders: updatedItems.map(item => ({
          id: item.id,
          sortOrder: item.sortOrder
        }))
      }, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });

      
      addNotification(tDiff('notifications.reordered'), 'success');
    } catch (err) {
      console.error('Error updating sort orders:', {
        error: err.message,
        status: err.response?.status,
        difficultyId: movedDifficulty?.id,
        difficultyName: movedDifficulty?.name
      });
      addNotification(tDiff('notifications.reorderFailed'), 'error');
      await reloadDifficulties();
    } finally {
      setIsReordering(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isCreating) {
      setSelectedAction({ type: 'create', data: newDifficulty });
    } else {
      setSelectedAction({ type: 'edit', data: editingDifficulty });
    }
    handlePasswordSubmit();
  };

  const sortedDifficulties = [...difficulties].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDirectDelete = async () => {
    if (!fallbackDiff || fallbackDiff === String(deletingDifficulty?.id)) return;
    try {
      setIsLoading(true);
      await api.delete(`${import.meta.env.VITE_DIFFICULTIES}/${deletingDifficulty.id}?fallbackId=${difficulties.find(d => d.name === fallbackDiff)?.id}`, {
        data: { superAdminPassword: verifiedPassword }
      });
      await reloadDifficulties();
      addNotification(tDiff('notifications.deleted'));
      setDeletingDifficulty(null);
      setShowDeleteInput(false);
      setFallbackDiff('');
    } catch (err) {
      setError(tDiff('passwordModal.errors.generic'));
      addNotification(tDiff('passwordModal.errors.generic'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (user.permissionFlags === undefined) {
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

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
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
              onClick={activeTab === 'difficulties' ? reloadDifficulties : fetchTags}
              disabled={isLoading || contextLoading || isReordering || tagsLoading}
              aria-label={tDiff('header.refresh')}
            >
              <RefreshIcon color="#fff" size="36px" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'difficulties' ? 'active' : ''}`}
              onClick={() => setActiveTab('difficulties')}
            >
              Difficulties
            </button>
            <button
              className={`tab-button ${activeTab === 'tags' ? 'active' : ''}`}
              onClick={() => setActiveTab('tags')}
            >
              Tags
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {activeTab === 'difficulties' ? (
            <>
              <button
                className="create-button"
                onClick={handleCreateClick}
                disabled={isLoading || contextLoading || isReordering}
              >
                {tDiff('buttons.create')}
              </button>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="difficulties">
              {(provided) => (
                <div 
                  className="difficulties-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {isLoading || contextLoading ? (
                    <div className="loading-message">{tDiff('loading.difficulties')}</div>
                  ) : sortedDifficulties.length === 0 ? (
                    <div className="no-items-message">{tDiff('noItems.message')}</div>
                  ) : (
                    sortedDifficulties.map((difficulty, index) => (
                      <Draggable 
                        key={difficulty.id} 
                        draggableId={difficulty.id.toString()} 
                        index={index}
                        isDragDisabled={isReordering}
                      >
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`difficulty-item ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
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
                                onClick={() => handleEditClick(difficulty)}
                                disabled={isLoading || isReordering}
                              >
                                <EditIcon color="#fff" size="24px" />
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => setDeletingDifficulty(difficulty)}
                                disabled={isLoading || isReordering}
                              >
                                <TrashIcon color="#fff" size="24px"/>
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
            </>
          ) : (
            <>
              <button
                className="create-button"
                onClick={() => setIsCreatingTag(true)}
                disabled={tagsLoading}
              >
                Create Tag
              </button>

              {tagsLoading ? (
                <div className="loading-message">Loading tags...</div>
              ) : tags.length === 0 ? (
                <div className="no-items-message">No tags found. Create your first tag!</div>
              ) : (
                <div className="tags-list">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="tag-item"
                    >
                      <div className="tag-item-content">
                        {tag.icon && (
                          <img
                            src={tag.icon}
                            alt={tag.name}
                            className="tag-item-icon"
                          />
                        )}
                        <div className="tag-item-info">
                          <div className="tag-item-name" style={{ color: tag.color }}>
                            {tag.name}
                          </div>
                          <div className="tag-item-color">
                            {tag.color}
                          </div>
                          {tag.group && (
                            <div className="tag-item-group">
                              Group: {tag.group}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="tag-item-actions">
                        <button
                          onClick={() => {
                            // Store original tag data for comparison
                            setOriginalTag({ ...tag });
                            setEditingTag({ ...tag, iconFile: null, group: tag.group || '' });
                          }}
                        >
                          <EditIcon color="#fff" size="20px" />
                        </button>
                        <button
                          onClick={() => setDeletingTag(tag)}
                        >
                          <TrashIcon color="#fff" size="20px" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Tag Modal */}
              {isCreatingTag && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      // Clean up preview URL if exists
                      if (newTag.icon && newTag.icon.startsWith('blob:')) {
                        URL.revokeObjectURL(newTag.iconUrl);
                      }
                      setIsCreatingTag(false);
                      setNewTag({ name: '', iconFile: null, icon: null, color: '#FF5733' });
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <button
                      className="modal-close-button"
                      onClick={() => {
                        setIsCreatingTag(false);
                        setNewTag({ name: '', iconFile: null, icon: null, color: '#FF5733' });
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <h2>Create Tag</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateTag(); }}>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={newTag.name}
                          onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <input
                          type="color"
                          value={newTag.color}
                          onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Group (Optional)</label>
                        <input
                          type="text"
                          value={newTag.group}
                          onChange={(e) => setNewTag({ ...newTag, group: e.target.value })}
                          placeholder="Enter group name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Icon (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Create preview URL for display
                              const previewUrl = URL.createObjectURL(file);
                              setNewTag({ 
                                ...newTag, 
                                iconFile: file,
                                icon: previewUrl // For preview only
                              });
                            }
                          }}
                        />
                        {newTag.icon && (
                          <>
                            <img
                              src={newTag.icon}
                              alt="Preview"
                              className="icon-preview"
                            />
                            <button
                              type="button"
                              className="remove-icon-button"
                              onClick={() => {
                                // Clean up preview URL
                                if (newTag.icon && newTag.icon.startsWith('blob:')) {
                                  URL.revokeObjectURL(newTag.icon);
                                }
                                setNewTag({ ...newTag, iconFile: null, icon: null });
                              }}
                            >
                              Remove Icon
                            </button>
                          </>
                        )}
                      </div>
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">Create</button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            // Clean up preview URL if exists
                            if (newTag.icon && newTag.icon.startsWith('blob:')) {
                              URL.revokeObjectURL(newTag.icon);
                            }
                            setIsCreatingTag(false);
                            setNewTag({ name: '', iconFile: null, icon: null, color: '#FF5733' });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Tag Modal */}
              {editingTag && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      handleCloseEditTag();
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <button
                      className="modal-close-button"
                      onClick={handleCloseEditTag}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <h2>Edit Tag</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateTag(); }}>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={editingTag.name}
                          onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <input
                          type="color"
                          value={editingTag.color}
                          onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Group (Optional)</label>
                        <input
                          type="text"
                          value={editingTag.group || ''}
                          onChange={(e) => setEditingTag({ ...editingTag, group: e.target.value })}
                          placeholder="Enter group name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Icon (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Clean up previous preview URL if it was a blob URL
                              if (editingTag.icon && editingTag.icon.startsWith('blob:')) {
                                URL.revokeObjectURL(editingTag.icon);
                              }
                              // Create preview URL for display
                              const previewUrl = URL.createObjectURL(file);
                              setEditingTag({ 
                                ...editingTag, 
                                iconFile: file,
                                icon: previewUrl // For preview only
                              });
                            }
                          }}
                        />
                        {editingTag.icon && (
                          <>
                            <img
                              src={editingTag.icon}
                              alt="Preview"
                              className="icon-preview"
                            />
                            <button
                              type="button"
                              className="remove-icon-button"
                              onClick={() => {
                                // Clean up preview URL if it was a blob URL
                                if (editingTag.icon && editingTag.icon.startsWith('blob:')) {
                                  URL.revokeObjectURL(editingTag.icon);
                                }
                                setEditingTag({ ...editingTag, iconFile: null, icon: null });
                              }}
                            >
                              Remove Icon
                            </button>
                          </>
                        )}
                      </div>
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">Update</button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={handleCloseEditTag}
                      >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Tag Confirmation */}
              {deletingTag && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      setDeletingTag(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <button
                      className="modal-close-button"
                      onClick={() => setDeletingTag(null)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <h2>Delete Tag</h2>
                    <p>Are you sure you want to delete the tag "{deletingTag.name}"?</p>
                    <p>
                      This action cannot be undone. The tag will be removed from all levels.
                    </p>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="delete-confirm-button"
                        onClick={handleDeleteTag}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setDeletingTag(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

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

                <div className={`delete-input ${showDeleteInput ? 'fade-in' : ''}`}>
                  <h2>{tDiff('modal.delete.title')}</h2>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (fallbackDiff) {
                      setSelectedAction({ 
                        type: 'delete', 
                        data: { 
                          id: deletingDifficulty.id, 
                          fallbackDiff 
                        } 
                      });
                      setShowPasswordModal(true);
                    }
                  }}>
                    <div className="form-group">
                      <label>{tDiff('form.labels.fallbackDiff')}</label>
                      <RatingInput
                        value={fallbackDiff || ''}
                        onChange={(val) => setFallbackDiff(val || '')}
                        showDiff={true}
                        difficulties={difficulties.filter(d => d.id !== deletingDifficulty?.id)}
                        allowCustomInput={false}
                        placeholder={tDiff('form.placeholders.fallbackDiff')}
                      />
                      <p className="help-text">
                        {tDiff('form.helpText.fallbackDiff', { name: deletingDifficulty?.name })}
                      </p>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="delete-confirm-button" onClick={handleDirectDelete} disabled={!fallbackDiff || fallbackDiff === String(deletingDifficulty?.id) || isLoading}>
                        {isLoading ? tDiff('loading.deleting') || 'Deleting...' : tDiff('buttons.delete')}
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

          {showInitialPasswordPrompt && (
            <div className="password-modal">
              <div className="password-modal-content">
                <h3>{tDiff('passwordModal.initialTitle')}</h3>
                <p>{tDiff('passwordModal.initialMessage')}</p>
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
                    onClick={handleInitialPasswordSubmit}
                    disabled={!superAdminPassword}
                  >
                    {tDiff('buttons.confirm')}
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
            onSubmit={handleFormSubmit}
            onChange={(updatedDifficulty) => {
              if (isCreating) {
                setNewDifficulty(updatedDifficulty);
              } else {
                setEditingDifficulty(updatedDifficulty);
              }
            }}
            refreshDifficulties={reloadDifficulties}
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