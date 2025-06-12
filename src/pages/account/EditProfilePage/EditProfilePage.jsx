import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import './editProfilePage.css';
import { CompleteNav } from '@/components/layout';
import { DiscordIcon, UnlinkIcon } from '@/components/common/icons';
import { Tooltip } from 'react-tooltip';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { ProfilePicturePopup } from '@/components/popups';
import { CountrySelect } from '@/components/common/selectors';

const ProviderIcon = ({ provider, size, color="#fff" }) => {
  switch(provider) {
    case 'discord':
      return <DiscordIcon size={size} color={color} />;
    default:
      return null;
  }
};

const EditProfilePage = () => {
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
  console.log(user)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const hasNoPassword = user?.password === null;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ? user.avatarUrl : null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [initialImage, setInitialImage] = useState(null);

  useEffect(() => {
    if (isPopupOpen) {
      // Lock scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      // Cleanup: ensure scrolling is restored
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isPopupOpen]);

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
      setError('New passwords do not match');
      return;
    }

    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess('Password changed successfully!');
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setIsChangingPassword(false);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    }
  };

  const handleProviderLink = async (provider) => {
    try {
      setError('');
      setSuccess('');
      await linkProvider(provider);
      setSuccess(`${provider} account linked successfully!`);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to link ${provider} account`);
    }
  };

  const handleProviderUnlink = async (provider) => {
    try {
      await unlinkProvider(provider);
      setSuccess(`${provider} account unlinked successfully!`);
    } catch (err) {
      setError(err.message || `Failed to unlink ${provider} account`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.put(`${import.meta.env.VITE_PROFILE}/me`, {
        // username: formData.username,
        nickname: formData.nickname,
        country: formData.country,
      });

      fetchUser();
      toast.success('Profile updated successfully');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
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
    setIsLoading(true);
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
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      const errorData = error.response?.data;
      
      if (errorData?.code === 'VALIDATION_ERROR') {
        errorData.details.errors.forEach(err => toast.error(err));
        setUploadError(errorData.details.errors.join(', '));
      } else {
        setUploadError(errorData?.error || 'Failed to upload avatar');
        toast.error(errorData?.error || 'Failed to upload avatar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatarUrl) return;

    setIsLoading(true);
    try {
      await api.delete(`${import.meta.env.VITE_PROFILE}/avatar`);

      setAvatarPreview(null);
      setUser({ ...user, avatarUrl: null, avatarId: null });
      toast.success('Avatar removed successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove avatar');
    } finally {
      setIsLoading(false);
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
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
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
  return (
    <>
    <div className="background-level"/> 
      <CompleteNav/>
    <div className="edit-profile-page">
      <div className="edit-profile-container">
        <h1>Edit Profile</h1>

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
                <span>Drag & drop or click to upload</span>
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
              disabled={isLoading}
            >
              {isLoading ? 'Removing...' : 'Remove Avatar'}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              disabled
              className="input-field readonly"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              required
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              readOnly
              className="input-field readonly"
            />
            {user && !user.isEmailVerified && (
              <div className="email-verification-message" onClick={() => navigate('/profile/verify-email')}>
                <span className="profile-banner-text">You need to verify your email</span>
                <span className="email-verification-arrow">→</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
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
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="button submit-button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="section-divider" />

        <h2>{hasNoPassword ? 'Add Password' : 'Password'}</h2>
        {hasNoPassword ? (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
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
              <label htmlFor="confirmPassword">Confirm Password</label>
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
              Create Password
            </button>
          </form>
        ) : !isChangingPassword ? (
          <button
            className="change-password-button"
            onClick={() => setIsChangingPassword(true)}
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
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
              <label htmlFor="newPassword">New Password</label>
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
              <label htmlFor="confirmPassword">Confirm New Password</label>
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
              Update Password
            </button>
            <button
              type="button"
              className="change-password-button"
              onClick={() => setIsChangingPassword(false)}
              style={{ marginTop: '1rem' }}
            >
              Cancel
            </button>
          </form>
        )}

        <div className="section-divider" />

        <h2>Linked Accounts</h2>
        <div className="linked-accounts">
          {user?.providers?.some(p => p.name === 'discord') ? (
            <div className="provider-info">
              <div className="provider-details">
                <ProviderIcon provider="discord" size={32}/>
                <span>Discord</span>
                {user?.providers?.find(p => p.name === 'discord')?.profile?.username && (
                  <span className="provider-username">
                    @{user.providers.find(p => p.name === 'discord').profile.username}
                  </span>
                )}
              </div>
              <div className="unlink-container">
                 <button
                  className={`unlink-button`}
                    onClick={() => handleProviderUnlink('discord')}
                >
                  Unlink
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
              Link Discord Account
            </button>
          )}
        </div>
      </div>
    </div>

    <ProfilePicturePopup
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