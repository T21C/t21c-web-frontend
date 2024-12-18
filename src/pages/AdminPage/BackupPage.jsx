import { CompleteNav } from "../../components";
import "./css/adminbackuppage.css";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import api from "../../utils/api";

const BackupPage = () => {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const [backups, setBackups] = useState({ mysql: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

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
      await api.post(`${import.meta.env.VITE_BACKUP_API}/create`);
      addNotification("Backup created successfully", "success");
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

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const renderBackupList = (backupList, type) => (
    <div className="backup-section">
      <h2>{type.toUpperCase()} Backups</h2>
      <div className="backup-list">
        {backupList.map((backup) => (
          <div key={backup.filename} className="backup-item">
            <div className="backup-info">
              <h3>{backup.filename}</h3>
              <p>{new Date(backup.created).toLocaleString()}</p>
              <p>{formatFileSize(backup.size)}</p>
            </div>
            <div className="backup-actions">
              <button
                className="restore-btn"
                onClick={() => handleRestoreBackup(type, backup.filename)}
                disabled={loading}
              >
                Restore
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteBackup(type, backup.filename)}
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

  return (
    <div className="admin-backup-page">
      <CompleteNav />
      <ScrollButton />
      <div className="admin-backup-body">
        <div className="backup-header">
          <h1>Database Backups</h1>
          <button
            className="create-backup-btn"
            onClick={handleCreateBackup}
            disabled={loading}
          >
            Create New Backup
          </button>
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
        ) : (backups.mysql.length > 0 || backups.files.length > 0) ? (
          <>
            {renderBackupList(backups.mysql, 'mysql')}
            {renderBackupList(backups.files, 'files')}
          </>
        ) : (
          <div className="no-backups-message">
            <h2>No backups available</h2>
            <p>Create your first backup using the button above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupPage; 