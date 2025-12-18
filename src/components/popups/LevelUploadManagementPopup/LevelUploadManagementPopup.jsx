import React, { useState, useRef, useEffect } from 'react';
import api from '@/utils/api';
import './leveluploadmanagementpopup.css';
import { useTranslation } from 'react-i18next';
import { encodeFilename } from '@/utils/zipUtils';
import { uploadFileInChunks, validateChunkedUpload } from '@/utils/chunkedUpload';
import { isCdnUrl } from '@/utils/Utility';

const LevelUploadManagementPopup = ({ level, formData, setFormData, onClose, setLevel }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [levelFiles, setLevelFiles] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [targetLevel, setTargetLevel] = useState(null);
  const [originalZip, setOriginalZip] = useState(null);
  const [songFiles, setSongFiles] = useState({});
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const { t } = useTranslation(['components']);
  const tUpload = (key, params = {}) => t(`levelUploadManagement.${key}`, params);

  const fetchLevelFiles = async () => {
    if (formData.dlLink && formData.dlLink !== 'removed' && isCdnUrl(formData.dlLink)) {
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

  // Cleanup: Cancel any ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Create abort controller for this upload
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Upload file in chunks
      const fileId = await uploadFileInChunks(
        file,
        `${import.meta.env.VITE_CHUNK_UPLOAD_URL}/chunk`,
        (progress) => setUploadProgress(progress)
      );

      // Check if cancelled before validation
      if (signal.aborted) {
        return;
      }

      // Validate the upload
      const validationResult = await validateChunkedUpload(
        fileId,
        `${import.meta.env.VITE_CHUNK_UPLOAD_URL}/validate`
      );

      // Check if cancelled before final upload
      if (signal.aborted) {
        return;
      }

      if (validationResult.success) {
        // Now submit the level with the fileId and encoded filename
        // Use signal to allow cancellation
        const response = await api.post(
          `${import.meta.env.VITE_LEVELS}/${level.id}/upload`,
          {
            fileId,
            fileName: encodeFilename(file.name),
            fileSize: file.size
          },
          {
            signal,
            timeout: 300000, // 5 minutes timeout for large file processing
          }
        );

        if (response.data.success) {
          setLevel(response.data.level.dataValues);
          setFormData(prev => ({
            ...prev,
            dlLink: response.data.dlLink
          }));
          fetchLevelFiles();
        }
      } else {
        throw new Error('Upload validation failed');
      }
    } catch (error) {
      // Don't show error if request was cancelled (user closed popup or navigated away)
      if (api.isCancel && api.isCancel(error)) {
        return;
      }
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return;
      }
      setError(error.response?.data?.error || tUpload('errors.uploadFailed'));
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
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
      setLevel(prev => ({ ...prev, dlLink: "removed" }));
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || tUpload('errors.deleteFailed'));
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      handleClose();
    }
  };

  const handleClose = () => {
    // Prevent closing during upload
    if (isUploading) {
      const confirmed = window.confirm(tUpload('confirmCloseDuringUpload') || 'Upload in progress. Are you sure you want to cancel?');
      if (!confirmed) {
        return;
      }
      // Cancel the upload
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    onClose();
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
              handleClose();
            }}
            disabled={isUploading}
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
              {tUpload('upload.progress', { progress: uploadProgress.toFixed(2) })}
            </div>
            <button
              className="cancel-upload-button"
              onClick={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                setIsUploading(false);
                setUploadProgress(0);
                setError(null);
              }}
            >
              {tUpload('buttons.cancel')}
            </button>
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
            {selectedLevel && levelFiles.length > 0 && (
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
            {level.dlLink && level.dlLink !== 'removed' && levelFiles.length > 0 && (
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