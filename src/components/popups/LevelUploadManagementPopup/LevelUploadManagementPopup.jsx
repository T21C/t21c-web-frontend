import React, { useState, useRef, useEffect } from 'react';
import api from '@/utils/api';
import './leveluploadmanagementpopup.css';
import axios from 'axios';

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
          setTargetLevel(targetPath ? targetPath.split('\\').pop() : null);
        }
      } catch (error) {
        console.error('Error fetching level files:', error);
        setError('Failed to fetch level files');
      }
    }
  };

  useEffect(() => {
    fetchLevelFiles();
  }, [formData]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('levelZip', file);

    try {
      const response = await api.post(`${import.meta.env.VITE_LEVELS}/${level.id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });
      
      setFormData(prev => ({ ...prev, dlLink: response.data.level.dlLink }));
      if (response.data.levelFiles?.length > 1) {
        setLevelFiles(response.data.levelFiles);
        setTargetLevel(null);
      } else {
        onClose();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload level file');
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
        onClose();
      } else {
        setError(result.data.error || 'Failed to select level file');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to select level file');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this level file? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`${import.meta.env.VITE_LEVELS}/${level.id}/upload`);
      setFormData(prev => ({ ...prev, dlLink: "removed" }));
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete level file');
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
          <h2>Manage Level Upload</h2>
          <button 
            className="close-button" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
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
              Uploading... {uploadProgress}%
            </div>
          </div>
        ) : (
          <>
          <div className="level-selection">
            <h3>Select Level File</h3>
            {originalZip && (
              <div className="original-zip-info">
                <div className="zip-name">Original Zip: {originalZip.name}</div>
                <div className="zip-size">Size: {(originalZip.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            )}
            {Object.keys(songFiles).length > 0 && (
              <div className="song-files-info">
                <h4>Song Files</h4>
                {Object.entries(songFiles).map(([filename, file]) => (
                  <div key={filename} className="song-file">
                    <span className="song-name">{file.name}</span>
                    <span className="song-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ))}
              </div>
            )}
            {targetLevel && (
              <div className="current-target">
                Current Target: <span className="target-name">{targetLevel}</span>
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
            <button 
              className="select-button"
              onClick={handleLevelSelect}
              disabled={!selectedLevel || selectedLevel === targetLevel}
            >
              {selectedLevel === targetLevel ? 'Currently Selected' : 'Select Level'}
            </button>
          </div>
          <br />
          <div className="upload-actions">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button 
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload New Level
            </button>
            {level.dlLink && level.dlLink !== 'removed' && (
              <button 
                className="delete-button"
                onClick={handleDelete}
              >
                Delete Current Level
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