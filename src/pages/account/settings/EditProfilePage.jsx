import { routes } from '@/api/routes';
// tuf-search: #EditProfilePage #editProfilePage #account #settings
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import './editProfilePage.css';
import { CrossIcon, EditIcon } from '@/components/common/icons';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { ChangeEmailPopup } from '@/components/popups/Users';
import { CountrySelect } from '@/components/common/selectors';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { hasAccountEmail } from '@/utils/accountEmail';
import { AccountStatusBanners } from '@/components/account/AccountStatusBanners/AccountStatusBanners';
import { CDN_IMAGE_ACCEPT, isCdnSupportedImageMimeType } from '@/config/constants/cdnImageAccept';
import { userAvatarDisplayUrl } from '@/utils/playerAvatarDisplay';
import {
  getUsernameFormatError,
  isUsernameChanging,
  sanitizeUsernameInput,
  USERNAME_MAX_LEN,
} from '@/utils/usernameValidation';

const usernameChangeCooldown = 1 * 24 * 60 * 60 * 1000; // 1 day

const EditProfilePage = ({ embeddedInSettings = false } = {}) => {
  const { t } = useTranslation(['pages', 'common']);
  const {
    user,
    changeEmail,
    cancelPendingEmail,
    setUser,
    fetchUser,
  } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    nickname: user?.nickname || '',
    country: user?.player?.country || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user ? userAvatarDisplayUrl(user) : null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [isAvatarPopupOpen, setIsAvatarPopupOpen] = useState(false);
  const [isEmailChangePopupOpen, setIsEmailChangePopupOpen] = useState(false);
  const [initialImage, setInitialImage] = useState(null);
  const [usernameRateLimit, setUsernameRateLimit] = useState(null);
  const [usernameTimer, setUsernameTimer] = useState(null);
  const timerIntervalRef = useRef(null);
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);
  const [originalUsername, setOriginalUsername] = useState(user?.username || '');

  useBodyScrollLock(isAvatarPopupOpen || isEmailChangePopupOpen);

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
    if (name === 'username') {
      const sanitized = sanitizeUsernameInput(value);
      setFormData((prev) => ({
        ...prev,
        [name]: sanitized,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const performAvatarUpload = useCallback(
    async (file) => {
      setIsUploadingAvatar(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const response = await api.post(`${routes.auth.profile.root()}/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        const urls = response.data.avatar?.urls;
        const isGifUpload = Boolean(response.data.avatarIsGif);
        const nextUrl =
          isGifUpload && urls?.original_animated
            ? urls.original_animated
            : urls?.medium ?? urls?.original ?? null;
        setAvatarPreview(nextUrl);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                avatarUrl: nextUrl,
                avatarIsGif: isGifUpload,
              }
            : prev,
        );
        toast.success(t('editProfile.success.avatarUploaded'));
      } catch (error) {
        const msg = getCdnErrorMessage(error, t('editProfile.error.failedToUploadAvatar'));
        setUploadError(msg);
        toast.error(msg);
      } finally {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [setUser, t],
  );

  const beginAvatarFileSelection = useCallback((file) => {
    if (!isCdnSupportedImageMimeType(file.type)) {
      toast.error(t('editProfile.error.invalidFileType'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setInitialImage(reader.result);
      setIsAvatarPopupOpen(true);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    beginAvatarFileSelection(file);
  };

  const handlePopupClose = () => {
    setIsAvatarPopupOpen(false);
    setInitialImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePopupSave = async (file) => {
    await performAvatarUpload(file);
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatarUrl) return;

    const confirmed = window.confirm(t('editProfile.avatar.confirmRemove'));
    if (!confirmed) return;

    setIsUploadingAvatar(true);
    try {
      await api.delete(`${routes.auth.profile.root()}/avatar`);

      setAvatarPreview(null);
      setUser({ ...user, avatarUrl: null, avatarId: null, avatarIsGif: false });
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

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;
      beginAvatarFileSelection(file);
    },
    [beginAvatarFileSelection],
  );

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

    if (formData.username) {
      const usernameFormatError = getUsernameFormatError(formData.username);
      if (usernameFormatError?.type === 'length') {
        setError(t('editProfile.error.usernameLength'));
        setIsSavingProfile(false);
        return;
      }
      if (usernameFormatError?.type === 'consecutivePeriods') {
        setError(t('editProfile.error.usernameConsecutivePeriods'));
        setIsSavingProfile(false);
        return;
      }
      if (usernameFormatError?.type === 'characters') {
        setError(t('editProfile.error.usernameAlphanumeric'));
        setIsSavingProfile(false);
        return;
      }
    }

    try {
      const profilePayload = {};

      if (
        isUsernameEditing ||
        isUsernameChanging(formData.username, originalUsername)
      ) {
        profilePayload.username = formData.username;
      }

      if (formData.country !== (user?.player?.country || '')) {
        profilePayload.country = formData.country;
      }

      if (!user?.playerId && formData.nickname !== (user?.nickname || '')) {
        profilePayload.nickname = formData.nickname;
      }

      await api.put(`${routes.auth.profile.root()}/me`, profilePayload);

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

  const isProfileFormUnchanged = useMemo(() => {
    if (!user) return true;
    const uName = user.username || '';
    const uCountry = user.player?.country || '';
    const uNick = user.nickname || '';
    const nameMatch = (formData.username || '') === uName;
    const countryMatch = (formData.country || '') === uCountry;
    const nickMatch = user.playerId ? true : (formData.nickname || '') === (uNick || '');
    return nameMatch && countryMatch && nickMatch;
  }, [user, formData.username, formData.country, formData.nickname]);

  return (
    <>
    <AccountStatusBanners variant="edit" user={user} navigate={navigate} />
    <div className={`edit-profile-page${embeddedInSettings ? " edit-profile-page--embedded" : ""}`}>

      <div className="edit-profile-container page-content-600">
        {embeddedInSettings ? (
          <h2 className="edit-profile-page__page-title">{t("editProfile.title")}</h2>
        ) : (
          <h1 className="edit-profile-page__page-title">{t("editProfile.title")}</h1>
        )}

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
              accept={CDN_IMAGE_ACCEPT}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          {avatarPreview && (
            <button 
              className="remove-avatar-btn btn-fill-danger"
              onClick={handleAvatarRemove}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? t('editProfile.avatar.removing') : t('editProfile.avatar.removeAvatar')}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="form-group">
            <label htmlFor="profile-email-display">{t('editProfile.form.labels.email')}</label>
            <div className="username-input-wrapper">
              <input
                type="text"
                id="profile-email-display"
                readOnly
                className="input-field readonly"
                value={user?.email || ''}
                autoComplete="off"
              />
              <button
                type="button"
                className="username-action-btn edit btn-fill-secondary"
                onClick={() => setIsEmailChangePopupOpen(true)}
                disabled={isSavingProfile}
                title={
                  hasAccountEmail(user)
                    ? t('editProfile.emailChange.editTitle')
                    : t('editProfile.emailChange.setEditTitle')
                }
              >
                <span className="username-action-icon">
                  <EditIcon color="#fff" size="24px" />
                </span>
              </button>
            </div>
            {user?.pendingEmail && (
              <div
                className="email-verification-message email-verification-message--compact"
                role="status"
              >
                <span className="profile-banner-text">
                  Pending verification: {user.pendingEmail}
                </span>
                <button
                  type="button"
                  className="username-action-btn edit btn-fill-secondary"
                  onClick={() => navigate('/profile/verify-email')}
                >
                  Verify
                </button>
                <button
                  type="button"
                  className="username-action-btn edit btn-fill-secondary"
                  onClick={async () => {
                    try {
                      await cancelPendingEmail();
                      setSuccess('Pending email change cancelled');
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to cancel');
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {!hasAccountEmail(user) && !user?.pendingEmail && (
              <div
                className="email-verification-message email-verification-message--compact"
                role="button"
                tabIndex={0}
                onClick={() => setIsEmailChangePopupOpen(true)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setIsEmailChangePopupOpen(true);
                  }
                }}
              >
                <span className="profile-banner-text">{t('editProfile.form.emailMissing.message')}</span>
                <span className="email-verification-arrow">{t('editProfile.form.emailVerification.arrow')}</span>
              </div>
            )}
            {hasAccountEmail(user) && !hasFlag(user, permissionFlags.EMAIL_VERIFIED) && !user?.pendingEmail && (
              <div
                className="email-verification-message email-verification-message--compact"
                role="button"
                tabIndex={0}
                onClick={() => navigate('/profile/verify-email')}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    navigate('/profile/verify-email');
                  }
                }}
              >
                <span className="profile-banner-text">{t('editProfile.form.emailVerification.message')}</span>
                <span className="email-verification-arrow">{t('editProfile.form.emailVerification.arrow')}</span>
              </div>
            )}
          </div>

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
                maxLength={USERNAME_MAX_LEN}
              />
              {!usernameRateLimit && (
                <button
                  type="button"
                  className={`username-action-btn ${isUsernameEditing ? 'cancel btn-fill-danger' : 'edit btn-fill-secondary'}`}
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

          {user?.playerId ? (
            <div className="edit-profile-page__nickname-moved">
              <Link to="/settings/player" className="edit-profile-page__nickname-moved-link">
                {t('editProfile.nicknameMoved.hint')}
              </Link>
            </div>
          ) : (
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
          )}

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
              className="button btn-fill-neutral-dark"
              type="button" 
              onClick={() => navigate('/profile')}
              disabled={isSavingProfile}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button 
              className="button submit-button btn-fill-primary"
              type="submit"
              disabled={isSavingProfile || isProfileFormUnchanged}
            >
              {isSavingProfile ? t('loading.saving', { ns: 'common' }) : t('editProfile.form.buttons.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ImageSelectorPopup
      isOpen={isAvatarPopupOpen}
      onClose={handlePopupClose}
      onSave={handlePopupSave}
      currentAvatar={avatarPreview}
      initialImage={initialImage}
    />
    <ChangeEmailPopup
      isOpen={isEmailChangePopupOpen}
      onClose={() => setIsEmailChangePopupOpen(false)}
      currentEmail={user?.email}
      changeEmail={changeEmail}
    />
    </>
  );
};

export default EditProfilePage;
