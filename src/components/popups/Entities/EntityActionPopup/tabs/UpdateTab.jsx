import React from 'react';
import { CustomSelect } from '@/components/common/selectors';

export const UpdateTab = ({
  type,
  name,
  setName,
  avatarUrl,
  avatarPreview,
  avatarFile,
  setAvatarFile,
  setAvatarPreview,
  handleAvatarUpload,
  handleDeleteAvatar,
  isUploadingAvatar,
  verificationState,
  setVerificationState,
  verificationStateOptions,
  handleUpdate,
  isLoading,
  tEntity
}) => {
  return (
    <div className="form-section">
      <div className="form-group">
        <label>{tEntity('form.name')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {type === 'artist' && (
        <div className="form-group">
          <label>{tEntity('form.avatarUrl')}</label>
          <div className="avatar-section">
            {(avatarUrl || avatarPreview) && (
              <div className="avatar-preview">
                <img src={avatarUrl || avatarPreview} alt="Avatar" />
                {avatarUrl && (
                  <button onClick={handleDeleteAvatar} className="delete-avatar-btn">
                    {tEntity('buttons.deleteAvatar')}
                  </button>
                )}
              </div>
            )}
            <div className="avatar-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAvatarFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAvatarPreview(reader.result);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setAvatarPreview(null);
                  }
                }}
                id="avatar-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="avatar-upload" className="upload-label">
                {tEntity('buttons.selectAvatar')}
              </label>
              {avatarFile && (
                <button onClick={handleAvatarUpload} disabled={isUploadingAvatar}>
                  {isUploadingAvatar ? tEntity('buttons.uploading') : tEntity('buttons.upload')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <CustomSelect
          label={tEntity('form.verificationState')}
          options={verificationStateOptions}
          value={verificationStateOptions.find(opt => opt.value === verificationState) || verificationStateOptions[0]}
          onChange={(option) => setVerificationState(option?.value || 'unverified')}
          width="100%"
        />
      </div>

      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleUpdate}
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? tEntity('buttons.updating') : tEntity('buttons.update')}
        </button>
      </div>
    </div>
  );
};

export default UpdateTab;
