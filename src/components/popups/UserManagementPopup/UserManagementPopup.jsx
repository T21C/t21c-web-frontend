import React, { useState, useEffect, useCallback } from 'react';
import './usermanagementpopup.css';
import api from '@/utils/api';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/layout';
import { hasAnyFlag, permissionFlags } from '@/utils/UserPermissions';
import { hasFlag } from '@/utils/UserPermissions';

// Role configuration for different management types
const ROLE_CONFIGS = {
  rater: {
    title: 'Raters',
    endpoint: '/v2/admin/users',
    roles: [
      { flag: permissionFlags.RATER, name: 'rater', label: 'userManagement.roles.rater' },
      { flag: permissionFlags.SUPER_ADMIN, name: 'superadmin', label: 'userManagement.roles.superadmin' }
    ]
  },
  curator: {
    title: 'Curators',
    endpoint: '/v2/admin/users/curators',
    roles: [
      { flag: permissionFlags.CURATOR, name: 'curator', label: 'userManagement.roles.curator' },
      { flag: permissionFlags.HEAD_CURATOR, name: 'headcurator', label: 'userManagement.roles.headCurator' }
    ]
  }
};

const isOnlyHeadCurator = (user) => {
  return hasFlag(user, permissionFlags.HEAD_CURATOR) && !hasFlag(user, permissionFlags.SUPER_ADMIN);
};

