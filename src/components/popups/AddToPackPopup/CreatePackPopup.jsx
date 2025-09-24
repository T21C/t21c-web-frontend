import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CrossIcon, ImageIcon } from '@/components/common/icons';
import ImageSelectorPopup from '../ImageSelectorPopup/ImageSelectorPopup';
import './CreatePackPopup.css';
import toast from 'react-hot-toast';
import api from '@/utils/api';

const CreatePackPopup = ({ onClose, onCreate }) => {
  const { t } = useTranslation('components');
  const tPopup = (key) => t(`packPopups.createPack.${key}`) || key;
  
  const [formData, setFormData] = useState({
    name: '',
    iconUrl: '',
    cssFlags: 0,
    viewMode: 1, // PUBLIC
    isPinned: false
  });
  const [loading, setLoading] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // View mode options
  const viewModeOptions = [
    { value: 1, label: tPopup('viewMode.public') },
    { value: 2, label: tPopup('viewMode.linkonly') },
    { value: 3, label: tPopup('viewMode.private') }
  ];

  // CSS theme options
  const cssThemeOptions = [
    { value: 0, label: tPopup('theme.default') },
    { value: 1, label: tPopup('theme.dark') },
    { value: 2, label: tPopup('theme.neon') },
    { value: 3, label: tPopup('theme.pastel') }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIconUpload = async (file) => {
    setUploadingIcon(true);
    try {
      // For new packs, we'll store the file temporarily and upload it after pack creation
      // Convert file to data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          iconUrl: e.target.result,
          iconFile: file // Store the file for later upload
        }));
      };
      reader.readAsDataURL(file);
      
      toast.success(tPopup('success.iconSelected'), {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Error processing icon:', error);
      toast.error(tPopup('errors.iconProcessFailed'), {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#ffffff',
        },
      });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(tPopup('errors.nameRequired'));
      return;
    }

    setLoading(true);
    try {
      // Create pack without icon first
      const packData = { ...formData };
      delete packData.iconFile; // Remove the file from pack data
      delete packData.iconUrl; // Remove the preview URL
      
      const newPack = await onCreate(packData);
      
      // Upload icon if one was selected
      if (formData.iconFile && newPack) {
        try {
          const iconFormData = new FormData();
          iconFormData.append('icon', formData.iconFile);

          await api.post(`/v2/database/levels/packs/${newPack.id}/icon`, iconFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          toast.success(tPopup('success.iconUploaded'), {
            duration: 3000,
            position: 'top-right',
            style: {
              background: '#10b981',
              color: '#ffffff',
            },
          });
        } catch (iconError) {
          console.error('Error uploading pack icon:', iconError);
          const errorMessage = iconError.response?.data?.error || tPopup('errors.iconUploadFailed');
          toast.error(errorMessage, {
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#ef4444',
              color: '#ffffff',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating pack:', error);
      toast.error(tPopup('errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Close popup when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('create-pack-popup')) {
      onClose();
    }
  };

  return (
    <div className="create-pack-popup" onClick={handleBackdropClick}>
      <div className="create-pack-popup__content" onClick={(e) => e.stopPropagation()}>
        <div className="create-pack-popup__header">
          <h2 className="create-pack-popup__title">{tPopup('title')}</h2>
          <button className="create-pack-popup__close" onClick={onClose}>
            <CrossIcon />
          </button>
        </div>

        <form className="create-pack-popup__form" onSubmit={handleSubmit}>
          <div className="create-pack-popup__body">
            <div className="create-pack-popup__field">
              <label className="create-pack-popup__label">
                {tPopup('name.label')} *
              </label>
              <input
                type="text"
                className="create-pack-popup__input"
                placeholder={tPopup('name.placeholder')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                maxLength={100}
                required
              />
              <p className="create-pack-popup__help">
                {tPopup('name.help')}
              </p>
            </div>

            <div className="create-pack-popup__field">
              <label className="create-pack-popup__label">
                {tPopup('icon.label')}
              </label>
              <div className="create-pack-popup__icon-section">
                {formData.iconUrl && (
                  <div className="create-pack-popup__icon-preview">
                    <img 
                      src={formData.iconUrl} 
                      alt="Pack icon" 
                      className="create-pack-popup__icon-preview-img"
                    />
                  </div>
                )}
                <div className="create-pack-popup__icon-actions">
                  <button
                    type="button"
                    className="create-pack-popup__icon-upload-btn"
                    onClick={() => setShowImageSelector(true)}
                    disabled={uploadingIcon}
                  >
                    <ImageIcon />
                    <span>
                      {uploadingIcon ? tPopup('icon.uploading') : tPopup('icon.upload')}
                    </span>
                  </button>
                  {formData.iconUrl && (
                    <button
                      type="button"
                      className="create-pack-popup__icon-remove-btn"
                      onClick={() => handleInputChange('iconUrl', '')}
                    >
                      {tPopup('icon.remove')}
                    </button>
                  )}
                </div>
              </div>
              <p className="create-pack-popup__help">
                {tPopup('icon.help')}
              </p>
            </div>

            <div className="create-pack-popup__field">
              <label className="create-pack-popup__label">
                {tPopup('theme.label')}
              </label>
              <select
                className="create-pack-popup__select"
                value={formData.cssFlags}
                onChange={(e) => handleInputChange('cssFlags', parseInt(e.target.value))}
              >
                {cssThemeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="create-pack-popup__help">
                {tPopup('theme.help')}
              </p>
            </div>

            <div className="create-pack-popup__field">
              <label className="create-pack-popup__label">
                {tPopup('viewMode.label')}
              </label>
              <select
                className="create-pack-popup__select"
                value={formData.viewMode}
                onChange={(e) => handleInputChange('viewMode', parseInt(e.target.value))}
              >
                {viewModeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="create-pack-popup__help">
                {tPopup('viewMode.help')}
              </p>
            </div>

            <div className="create-pack-popup__field">
              <label className="create-pack-popup__checkbox-label">
                <input
                  type="checkbox"
                  className="create-pack-popup__checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => handleInputChange('isPinned', e.target.checked)}
                />
                <span className="create-pack-popup__checkbox-text">
                  {tPopup('pinned.label')}
                </span>
              </label>
              <p className="create-pack-popup__help">
                {tPopup('pinned.help')}
              </p>
            </div>
          </div>

          <div className="create-pack-popup__footer">
            <button
              type="button"
              className="create-pack-popup__cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              {tPopup('cancel')}
            </button>
            <button
              type="submit"
              className="create-pack-popup__create-btn"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? tPopup('creating') : tPopup('create')}
            </button>
          </div>
        </form>
      </div>

      {showImageSelector && (
        <ImageSelectorPopup
          isOpen={showImageSelector}
          onClose={() => setShowImageSelector(false)}
          onSave={handleIconUpload}
        />
      )}
    </div>
  );
};

export default CreatePackPopup;
