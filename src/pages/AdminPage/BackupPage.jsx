import { CompleteNav } from "../../components";
import "./css/adminbackuppage.css";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import api from "../../utils/api";

const TimeAgo = ({ date }) => {
  const [timeAgo, setTimeAgo] = useState('');

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

      setTimeAgo(`${interval} ${unit}${interval !== 1 ? 's' : ''} ago`);
    };

    updateTimeAgo();
    const timer = setInterval(updateTimeAgo, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [date]);

  return <span className="time-ago">{timeAgo}</span>;
};

const BackupList = ({ backups, type, onRestore, onDelete, loading }) => {
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const getFileNameAndExtension = (filename) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return [filename, ''];
    return [filename.slice(0, lastDotIndex), filename.slice(lastDotIndex)];
  };

  const handleRename = async (backup) => {
    try {
      setRenameLoading(true);
      const [, extension] = getFileNameAndExtension(backup.filename);
      const fullNewName = newName + extension;
      const response = await api.post(
        `${import.meta.env.VITE_BACKUP_API}/rename/${type}/${backup.filename}`,
        { newName: fullNewName }
      );
      if (response.data.success) {
        backup.filename = response.data.newName;
        setEditingId(null);
        setNewName('');
      }
    } catch (error) {
      console.error('Error renaming backup:', error);
    } finally {
      setRenameLoading(false);
    }
  };

  if (!backups || backups.length === 0) {
    return (
      <div className="no-backups-message">
        <h2>No {type} backups available</h2>
        <p>Create your first backup using the button above</p>
      </div>
    );
  }

  return (
    <div className="backup-section">
      <div className="backup-list">
        {backups.map((backup) => {
          const [fileName, extension] = getFileNameAndExtension(backup.filename);
          return (
            <div key={backup.filename} className="backup-item">
              <div className="backup-info">
                {editingId === backup.filename ? (
                  <div className="rename-controls">
                    <div className="rename-input-container">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new name"
                        className="rename-input"
                      />
                      <span className="file-extension">{extension}</span>
                    </div>
                    <div className="rename-buttons">
                      <button
                        className="save-rename-btn"
                        onClick={() => handleRename(backup)}
                        disabled={renameLoading || !newName.trim()}
                      >
                        {renameLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="cancel-rename-btn"
                        onClick={() => {
                          setEditingId(null);
                          setNewName('');
                        }}
                        disabled={renameLoading}
                      >
                        Cancel
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
                        disabled={loading || renameLoading}
                      >
                        ✎
                      </button>
                    </div>
                    <div className="backup-details">
                      <p className="backup-date">
                        Created: {new Date(backup.created).toLocaleString()}
                        <TimeAgo date={backup.created} />
                      </p>
                      <p className="backup-size">Size: {formatFileSize(backup.size)}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="backup-actions">
                <button
                  className="restore-btn"
                  onClick={() => onRestore(type, backup.filename)}
                  disabled={loading || renameLoading}
                >
                  Restore
                </button>
                <button
                  className="delete-btn"
                  onClick={() => onDelete(type, backup.filename)}
                  disabled={loading || renameLoading}
                >
                  Delete
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mysql');
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState({ mysql: [], files: [] });
  const [sortOrder, setSortOrder] = useState('newest');
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${import.meta.env.VITE_BACKUP_API}/list`);
      setBackups(response.data);
    } catch (error) {
      console.error('Failed to load backups:', error);
      addNotification('Failed to load backups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const response = await api.post(`${import.meta.env.VITE_BACKUP_API}/create/${activeTab}`);
      if (response.data.success) {
        addNotification(`${activeTab.toUpperCase()} backup created successfully`);
        await loadBackups();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      addNotification('Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (type, filename) => {
    if (window.confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      try {
        setLoading(true);
        const response = await api.post(`${import.meta.env.VITE_BACKUP_API}/restore/${type}/${filename}`);
        if (response.data.success) {
          addNotification('Backup restored successfully');
        }
      } catch (error) {
        console.error('Failed to restore backup:', error);
        addNotification('Failed to restore backup', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (type, filename) => {
    if (window.confirm('Are you sure you want to delete this backup?')) {
      try {
        setLoading(true);
        const response = await api.delete(`${import.meta.env.VITE_BACKUP_API}/delete/${type}/${filename}`);
        if (response.data.success) {
          addNotification('Backup deleted successfully');
          await loadBackups();
        }
      } catch (error) {
        console.error('Failed to delete backup:', error);
        addNotification('Failed to delete backup', 'error');
      } finally {
        setLoading(false);
      }
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

  return (
    <div className="admin-backup-page">
      <CompleteNav user={user} />
      <div className="admin-backup-body">
        <div className="header-container">
          <h1>Backups</h1>
          <button 
            className="refresh-button"
            onClick={loadBackups}
            disabled={loading}
          >
            <svg fill="#ffffff" height="30px" width="30px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 489.698 489.698" xml:space="preserve">
              <g>
                <g>
                  <path d="M468.999,227.774c-11.4,0-20.8,8.3-20.8,19.8c-1,74.9-44.2,142.6-110.3,178.9c-99.6,54.7-216,5.6-260.6-61l62.9,13.1 c10.4,2.1,21.8-4.2,23.9-15.6c2.1-10.4-4.2-21.8-15.6-23.9l-123.7-26c-7.2-1.7-26.1,3.5-23.9,22.9l15.6,124.8 c1,10.4,9.4,17.7,19.8,17.7c15.5,0,21.8-11.4,20.8-22.9l-7.3-60.9c101.1,121.3,229.4,104.4,306.8,69.3 c80.1-42.7,131.1-124.8,132.1-215.4C488.799,237.174,480.399,227.774,468.999,227.774z"></path>
                  <path d="M20.599,261.874c11.4,0,20.8-8.3,20.8-19.8c1-74.9,44.2-142.6,110.3-178.9c99.6-54.7,216-5.6,260.6,61l-62.9-13.1 c-10.4-2.1-21.8,4.2-23.9,15.6c-2.1,10.4,4.2,21.8,15.6,23.9l123.8,26c7.2,1.7,26.1-3.5,23.9-22.9l-15.6-124.8 c-1-10.4-9.4-17.7-19.8-17.7c-15.5,0-21.8,11.4-20.8,22.9l7.2,60.9c-101.1-121.2-229.4-104.4-306.8-69.2 c-80.1,42.6-131.1,124.8-132.2,215.3C0.799,252.574,9.199,261.874,20.599,261.874z"></path>
                </g>
              </g>
            </svg>
          </button>
        </div>

        <div className="backup-tabs-container">
          <div className="backup-tabs">
            <button
              className={`tab-button ${activeTab === 'mysql' ? 'active' : ''}`}
              onClick={() => setActiveTab('mysql')}
            >
              MySQL Backups
            </button>
            <button
              className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              Files Backups
            </button>
          </div>
          <div className="total-size">
            Total Size: {formatFileSize(totalSize)}
          </div>
        </div>

        <div className="backup-header">
          <div className="header-left">
            <h2>{activeTab === 'mysql' ? 'MySQL' : 'Files'} Backups</h2>
            <div className="sort-buttons">
              <button
                className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                onClick={() => setSortOrder('newest')}
              >
                Newest
              </button>
              <button
                className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortOrder('oldest')}
              >
                Oldest
              </button>
            </div>
          </div>
          <div className="header-right">
            <button
              className="create-backup-btn"
              onClick={handleCreateBackup}
              disabled={loading}
            >
              {loading ? 'Creating...' : `Create ${activeTab.toUpperCase()} Backup`}
            </button>
          </div>
        </div>

        <BackupList
          backups={sortedBackups}
          type={activeTab}
          onRestore={handleRestore}
          onDelete={handleDelete}
          loading={loading}
        />

        <div className="notifications">
          {notifications.map(({ id, message, type }) => (
            <div key={id} className={`notification ${type}`}>
              {message}
              <button
                className="close-notification"
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <ScrollButton />
    </div>
  );
};

export default BackupPage; 