const UserEntry = ({ user, onUpdate, onDelete, superAdminPassword, onError, roleConfig, currentUser }) => {
  const { t } = useTranslation('components');
  const tUser = (key, params) => t(`userManagement.userEntry.${key}`, params);
  const tError = (key) => t(`userManagement.errors.${key}`) || key;
  const tButtons = (key, params) => t(`userManagement.buttons.${key}`, params);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Find the highest role the user has
  const getHighestRole = () => {
    for (let i = roleConfig.roles.length - 1; i >= 0; i--) {
      if (hasFlag(user, roleConfig.roles[i].flag)) {
        return roleConfig.roles[i];
      }
    }
    return null;
  };

  // Find the next role to promote to (step-by-step progression)
  const getNextRole = () => {
    const currentRole = getHighestRole();
    if (!currentRole) {
      return roleConfig.roles[0]; // First role (rater/curator)
    }
    const currentIndex = roleConfig.roles.findIndex(r => r.flag === currentRole.flag);
    if (currentIndex < roleConfig.roles.length - 1) {
      return roleConfig.roles[currentIndex + 1]; // Next role in sequence
    }
    return null; // Already at highest role
  };

  // Find the previous role to demote to (step-by-step demotion)
  const getPreviousRole = () => {
    const currentRole = getHighestRole();
    if (!currentRole) {
      return null; // No current role
    }
    const currentIndex = roleConfig.roles.findIndex(r => r.flag === currentRole.flag);
    if (currentIndex > 0) {
      return roleConfig.roles[currentIndex - 1]; // Previous role in sequence
    }
    return null; // Already at lowest role
  };

  // Check if user is at the top role
  const isAtTopRole = () => {
    const currentRole = getHighestRole();
    if (!currentRole) return false;
    const currentIndex = roleConfig.roles.findIndex(r => r.flag === currentRole.flag);
    return currentIndex === roleConfig.roles.length - 1;
  };

  // Check if user is at the bottom role
  const isAtBottomRole = () => {
    const currentRole = getHighestRole();
    if (!currentRole) return true; // No role = at bottom
    const currentIndex = roleConfig.roles.findIndex(r => r.flag === currentRole.flag);
    return currentIndex === 0;
  };

  // Check if user can be completely removed (only if not at bottom role)
  const canBeRemoved = () => {
    return isAtBottomRole();
  };

  // Check if current user can manage this user
  const canManageUser = () => {
    // Super admins can manage everyone
    if (hasFlag(currentUser, permissionFlags.SUPER_ADMIN)) {
      return true;
    }
    
    // Head curators can only manage regular curators (not other head curators)
    if (hasAnyFlag(currentUser, [permissionFlags.HEAD_CURATOR, permissionFlags.SUPER_ADMIN])) {
      const userHighestRole = getHighestRole();
      if (!userHighestRole) return false;
      
      // Head curators can only manage users with curator role (not head curator)
      return userHighestRole.flag === permissionFlags.CURATOR;
    }
    
    return false;
  };

  // Check if user should show as protected (head curators when current user is head curator)
  const shouldShowProtected = () => {
    if (isOnlyHeadCurator(currentUser)) {
      const userHighestRole = getHighestRole();
      return userHighestRole && userHighestRole.flag === permissionFlags.HEAD_CURATOR;
    }
    return false;
  };

  const handleRoleChange = async (promote = true) => {
    // Only require password for super admins
    if (hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && !superAdminPassword) {
      onError(tError('passwordRequired'));
      return;
    }

    try {
      setIsLoading(true);
      
      if (promote) {
        // Promoting: Grant the next role
        const targetRole = getNextRole();
        if (!targetRole) {
          onError(tError('alreadyHighestRole'));
          return;
        }

        const payload = {
          username: user.username,
          role: targetRole.name
        };

        await api.post(`/v2/admin/users/grant-role`, payload, {
          headers: hasFlag(currentUser, permissionFlags.SUPER_ADMIN) ? {
            'X-Super-Admin-Password': superAdminPassword
          } : {}
        });
      } else {
        // Demoting: Revoke the current role
        const currentRole = getHighestRole();
        if (!currentRole) {
          onError(tError('alreadyLowestRole'));
          return;
        }

        const payload = {
          userId: user.id,
          role: currentRole.name
        };

        await api.post(`/v2/admin/users/revoke-role`, payload, {
          headers: hasFlag(currentUser, permissionFlags.SUPER_ADMIN) ? {
            'X-Super-Admin-Password': superAdminPassword
          } : {}
        });
      }
      
      onUpdate();
    } catch (error) {
      console.error('Error updating role:', error);
      if (error.response?.data?.message === 'Invalid super admin password') {
        onError(tError('invalidPassword'));
      } else {
        onError(error.response?.data?.error || tError('updateRoleFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    // Check if user can be removed (not at bottom role)
    if (!canBeRemoved()) {
      onError(tError('cannotRemoveBottomRole'));
      return;
    }

    if (!window.confirm(tError('deleteConfirm'))) {
      return;
    }

    // Only require password for super admins
    if (hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && !superAdminPassword) {
      onError(tError('passwordRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const currentRole = getHighestRole();
      if (!currentRole) {
        onError(tError('noRoleToRemove'));
        return;
      }

      const payload = { 
        userId: user.id,
        role: currentRole.name
      };
      await api.post(`/v2/admin/users/revoke-role`, payload, {
        headers: hasFlag(currentUser, permissionFlags.SUPER_ADMIN) ? {
          'X-Super-Admin-Password': superAdminPassword
        } : {}
      });
      onDelete();
    } catch (error) {
      console.error('Error removing user:', error);
      if (error.response?.data?.error === 'Invalid super admin password') {
        onError(tError('invalidPassword'));
      } else {
        onError(error.response?.data?.error || tError('deleteFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentRole = getHighestRole();
  const nextRole = getNextRole();
  const previousRole = getPreviousRole();
  const atTopRole = isAtTopRole();
  const atBottomRole = isAtBottomRole();

  return (
    <div className="user-entry">
      <div className="user-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="user-info">
          <UserAvatar 
            primaryUrl={user.avatarUrl}
            fallbackUrl={user.pfp}
          />
          <div className="user-text">
            <span className="user-name">
              {user.nickname || tUser('unknown')}
              {currentRole && (
                <span className={`role-badge ${atTopRole ? 'top-role' : ''}`} title={t(currentRole.label)}>
                  {t(currentRole.label)}
                  {atTopRole && <span className="top-role-indicator">★</span>}
                </span>
              )}
            </span>
            <span className="internal-username">@{user.username}</span>
          </div>
        </div>
        <div className="user-actions">
          {/* Show Protected status for head curators when current user is head curator */}
          {shouldShowProtected() && (
            <span className="protected-status">Protected</span>
          )}
          
          {/* Only show actions if current user can manage this user */}
          {canManageUser() && (
            <>
                             {/* Promote button - only for bottom role users */}
               {atBottomRole && nextRole && hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && (
                 <button 
                   className="promote-button"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleRoleChange(true);
                   }}
                   disabled={(hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && !superAdminPassword) || isLoading}
                   title={tButtons('promoteTo', { role: t(nextRole.label) })}
                 >
                   {tButtons('promote')}
                 </button>
               )}
               
               {/* Demote button - only for top role users */}
               {atTopRole && previousRole && (
                 <button 
                   className="demote-button"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleRoleChange(false);
                   }}
                   disabled={(hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && !superAdminPassword) || isLoading}
                   title={tButtons('demoteTo', { role: t(previousRole.label) })}
                 >
                   {tButtons('demote')}
                 </button>
               )}

               {/* Delete button - only for users who can be removed (not at bottom role) */}
               {currentRole && canBeRemoved() && (
                 <button 
                   className="delete-user-button"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleDelete();
                   }}
                   disabled={(hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && !superAdminPassword) || isLoading}
                 >
                   {tUser('buttons.remove')}
                 </button>
               )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const UserManagementPopup = ({ onClose, currentUser, initialMode = 'rater' }) => {
  const { t } = useTranslation('components');
  
  // Determine initial mode based on user permissions
  const getInitialMode = () => {
    if (hasFlag(currentUser, permissionFlags.SUPER_ADMIN)) {
      return initialMode;
    }
    // If user is head curator, force curator mode
    if (hasFlag(currentUser, permissionFlags.HEAD_CURATOR)) {
      return 'curator';
    }
    return initialMode;
  };
  
  const [managementMode, setManagementMode] = useState(getInitialMode());
  const roleConfig = ROLE_CONFIGS[managementMode];
  const tPopup = (key) => t(`userManagement.${key}`) || key;

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClickOutside = useCallback((event) => {
    if (event.target.classList.contains('user-management-overlay')) {
      onClose();
    }
  }, [onClose]);

  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleClickOutside, handleEscapeKey]);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get(roleConfig.endpoint);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage(t('userManagement.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [roleConfig.endpoint, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleModeChange = (newMode) => {
    // Head curators can only stay in curator mode
    if (isOnlyHeadCurator(currentUser) &&
    newMode !== 'curator') {
      return;
    }
    
    setManagementMode(newMode);
    setUsers([]);
    setNewUserUsername('');
    setSearchQuery('');
    setErrorMessage('');
  };

  const handleAddUser = async () => {
    if (!newUserUsername.trim()) return;

    // Only require password for super admins
    if (hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && !superAdminPassword) {
      setErrorMessage(t('userManagement.errors.passwordRequired'));
      return;
    }

    try {
      const payload = { 
        username: newUserUsername,
        role: roleConfig.roles[0].name // Start with the lowest role
      };
      await api.post('/v2/admin/users/grant-role', payload, {
        headers: hasFlag(currentUser, permissionFlags.SUPER_ADMIN) ? {
          'X-Super-Admin-Password': superAdminPassword
        } : {}
      });
      await fetchUsers();
      setNewUserUsername('');
    } catch (error) {
      console.error('Error adding user:', error);
      setErrorMessage(error.response?.data?.error || t('userManagement.errors.addFailed'));
    }
  };

  const handleUpdateUser = useCallback(() => fetchUsers(), [fetchUsers]);

  const handleDeleteUser = useCallback(() => fetchUsers(), [fetchUsers]);

  const handleError = (message) => {
    setErrorMessage(message);
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.nickname?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="user-management-overlay">
      <div className="user-management-popup">
        <div className="popup-header">
          {/* Only show mode toggle if user is not a head curator */}
          {!isOnlyHeadCurator(currentUser) && (
            <div className="mode-toggle">
              <button
                className={`mode-button ${managementMode === 'rater' ? 'active' : ''}`}
                onClick={() => handleModeChange('rater')}
              >
                {tPopup('modeToggle.rater')}
              </button>
              <button
                className={`mode-button ${managementMode === 'curator' ? 'active' : ''}`}
                onClick={() => handleModeChange('curator')}
              >
                {tPopup('modeToggle.curator')}
              </button>
            </div>
          )}
                     {/* Only show password input for super admins */}
           {hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && (
             <div className="header-password-input">
               <input
                 type="password"
                 value={superAdminPassword}
                 onChange={(e) => setSuperAdminPassword(e.target.value)}
                 placeholder={tPopup('superAdmin.password.placeholder')}
               />
             </div>
           )}
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="search-section">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tPopup('search.placeholder')}
            className="search-input"
            autoComplete='off'
            aria-autocomplete='none'
          />
        </div>

        <div className="users-list">
          {isLoading ? (
            <div className="loading">{tPopup('loading')}</div>
          ) : (
            filteredUsers.map(user => (
              <UserEntry
                key={user.id}
                user={user}
                onUpdate={handleUpdateUser}
                onDelete={handleDeleteUser}
                superAdminPassword={superAdminPassword}
                onError={handleError}
                roleConfig={roleConfig}
                currentUser={currentUser}
              />
            ))
          )}
        </div>

        {/* Only show add user section if user can add users (super admin or head curator) */}
        {(hasFlag(currentUser, permissionFlags.SUPER_ADMIN) || hasFlag(currentUser, permissionFlags.HEAD_CURATOR)) && (
          <div className="add-user-section">
            <input
              type="text"
              value={newUserUsername}
              onChange={(e) => setNewUserUsername(e.target.value)}
              placeholder={tPopup('addUser.placeholder')}
            />
            <button onClick={handleAddUser}>{tPopup('addUser.button')}</button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="error-message-container">
          <p className="error-text">{errorMessage}</p>
          <button className="close-error" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}
    </div>
  );
};

export default UserManagementPopup;
