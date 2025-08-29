import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import './thumbnailupload.css';

const ThumbnailUpload = ({
  currentThumbnail,
  onThumbnailUpdate,
  onThumbnailRemove,
  uploadEndpoint,
  className = '',
  disabled = false
}) => {
  const { t } = useTranslation('components');
  const tCur = (key, params = {}) => t(`thumbnailUpload.${key}`, params);

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(currentThumbnail || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Update preview when currentThumbnail changes
  React.useEffect(() => {
    setThumbnailPreview(currentThumbnail || '');
    
    // If currentThumbnail is cleared, also reset the file input and file state
    if (!currentThumbnail) {
      setThumbnailFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentThumbnail]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please select a JPEG, PNG, WebP, GIF, or SVG file.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Please select a file smaller than 10MB.');
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
    if (!thumbnailFile || !uploadEndpoint) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('thumbnail', thumbnailFile);

      const response = await api.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setThumbnailPreview(response.data.previewLink);
        if (onThumbnailUpdate) {
          onThumbnailUpdate(response.data.previewLink);
        }
        setThumbnailFile(null);
        
        // Reset the file input element
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast.success(tCur('uploadSuccess'));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || tCur('uploadError');
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const removeThumbnail = async () => {
    if (!uploadEndpoint) return;

    try {
      await api.delete(uploadEndpoint);
      setThumbnailPreview('');
      setThumbnailFile(null);
      
      // Reset the file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (onThumbnailRemove) {
        onThumbnailRemove();
      }
      toast.success(tCur('removeSuccess'));
    } catch (error) {
      const errorMessage = error.response?.data?.error || tCur('removeError');
      toast.error(errorMessage);
    }
  };

  // Generate unique ID for file input
  const fileInputId = `thumbnail-file-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`thumbnail-upload ${className}`}>
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
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg"
          onChange={handleThumbnailChange}
          className="thumbnail-upload__file-input"
          disabled={disabled}
        />
        <label 
          htmlFor={fileInputId} 
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
