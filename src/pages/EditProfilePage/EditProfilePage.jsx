import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './editProfilePage.css';

const EditProfilePage = () => {
  const { user, updateProfile, changePassword, linkProvider, unlinkProvider } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await updateProfile({
        username: formData.username,
        email: formData.email,
      });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
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
      await linkProvider(provider);
      setSuccess(`${provider} account linked successfully!`);
    } catch (err) {
      setError(err.message || `Failed to link ${provider} account`);
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

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-container">
        <h1>Edit Profile</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
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
              required
            />
          </div>

          <button type="submit" className="save-button">
            Save Changes
          </button>
        </form>

        <div className="section-divider" />

        <h2>Password</h2>
        {!isChangingPassword ? (
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
          {user?.providers?.includes('discord') ? (
            <div className="provider-info">
              <span>Discord</span>
              <button
                className="unlink-button"
                onClick={() => handleProviderUnlink('discord')}
              >
                Unlink
              </button>
            </div>
          ) : (
            <button
              className="link-button"
              onClick={() => handleProviderLink('discord')}
            >
              Link Discord Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage; 