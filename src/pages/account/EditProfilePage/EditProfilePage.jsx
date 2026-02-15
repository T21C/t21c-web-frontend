import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import './editProfilePage.css';
import { CrossIcon, DiscordIcon, EditIcon, UnlinkIcon } from '@/components/common/icons';
import { Tooltip } from 'react-tooltip';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { CountrySelect } from '@/components/common/selectors';
import { useTranslation } from 'react-i18next';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

const usernameChangeCooldown = 1 * 24 * 60 * 60 * 1000; // 1 day

const ProviderIcon = ({ provider, size, color="#fff" }) => {
  switch(provider) {
    case 'discord':
      return <DiscordIcon size={size} color={color} />;
    default:
      return null;
  }
};

const EditProfilePage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const { user, changePassword, linkProvider, unlinkProvider, setUser, fetchUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    nickname: user?.nickname || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    country: user?.player?.country || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const hasNoPassword = user?.password === null;
  const navigate = useNavigate();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ? user.avatarUrl : null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [initialImage, setInitialImage] = useState(null);
  const [usernameRateLimit, setUsernameRateLimit] = useState(null);
  const [usernameTimer, setUsernameTimer] = useState(null);
  const timerIntervalRef = useRef(null);
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);
  const [originalUsername, setOriginalUsername] = useState(user?.username || '');

  useEffect(() => {
    if (isPopupOpen) {
      // Lock scrolling
      document.body.style.overflowY = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      // Restore scrolling
      document.body.style.overflowY = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      // Cleanup: ensure scrolling is restored
      document.body.style.overflowY = '';
      document.body.style.paddingRight = '';
    };
  }, [isPopupOpen]);

  // Check for existing rate limit on mount
  useEffect(() => {
    if (user?.lastUsernameChange) {
      const lastChange = new Date(user.lastUsernameChange).getTime();
      const now = Date.now();
      const msSinceLastChange = now - lastChange;
      const msRemaining = usernameChangeCooldown - msSinceLastChange;

      if (msRemaining > 0) {
        const nextAvailableChange = new Date(lastChange + usernameChangeCooldown);
        setUsernameRateLimit({
          nextAvailableChange: nextAvailableChange.toISOString(),
          timeRemaining: {
            milliseconds: msRemaining
          }
        });
      }
    }
    // Initialize original username when user data loads
    if (user?.username) {
      setOriginalUsername(user.username);
      setFormData(prev => ({
        ...prev,
        username: user.username
      }));
    }
  }, [user?.lastUsernameChange, user?.username]);

  // Username rate limit timer effect
  useEffect(() => {
    if (usernameRateLimit?.nextAvailableChange) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const nextAvailable = new Date(usernameRateLimit.nextAvailableChange).getTime();
        const msRemaining = nextAvailable - now;

        if (msRemaining <= 0) {
          // Timer expired, clear rate limit
          setUsernameRateLimit(null);
          setUsernameTimer(null);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return;
        }

        const hours = Math.floor(msRemaining / (60 * 60 * 1000));
        const minutes = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((msRemaining % (60 * 1000)) / 1000);

        setUsernameTimer({
          hours,
          minutes,
          seconds,
          formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        });
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else {
      setUsernameTimer(null);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [usernameRateLimit]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('editProfile.error.newPasswordsDoNotMatch'));
      return;
    }

    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess(t('editProfile.success.passwordChanged'));
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setIsChangingPassword(false);
    } catch (err) {
      setError(err.message || t('editProfile.error.failedToChangePassword'));
    }
  };

  const handleProviderLink = async (provider) => {
    try {
      setError('');
      setSuccess('');
      await linkProvider(provider);
      setSuccess(t('editProfile.success.accountLinked', { provider }));
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.error.failedToLinkAccount', { provider }));
    }
  };

  const handleProviderUnlink = async (provider) => {
    try {
      await unlinkProvider(provider);
      setSuccess(t('editProfile.success.accountUnlinked', { provider }));
    } catch (err) {
      setError(err.message || t('editProfile.error.failedToUnlinkAccount', { provider }));
    }
  };


  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('editProfile.error.invalidFileType'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setInitialImage(reader.result);
      setIsPopupOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
    setInitialImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePopupSave = async (file) => {
    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post(`${import.meta.env.VITE_PROFILE}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const avatarUrl = response.data.avatar.urls.medium;
      setAvatarPreview(avatarUrl);
      setUser({ ...user, avatarUrl});
      toast.success(t('editProfile.success.avatarUploaded'));
    } catch (error) {
      const errorData = error.response?.data;
      
      if (errorData?.code === 'VALIDATION_ERROR') {
        errorData.details.errors.forEach(err => toast.error(err));
        setUploadError(errorData.details.errors.join(', '));
      } else {
        setUploadError(errorData?.error || t('editProfile.error.failedToUploadAvatar'));
        toast.error(errorData?.error || t('editProfile.error.failedToUploadAvatar'));
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatarUrl) return;

    const confirmed = window.confirm(t('editProfile.avatar.confirmRemove'));
    if (!confirmed) return;

    setIsUploadingAvatar(true);
    try {
      await api.delete(`${import.meta.env.VITE_PROFILE}/avatar`);

      setAvatarPreview(null);
      setUser({ ...user, avatarUrl: null, avatarId: null });
      toast.success(t('editProfile.success.avatarRemoved'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('editProfile.error.failedToRemoveAvatar'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('editProfile.error.invalidFileType'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setInitialImage(reader.result);
      setIsPopupOpen(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCountryChange = (country) => {
    setFormData((prev) => ({
      ...prev,
      country,
    }));
  };

  const handleUsernameEditClick = () => {
    if (usernameRateLimit) return; // Don't allow editing if rate limited
    setOriginalUsername(formData.username);
    setIsUsernameEditing(true);
  };

  const handleUsernameCancel = () => {
    setFormData((prev) => ({
      ...prev,
      username: originalUsername,
    }));
    setIsUsernameEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`${import.meta.env.VITE_PROFILE}/me`, {
        username: formData.username,
        nickname: formData.nickname,
        country: formData.country,
      });

      // Clear rate limit state on successful update
      setUsernameRateLimit(null);
      setUsernameTimer(null);
      setIsUsernameEditing(false);
      setOriginalUsername(formData.username);
      
      fetchUser();
      toast.success(t('editProfile.success.profileUpdated'));
      navigate('/profile');
    } catch (error) {
      const errorData = error.response?.data;
      
      // Handle username rate limit (429)
      if (errorData?.code === 429 && errorData?.nextAvailableChange) {
        setUsernameRateLimit({
          nextAvailableChange: errorData.nextAvailableChange,
          timeRemaining: errorData.timeRemaining
        });
        
        // Reset username to original value
        setFormData(prev => ({
          ...prev,
          username: originalUsername
        }));
        setIsUsernameEditing(false);
        
        toast.error(errorData.error || t('editProfile.error.usernameChangeRateLimited'));
      } else {
        toast.error(errorData?.error || t('editProfile.error.failedToUpdateProfile'));
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isLastProvider = user?.password === null && user?.providers?.length === 1;

  return (
    <>
    
    <div className="edit-profile-page">
      <div className="edit-profile-container">
        <h1>{t('editProfile.title')}</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="avatar-section">
          <div 
            className={`avatar-upload-area ${isDragging ? 'dragging' : ''} ${uploadError ? 'error' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <img 
                src={avatarPreview} 
                alt="Profile" 
                className="avatar-preview"
              />
            ) : (
              <div className="avatar-placeholder">
                <i className="fas fa-user"></i>
                <span>{t('editProfile.avatar.dragDropOrClick')}</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          {avatarPreview && (
            <button 
              className="remove-avatar-btn"
              onClick={handleAvatarRemove}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? t('editProfile.avatar.removing') : t('editProfile.avatar.removeAvatar')}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="form-group">
            <label htmlFor="username">
              {t('editProfile.form.labels.username')}
              {usernameTimer && (
                <span className="username-timer">
                  ({usernameTimer.formatted})
                </span>
              )}
            </label>
            <div className="username-input-wrapper">
              <input
                type="text"
                autoComplete='off'
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`input-field ${usernameRateLimit ? 'disabled' : ''} ${!isUsernameEditing ? 'readonly' : ''}`}
                disabled={!!usernameRateLimit || !isUsernameEditing}
                readOnly={!isUsernameEditing && !usernameRateLimit}
              />
              {!usernameRateLimit && (
                <button
                  type="button"
                  className={`username-action-btn ${isUsernameEditing ? 'cancel' : 'edit'}`}
                  onClick={isUsernameEditing ? handleUsernameCancel : handleUsernameEditClick}
                  disabled={isSavingProfile && isUsernameEditing}
                  title={isUsernameEditing ? t('buttons.cancel', { ns: 'common' }) : t('buttons.edit', { ns: 'common' })}
                >
                  <span className="username-action-icon">
                    {isUsernameEditing ? (
                      <CrossIcon style={{transform: 'rotate(45deg)'}} color="#fff" size={"24px"} />
                    ) : (
                      <EditIcon color="#fff" size={"24px"} />
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="nickname">{t('editProfile.form.labels.nickname')}</label>
            <input
              type="text"
              autoComplete='off'
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              required
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('editProfile.form.labels.email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled
              className="input-field disabled"
            />
            {!hasFlag(user, permissionFlags.EMAIL_VERIFIED) && (
              <div className="email-verification-message" onClick={() => navigate('/profile/verify-email')}>
                <span className="profile-banner-text">{t('editProfile.form.emailVerification.message')}</span>
                <span className="email-verification-arrow">{t('editProfile.form.emailVerification.arrow')}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="country">{t('editProfile.form.labels.country')}</label>
            <CountrySelect 
              value={formData.country}
              onChange={handleCountryChange}
              required
            />
          </div>

          <div className="form-actions">
            <button 
              className="button"
              type="button" 
              onClick={() => navigate('/profile')}
              disabled={isSavingProfile}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button 
              className="button submit-button"
              type="submit"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? t('loading.saving', { ns: 'common' }) : t('editProfile.form.buttons.saveChanges')}
            </button>
          </div>
        </form>

        <div className="section-divider" />

        <h2>{hasNoPassword ? t('editProfile.password.addPassword') : t('editProfile.password.title')}</h2>
        {hasNoPassword ? (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="newPassword">{t('editProfile.password.newPassword')}</label>
              <input
                className="input-field"
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('editProfile.password.confirmPassword')}</label>
              <input
                className="input-field"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="save-button">
              {t('editProfile.password.createPassword')}
            </button>
          </form>
        ) : !isChangingPassword ? (
          <button
            className="change-password-button"
            onClick={() => setIsChangingPassword(true)}
          >
            {t('editProfile.password.changePassword')}
          </button>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="currentPassword">{t('editProfile.password.currentPassword')}</label>
              <input
                className="input-field"
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">{t('editProfile.password.newPassword')}</label>
              <input
                className="input-field"
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('editProfile.password.confirmNewPassword')}</label>
              <input
                className="input-field"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="save-button">
              {t('editProfile.password.updatePassword')}
            </button>
            <button
              type="button"
              className="change-password-button"
              onClick={() => setIsChangingPassword(false)}
              style={{ marginTop: '1rem' }}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
          </form>
        )}

        <div className="section-divider" />

        <h2>{t('editProfile.linkedAccounts.title')}</h2>
        <div className="linked-accounts">
          {user?.providers?.some(p => p.name === 'discord') ? (
            <div className="provider-info">
              <div className="provider-details">
                <ProviderIcon provider="discord" size={32}/>
                <span>{t('editProfile.linkedAccounts.discord')}</span>
                {user?.providers?.find(p => p.name === 'discord')?.profile?.username && (
                  <span className="provider-username">
                    @{user.providers.find(p => p.name === 'discord').profile.username}
                  </span>
                )}
              </div>
              <div className="unlink-container">
                <button
                  className={`unlink-button ${isLastProvider ? 'disabled' : ''}`}
                  onClick={() => handleProviderUnlink('discord')}
                  disabled={isLastProvider}
                  data-tooltip-id="unlink-tooltip"
                  data-tooltip-content={isLastProvider ? t('editProfile.linkedAccounts.cannotUnlinkLastProvider') : undefined}
                >
                  {t('editProfile.linkedAccounts.unlink')}
                  <UnlinkIcon color="#fff" size={"24px"} />
                </button>
                <Tooltip id="unlink-tooltip" />
              </div>
            </div>
          ) : (
            <button
              className="link-button"
              onClick={() => handleProviderLink('discord')}
            >
              <DiscordIcon size={16} />
              {t('editProfile.linkedAccounts.linkDiscord')}
            </button>
          )}
        </div>
      </div>
    </div>

    <ImageSelectorPopup
      isOpen={isPopupOpen}
      onClose={handlePopupClose}
      onSave={handlePopupSave}
      currentAvatar={avatarPreview}
      initialImage={initialImage}
    />
    </>
  );
};

export default EditProfilePage; 