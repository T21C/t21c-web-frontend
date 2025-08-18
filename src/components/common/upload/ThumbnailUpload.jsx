import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import './thumbnailupload.css';

const ThumbnailUpload = ({
  levelId,
  currentThumbnail,
  onThumbnailUpdate,
  className = '',
  disabled = false
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`thumbnailUpload.${key}`, params);

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(currentThumbnail || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please select a JPEG, PNG, or WebP file.');
        return;
      }

      // Validate file size (3MB limit)
      if (file.size > 3 * 1024 * 1024) {
        toast.error('File size too large. Please select a file smaller than 3MB.');
        return;
      }

      setThumbnailFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadThumbnail = async () => {
    if (!thumbnailFile || !levelId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('thumbnail', thumbnailFile);

      const response = await api.post(
        `${import.meta.env.VITE_CURATIONS}/${levelId}/thumbnail`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setThumbnailPreview(response.data.previewLink);
        if (onThumbnailUpdate) {
          onThumbnailUpdate(response.data.previewLink);
        }
        toast.success('Thumbnail uploaded successfully');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to upload thumbnail';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const removeThumbnail = async () => {
    if (!levelId) return;

    try {
      await api.delete(`${import.meta.env.VITE_CURATIONS}/${levelId}/thumbnail`);
      setThumbnailPreview('');
      setThumbnailFile(null);
      if (onThumbnailUpdate) {
        onThumbnailUpdate('');
      }
      toast.success('Thumbnail removed successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to remove thumbnail';
      toast.error(errorMessage);
    }
  };

  return (
    <div className={`thumbnail-upload ${className}`}>
      <label className="thumbnail-upload__label">{tCur('label')}</label>
      
      {/* Thumbnail Preview */}
      {thumbnailPreview && (
        <div className="thumbnail-upload__preview">
          <img 
            src={thumbnailPreview} 
            alt="Level thumbnail" 
            className="thumbnail-upload__image"
          />
          <button
            type="button"
            onClick={removeThumbnail}
            className="thumbnail-upload__remove"
            title={tCur('remove')}
            disabled={disabled}
          >
            ✖
          </button>
        </div>
      )}

      {/* Thumbnail Upload */}
      <div className="thumbnail-upload__controls">
        <input
          id={`thumbnail-file-${levelId}`}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleThumbnailChange}
          className="thumbnail-upload__file-input"
          disabled={disabled}
        />
        <label 
          htmlFor={`thumbnail-file-${levelId}`} 
          className="thumbnail-upload__file-label"
        >
          {thumbnailFile ? thumbnailFile.name : tCur('chooseFile')}
        </label>
        
        {thumbnailFile && (
          <button
            type="button"
            onClick={uploadThumbnail}
            disabled={isUploading || disabled}
            className="thumbnail-upload__upload-btn"
          >
            {isUploading ? tCur('uploading') : tCur('upload')}
          </button>
        )}
      </div>

      <small className="thumbnail-upload__help">{tCur('help')}</small>
    </div>
  );
};

export default ThumbnailUpload;
