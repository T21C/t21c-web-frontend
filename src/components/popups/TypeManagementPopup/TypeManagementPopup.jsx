import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './typemanagementpopup.css';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ABILITIES } from '@/utils/Abilities';

const POPUP_MODES = {
  LIST: 'LIST',
  CREATE: 'CREATE',
  EDIT: 'EDIT'
};

const TypeManagementPopup = ({
  isOpen,
  onClose,
  curationTypes,
  onTypeUpdate,
  verifiedPassword
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`typeManagementPopup.${key}`, params);

  const [mode, setMode] = useState(POPUP_MODES.LIST);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [localCurationTypes, setLocalCurationTypes] = useState([]);
  const modalRef = useRef(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    abilities: 0n,
    icon: null,
    iconPreview: null
  });

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
      setMode(POPUP_MODES.LIST);
      setSelectedType(null);
      resetForm();
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside]);

  // Sync local curation types with props
  useEffect(() => {
    if (curationTypes) {
      setLocalCurationTypes([...curationTypes].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [curationTypes]);

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3B82F6',
      abilities: 0n,
      icon: null,
      iconPreview: null
    });
  };

  const handleCreateNew = () => {
    setMode(POPUP_MODES.CREATE);
    resetForm();
  };

  const handleEditType = (type) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      color: type.color,
      abilities: BigInt(type.abilities || 0),
      icon: null,
      iconPreview: type.icon
    });
    setMode(POPUP_MODES.EDIT);
  };

  const handleDeleteType = async (type) => {
    if (!window.confirm(tCur('confirmations.deleteType', { name: type.name }))) {
      return;
    }

    try {
      setIsLoading(true);
      await api.delete(`${import.meta.env.VITE_CURATIONS}/types/${type.id}`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      
      toast.success(tCur('notifications.deleted'));
      onTypeUpdate();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete curation type';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToList = () => {
    setMode(POPUP_MODES.LIST);
    setSelectedType(null);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only JPEG, PNG, WebP, and SVG files are allowed.');
        return;
      }

      // Validate file size (1MB limit)
      if (file.size > 1024 * 1024) {
        toast.error('File size too large. Maximum size is 1MB.');
        return;
      }

      setFormData(prev => ({ ...prev, icon: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, iconPreview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIcon = () => {
    setFormData(prev => ({ ...prev, icon: null, iconPreview: null }));
  };

  const checkAbility = (input, ability) => {
    if (!input || ability === undefined || ability === null) return false;
    return (BigInt(input) & BigInt(ability)) === BigInt(ability);
  };

  const updateAbility = (input, ability, enabled) => {
    if ((!input && input !== 0n) || ability === undefined || ability === null) return input ? BigInt(input) : 0n;
    return enabled ? BigInt(input || 0) | BigInt(ability) : BigInt(input || 0) & ~BigInt(ability);
  };

  const handleAbilityChange = (ability, enabled) => {
    const newAbilities = updateAbility(formData.abilities, ability, enabled);
    handleFormChange('abilities', newAbilities);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!/^#[0-9A-F]{6}$/i.test(formData.color)) {
      toast.error('Invalid color format. Use hex color (e.g., #3B82F6)');
      return;
    }

    try {
      setIsLoading(true);
      
      const submitData = {
        name: formData.name.trim(),
        color: formData.color,
        abilities: formData.abilities.toString()
      };

      let response;
      if (mode === POPUP_MODES.CREATE) {
        response = await api.post(`${import.meta.env.VITE_CURATIONS}/types`, submitData, {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        });
        toast.success(tCur('notifications.created'));
      } else {
        response = await api.put(`${import.meta.env.VITE_CURATIONS}/types/${selectedType.id}`, submitData, {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        });
        toast.success(tCur('notifications.updated'));
      }

      // Upload icon if provided
      if (formData.icon) {
        const formDataIcon = new FormData();
        formDataIcon.append('icon', formData.icon);
        
        const iconResponse = await api.post(
          `${import.meta.env.VITE_CURATIONS}/types/${response.data.id}/icon`,
          formDataIcon,
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      onTypeUpdate();
      handleBackToList();
    } catch (error) {
      const errorMessage = error.response?.data?.error || `Failed to ${mode === POPUP_MODES.CREATE ? 'create' : 'update'} curation type`;
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    setIsReordering(true);
    
    try {      
      const items = Array.from(localCurationTypes);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      const updatedItems = items.map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      
      setLocalCurationTypes(updatedItems);
      
      const response = await api.put(`${import.meta.env.VITE_CURATIONS}/types/sort-orders`, {
        sortOrders: updatedItems.map(item => ({
          id: item.id,
          sortOrder: item.sortOrder
        }))
      }, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });

      toast.success(tCur('notifications.reordered'));
      onTypeUpdate();
    } catch (err) {
      console.error('Error updating sort orders:', err);
      toast.error(tCur('notifications.reorderFailed'));
      // Reset to original order
      if (curationTypes) {
        setLocalCurationTypes([...curationTypes].sort((a, b) => a.sortOrder - b.sortOrder));
      }
    } finally {
      setIsReordering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="type-management-modal">
      <div className="type-management-modal__content" ref={modalRef}>
        <button 
          className="type-management-modal__close-button"
          onClick={onClose}
          type="button"
        >
          ✖
        </button>

        {/* Header */}
        <div className="type-management-modal__header">
          <h2>
            {mode === POPUP_MODES.LIST && tCur('title')}
            {mode === POPUP_MODES.CREATE && tCur('create.title')}
            {mode === POPUP_MODES.EDIT && tCur('edit.title')}
          </h2>
          <p>
            {mode === POPUP_MODES.LIST && tCur('description')}
            {mode === POPUP_MODES.CREATE && tCur('create.description')}
            {mode === POPUP_MODES.EDIT && tCur('edit.description')}
          </p>
        </div>

        {/* List Mode */}
        {mode === POPUP_MODES.LIST && (
          <>
            <div className="type-management-modal__actions">
              <button
                className="type-management-modal__create-btn"
                onClick={handleCreateNew}
              >
                ➕
                {tCur('actions.create')}
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="curation-types">
                {(provided) => (
                  <div 
                    className="type-management-modal__types"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {isLoading ? (
                      <div className="type-management-modal__loading">{tCur('loading')}</div>
                    ) : localCurationTypes.length === 0 ? (
                      <div className="type-management-modal__empty">{tCur('empty')}</div>
                    ) : (
                      localCurationTypes.map((type, index) => (
                        <Draggable 
                          key={type.id} 
                          draggableId={type.id.toString()} 
                          index={index}
                          isDragDisabled={isReordering}
                        >
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`type-management-modal__type-item ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className="type-management-modal__type-info">
                                <div className="type-management-modal__type-header">
                                  <div className="type-management-modal__drag-handle">
                                    ⋮⋮
                                  </div>
                                  {type.icon && (
                                    <img 
                                      src={type.icon} 
                                      alt={`${type.name} icon`}
                                      className="type-management-modal__type-icon"
                                    />
                                  )}
                                  <h3>{type.name}</h3>
                                </div>
                                <div className="type-management-modal__type-details">
                                  <span 
                                    className="type-management-modal__type-color"
                                    style={{ backgroundColor: type.color }}
                                  >
                                    {type.color}
                                  </span>
                                  <span className="type-management-modal__type-abilities">
                                    {type.abilities > 0 ? tCur('hasAbilities') : tCur('noAbilities')}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="type-management-modal__type-actions">
                                <button
                                  className="type-management-modal__action-btn type-management-modal__action-btn--edit"
                                  onClick={() => handleEditType(type)}
                                  title={tCur('actions.edit')}
                                  disabled={isReordering}
                                >
                                  <EditIcon size={30}/>
                                </button>
                                <button
                                  className="type-management-modal__action-btn type-management-modal__action-btn--delete"
                                  onClick={() => handleDeleteType(type)}
                                  title={tCur('actions.delete')}
                                  disabled={isLoading || isReordering}
                                >
                                  <TrashIcon size={34}/>
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
        )}

        {/* Create/Edit Mode */}
        {(mode === POPUP_MODES.CREATE || mode === POPUP_MODES.EDIT) && (
          <form onSubmit={handleFormSubmit} className="type-management-modal__form">
            <div className="type-management-modal__form-group">
              <label htmlFor="name">{tCur('form.name')}</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder={tCur('form.namePlaceholder')}
                required
                className="type-management-modal__input"
              />
            </div>

            <div className="type-management-modal__form-group">
              <label htmlFor="color">{tCur('form.color')}</label>
              <div className="type-management-modal__color-input">
                <input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleFormChange('color', e.target.value)}
                  className="type-management-modal__color-picker"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleFormChange('color', e.target.value)}
                  placeholder="#3B82F6"
                  className="type-management-modal__color-text"
                />
              </div>
            </div>

            <div className="type-management-modal__form-group">
              <label>{tCur('form.icon')}</label>
              <div className="type-management-modal__icon-upload">
                {formData.iconPreview && (
                  <div className="type-management-modal__icon-preview">
                    <img 
                      src={formData.iconPreview} 
                      alt="Icon preview"
                      className="type-management-modal__icon-preview-img"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="type-management-modal__icon-remove"
                    >
                      ✖
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                  onChange={handleIconChange}
                  className="type-management-modal__file-input"
                  id="icon-upload"
                />
                <label htmlFor="icon-upload" className="type-management-modal__file-label">
                  {formData.iconPreview ? tCur('form.changeIcon') : tCur('form.selectIcon')}
                </label>
              </div>
              <p className="type-management-modal__help-text">{tCur('form.iconHelp')}</p>
            </div>

            <div className="type-management-modal__form-group">
              <label>{tCur('form.abilities')}</label>
              <div className="type-management-modal__abilities">
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.CUSTOM_CSS)}
                    onChange={(e) => handleAbilityChange(ABILITIES.CUSTOM_CSS, e.target.checked)}
                  />
                  {tCur('abilities.customCSS')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.CURATOR_ASSIGNABLE)}
                    onChange={(e) => handleAbilityChange(ABILITIES.CURATOR_ASSIGNABLE, e.target.checked)}
                  />
                  {tCur('abilities.curatorAssignable')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.RATER_ASSIGNABLE)}
                    onChange={(e) => handleAbilityChange(ABILITIES.RATER_ASSIGNABLE, e.target.checked)}
                  />
                  {tCur('abilities.raterAssignable')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.SHOW_ASSIGNER)}
                    onChange={(e) => handleAbilityChange(ABILITIES.SHOW_ASSIGNER, e.target.checked)}
                  />
                  {tCur('abilities.showAssigner')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.FORCE_DESCRIPTION)}
                    onChange={(e) => handleAbilityChange(ABILITIES.FORCE_DESCRIPTION, e.target.checked)}
                  />
                  {tCur('abilities.forceDescription')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.FRONT_PAGE_ELIGIBLE)}
                    onChange={(e) => handleAbilityChange(ABILITIES.FRONT_PAGE_ELIGIBLE, e.target.checked)}
                  />
                  {tCur('abilities.frontPageEligible')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.CUSTOM_COLOR_THEME)}
                    onChange={(e) => handleAbilityChange(ABILITIES.CUSTOM_COLOR_THEME, e.target.checked)}
                  />
                  {tCur('abilities.customColorTheme')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.LEVEL_LIST_BASIC_GLOW)}
                    onChange={(e) => handleAbilityChange(ABILITIES.LEVEL_LIST_BASIC_GLOW, e.target.checked)}
                  />
                  {tCur('abilities.levelListBasicGlow')}
                </label>
                <label className="type-management-modal__ability-item">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.LEVEL_LIST_LEGENDARY_GLOW)}
                    onChange={(e) => handleAbilityChange(ABILITIES.LEVEL_LIST_LEGENDARY_GLOW, e.target.checked)}
                  />
                  {tCur('abilities.levelListLegendaryGlow')}
                </label>
              </div>
            </div>

            <div className="type-management-modal__form-actions">
              <button
                type="button"
                onClick={handleBackToList}
                className="type-management-modal__btn type-management-modal__btn--cancel"
              >
                {tCur('buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="type-management-modal__btn type-management-modal__btn--submit"
              >
                {isLoading ? tCur('buttons.submitting') : (mode === POPUP_MODES.CREATE ? tCur('buttons.create') : tCur('buttons.update'))}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TypeManagementPopup;
