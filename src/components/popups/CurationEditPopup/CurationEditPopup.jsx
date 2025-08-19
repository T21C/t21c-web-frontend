import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './curationeditpopup.css';
import toast from 'react-hot-toast';
import { ThumbnailUpload } from '@/components/common/upload';

const CurationEditPopup = ({
  isOpen,
  onClose,
  curation,
  curationTypes,
  onUpdate
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`curationEditPopup.${key}`, params);

  const [formData, setFormData] = useState({
    typeId: '',
    description: '',
    customCSS: '',
    customColor: '#ffffff'
  });
  const [isLoading, setIsLoading] = useState(false);
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
      
      // Initialize form data when curation changes
      if (curation) {
        setFormData({
          typeId: curation.typeId?.toString() || '',
          description: curation.description || '',
          customCSS: curation.customCSS || '',
          customColor: curation.customColor || '#ffffff'
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside, curation]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!curation) {
      toast.error('No curation selected for editing');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await api.put(`${import.meta.env.VITE_CURATIONS}/${curation.id}`, {
        typeId: parseInt(formData.typeId),
        description: formData.description,
        customCSS: formData.customCSS,
        customColor: formData.customColor
      });

      toast.success(tCur('notifications.updated'));
      onUpdate(response.data.curation);
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || tCur('errors.updateFailed');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !curation) return null;

  return (
    <div className="curation-edit-modal">
      <div className="curation-edit-modal__content" ref={modalRef}>
        <button 
          className="curation-edit-modal__close-button"
          onClick={onClose}
          type="button"
        >
          ✖
        </button>

        <div className="curation-edit-modal__header">
          <h2>{tCur('title')}</h2>
          <p>{tCur('description')}</p>
        </div>

        {/* Level Information Display */}
        <div className="curation-edit-modal__level-info">
          <div className="curation-edit-modal__level-card">
            <div className="curation-edit-modal__level-header">
              <img 
                src={curation.level?.difficulty?.icon || '/default-difficulty-icon.png'} 
                alt={curation.level?.difficulty?.name || 'Difficulty'} 
                className="curation-edit-modal__difficulty-icon" 
              />
              <div className="curation-edit-modal__level-details">
                <h3>{curation.level?.song || 'Unknown Level'}</h3>
                <p className="curation-edit-modal__level-artist">{curation.level?.artist || 'Unknown Artist'}</p>
                <p className="curation-edit-modal__level-creator">{curation.level?.creator || 'Unknown Creator'}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="curation-edit-modal__form">
          {/* Curation Type Selection */}
          <div className="curation-edit-modal__form-group">
            <label htmlFor="type-select">{tCur('form.type')}</label>
            <select
              id="type-select"
              value={formData.typeId}
              onChange={(e) => handleInputChange('typeId', e.target.value)}
              className="curation-edit-modal__select"
              required
            >
              <option value="">{tCur('form.selectType')}</option>
              {curationTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="curation-edit-modal__form-group">
            <label htmlFor="description">{tCur('form.description')}</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={tCur('form.descriptionPlaceholder')}
              className="curation-edit-modal__textarea"
              rows={3}
            />
          </div>

          {/* Custom Color */}
          <div className="curation-edit-modal__form-group">
            <label htmlFor="custom-color">{tCur('form.customColor')}</label>
            <div className="curation-edit-modal__color-input">
              <input
                id="custom-color"
                type="color"
                value={formData.customColor}
                onChange={(e) => handleInputChange('customColor', e.target.value)}
                className="curation-edit-modal__color-picker"
              />
              <input
                type="text"
                value={formData.customColor}
                onChange={(e) => handleInputChange('customColor', e.target.value)}
                placeholder="#ffffff"
                className="curation-edit-modal__color-text"
              />
            </div>
          </div>

          {/* Custom CSS */}
          <div className="curation-edit-modal__form-group">
            <label htmlFor="custom-css">{tCur('form.customCSS')}</label>
            <textarea
              id="custom-css"
              value={formData.customCSS}
              onChange={(e) => handleInputChange('customCSS', e.target.value)}
              placeholder={tCur('form.customCSSPlaceholder')}
              className="curation-edit-modal__css-textarea"
              rows={8}
            />
            <p className="curation-edit-modal__help-text">{tCur('form.customCSSHelp')}</p>
          </div>

          {/* Thumbnail Upload */}
          <div className="curation-edit-modal__form-group">
            <label>{tCur('form.thumbnail')}</label>
            <ThumbnailUpload
              currentThumbnail={curation.previewLink}
              onThumbnailUpdate={(thumbnailUrl) => {
                // Refresh curation data after thumbnail update
                const updatedCuration = { ...curation, previewLink: thumbnailUrl };
                onUpdate(updatedCuration);
              }}
              onThumbnailRemove={() => {
                // Refresh curation data after thumbnail removal
                const updatedCuration = { ...curation, previewLink: null };
                onUpdate(updatedCuration);
              }}
              uploadEndpoint={`${import.meta.env.VITE_CURATIONS}/${curation.id}/thumbnail`}
            />
          </div>

          {/* Form Actions */}
          <div className="curation-edit-modal__actions">
            <button
              type="button"
              onClick={onClose}
              className="curation-edit-modal__cancel-btn"
              disabled={isLoading}
            >
              {tCur('actions.cancel')}
            </button>
            <button
              type="submit"
              className="curation-edit-modal__save-btn"
              disabled={isLoading || !formData.typeId}
            >
              {isLoading ? tCur('actions.saving') : tCur('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CurationEditPopup;
