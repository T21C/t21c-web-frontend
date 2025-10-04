import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CrossIcon, ImageIcon, TrashIcon } from '@/components/common/icons';
import ImageSelectorPopup from '../ImageSelectorPopup/ImageSelectorPopup';
import './EditPackPopup.css';
import toast from 'react-hot-toast';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import api from '@/utils/api';
import { LevelPackViewModes } from '@/utils/constants';

const EditPackPopup = ({ pack, onClose, onUpdate, onDelete }) => {
  const { t } = useTranslation('components');
  const tPopup = (key) => t(`packPopups.editPack.${key}`) || key;
  
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: pack.name || '',
    iconUrl: pack.iconUrl || '',
    cssFlags: pack.cssFlags || 0,
    viewMode: pack.viewMode || 3,
    isPinned: pack.isPinned || false
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // View mode options
  const viewModeOptions = [
    { value: LevelPackViewModes.LINKONLY, label: tPopup('viewMode.linkonly') },
    { value: LevelPackViewModes.PRIVATE, label: tPopup('viewMode.private') }
  ];

  if (hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    viewModeOptions.splice(0, 0, 
      { value: LevelPackViewModes.PUBLIC, label: tPopup('viewMode.public') }, 
      { value: LevelPackViewModes.FORCED_PRIVATE, label: tPopup('viewMode.forcedPrivate') });
  }

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
      const formData = new FormData();
      formData.append('icon', file);

      const response = await api.post(`/v2/database/levels/packs/${pack.id}/icon`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update form data with new icon URL
      setFormData(prev => ({
        ...prev,
        iconUrl: response.data.icon.urls.original
      }));

      toast.success(tPopup('success.iconUploaded'));
    } catch (error) {
      console.error('Error uploading pack icon:', error);
      const errorMessage = error.response?.data?.error || tPopup('errors.iconUploadFailed');
      toast.error(errorMessage);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleIconRemove = async () => {
    setUploadingIcon(true);
    try {
      await api.delete(`/v2/database/levels/packs/${pack.id}/icon`);

      // Update form data to remove icon URL
      setFormData(prev => ({
        ...prev,
        iconUrl: ''
      }));

      toast.success(tPopup('success.iconRemoved'));
    } catch (error) {
      console.error('Error removing pack icon:', error);
      const errorMessage = error.response?.data?.error || tPopup('errors.iconRemoveFailed');
      toast.error(errorMessage);
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
      const response = await api.put(`/v2/database/levels/packs/${pack.id}`, formData);
      onUpdate?.(response.data);
      onClose();
      toast.success(tPopup('success.updated'));
    } catch (error) {
      console.error('Error updating pack:', error);
      toast.error(error.response?.data?.error || tPopup('errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/v2/database/levels/packs/${pack.id}`);
      onClose();
      // Call the onDelete callback if provided (for navigation, etc.)
      onDelete?.();
      toast.success(tPopup('success.deleted'));
    } catch (error) {
      console.error('Error deleting pack:', error);
      toast.error(error.response?.data?.error || tPopup('errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Close popup when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('edit-pack-popup')) {
      onClose();
    }
  };

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const canEdit = user && (
    pack.ownerId === user.id || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  const canDelete = user && (
    pack.ownerId === user.id || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  const isForcedPrivate = pack.viewMode === LevelPackViewModes.FORCED_PRIVATE;

  return (
    <div className="edit-pack-popup" onClick={handleBackdropClick}>
      <div className="edit-pack-popup__content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-pack-popup__header">
          <h2 className="edit-pack-popup__title">{tPopup('title')}</h2>
          <button className="edit-pack-popup__close" onClick={onClose}>
            <CrossIcon />
          </button>
        </div>

        <form className="edit-pack-popup__form" onSubmit={handleSubmit}>
          <div className="edit-pack-popup__body">
            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {tPopup('name.label')} *
              </label>
              <input
                type="text"
                className="edit-pack-popup__input"
                placeholder={tPopup('name.placeholder')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                maxLength={100}
                required
                disabled={!canEdit}
              />
              <p className="edit-pack-popup__help">
                {tPopup('name.help')}
              </p>
            </div>

            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {tPopup('icon.label')}
              </label>
              <div className="edit-pack-popup__icon-section">
                {formData.iconUrl && (
                  <div className="edit-pack-popup__icon-preview">
                    <img 
                      src={formData.iconUrl} 
                      alt="Pack icon" 
                      className="edit-pack-popup__icon-preview-img"
                    />
                  </div>
                )}
                <div className="edit-pack-popup__icon-actions">
                  <button
                    type="button"
                    className="edit-pack-popup__icon-upload-btn"
                    onClick={() => setShowImageSelector(true)}
                    disabled={!canEdit || uploadingIcon}
                  >
                    <ImageIcon />
                    <span>
                      {uploadingIcon ? tPopup('icon.uploading') : tPopup('icon.upload')}
                    </span>
                  </button>
                  {formData.iconUrl && (
                    <button
                      type="button"
                      className="edit-pack-popup__icon-remove-btn"
                      onClick={handleIconRemove}
                      disabled={!canEdit || uploadingIcon}
                    >
                      {uploadingIcon ? tPopup('icon.removing') : tPopup('icon.remove')}
                    </button>
                  )}
                </div>
              </div>
              <p className="edit-pack-popup__help">
                {tPopup('icon.help')}
              </p>
            </div>

{/*
            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {tPopup('theme.label')}
              </label>
              <select
                className="edit-pack-popup__select"
                value={formData.cssFlags}
                onChange={(e) => handleInputChange('cssFlags', parseInt(e.target.value))}
                disabled={!canEdit}
              >
                {cssThemeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="edit-pack-popup__help">
                {tPopup('theme.help')}
              </p>
            </div>
*/}

            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {tPopup('viewMode.label')}
              </label>
              <select
                className="edit-pack-popup__select"
                value={formData.viewMode}
                onChange={(e) => handleInputChange('viewMode', e.target.value)}
                disabled={!canEdit || (isForcedPrivate && !hasFlag(user, permissionFlags.SUPER_ADMIN))}
              >
                {viewModeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {isForcedPrivate && (
                  <option value={LevelPackViewModes.FORCED_PRIVATE} disabled>
                    {tPopup('viewMode.forcedPrivate')} (Admin Locked)
                  </option>
                )}
              </select>
              <p className="edit-pack-popup__help">
                {isForcedPrivate 
                  ? tPopup('viewMode.forcedPrivateHelp')
                  : tPopup('viewMode.help')
                }
              </p>
            </div>

            {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <div className="edit-pack-popup__field">
                <label className="edit-pack-popup__checkbox-label">
                  <input
                    type="checkbox"
                    className="edit-pack-popup__checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => handleInputChange('isPinned', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="edit-pack-popup__checkbox-text">
                    {tPopup('pinned.label')}
                  </span>
                </label>
                <p className="edit-pack-popup__help">
                  {tPopup('pinned.help')}
                </p>
              </div>
            )}

            {!canEdit && (
              <div className="edit-pack-popup__no-permission">
                <p>{tPopup('noPermission')}</p>
              </div>
            )}
          </div>

          <div className="edit-pack-popup__footer">
            <div className="edit-pack-popup__footer-left">
              {canDelete && (
                <button
                  type="button"
                  className="edit-pack-popup__delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                >
                  <TrashIcon />
                  <span>{tPopup('delete')}</span>
                </button>
              )}
            </div>
            
            <div className="edit-pack-popup__footer-right">
              <button
                type="button"
                className="edit-pack-popup__cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                {tPopup('cancel')}
              </button>
              <button
                type="submit"
                className="edit-pack-popup__save-btn"
                disabled={loading || !canEdit || !formData.name.trim()}
              >
                {loading ? tPopup('saving') : tPopup('save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="edit-pack-popup__delete-confirm">
          <div className="edit-pack-popup__delete-confirm-content">
            <h3>{tPopup('deleteConfirm.title')}</h3>
            <p>{tPopup('deleteConfirm.message')}</p>
            <div className="edit-pack-popup__delete-confirm-actions">
              <button
                className="edit-pack-popup__delete-cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                {tPopup('deleteConfirm.cancel')}
              </button>
              <button
                className="edit-pack-popup__delete-confirm-btn"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? tPopup('deleting') : tPopup('deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageSelector && (
        <ImageSelectorPopup
          isOpen={showImageSelector}
          onClose={() => setShowImageSelector(false)}
          onSave={handleIconUpload}
          currentAvatar={formData.iconUrl}
        />
      )}
    </div>
  );
};

export default EditPackPopup;
