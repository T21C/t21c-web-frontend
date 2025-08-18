import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './curationtypepopup.css';
import toast from 'react-hot-toast';

const ABILITIES = {
  CUSTOM_CSS: 0,
  CUSTOM_COLOR: 1
};


const CurationTypePopup = ({
  isOpen,
  onClose,
  isCreating,
  curationType,
  onSubmit,
  onChange,
  refreshCurationTypes,
  verifiedPassword
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`curationTypePopup.${key}`, params);

  // Helper functions for bitwise ability management
  const checkAbility = (input, exp) => {
    return (input & Math.pow(2, exp)) === Math.pow(2, exp);
  };

  const updateAbility = (input, exp, enabled) => {
    const bitValue = Math.pow(2, exp);
    return enabled ? input | bitValue : input & ~bitValue;
  };
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    color: '#ffffff',
    abilities: 0
  });
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
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
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside]);

  useEffect(() => {
    if (isOpen) {
      if (isCreating) {
        setFormData({
          name: '',
          icon: '',
          color: '#ffffff',
          abilities: 0
        });
        setIconFile(null);
        setIconPreview('');
      } else if (curationType) {
        setFormData({
          name: curationType.name || '',
          icon: curationType.icon || '',
          color: curationType.color || '#ffffff',
          abilities: curationType.abilities || 0
        });
        setIconPreview(curationType.icon || '');
      }
    }
  }, [isOpen, isCreating, curationType]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (onChange) {
      onChange({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error(tCur('errors.nameRequired'));
      return;
    }

    // Validate color format
    if (formData.color && !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      toast.error('Please enter a valid color in hex format (e.g., #ffffff)');
      return;
    }

    if (!verifiedPassword) {
      toast.error('Password verification required');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      
      if (isCreating) {
        // Create the curation type first
        response = await api.post(`${import.meta.env.VITE_CURATIONS}/types`, {
          ...formData,
          superAdminPassword: verifiedPassword
        });
        
        // If there's an icon file to upload, upload it after creation
        if (iconFile && response.data.id) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append('icon', iconFile);
            
            await api.post(
              `${import.meta.env.VITE_CURATIONS}/types/${response.data.id}/icon`,
              uploadFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'X-Super-Admin-Password': verifiedPassword
                },
              }
            );
            
            // Update the response data with the uploaded icon URL
            response.data.icon = response.data.icon || '';
          } catch (uploadError) {
            console.error('Failed to upload icon:', uploadError);
            // Don't fail the entire submission if icon upload fails
            toast.error('Curation type created but icon upload failed');
          }
        }
        
        toast.success(tCur('notifications.created'));
      } else {
        // Update existing curation type
        response = await api.put(`${import.meta.env.VITE_CURATIONS}/types/${curationType.id}`, {
          ...formData,
          superAdminPassword: verifiedPassword
        });
        
        // If there's an icon file to upload, upload it
        if (iconFile) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append('icon', iconFile);
            
            const uploadResponse = await api.post(
              `${import.meta.env.VITE_CURATIONS}/types/${curationType.id}/icon`,
              uploadFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'X-Super-Admin-Password': verifiedPassword
                },
              }
            );
            
            // Update the response data with the uploaded icon URL
            if (uploadResponse.data.success) {
              response.data.icon = uploadResponse.data.icon;
            }
          } catch (uploadError) {
            console.error('Failed to upload icon:', uploadError);
            toast.error('Curation type updated but icon upload failed');
          }
        }
        
        toast.success(tCur('notifications.updated'));
      }
      
      if (onSubmit) onSubmit(response.data);
      if (refreshCurationTypes) refreshCurationTypes();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || tCur('errors.submitFailed');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please select a JPEG, PNG, WebP, or SVG file.');
        return;
      }

      // Validate file size (1MB limit)
      if (file.size > 1024 * 1024) {
        toast.error('File size too large. Please select a file smaller than 1MB.');
        return;
      }

      setIconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };



  const removeIcon = async () => {
    if (!curationType?.id) return;

    try {
      await api.delete(`${import.meta.env.VITE_CURATIONS}/types/${curationType.id}/icon`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      setFormData(prev => ({ ...prev, icon: '' }));
      setIconPreview('');
      setIconFile(null);
      toast.success('Icon removed successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to remove icon';
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="curation-type-modal">
        <div className="curation-type-modal__content" ref={modalRef}>
          <button 
            className="curation-type-modal__close-button"
            onClick={onClose}
            type="button"
          >
            ✖
          </button>

          <div className="curation-type-modal__header">
            <h2>{isCreating ? tCur('title.create') : tCur('title.edit')}</h2>
            <p>{isCreating ? tCur('description.create') : tCur('description.edit')}</p>
          </div>

          <div className="curation-type-modal__form">
            <div className="curation-type-modal__form-group">
              <label htmlFor="name">{tCur('form.name')} *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={tCur('form.namePlaceholder')}
                className="curation-type-modal__input"
                required
                autoComplete='off'
              />
            </div>

            <div className="curation-type-modal__form-group">
              <label htmlFor="icon">{tCur('form.icon')}</label>
              
              {/* Icon Preview */}
              {iconPreview && (
                <div className="curation-type-modal__icon-preview">
                  <img 
                    src={iconPreview} 
                    alt="Icon preview" 
                    className="curation-type-modal__icon-image"
                  />
                  {!isCreating && (
                    <button
                      type="button"
                      onClick={removeIcon}
                      className="curation-type-modal__icon-remove"
                      title="Remove icon"
                    >
                      ✖
                    </button>
                  )}
                </div>
              )}

                             {/* Icon Upload */}
               <div className="curation-type-modal__icon-upload">
                 <input
                   id="icon-file"
                   type="file"
                   accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                   onChange={handleIconChange}
                   className="curation-type-modal__file-input"
                 />
                 <label htmlFor="icon-file" className="curation-type-modal__file-label">
                   {iconFile ? iconFile.name : 'Choose Icon File'}
                 </label>
               </div>

              <small>{tCur('form.iconHelp')}</small>
            </div>

            <div className="curation-type-modal__form-group">
              <label htmlFor="color">{tCur('form.color')}</label>
              <div className="curation-type-modal__color-input">
                <input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="curation-type-modal__color-picker"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#ffffff"
                  className="curation-type-modal__color-text"
                />
              </div>
            </div>

            <div className="curation-type-modal__form-group">
              <label>{tCur('form.abilitiesTitle')}</label>
              <div className="curation-type-modal__abilities">
                <label className="curation-type-modal__ability-checkbox">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.CUSTOM_CSS)}
                    onChange={(e) => {
                      const newAbilities = updateAbility(formData.abilities, ABILITIES.CUSTOM_CSS, e.target.checked);
                      handleInputChange('abilities', newAbilities);
                    }}
                  />
                  <span>{tCur('form.abilities.Custom CSS')}</span>
                </label>
                <label className="curation-type-modal__ability-checkbox">
                  <input
                    type="checkbox"
                    checked={checkAbility(formData.abilities, ABILITIES.CUSTOM_COLOR)}
                    onChange={(e) => {
                      const newAbilities = updateAbility(formData.abilities, ABILITIES.CUSTOM_COLOR, e.target.checked);
                      handleInputChange('abilities', newAbilities);
                    }}
                  />
                  <span>{tCur('form.abilities.Custom Color')}</span>
                </label>
              </div>
            </div>

            <div className="curation-type-modal__actions">
              <button
                type="button"
                onClick={onClose}
                className="curation-type-modal__button curation-type-modal__button--secondary"
                disabled={isSubmitting}
              >
                {tCur('actions.cancel')}
              </button>
                             <button
                 type="button"
                 onClick={handleSubmit}
                 className="curation-type-modal__button curation-type-modal__button--primary"
                 disabled={isSubmitting}
               >
                 {isSubmitting ? (iconFile ? 'Creating and uploading...' : tCur('actions.submitting')) : (isCreating ? tCur('actions.create') : tCur('actions.update'))}
               </button>
            </div>
          </div>
        </div>
      </div>

      
    </>
  );
};

export default CurationTypePopup;
