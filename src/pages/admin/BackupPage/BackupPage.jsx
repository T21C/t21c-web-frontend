import { CompleteNav } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import "./adminbackuppage.css";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import api from "@/utils/api";
import { EditIcon, RefreshIcon } from "@/components/common/icons";
import { AccessDenied } from "@/components/common/display";
import { toast } from "react-hot-toast";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { formatDate } from "@/utils/Utility";
import i18next from "i18next";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes

const UploadZone = ({ type, onUploadComplete, storedPassword, isLoadingBackups }) => {
  const { t } = useTranslation('pages');
  const tBackup = (key, params = {}) => t(`backup.${key}`, params);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(tBackup('upload.errors.fileTooBig', { 
        size: formatFileSize(MAX_FILE_SIZE) 
      }));
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError('');
      
      const formData = new FormData();
      formData.append('backup', selectedFile);
      
      const response = await api.post(
        `${import.meta.env.VITE_BACKUP_API}/upload/${type}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Super-Admin-Password': storedPassword
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          },
        }
      );

      if (response.data.success) {
        toast.success(tBackup('notifications.uploadSuccess'));
        onUploadComplete();
        setSelectedFile(null);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.response?.status === 403 
        ? tBackup('passwordModal.errors.invalid')
        : tBackup('notifications.uploadFailed')
      );
      toast.error(error.response?.status === 403 
        ? tBackup('passwordModal.errors.invalid')
        : tBackup('notifications.uploadFailed')
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      handleUpload();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      handleUpload();
    }
  };

  return (
    <div
      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="icon">📤</div>
      <p>{tBackup('upload.dragDropMessage')}</p>
      <input
        type="file"
        onChange={handleFileSelect}
        accept=".sql,.zip,.tar.gz"
      />
      {isUploading && (
        <div 
          className="upload-progress"
          style={{ width: `${uploadProgress}%` }}
        />
      )}
      {uploadError && <p className="upload-error">{uploadError}</p>}
    </div>
  );
};

const TimeAgo = ({ date }) => {
  const [timeAgo, setTimeAgo] = useState('');
  const { t } = useTranslation('pages');
  const tBackup = (key, params = {}) => t(`backup.${key}`, params);

  useEffect(() => {
    const updateTimeAgo = () => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      
      let interval = seconds;
      let unit = 'second';

      if (seconds >= 31536000) {
        interval = Math.floor(seconds / 31536000);
        unit = 'year';
      } else if (seconds >= 2592000) {
        interval = Math.floor(seconds / 2592000);
        unit = 'month';
      } else if (seconds >= 86400) {
        interval = Math.floor(seconds / 86400);
        unit = 'day';
      } else if (seconds >= 3600) {
        interval = Math.floor(seconds / 3600);
        unit = 'hour';
      } else if (seconds >= 60) {
        interval = Math.floor(seconds / 60);
        unit = 'minute';
      }

      const key = `timeAgo.${unit}${interval !== 1 ? 's' : ''}`;
      setTimeAgo(tBackup(key, { count: interval }));
    };

    updateTimeAgo();
    const timer = setInterval(updateTimeAgo, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [date, tBackup]);

  return <span className="time-ago">{timeAgo}</span>;
};

const BackupList = ({ backups, type, onRestore, onDelete, isLoadingBackups, isDeletingBackup, isRestoringBackup, showConfirmation, storedPassword }) => {
  const { t } = useTranslation('pages');
  const tBackup = (key, params = {}) => t(`backup.${key}`, params);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloading, setDownloading] = useState({});

  const getFileNameAndExtension = (filename) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return [filename, ''];
    return [filename.slice(0, lastDotIndex), filename.slice(lastDotIndex)];
  };

  const handleRename = async (backup) => {
    if (!newName.trim()) return;
    
    try {
      setRenameLoading(true);
      const response = await api.post(
        `${import.meta.env.VITE_BACKUP_API}/rename/${type}/${backup.filename}`,
        { newName: newName + getFileNameAndExtension(backup.filename)[1] },
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      
      if (response.data.success) {
        toast.success(tBackup('notifications.renameSuccess'));
        setEditingId(null);
        setNewName('');
      }
    } catch (error) {
      console.error('Failed to rename backup:', error);
      toast.error(tBackup('notifications.renameFailed'));
    } finally {
      setRenameLoading(false);
    }
  };

  const handleAction = (action, backup) => {
    if (action === 'restore') {
      showConfirmation('restore', 'restore', { type, filename: backup.filename });
    } else if (action === 'delete') {
      showConfirmation('delete', 'delete', { type, filename: backup.filename });
    } else if (action === 'download') {
      handleDownload(backup);
    } else if (action === 'rename') {
      handleRename(backup);
    }
  };

  const handleDownload = async (backup) => {
    if (downloading[backup.filename]) return;
    
    try {
      setDownloading(prev => ({ ...prev, [backup.filename]: true }));
      setDownloadProgress(prev => ({ ...prev, [backup.filename]: 0 }));

      const response = await api.get(
        `${import.meta.env.VITE_BACKUP_API}/download/${type}/${backup.filename}`,
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          },
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(prev => ({ ...prev, [backup.filename]: percentCompleted }));
          }
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        setDownloadProgress(prev => ({ ...prev, [backup.filename]: 0 }));
        setDownloading(prev => ({ ...prev, [backup.filename]: false }));
      }, 1000);
    } catch (error) {
      console.error('Failed to download backup:', error);
      toast.error(tBackup('notifications.downloadFailed'));
      setDownloading(prev => ({ ...prev, [backup.filename]: false }));
      setDownloadProgress(prev => ({ ...prev, [backup.filename]: 0 }));
    }
  };

  if (!backups || backups.length === 0) {
    return (
      <div className="no-backups-message">
        <h2>{tBackup('noBackups.title', { type })}</h2>
        <p>{tBackup('noBackups.message')}</p>
      </div>
    );
  }

  return (
    <div className="backup-section">
      <div className="backup-list">
        {backups.map((backup) => {
          const [fileName, extension] = getFileNameAndExtension(backup.filename);
          const progress = downloadProgress[backup.filename] || 0;
          const isDownloading = downloading[backup.filename];
          const circumference = 2 * Math.PI * 10;
          const offset = circumference - (progress / 100) * circumference;

          return (
            <div key={backup.filename} className="backup-item">
              <div className="download-wrapper">
                <div className={`download-progress ${isDownloading ? 'visible' : ''}`}>
                  <svg className="progress-circle" width="24" height="24">
                    <circle
                      className="progress-background"
                      cx="12"
                      cy="12"
                      r="10"
                    />
                    <circle
                      className="progress-bar"
                      cx="12"
                      cy="12"
                      r="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                    />
                  </svg>
                </div>
                <button
                  className={`download-btn ${isDownloading ? 'downloading' : ''}`}
                  onClick={() => handleAction('download', backup)}
                  disabled={isLoadingBackups || renameLoading || isDownloading}
                >
                  <svg className="svg-stroke" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round">
                    </path>
                  </svg>
                </button>
              </div>

              <div className="backup-info">
                {editingId === backup.filename ? (
                  <div className="rename-controls">
                    <div className="rename-input-container">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={tBackup('fileInfo.newName')}
                        className="rename-input"
                      />
                      <span className="file-extension">{extension}</span>
                    </div>
                    <div className="rename-buttons">
                      <button
                        className="save-rename-btn"
                        onClick={() => handleAction('rename', backup)}
                        disabled={renameLoading || !newName.trim()}
                      >
                        {renameLoading ? tBackup('buttons.saving') : tBackup('buttons.save')}
                      </button>
                      <button
                        className="cancel-rename-btn"
                        onClick={() => {
                          setEditingId(null);
                          setNewName('');
                        }}
                        disabled={renameLoading}
                      >
                        {tBackup('buttons.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="filename-container">
                      <h3>{backup.filename}</h3>
                      <button
                        className="edit-btn"
                        onClick={() => {
                          setEditingId(backup.filename);
                          setNewName(fileName);
                        }}
                        disabled={isLoadingBackups || renameLoading}
                      >
                        <EditIcon color="#fffa" size="24px" />
                      </button>
                    </div>
                    <div className="backup-details">
                      <p className="backup-date">
                        {tBackup('fileInfo.created', { date: formatDate(backup.created, i18next?.language) })}
                        <TimeAgo date={backup.created} />
                      </p>
                      <p className="backup-size">
                        {tBackup('fileInfo.size', { size: formatFileSize(backup.size) })}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="backup-actions">
                <button
                  className="restore-btn"
                  onClick={() => handleAction('restore', backup)}
                  disabled={isLoadingBackups || renameLoading}
                >
                  {tBackup('buttons.restore')}
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleAction('delete', backup)}
                  disabled={isLoadingBackups || renameLoading}
                >
                  {tBackup('buttons.delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const BackupPage = () => {
  const { t } = useTranslation('pages');
  const tBackup = (key, params = {}) => t(`backup.${key}`, params);
  const { user } = useAuth();
  const currentUrl = window.location.origin + location.pathname;
  const [activeTab, setActiveTab] = useState('mysql');
  const [backups, setBackups] = useState({ mysql: [], files: [] });
  const [sortOrder, setSortOrder] = useState('newest');
  const [showInitialPasswordModal, setShowInitialPasswordModal] = useState(true);
  const [initialPassword, setInitialPassword] = useState('');
  const [initialPasswordError, setInitialPasswordError] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  
  // Separate loading states
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDeletingBackup, setIsDeletingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  const validatePassword = async (password) => {
    try {
      setIsVerifyingPassword(true);
      await api.head(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_VERIFY_PASSWORD}?origin=backup`,
        {
          headers: {
            'X-Super-Admin-Password': password
          }
        }
      );
      return true;
    } catch (error) {
      return false;
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleInitialPasswordSubmit = async () => {
    try {
      const isValid = await validatePassword(initialPassword);
      if (isValid) {
        setStoredPassword(initialPassword);
        setShowInitialPasswordModal(false);
        setInitialPassword('');
        setInitialPasswordError('');
        await loadBackups();
      } else {
        setInitialPasswordError(tBackup('passwordModal.errors.invalid'));
      }
    } catch (error) {
      setInitialPasswordError(tBackup('passwordModal.errors.generic'));
    }
  };

  const handleConfirmation = async () => {
    if (!confirmationAction) return;
    
    const { type, action, params } = confirmationAction;
    try {
      if (type === 'create') {
        await handleCreateBackupWithPassword(params);
      } else if (type === 'delete') {
        await handleDeleteWithPassword(params.type, params.filename);
      } else if (type === 'restore') {
        await handleRestoreWithPassword(params.type, params.filename);
      }
    } finally {
      setShowConfirmationModal(false);
      setConfirmationAction(null);
    }
  };

  const showConfirmation = (type, action, params) => {
    setConfirmationAction({ type, action, params });
    setShowConfirmationModal(true);
  };

  const handleCreateBackupWithPassword = async () => {
    try {
      setIsCreatingBackup(true);
      const response = await api.post(
        `${import.meta.env.VITE_BACKUP_API}/create/${activeTab}`, 
        {},
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
    );
      if (response.data.success) {
        toast.success(tBackup('notifications.backupCreated', { type: activeTab.toUpperCase() }));
        await loadBackups();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.error(tBackup('notifications.createFailed'));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDeleteWithPassword = async (type, filename) => {
    try {
      setIsDeletingBackup(true);
      const response = await api.delete(
        `${import.meta.env.VITE_BACKUP_API}/delete/${type}/${filename}`,
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      if (response.data.success) {
        toast.success(tBackup('notifications.backupDeleted'));
        await loadBackups();
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      toast.error(tBackup('notifications.deleteFailed'));
    } finally {
      setIsDeletingBackup(false);
    }
  };

  const handleRestoreWithPassword = async (type, filename) => {
    try {
      setIsRestoringBackup(true);
      const response = await api.post(
        `${import.meta.env.VITE_BACKUP_API}/restore/${type}/${filename}`,
        {},
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      if (response.data.success) {
        toast.success(tBackup('notifications.backupRestored'));
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      toast.error(tBackup('notifications.restoreFailed'));
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const loadBackups = async () => {
    try {
      setIsLoadingBackups(true);
      const response = await api.get(`${import.meta.env.VITE_BACKUP_API}/list`);
      setBackups(response.data);
    } catch (error) {
      console.error('Failed to load backups:', error);
      toast.error(tBackup('notifications.loadFailed'));
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = () => {
    showConfirmation('create', 'create', {});
  };

  const handleRestore = async (type, filename) => {
    try {
      setIsRestoringBackup(true);
      const response = await api.post(
        `${import.meta.env.VITE_BACKUP_API}/restore/${type}/${filename}`,
        {},
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      if (response.data.success) {
        toast.success(tBackup('notifications.backupRestored'));
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      toast.error(tBackup('notifications.restoreFailed'));
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleDelete = async (type, filename) => {
    try {
      setIsDeletingBackup(true);
      const response = await api.delete(
        `${import.meta.env.VITE_BACKUP_API}/delete/${type}/${filename}`,
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      if (response.data.success) {
        toast.success(tBackup('notifications.backupDeleted'));
        await loadBackups();
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      toast.error(tBackup('notifications.deleteFailed'));
    } finally {
      setIsDeletingBackup(false);
    }
  };

  const sortedBackups = useMemo(() => {
    const currentBackups = [...backups[activeTab]];
    return currentBackups.sort((a, b) => {
      const timeA = new Date(a.created).getTime();
      const timeB = new Date(b.created).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [backups, activeTab, sortOrder]);

  const totalSize = useMemo(() => {
    return backups[activeTab].reduce((total, backup) => total + backup.size, 0);
  }, [backups, activeTab]);

  if (user.permissionFlags === undefined) {
    return (
      <div className="admin-backup-page">
        <MetaTags
          title={tBackup('meta.title')}
          description={tBackup('meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        <CompleteNav />
        <div className="background-level"></div>
        <div className="admin-backup-body">
          <div className="loader loader-level-detail"/>
        </div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied 
        metaTitle={tBackup('meta.title')}
        metaDescription={tBackup('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  return (
    <div className="admin-backup-page">
      <MetaTags
        title={tBackup('meta.title')}
        description={tBackup('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav user={user} />
      <div className="admin-backup-body">
        <div className="header-container">
          <h1>{tBackup('header.title')}</h1>
          <button 
            className="refresh-button"
            onClick={loadBackups}
            disabled={isLoadingBackups}
            aria-label={tBackup('header.refresh')}
          >
            <RefreshIcon color="#fff" size="36px" />
          </button>
        </div>

        <div className="backup-tabs-container">
          <div className="backup-tabs">
            <button
              className={`tab-button ${activeTab === 'mysql' ? 'active' : ''}`}
              onClick={() => setActiveTab('mysql')}
            >
              {tBackup('tabs.mysql')}
            </button>
            <button
              className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              {tBackup('tabs.files')}
            </button>
          </div>
          <div className="total-size">
            {tBackup('stats.totalSize', { size: formatFileSize(totalSize) })}
          </div>
        </div>

        <div className="backup-header">
          <div className="header-left">
            <h2>{activeTab === 'mysql' ? tBackup('tabs.mysql') : tBackup('tabs.files')}</h2>
            <div className="sort-buttons">
              <button
                className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                onClick={() => setSortOrder('newest')}
              >
                {tBackup('sort.newest')}
              </button>
              <button
                className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortOrder('oldest')}
              >
                {tBackup('sort.oldest')}
              </button>
            </div>
          </div>
          <div className="header-right">
            <button
              className="create-backup-btn"
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
            >
              {isCreatingBackup 
                ? tBackup('buttons.creating') 
                : tBackup('buttons.create', { type: activeTab.toUpperCase() })
              }
            </button>
          </div>
        </div>

        <UploadZone 
          type={activeTab}
          onUploadComplete={loadBackups}
          storedPassword={storedPassword}
          isLoadingBackups={isLoadingBackups}
        />

        <BackupList
          backups={sortedBackups}
          type={activeTab}
          onRestore={handleRestore}
          onDelete={handleDelete}
          isLoadingBackups={isLoadingBackups}
          isDeletingBackup={isDeletingBackup}
          isRestoringBackup={isRestoringBackup}
          showConfirmation={showConfirmation}
          storedPassword={storedPassword}
        />
      </div>
      <ScrollButton />
      
      {showInitialPasswordModal && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>{tBackup('passwordModal.title')}</h3>
            <p>{tBackup('passwordModal.initialMessage')}</p>
            <input
              type="password"
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              placeholder={tBackup('passwordModal.placeholder')}
            />
            {initialPasswordError && <p className="error-message">{initialPasswordError}</p>}
            <div className="password-modal-actions">
              <button 
                className="confirm-btn"
                onClick={handleInitialPasswordSubmit}
                style={{pointerEvents: !initialPassword || isVerifyingPassword ? 'none' : 'auto'}}
                disabled={!initialPassword || isVerifyingPassword}
              >
                {isVerifyingPassword ? tBackup('buttons.verifying') : tBackup('buttons.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmationModal && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>{tBackup('confirmation.title')}</h3>
            <p>
              {confirmationAction?.type === 'create' && tBackup('confirmation.createMessage')}
              {confirmationAction?.type === 'delete' && tBackup('confirmation.deleteMessage')}
              {confirmationAction?.type === 'restore' && tBackup('confirmation.restoreMessage')}
            </p>
            <div className="password-modal-actions">
              <button 
                className="confirm-btn"
                onClick={handleConfirmation}
                disabled={
                  (confirmationAction?.type === 'create' && isCreatingBackup) ||
                  (confirmationAction?.type === 'delete' && isDeletingBackup) ||
                  (confirmationAction?.type === 'restore' && isRestoringBackup)
                }
              >
                {tBackup('buttons.confirm')}
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowConfirmationModal(false);
                  setConfirmationAction(null);
                }}
                disabled={
                  (confirmationAction?.type === 'create' && isCreatingBackup) ||
                  (confirmationAction?.type === 'delete' && isDeletingBackup) ||
                  (confirmationAction?.type === 'restore' && isRestoringBackup)
                }
              >
                {tBackup('buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPage; 