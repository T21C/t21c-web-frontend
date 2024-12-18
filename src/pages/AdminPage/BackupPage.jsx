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
        {backups.map((backup) => (
          <div key={backup.filename} className="backup-item">
            <div className="backup-info">
              <h3>{backup.filename}</h3>
              <div className="backup-details">
                <p className="backup-date">
                  Created: {new Date(backup.created).toLocaleString()}
                  <TimeAgo date={backup.created} />
                </p>
                <p className="backup-size">Size: {formatFileSize(backup.size)}</p>
              </div>
            </div>
            <div className="backup-actions">
              <button
                className="restore-btn"
                onClick={() => onRestore(type, backup.filename)}
                disabled={loading}
              >
                Restore
              </button>
              <button
                className="delete-btn"
                onClick={() => onDelete(type, backup.filename)}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BackupPage = () => {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const [backups, setBackups] = useState({ mysql: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('mysql'); // 'mysql' or 'files'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'

  const sortedBackups = useMemo(() => {
    if (!backups[activeTab] || backups[activeTab].length === 0) return [];
    return [...backups[activeTab]].sort((a, b) => {
      const dateA = new Date(a.created);
      const dateB = new Date(b.created);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [backups, activeTab, sortOrder]);

  const totalSize = useMemo(() => {
    if (!backups[activeTab]) return 0;
    return backups[activeTab].reduce((sum, backup) => sum + backup.size, 0);
  }, [backups, activeTab]);

  useEffect(() => {
    fetchBackups();
  }, []);

  const addNotification = (message, type = 'error') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${import.meta.env.VITE_BACKUP_API}/list`);
      setBackups(response.data);
    } catch (err) {
      addNotification("Failed to fetch backups");
      console.error("Error fetching backups:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await api.post(`${import.meta.env.VITE_BACKUP_API}/create`, {
        target: activeTab
      });
      addNotification(`${activeTab.toUpperCase()} backup created successfully`, "success");
      await fetchBackups();
    } catch (err) {
      addNotification("Failed to create backup");
      console.error("Error creating backup:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (type, filename) => {
    if (window.confirm("Are you sure you want to restore this backup? This will overwrite current data.")) {
      try {
        setLoading(true);
        await api.post(`${import.meta.env.VITE_BACKUP_API}/restore/${type}/${filename}`);
        addNotification("Backup restored successfully", "success");
      } catch (err) {
        addNotification("Failed to restore backup");
        console.error("Error restoring backup:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteBackup = async (type, filename) => {
    if (window.confirm("Are you sure you want to delete this backup? This cannot be undone.")) {
      try {
        setLoading(true);
        await api.delete(`${import.meta.env.VITE_BACKUP_API}/delete/${type}/${filename}`);
        addNotification("Backup deleted successfully", "success");
        await fetchBackups();
      } catch (err) {
        addNotification("Failed to delete backup");
        console.error("Error deleting backup:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="admin-backup-page">
      <CompleteNav />
      <ScrollButton />
      <div className="admin-backup-body">
        <h1>Database Backups</h1>
        
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
            <div className="sort-controls">
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
              className="reload-btn"
              onClick={fetchBackups}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
            <button
              className="create-backup-btn"
              onClick={handleCreateBackup}
              disabled={loading}
            >
              Create New {activeTab === 'mysql' ? 'MySQL' : 'Files'} Backup
            </button>
          </div>
        </div>

        <div className="notifications">
          {notifications.map(({ id, message, type }) => (
            <div key={id} className={`notification ${type}`}>
              {message}
              <button className="close-notification" onClick={() => removeNotification(id)}>
                ×
              </button>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loader-backup-detail">Loading...</div>
        ) : (
          <BackupList
            backups={sortedBackups}
            type={activeTab}
            onRestore={handleRestoreBackup}
            onDelete={handleDeleteBackup}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export default BackupPage; 