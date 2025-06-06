import React, { useState, useRef, useEffect } from 'react';
import api from '@/utils/api';
import './leveluploadmanagementpopup.css';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { prepareZipForUpload, validateZipSize, formatFileSize, encodeFilename } from '@/utils/zipUtils';
import { uploadFileInChunks, validateChunkedUpload } from '@/utils/chunkedUpload';

const LevelUploadManagementPopup = ({ level, formData, setFormData, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [levelFiles, setLevelFiles] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [targetLevel, setTargetLevel] = useState(null);
  const [originalZip, setOriginalZip] = useState(null);
  const [songFiles, setSongFiles] = useState({});
  const fileInputRef = useRef(null);
  const { t } = useTranslation(['components']);
  const tUpload = (key, params = {}) => t(`levelUploadManagement.${key}`, params);

  const fetchLevelFiles = async () => {
    if (formData.dlLink && formData.dlLink !== 'removed') {
      try {
        const fileId = formData.dlLink.split('/').pop();
        const response = await fetch(`${import.meta.env.VITE_CDN_URL}/${fileId}/metadata`);
        const data = await response.json();
        
        if (data.metadata) {
          // Set level files
          const files = Object.entries(data.metadata.levelFiles).map(([key, file]) => ({
            ...file,
            fullPath: key
          }));
          setLevelFiles(files);

          // Set song files
          setSongFiles(data.metadata.songFiles);

          // Set original zip info
          setOriginalZip(data.metadata.originalZip);

          // Set target level
          const targetPath = data.metadata.targetLevel;
          setTargetLevel(targetPath ? targetPath.split(/\\|\//).pop() : null);
        }
      } catch (error) {
        console.error('Error fetching level files:', error);
        setError(tUpload('errors.fetchFailed'));
      }
    }
  };

  useEffect(() => {
    fetchLevelFiles();
  }, [formData]);

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file type and size
      if (!validateZipSize(file)) {
        setError(tUpload('errors.invalidZip'));
        return;
      }

      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Upload file in chunks
      const fileId = await uploadFileInChunks(
        file,
        `${import.meta.env.VITE_CHUNK_UPLOAD_URL}/chunk`,
        (progress) => setUploadProgress(progress)
      );

      // Validate the upload
      const validationResult = await validateChunkedUpload(
        fileId,
        `${import.meta.env.VITE_CHUNK_UPLOAD_URL}/validate`
      );

      if (validationResult.success) {
        // Encode filename to hex string array

        // Now submit the level with the fileId and encoded filename
        const response = await api.post(`${import.meta.env.VITE_LEVELS}/${level.id}/upload`, {
          fileId,
          fileName: encodeFilename(file.name),
          fileSize: file.size
        });

        if (response.data.success) {
          setFormData(prev => ({
            ...prev,
            dlLink: response.data.level.dlLink
          }));
          fetchLevelFiles();
        }
      } else {
        throw new Error('Upload validation failed');
      }
    } catch (error) {
      setError(error.response?.data?.error || tUpload('errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleLevelSelect = async () => {
    if (!selectedLevel) return;

    try {
      const result = await api.post(`${import.meta.env.VITE_LEVELS}/${level.id}/select-level`, {
        selectedLevel,
      });

      if (result.data.success) {
        setTargetLevel(selectedLevel);
      } else {
        setError(result.data.error || tUpload('errors.selectFailed'));
      }
    } catch (error) {
      setError(error.response?.data?.error || tUpload('errors.selectFailed'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(tUpload('confirmDelete'))) {
      return;
    }

    try {
      await api.delete(`${import.meta.env.VITE_LEVELS}/${level.id}/upload`);
      setFormData(prev => ({ ...prev, dlLink: "removed" }));
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || tUpload('errors.deleteFailed'));
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="level-upload-management-popup" onClick={handleOverlayClick}>
      <div className="level-upload-management-content" onClick={handleContentClick}>
        <div className="level-upload-management-header">
          <h2>{tUpload('title')}</h2>
          <button 
            className="close-button" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            {tUpload('buttons.close')}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="progress-text">
              {tUpload('upload.progress', { progress: uploadProgress })}
            </div>
          </div>
        ) : (
          <>
          <div className="level-selection">
            <h3>{tUpload('sections.levelSelection.title')}</h3>
            {originalZip && (
              <div className="original-zip-info">
                <div className="zip-name">{tUpload('sections.levelSelection.originalZip.title', { name: originalZip.name })}</div>
                <div className="zip-size">{tUpload('sections.levelSelection.originalZip.size', { size: (originalZip.size / 1024 / 1024).toFixed(2) })}</div>
              </div>
            )}
            {Object.keys(songFiles).length > 0 && (
              <div className="song-files-info">
                <h4>{tUpload('sections.levelSelection.songFiles.title')}</h4>
                {Object.entries(songFiles).map(([filename, file]) => (
                  <div key={filename} className="song-file">
                    <span className="song-name">{file.name}</span>
                    <span className="song-size">{tUpload('sections.levelSelection.songFiles.size', { size: (file.size / 1024 / 1024).toFixed(2) })}</span>
                  </div>
                ))}
              </div>
            )}
            {targetLevel && (
              <div className="current-target">
                {tUpload('sections.levelSelection.currentTarget', { name: targetLevel })}
              </div>
            )}
            <div className="level-list">
              {levelFiles.map((file) => (
                <div 
                  key={file.fullPath}
                  className={`level-item ${selectedLevel === file.fullPath ? 'selected' : ''} ${targetLevel === file.name ? 'target' : ''}`}
                  onClick={() => {
                    setSelectedLevel(file.fullPath);
                    setError(null);
                  }}
                >
                  <div className="level-name">
                    {file.name}
                  </div>
                  <div className="level-info">
                    <span>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    {file.hasYouTubeStream && <span>Has YouTube Stream</span>}
                    {file.songFilename && <span>Song: {file.songFilename}</span>}
                    {file.artist && <span>Artist: {file.artist}</span>}
                    {file.author && <span>Author: {file.author}</span>}
                    {file.difficulty && <span>Difficulty: {file.difficulty}</span>}
                    {file.bpm && <span>BPM: {file.bpm.toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
            {selectedLevel && (
            <button 
              className="select-button"
              onClick={handleLevelSelect}
              disabled={!selectedLevel || selectedLevel === targetLevel}
            >
              {selectedLevel === targetLevel ? tUpload('buttons.currentlySelected') : tUpload('buttons.select')}
            </button>
            )}
          </div>
          <br />
          <div className="upload-actions">
            <input
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button 
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              {tUpload('buttons.uploadNew')}
            </button>
            {level.dlLink && level.dlLink !== 'removed' && (
              <button 
                className="delete-button"
                onClick={handleDelete}
              >
                {tUpload('buttons.deleteCurrent')}
              </button>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LevelUploadManagementPopup; 