import { CompleteNav } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import "./adminprofilingpage.css";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollButton } from "@/components/common/buttons";
import api from "@/utils/api";
import { EditIcon, RefreshIcon } from "@/components/common/icons";
import { AccessDenied } from "@/components/common/display";
import { toast } from "react-hot-toast";

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

const ProfileList = ({ profiles, type, onDelete, isLoadingProfiles, isDeletingProfile, showConfirmation, storedPassword }) => {
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

  const handleRename = async (profile) => {
    if (!newName.trim()) return;
    
    try {
      setRenameLoading(true);
      const response = await api.post(
        `/v2/profiling/rename/${profile.filename}`,
        { newName: newName + getFileNameAndExtension(profile.filename)[1] },
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Profile renamed successfully');
        setEditingId(null);
        setNewName('');
      }
    } catch (error) {
      console.error('Failed to rename profile:', error);
      toast.error('Failed to rename profile');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleAction = (action, profile) => {
    if (action === 'delete') {
      showConfirmation('delete', 'delete', { type, filename: profile.filename });
    } else if (action === 'download') {
      handleDownload(profile);
    } else if (action === 'rename') {
      setEditingId(profile.filename);
      setNewName(getFileNameAndExtension(profile.filename)[0]);
    }
  };

  const handleDownload = async (profile) => {
    if (downloading[profile.filename]) return;
    
    try {
      setDownloading(prev => ({ ...prev, [profile.filename]: true }));
      setDownloadProgress(prev => ({ ...prev, [profile.filename]: 0 }));

      const response = await api.get(
        `/v2/profiling/download/${profile.filename}`,
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          },
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(prev => ({ ...prev, [profile.filename]: percentCompleted }));
          }
        }
      );
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', profile.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Profile downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download profile');
    } finally {
      setDownloading(prev => ({ ...prev, [profile.filename]: false }));
      setDownloadProgress(prev => ({ ...prev, [profile.filename]: 0 }));
    }
  };

  return (
    <div className="profile-list">
      {profiles.length === 0 ? (
        <div className="no-profiles-message">
          <h2>No profiles available</h2>
          <p>There are no {type} profiles available. Create a new profile to get started.</p>
        </div>
      ) : (
        profiles.map((profile) => (
          <div key={profile.filename} className="profile-item">
            <div className="profile-info">
              <div className="filename-container">
                {editingId === profile.filename ? (
                  <div className="rename-controls">
                    <div className="rename-input-container">
                      <input
                        type="text"
                        className="rename-input"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new name"
                      />
                      <span className="file-extension">
                        {getFileNameAndExtension(profile.filename)[1]}
                      </span>
                    </div>
                    <div className="rename-buttons">
                      <button
                        className="save-rename-btn"
                        onClick={() => handleRename(profile)}
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
                    <h3>{profile.filename}</h3>
                    <button
                      className="edit-btn"
                      onClick={() => handleAction('rename', profile)}
                      disabled={isLoadingProfiles || isDeletingProfile}
                    >
                      <EditIcon />
                    </button>
                  </>
                )}
              </div>
              <div className="profile-details">
                <p className="profile-date">
                  {new Date(profile.created).toLocaleString()}
                  <TimeAgo date={profile.created} />
                </p>
                <p className="profile-size">
                  {formatFileSize(profile.size)}
                </p>
                <p className="profile-type">
                  {profile.type === 'cpu' ? 'CPU Profile' : 'Heap Profile'}
                </p>
              </div>
            </div>
            <div className="profile-actions">
              <div className="download-wrapper">
                <button
                  className={`download-btn ${downloading[profile.filename] ? 'downloading' : ''}`}
                  onClick={() => handleAction('download', profile)}
                  disabled={isLoadingProfiles || isDeletingProfile || downloading[profile.filename]}
                >
                  Download
                  <div className={`download-progress ${downloading[profile.filename] ? 'visible' : ''}`}>
                    <svg className="progress-circle" viewBox="0 0 36 36">
                      <path
                        className="progress-background"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="progress-bar"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        strokeDasharray={`${downloadProgress[profile.filename] || 0}, 100`}
                      />
                    </svg>
                  </div>
                </button>
              </div>
              <button
                className="delete-btn"
                onClick={() => handleAction('delete', profile)}
                disabled={isLoadingProfiles || isDeletingProfile}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ProfilingPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cpu');
  const [profiles, setProfiles] = useState({ cpu: [], heap: [] });
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [isTriggeringProfile, setIsTriggeringProfile] = useState(false);
  const [storedPassword, setStoredPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmationModal, setConfirmationModal] = useState({
    show: false,
    type: '',
    action: '',
    params: {},
  });
  // Remote profiling state
  const [isRemoteProfilingEnabled, setIsRemoteProfilingEnabled] = useState(false);
  const [isTogglingRemoteProfiling, setIsTogglingRemoteProfiling] = useState(false);
  const [remoteProfilingPid, setRemoteProfilingPid] = useState(null);

  const validatePassword = async (password) => {
    try {
      // Just validate the password format, no need to check with server yet
      if (!password || password.length < 6) {
        setPasswordError('Password must be at least 6 characters long');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Password validation error:', error);
      setPasswordError('Error validating password');
      return false;
    }
  };

  const handleInitialPasswordSubmit = async () => {
    if (!(await validatePassword(password))) return;
    
    try {
      setStoredPassword(password);
      setShowPasswordModal(false);
      setPassword('');
      setPasswordError('');
      await loadProfiles();
    } catch (error) {
      console.error('Password submission error:', error);
      setPasswordError('Error submitting password');
    }
  };

  const handleConfirmation = async () => {
    const { type, action, params } = confirmationModal;
    
    if (action === 'delete') {
      await handleDeleteWithPassword(type, params.filename);
    }
    
    setConfirmationModal({
      show: false,
      type: '',
      action: '',
      params: {},
    });
  };

  const showConfirmation = (type, action, params) => {
    setConfirmationModal({
      show: true,
      type,
      action,
      params,
    });
  };

  const handleDeleteWithPassword = async (type, filename) => {
    try {
      setIsDeletingProfile(true);
      const response = await api.delete(
        `/v2/profiling/delete/${filename}`,
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Profile deleted successfully');
        await loadProfiles();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete profile');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const loadProfiles = async () => {
    if (!storedPassword) return;
    
    try {
      setIsLoadingProfiles(true);
      const response = await api.get('/v2/profiling/list', {
        headers: {
          'X-Super-Admin-Password': storedPassword
        }
      });
      
      if (response.data) {
        setProfiles({
          cpu: response.data.cpu || [],
          heap: response.data.heap || [],
        });
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleTriggerProfile = async () => {
    if (!storedPassword) {
      setShowPasswordModal(true);
      return;
    }
    
    try {
      setIsTriggeringProfile(true);
      const endpoint = activeTab === 'cpu' 
        ? '/v2/profiling/trigger/cpu' 
        : '/v2/profiling/trigger/heap';
      
      const response = await api.post(
        endpoint,
        { duration: 10 },
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Profile created successfully');
        // Wait a moment for the profile to be created
        setTimeout(loadProfiles, 5000);
      }
    } catch (error) {
      console.error('Failed to trigger profiling:', error);
      toast.error('Failed to create profile');
    } finally {
      setIsTriggeringProfile(false);
    }
  };

  const handleDelete = async (type, filename) => {
    if (!storedPassword) {
      setShowPasswordModal(true);
      return;
    }
    
    showConfirmation('delete', 'delete', { type, filename });
  };

  // Load remote profiling status
  const loadRemoteProfilingStatus = async () => {
    if (!storedPassword) return;
    
    try {
      const response = await api.get('/v2/profiling/remote/status', {
        headers: {
          'X-Super-Admin-Password': storedPassword
        }
      });
      
      if (response.data.success) {
        setIsRemoteProfilingEnabled(response.data.enabled);
        setRemoteProfilingPid(response.data.pid);
      }
    } catch (error) {
      console.error('Failed to load remote profiling status:', error);
      toast.error('Failed to load remote profiling status');
    }
  };

  // Toggle remote profiling
  const handleToggleRemoteProfiling = async () => {
    if (!storedPassword) {
      setShowPasswordModal(true);
      return;
    }
    
    try {
      setIsTogglingRemoteProfiling(true);
      const response = await api.post(
        '/v2/profiling/remote/toggle',
        { enable: !isRemoteProfilingEnabled },
        {
          headers: {
            'X-Super-Admin-Password': storedPassword
          }
        }
      );
      
      if (response.data.success) {
        setIsRemoteProfilingEnabled(!isRemoteProfilingEnabled);
        setRemoteProfilingPid(response.data.pid);
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Failed to toggle remote profiling:', error);
      toast.error('Failed to toggle remote profiling');
    } finally {
      setIsTogglingRemoteProfiling(false);
    }
  };

  // Show password modal immediately when component mounts
  useEffect(() => {
    setShowPasswordModal(true);
  }, []);

  // Load profiles when password is set or tab changes
  useEffect(() => {
    if (storedPassword) {
      loadProfiles();
      loadRemoteProfilingStatus();
    }
  }, [activeTab, storedPassword]);

  if (!user?.isSuperAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="admin-profiling-page">
      <MetaTags
        title="Server Profiling"
        description="Manage server profiling data"
      />
      <CompleteNav />
      <div className="admin-profiling-body">
        <div className="header-container">
          <h1>Server Profiling</h1>
        </div>
        
        {/* Remote Profiling Section */}
        <div className="remote-profiling-section">
          <div className="remote-profiling-header">
            <h2>Remote Profiling</h2>
            <div className="remote-profiling-status">
              <span className={`status-indicator ${isRemoteProfilingEnabled ? 'enabled' : 'disabled'}`}>
                {isRemoteProfilingEnabled ? 'Enabled' : 'Disabled'}
              </span>
              {isRemoteProfilingEnabled && remoteProfilingPid && (
                <span className="pid-info">PID: {remoteProfilingPid}</span>
              )}
            </div>
          </div>
          <div className="remote-profiling-description">
            <p>
              Enable remote profiling to analyze the server from your local machine using Chrome DevTools.
              When enabled, you can connect to the server using Chrome DevTools at chrome://inspect/#devices.
            </p>
          </div>
          <div className="remote-profiling-actions">
            <button
              className={`toggle-remote-btn ${isRemoteProfilingEnabled ? 'enabled' : 'disabled'}`}
              onClick={handleToggleRemoteProfiling}
              disabled={isTogglingRemoteProfiling || !storedPassword}
            >
              {isTogglingRemoteProfiling 
                ? 'Toggling...' 
                : isRemoteProfilingEnabled ? 'Disable Remote Profiling' : 'Enable Remote Profiling'}
            </button>
          </div>
        </div>
        
        <div className="profiling-tabs-container">
          <div className="profiling-tabs">
            <button
              className={`tab-button ${activeTab === 'cpu' ? 'active' : ''}`}
              onClick={() => setActiveTab('cpu')}
            >
              CPU Profiles
            </button>
            <button
              className={`tab-button ${activeTab === 'heap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heap')}
            >
              Heap Profiles
            </button>
          </div>
          <div className="header-right">
            <button
              className="reload-btn"
              onClick={loadProfiles}
              disabled={isLoadingProfiles || !storedPassword}
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="profiling-header">
          <div className="header-left">
            <h2>{activeTab === 'cpu' ? 'CPU Profiles' : 'Heap Profiles'}</h2>
          </div>
          <button
            className="create-profile-btn"
            onClick={handleTriggerProfile}
            disabled={isLoadingProfiles || isTriggeringProfile || !storedPassword}
          >
            {isTriggeringProfile 
              ? 'Creating Profile...' 
              : activeTab === 'cpu' ? 'Create CPU Profile' : 'Create Heap Profile'}
          </button>
        </div>
        
        {isLoadingProfiles ? (
          <div className="loader-profile-detail">
            <div className="loader"></div>
            <p>Loading profiles...</p>
          </div>
        ) : (
          <ProfileList
            profiles={profiles[activeTab]}
            type={activeTab}
            onDelete={handleDelete}
            isLoadingProfiles={isLoadingProfiles}
            isDeletingProfile={isDeletingProfile}
            showConfirmation={showConfirmation}
            storedPassword={storedPassword}
          />
        )}
      </div>
      
      {showPasswordModal && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>Enter Admin Password</h3>
            <p>Please enter your admin password to access profiling features.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
            {passwordError && <p className="error-message">{passwordError}</p>}
            <div className="password-modal-actions">
              <button
                className="confirm-btn"
                onClick={handleInitialPasswordSubmit}
                disabled={!password}
              >
                Confirm
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPasswordError('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {confirmationModal.show && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this profile? This action cannot be undone.</p>
            <div className="password-modal-actions">
              <button
                className="confirm-btn"
                onClick={handleConfirmation}
              >
                Confirm
              </button>
              <button
                className="cancel-btn"
                onClick={() => setConfirmationModal({
                  show: false,
                  type: '',
                  action: '',
                  params: {},
                })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ScrollButton />
    </div>
  );
};

export default ProfilingPage; 