import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CrossIcon, ImageIcon, TrashIcon } from '@/components/common/icons';
import ImageSelectorPopup from '../../../common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { CustomSelect } from '@/components/common/selectors';
import './EditPackPopup.css';
import toast from 'react-hot-toast';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import api from '@/utils/api';
import { LevelPackViewModes } from '@/utils/constants';

const EditPackPopup = ({ pack, onClose, onUpdate, onDelete }) => {
  const { t } = useTranslation('components');
  
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
  const [transferOwnershipSearch, setTransferOwnershipSearch] = useState('');
  const [transferOwnershipUsers, setTransferOwnershipUsers] = useState([]);
  const [transferOwnershipLoading, setTransferOwnershipLoading] = useState(false);
  const [transferringOwnership, setTransferringOwnership] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);
  const transferSearchRef = useRef(null);
  const transferDropdownRef = useRef(null);

  // View mode options
  const viewModeOptions = [
    { value: LevelPackViewModes.LINKONLY.toString(), label: t('packPopups.editPack.viewMode.linkonly') },
    { value: LevelPackViewModes.PRIVATE.toString(), label: t('packPopups.editPack.viewMode.private') }
  ];

  if (hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    viewModeOptions.splice(0, 0, 
      { value: LevelPackViewModes.PUBLIC.toString(), label: t('packPopups.editPack.viewMode.public') }, 
      { value: LevelPackViewModes.FORCED_PRIVATE.toString(), label: t('packPopups.editPack.viewMode.forcedPrivate') });
  }

  // CSS theme options
  const cssThemeOptions = [
    { value: 0, label: t('packPopups.editPack.theme.default') },
    { value: 1, label: t('packPopups.editPack.theme.dark') },
    { value: 2, label: t('packPopups.editPack.theme.neon') },
    { value: 3, label: t('packPopups.editPack.theme.pastel') }
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

      toast.success(t('packPopups.editPack.success.iconUploaded'));
    } catch (error) {
      console.error('Error uploading pack icon:', error);
      const errorMessage = error.response?.data?.error || t('packPopups.editPack.errors.iconUploadFailed');
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

      toast.success(t('packPopups.editPack.success.iconRemoved'));
    } catch (error) {
      console.error('Error removing pack icon:', error);
      const errorMessage = error.response?.data?.error || t('packPopups.editPack.errors.iconRemoveFailed');
      toast.error(errorMessage);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('packPopups.editPack.errors.nameRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/v2/database/levels/packs/${pack.id}`, formData);
      onUpdate?.(response.data);
      onClose();
      toast.success(t('packPopups.editPack.success.updated'));
    } catch (error) {
      console.error('Error updating pack:', error);
      toast.error(error.response?.data?.error || t('packPopups.editPack.errors.updateFailed'));
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
      toast.success(t('packPopups.editPack.success.deleted'));
    } catch (error) {
      console.error('Error deleting pack:', error);
      toast.error(error.response?.data?.error || t('packPopups.editPack.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Search users for ownership transfer
  useEffect(() => {
    const searchUsers = async () => {
      if (!transferOwnershipSearch || transferOwnershipSearch.length < 1) {
        setTransferOwnershipUsers([]);
        return;
      }

      setTransferOwnershipLoading(true);
      try {
        const encodedSearch = encodeURIComponent(transferOwnershipSearch);
        const response = await api.get(`/v2/database/levels/packs/users/search/${encodedSearch}`);
        setTransferOwnershipUsers(response.data || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setTransferOwnershipUsers([]);
      } finally {
        setTransferOwnershipLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [transferOwnershipSearch]);

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error(t('packPopups.editPack.errors.selectNewOwner'));
      return;
    }

    setTransferringOwnership(true);
    try {
      const response = await api.put(`/v2/database/levels/packs/${pack.id}/transfer-ownership`, {
        newOwnerId: selectedNewOwner.id
      });
      
      toast.success(t('packPopups.editPack.success.ownershipTransferred'));
      onUpdate?.(response.data.pack);
      setSelectedNewOwner(null);
      setTransferOwnershipSearch('');
      setTransferOwnershipUsers([]);
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast.error(error.response?.data?.error || t('packPopups.editPack.errors.transferFailed'));
    } finally {
      setTransferringOwnership(false);
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
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  // Position dropdown portal and handle clicks outside
  useEffect(() => {
    if (transferOwnershipSearch.length >= 1 && transferSearchRef.current && transferDropdownRef.current) {
      const updatePosition = () => {
        if (!transferSearchRef.current || !transferDropdownRef.current) return;
        
        const containerRect = transferSearchRef.current.getBoundingClientRect();
        const dropdown = transferDropdownRef.current;
        
        // Position dropdown below the input
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${containerRect.bottom + window.scrollY}px`;
        dropdown.style.left = `${containerRect.left + window.scrollX}px`;
        dropdown.style.width = `${containerRect.width}px`;
        dropdown.style.zIndex = '10000';
      };

      updatePosition();

      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      const handleClickOutside = (event) => {
        if (
          transferDropdownRef.current &&
          !transferDropdownRef.current.contains(event.target) &&
          transferSearchRef.current &&
          !transferSearchRef.current.contains(event.target)
        ) {
          // Small delay to allow option clicks to register
          setTimeout(() => {
            if (!selectedNewOwner) {
              setTransferOwnershipSearch('');
              setTransferOwnershipUsers([]);
            }
          }, 100);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [transferOwnershipSearch, selectedNewOwner]);

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
          <h2 className="edit-pack-popup__title">{t('packPopups.editPack.title')}</h2>
          <button className="edit-pack-popup__close" onClick={onClose}>
            <CrossIcon />
          </button>
        </div>

        <form className="edit-pack-popup__form" onSubmit={handleSubmit}>
          <div className="edit-pack-popup__body">
            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {t('packPopups.editPack.name.label')} *
              </label>
              <input
                type="text"
                className="edit-pack-popup__input"
                placeholder={t('packPopups.editPack.name.placeholder')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                maxLength={100}
                required
                disabled={!canEdit}
              />
              <p className="edit-pack-popup__help">
                {t('packPopups.editPack.name.help')}
              </p>
            </div>

            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {t('packPopups.editPack.icon.label')}
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
                      {uploadingIcon ? t('packPopups.editPack.icon.uploading') : t('packPopups.editPack.icon.upload')}
                    </span>
                  </button>
                  {formData.iconUrl && (
                    <button
                      type="button"
                      className="edit-pack-popup__icon-remove-btn"
                      onClick={handleIconRemove}
                      disabled={!canEdit || uploadingIcon}
                    >
                      {uploadingIcon ? t('packPopups.editPack.icon.removing') : t('packPopups.editPack.icon.remove')}
                    </button>
                  )}
                </div>
              </div>
              <p className="edit-pack-popup__help">
                {t('packPopups.editPack.icon.help')}
              </p>
            </div>

{/*
            <div className="edit-pack-popup__field">
              <label className="edit-pack-popup__label">
                {t('packPopups.editPack.theme.label')}
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
                {t('packPopups.editPack.theme.help')}
              </p>
            </div>
*/}

            <div className="edit-pack-popup__field">
              <CustomSelect
                label={t('packPopups.editPack.viewMode.label')}
                options={viewModeOptions}
                value={viewModeOptions.find(opt => opt.value === formData.viewMode.toString())}
                onChange={(selected) => handleInputChange('viewMode', parseInt(selected.value))}
                width="100%"
                isDisabled={!canEdit || (isForcedPrivate && !hasFlag(user, permissionFlags.SUPER_ADMIN))}
              />
              <p className="edit-pack-popup__help">
                {isForcedPrivate 
                  ? t('packPopups.editPack.viewMode.forcedPrivateHelp')
                  : t('packPopups.editPack.viewMode.help')
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
                    {t('packPopups.editPack.pinned.label')}
                  </span>
                </label>
                <p className="edit-pack-popup__help">
                  {t('packPopups.editPack.pinned.help')}
                </p>
              </div>
            )}

            {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <div className="edit-pack-popup__field">
                <label className="edit-pack-popup__label">
                  {t('packPopups.editPack.transferOwnership.label')}
                </label>
                {pack.packOwner && (
                  <div className="edit-pack-popup__transfer-current-owner">
                    <span className="edit-pack-popup__transfer-current-label">
                      {t('packPopups.editPack.transferOwnership.currentOwner')}:
                    </span>
                    <span className="edit-pack-popup__transfer-current-name">
                      {pack.packOwner.nickname || pack.packOwner.username}
                    </span>
                  </div>
                )}
                <div className="edit-pack-popup__transfer-ownership">
                  <div className="edit-pack-popup__transfer-search" ref={transferSearchRef}>
                    <input
                      type="text"
                      className="edit-pack-popup__input"
                      placeholder={t('packPopups.editPack.transferOwnership.placeholder')}
                      value={transferOwnershipSearch}
                      onChange={(e) => {
                        setTransferOwnershipSearch(e.target.value);
                        setSelectedNewOwner(null);
                      }}
                      disabled={transferringOwnership}
                    />
                  </div>
                  {transferOwnershipSearch.length >= 1 && createPortal(
                    <div className="edit-pack-popup__transfer-dropdown" ref={transferDropdownRef}>
                      {transferOwnershipLoading ? (
                        <div className="edit-pack-popup__transfer-loading">
                          {t('packPopups.editPack.transferOwnership.searching')}
                        </div>
                      ) : transferOwnershipUsers.length === 0 ? (
                        <div className="edit-pack-popup__transfer-no-results">
                          {t('packPopups.editPack.transferOwnership.noResults')}
                        </div>
                      ) : (
                        transferOwnershipUsers.map((userOption) => (
                          <div
                            key={userOption.id}
                            className={`edit-pack-popup__transfer-option ${selectedNewOwner?.id === userOption.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedNewOwner(userOption);
                              setTransferOwnershipSearch('');
                              setTransferOwnershipUsers([]);
                            }}
                          >
                            <span className="edit-pack-popup__transfer-option-name">
                              {userOption.nickname || userOption.username}
                            </span>
                            {userOption.username !== userOption.nickname && (
                              <span className="edit-pack-popup__transfer-option-username">
                                @{userOption.username}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>,
                    document.body
                  )}
                  {selectedNewOwner && (
                    <div className="edit-pack-popup__transfer-selected">
                      <span className="edit-pack-popup__transfer-selected-label">
                        {t('packPopups.editPack.transferOwnership.selected')}:
                      </span>
                      <span className="edit-pack-popup__transfer-selected-name">
                        {selectedNewOwner.nickname || selectedNewOwner.username}
                      </span>
                      <button
                        type="button"
                        className="edit-pack-popup__transfer-btn"
                        onClick={handleTransferOwnership}
                        disabled={transferringOwnership || !canEdit}
                      >
                        {transferringOwnership ? t('packPopups.editPack.transferOwnership.transferring') : t('packPopups.editPack.transferOwnership.transfer')}
                      </button>
                    </div>
                  )}
                </div>
                <p className="edit-pack-popup__help">
                  {t('packPopups.editPack.transferOwnership.help')}
                </p>
              </div>
            )}

            {!canEdit && (
              <div className="edit-pack-popup__no-permission">
                <p>{t('packPopups.editPack.noPermission')}</p>
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
                  <span>{t('packPopups.editPack.delete')}</span>
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
                {t('buttons.cancel', { ns : "common"})}
              </button>
              <button
                type="submit"
                className="edit-pack-popup__save-btn"
                disabled={loading || !canEdit || !formData.name.trim()}
              >
                {loading ? t('packPopups.editPack.saving') : t('packPopups.editPack.save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="edit-pack-popup__delete-confirm">
          <div className="edit-pack-popup__delete-confirm-content">
            <h3>{t('packPopups.editPack.deleteConfirm.title')}</h3>
            <p>{t('packPopups.editPack.deleteConfirm.message')}</p>
            <div className="edit-pack-popup__delete-confirm-actions">
              <button
                className="edit-pack-popup__delete-cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                {t('buttons.cancel', { ns : "common"})}
              </button>
              <button
                className="edit-pack-popup__delete-confirm-btn"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? t('buttons.deleting', { ns : "common" }) : t('buttons.confirm', { ns : "common" })}
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
