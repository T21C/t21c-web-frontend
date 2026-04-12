import React, { useState, useRef, useEffect } from 'react';
import api from '@/utils/api';
import './leveluploadmanagementpopup.css';
import { useTranslation } from 'react-i18next';
import { encodeFilename } from '@/utils/zipUtils';
import { uploadFileInChunks, validateChunkedUpload } from '@/utils/chunkedUpload';
import { isCdnUrl } from '@/utils/Utility';
import { CrossIcon } from '@/components/common/icons';

const LevelUploadManagementPopup = ({
  level,
  formData,
  setFormData,
  onClose,
  setLevel,
  isSuperAdmin = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlImportIndeterminate, setUrlImportIndeterminate] = useState(false);
  const [urlImportPanelOpen, setUrlImportPanelOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [error, setError] = useState(null);
  const [levelFiles, setLevelFiles] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [targetLevel, setTargetLevel] = useState(null);
  const [originalZip, setOriginalZip] = useState(null);
  const [songFiles, setSongFiles] = useState({});
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const { t } = useTranslation(['components']);

  const fetchLevelFiles = async () => {
    if (formData.dlLink && formData.dlLink !== 'removed' && isCdnUrl(formData.dlLink)) {
      try {
        const fileId = formData.dlLink.split('/').pop();
        const response = await fetch(`${import.meta.env.VITE_CDN_URL}/${fileId}/metadata`);
        const data = await response.json();
        
        if (data.metadata) {
          const allLevelFiles = Array.isArray(data.metadata.allLevelFiles) ? data.metadata.allLevelFiles : [];
          const levelFilesMap = data.metadata.levelFiles || {};

          const files = allLevelFiles.length > 0
            ? allLevelFiles.map((file) => {
                const relativePath = file.relativePath || file.name;
                return {
                  ...file,
                  fullPath: relativePath,
                  storagePath: file.path || levelFilesMap[relativePath]?.path,
                };
              })
            : Object.entries(levelFilesMap).map(([key, file]) => ({
                ...file,
                fullPath: file.relativePath || key,
                storagePath: file.path,
              }));
          setLevelFiles(files);

          // Set song files
          setSongFiles(data.metadata.songFiles);

          // Set original zip info
          setOriginalZip(data.metadata.originalZip);

          // Set target level as canonical relative/full path for reliable matching.
          const targetPath =
            data.metadata.targetLevelRelativePath ||
            files.find((f) => f.storagePath === data.metadata.targetLevel)?.fullPath ||
            data.metadata.targetLevel ||
            null;
          setTargetLevel(targetPath);
        }
      } catch (error) {
        console.error('Error fetching level files:', error);
        setError(t('levelUploadManagement.errors.fetchFailed'));
      }
    }
  };

  useEffect(() => {
    fetchLevelFiles();
  }, [formData]);

  useEffect(() => {
    const v = level?.dlLink;
    if (!v || v === 'removed') {
      setImportUrl('');
    } else {
      setImportUrl(String(v));
    }
  }, [level?.id, level?.dlLink]);

  useEffect(() => {
    setUrlImportPanelOpen(false);
  }, [level?.id]);

  const closeUrlImportPanel = () => {
    if (isUploading) {
      return;
    }
    setUrlImportPanelOpen(false);
    setError(null);
  };

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
      setUrlImportIndeterminate(false);
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
          // Update formData with new dlLink
          const updatedLevel = response.data.level || {};
          const newDlLink = updatedLevel.dlLink || response.data.dlLink;
          setFormData(prev => ({
            ...prev,
            dlLink: newDlLink
          }));
          
          // Update level data through onUpdate callback
          // setLevel is actually onUpdate which expects { level: {...} } format
          if (setLevel) {
            setLevel({ level: { ...level, ...updatedLevel, dlLink: newDlLink } });
          }
          
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
      setError(error.response?.data?.error || t('levelUploadManagement.errors.uploadFailed'));
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleUploadFromUrl = async () => {
    const trimmed = importUrl.trim();
    if (!trimmed) {
      setError(t('levelUploadManagement.errors.missingUrl'));
      return;
    }
    if (isCdnUrl(trimmed)) {
      setError(t('levelUploadManagement.errors.cdnNotAllowed'));
      return;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setIsUploading(true);
      setUrlImportIndeterminate(true);
      setError(null);
      setUploadProgress(0);

      const response = await api.post(
        `${import.meta.env.VITE_LEVELS}/${level.id}/upload-from-url`,
        {url: trimmed},
        {
          signal,
          timeout: 300000,
        },
      );

      if (signal.aborted) {
        return;
      }

      if (response.data.success) {
        const updatedLevel = response.data.level || {};
        const newDlLink = updatedLevel.dlLink || response.data.dlLink;
        setFormData((prev) => ({
          ...prev,
          dlLink: newDlLink,
        }));
        if (newDlLink) {
          setImportUrl(String(newDlLink));
        }
        if (setLevel) {
          setLevel({level: {...level, ...updatedLevel, dlLink: newDlLink}});
        }
        setUploadProgress(100);
        fetchLevelFiles();
      }
    } catch (err) {
      if (api.isCancel && api.isCancel(err)) {
        return;
      }
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }
      setError(err.response?.data?.error || t('levelUploadManagement.errors.importFailed'));
    } finally {
      setIsUploading(false);
      setUrlImportIndeterminate(false);
      abortControllerRef.current = null;
    }
  };

  const handleLevelSelect = async () => {
    if (!selectedLevel || isSelecting || selectedLevel === targetLevel) return;

    try {
      setIsSelecting(true);
      setError(null);
      const result = await api.post(`${import.meta.env.VITE_LEVELS}/${level.id}/select-level`, {
        selectedLevel,
      });

      if (result.data.success) {
        setTargetLevel(selectedLevel);
        // Fetch updated files to reflect any changes
        fetchLevelFiles();
      } else {
        setError(result.data.error || t('levelUploadManagement.errors.selectFailed'));
      }
    } catch (error) {
      setError(error.response?.data?.error || t('levelUploadManagement.errors.selectFailed'));
    } finally {
      setIsSelecting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('levelUploadManagement.confirmDelete'))) {
      return;
    }

    try {
      const response = await api.delete(`${import.meta.env.VITE_LEVELS}/${level.id}/upload`);
      if (response.data && response.data.success) {
        // Update formData with removed dlLink
        setFormData(prev => ({ ...prev, dlLink: "removed" }));
        
        // Update level data through onUpdate callback
        // setLevel is actually onUpdate which expects { level: {...} } format
        if (setLevel) {
          setLevel({ level: { ...level, dlLink: "removed" } });
        }
        
        // Clear file-related state since file is deleted
        setLevelFiles([]);
        setSongFiles({});
        setOriginalZip(null);
        setTargetLevel(null);
        setSelectedLevel(null);
        
        onClose();
      }
    } catch (error) {
      setError(error.response?.data?.error || t('levelUploadManagement.errors.deleteFailed'));
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
      const confirmed = window.confirm(t('levelUploadManagement.confirmCloseDuringUpload') || 'Upload in progress. Are you sure you want to cancel?');
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
          <h2>{t('levelUploadManagement.title')}</h2>
          <button 
            className="close-button" 
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            disabled={isUploading}
          >
            <CrossIcon color="#fff" size={"24px"} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className={`progress-fill${urlImportIndeterminate ? ' progress-fill--indeterminate' : ''}`}
                style={urlImportIndeterminate ? undefined : {width: `${uploadProgress}%`}}
              />
            </div>
            <div className="progress-text">
              {urlImportIndeterminate
                ? t('levelUploadManagement.upload.importFromUrl')
                : t('levelUploadManagement.upload.progress', {progress: uploadProgress.toFixed(2)})}
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
              {t('buttons.cancel', { ns: 'common' })}
            </button>
          </div>
        ) : (
          <>
            {originalZip && (
          <div className="level-selection">
            <h3>{t('levelUploadManagement.sections.levelSelection.title')}</h3>
              <div className="original-zip-info">
                <div className="zip-name">{t('levelUploadManagement.sections.levelSelection.originalZip.title', { name: originalZip.name })}</div>
                <div className="zip-size">{t('levelUploadManagement.sections.levelSelection.originalZip.size', { size: (originalZip.size / 1024 / 1024).toFixed(2) })}</div>
              </div>
            {Object.keys(songFiles).length > 0 && (
              <div className="song-files-info">
                <h4>{t('levelUploadManagement.sections.levelSelection.songFiles.title')}</h4>
                {Object.entries(songFiles).map(([filename, file]) => (
                  <div key={filename} className="song-file">
                    <span className="song-name">{file.name}</span>
                    <span className="song-size">{t('levelUploadManagement.sections.levelSelection.songFiles.size', { size: (file.size / 1024 / 1024).toFixed(2) })}</span>
                  </div>
                ))}
              </div>
            )}
            {targetLevel && (
              <div className="current-target">
                {t('levelUploadManagement.sections.levelSelection.currentTarget', { name: targetLevel })}
              </div>
            )}
            <div className="level-list">
              {levelFiles.map((file) => (
                <div 
                  key={file.fullPath}
                  className={`level-item ${selectedLevel === file.fullPath ? 'selected' : ''} ${targetLevel === file.fullPath ? 'target' : ''}`}
                  onClick={() => {
                    setSelectedLevel(file.fullPath);
                    setError(null);
                  }}
                >
                  <div className="level-name">
                    {file.name}
                  </div>
                  <div className="level-path">
                    {file.fullPath}
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
              className={`select-button ${isSelecting ? 'is-selecting' : ''}`}
              onClick={handleLevelSelect}
              disabled={!selectedLevel || selectedLevel === targetLevel || isSelecting}
            >
              {isSelecting
                ? `${t('levelUploadManagement.buttons.select')}...`
                : selectedLevel === targetLevel
                  ? t('levelUploadManagement.buttons.currentlySelected')
                  : t('levelUploadManagement.buttons.select')}
            </button>
            )}
          </div>
        )}
          <div className="upload-actions">
            <input
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <div className="upload-actions-primary">
              {isSuperAdmin ? (
                urlImportPanelOpen ? (
                  <div className="upload-from-url-panel">
                    <div className="upload-from-url-panel-header">
                      <h3 className="upload-from-url-title">
                        {t('levelUploadManagement.uploadFromUrl.title')}
                      </h3>
                      <button
                        type="button"
                        className="upload-from-url-panel-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeUrlImportPanel();
                        }}
                        disabled={isUploading}
                        aria-label={t('levelUploadManagement.uploadFromUrl.closePanelAria')}
                      >
                        <CrossIcon color="#fff" size="20px" />
                      </button>
                    </div>
                    <div className="upload-from-url-row">
                      <input
                        type="url"
                        className="upload-from-url-input"
                        value={importUrl}
                        onChange={(e) => {
                          setImportUrl(e.target.value);
                          setError(null);
                        }}
                        placeholder={t('levelUploadManagement.uploadFromUrl.placeholder')}
                        disabled={isUploading}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="upload-from-url-submit"
                        onClick={handleUploadFromUrl}
                        disabled={isUploading || !importUrl.trim()}
                      >
                        {t('levelUploadManagement.uploadFromUrl.submit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-actions-inline">
                    <button
                      type="button"
                      className="upload-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {t('levelUploadManagement.buttons.uploadNew')}
                    </button>
                    <button
                      type="button"
                      className="upload-import-button"
                      onClick={() => {
                        setError(null);
                        setUrlImportPanelOpen(true);
                      }}
                      disabled={isUploading}
                    >
                      {t('levelUploadManagement.buttons.import')}
                    </button>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  className="upload-button upload-button--full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {t('levelUploadManagement.buttons.uploadNew')}
                </button>
              )}
            </div>
            {isCdnUrl(level.dlLink) && (
              <button
                type="button"
                className="delete-button"
                onClick={handleDelete}
                disabled={isUploading}
              >
                {t('levelUploadManagement.buttons.deleteCurrent')}
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