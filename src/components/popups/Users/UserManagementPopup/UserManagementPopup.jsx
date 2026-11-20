// tuf-search: #UserManagementPopup #userManagementPopup #popups #users #userManagement
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './usermanagementpopup.css';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { UserAvatar } from '@/components/layout';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { hasAnyFlag, hasFlag, permissionFlags, setUserPermission } from '@/utils/UserPermissions';
import { SearchField } from '@/components/common/SearchField';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect, ProfileSelector, StateDisplay } from '@/components/common/selectors';
import { toastIfRateLimited, getRateLimitMessage } from '@/utils/rateLimitError';

const STAFF_ROLES = [
  {
    name: 'rater',
    flag: permissionFlags.RATER,
    labelKey: 'userManagement.roles.rater',
    requires: 'superAdmin',
  },
  {
    name: 'superadmin',
    flag: permissionFlags.SUPER_ADMIN,
    labelKey: 'userManagement.roles.superadmin',
    requires: 'superAdminPassword',
  },
  {
    name: 'curator',
    flag: permissionFlags.CURATOR,
    labelKey: 'userManagement.roles.curator',
    requires: 'headCurator',
  },
  {
    name: 'headcurator',
    flag: permissionFlags.HEAD_CURATOR,
    labelKey: 'userManagement.roles.headCurator',
    requires: 'superAdmin',
  },
  {
    name: 'submissionmanager',
    flag: permissionFlags.SUBMISSION_MANAGER,
    labelKey: 'userManagement.roles.submissionManager',
    requires: 'superAdmin',
  },
];

const isOnlyHeadCurator = (user) => {
  return hasFlag(user, permissionFlags.HEAD_CURATOR) && !hasFlag(user, permissionFlags.SUPER_ADMIN);
};

const isSameUser = (a, b) => Boolean(a?.id && b?.id && String(a.id) === String(b.id));

const isSelfLockoutRevoke = (actor, target, roleName) => {
  if (!isSameUser(actor, target)) return false;
  if (roleName === 'superadmin') return true;
  if (roleName === 'headcurator' && !hasFlag(actor, permissionFlags.SUPER_ADMIN)) return true;
  return false;
};

const viewerCanGrantRole = (viewer, role) => {
  if (role.requires === 'headCurator') {
    return hasAnyFlag(viewer, [permissionFlags.HEAD_CURATOR, permissionFlags.SUPER_ADMIN]);
  }
  if (role.requires === 'superAdmin' || role.requires === 'superAdminPassword') {
    return hasFlag(viewer, permissionFlags.SUPER_ADMIN);
  }
  return false;
};

const roleRequestHeaders = (roleName, currentUser, superAdminPassword) => {
  if (roleName === 'superadmin' && hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && superAdminPassword) {
    return { 'X-Super-Admin-Password': superAdminPassword };
  }
  return {};
};

const reportRoleError = (error, t, fallbackKey) => {
  if (toastIfRateLimited(error)) {
    toast.error(getRateLimitMessage(error));
    return;
  }
  const message =
    error.response?.data?.error ||
    error.response?.data?.message ||
    t(fallbackKey);
  toast.error(message);
};

const UserEntry = ({
  user,
  onRoleChanged,
  superAdminPassword,
  currentUser,
  visibleRoles,
}) => {
  const { t } = useTranslation('components');
  const [isLoading, setIsLoading] = useState(false);
  const protectedRow = isOnlyHeadCurator(currentUser) && hasFlag(user, permissionFlags.HEAD_CURATOR);

  const handleToggle = async (role, enable) => {
    const currentlyOn = hasFlag(user, role.flag);
    if (enable === currentlyOn) return;

    if (!enable && isSelfLockoutRevoke(currentUser, user, role.name)) {
      toast.error(t('userManagement.errors.cannotRemoveOwnRole'));
      return;
    }

    if (role.requires === 'superAdminPassword' && !superAdminPassword) {
      toast.error(t('userManagement.errors.passwordRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const headers = roleRequestHeaders(role.name, currentUser, superAdminPassword);
      if (enable) {
        await api.post(
          routes.admin.users.grantRole(),
          { username: user.username, role: role.name },
          { headers },
        );
      } else {
        await api.post(
          routes.admin.users.revokeRole(),
          { userId: user.id, role: role.name },
          { headers },
        );
      }
      onRoleChanged(user.id, role.flag, enable);
    } catch (error) {
      console.error('Error updating role:', error);
      reportRoleError(error, t, 'userManagement.errors.updateRoleFailed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="user-entry">
      <div className="user-header">
        <div className="user-info">
          <UserAvatar
            {...userAvatarUrls(user)}
          />
          <div className="user-text">
            <span className="user-name">
              {user.nickname || t('userManagement.userEntry.unknown')}
              {protectedRow && (
                <span className="protected-status">{t('userManagement.userEntry.protected')}</span>
              )}
            </span>
            <span className="internal-username">@{user.username}</span>
          </div>
        </div>
      </div>
      <div className="user-roles">
        {visibleRoles.map((role) => {
          const isOn = hasFlag(user, role.flag);
          const needsPassword = role.requires === 'superAdminPassword' && !superAdminPassword;
          const selfLocked = isOn && isSelfLockoutRevoke(currentUser, user, role.name);
          const canToggle = !protectedRow && !isLoading && !needsPassword && !selfLocked;
          return (
            <div
              key={role.name}
              className={`user-role-toggle${canToggle ? '' : ' is-disabled'}`}
            >
              <StateDisplay
                label={t(role.labelKey)}
                currentState={isOn ? 'on' : 'off'}
                states={['off', 'on']}
                activeStates={['on']}
                showValue={false}
                width={56}
                height={24}
                padding={3}
                onChange={(next) => {
                  if (!canToggle) return;
                  handleToggle(role, next === 'on');
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UserManagementPopup = ({ onClose, currentUser }) => {
  const { t } = useTranslation(['components', 'common']);
  const headCuratorOnly = isOnlyHeadCurator(currentUser);
  const visibleRoles = useMemo(
    () => STAFF_ROLES.filter((role) => viewerCanGrantRole(currentUser, role)),
    [currentUser],
  );
  const addRoleOptions = useMemo(
    () => visibleRoles.map((role) => ({
      value: role.name,
      label: t(role.labelKey),
    })),
    [visibleRoles, t],
  );

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addRole, setAddRole] = useState(visibleRoles[0]?.name || 'curator');
  const [searchQuery, setSearchQuery] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!visibleRoles.some((role) => role.name === addRole)) {
      setAddRole(visibleRoles[0]?.name || 'curator');
    }
  }, [visibleRoles, addRole]);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const endpoint = headCuratorOnly
        ? routes.admin.users.curators()
        : routes.admin.users.root();
      const response = await api.get(endpoint);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      reportRoleError(error, t, 'userManagement.errors.loadFailed');
    } finally {
      setIsLoading(false);
    }
  }, [headCuratorOnly, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const patchUserRole = useCallback((userId, flag, enable) => {
    setUsers((prev) => prev.map((entry) => (
      String(entry.id) === String(userId)
        ? setUserPermission(entry, flag, enable)
        : entry
    )));
  }, []);

  const handleAddUser = async () => {
    if (!selectedUser?.id && !selectedUser?.username) {
      toast.error(t('userManagement.errors.selectUser'));
      return;
    }
    const role = STAFF_ROLES.find((entry) => entry.name === addRole);
    if (!role) return;

    if (role.requires === 'superAdminPassword' && !superAdminPassword) {
      toast.error(t('userManagement.errors.passwordRequired'));
      return;
    }

    try {
      setIsAdding(true);
      const { data } = await api.post(
        routes.admin.users.grantRole(),
        {
          userId: selectedUser.id,
          username: selectedUser.username,
          role: role.name,
        },
        {
          headers: roleRequestHeaders(role.name, currentUser, superAdminPassword),
        },
      );
      const granted = data?.user;
      setUsers((prev) => {
        const existing = prev.find((entry) => String(entry.id) === String(selectedUser.id || granted?.id));
        if (existing) {
          return prev.map((entry) => (
            String(entry.id) === String(existing.id)
              ? setUserPermission(entry, role.flag, true)
              : entry
          ));
        }
        const nextUser = setUserPermission({
          ...granted,
          id: granted?.id || selectedUser.id,
          username: granted?.username || selectedUser.username,
          nickname: granted?.nickname || selectedUser.nickname,
          avatarUrl: granted?.avatarUrl || selectedUser.avatarUrl,
          playerId: granted?.playerId ?? selectedUser.playerId,
          permissionFlags: granted?.permissionFlags,
        }, role.flag, true);
        return [nextUser, ...prev];
      });
      setSelectedUser(null);
    } catch (error) {
      console.error('Error adding user:', error);
      reportRoleError(error, t, 'userManagement.errors.addFailed');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.nickname?.toLowerCase().includes(searchLower)
    );
  });

  const selectedAddRole = addRoleOptions.find((option) => option.value === addRole) || addRoleOptions[0] || null;

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="user-management-overlay"
      panelClassName="user-management-popup"
    >
        <div className="popup-header">
          <h2>{t('userManagement.title')}</h2>
           {hasFlag(currentUser, permissionFlags.SUPER_ADMIN) && (
             <div className="header-password-input">
              <input type="hidden" name="superadmin-verification-password" />
               <input
                 type="password"
                 autoComplete="current-password"
                 data-form-type="other"
                 value={superAdminPassword}
                 onChange={(e) => setSuperAdminPassword(e.target.value)}
                 placeholder={t('userManagement.superAdmin.password.placeholder')}
               />
             </div>
           )}
          <CloseButton
            variant="inline"
            onClick={onClose}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
        </div>

        <div className="search-section">
          <SearchField
            type="text"
            name="user-management-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('userManagement.search.placeholder')}
            className="search-input"
            autoComplete="off"
            aria-autocomplete="none"
            data-form-type="other"
          />
        </div>

        <div className="users-list">
          {isLoading ? (
            <div className="loading">{t('userManagement.loading')}</div>
          ) : (
            filteredUsers.map((user) => (
              <UserEntry
                key={user.id}
                user={user}
                onRoleChanged={patchUserRole}
                superAdminPassword={superAdminPassword}
                currentUser={currentUser}
                visibleRoles={visibleRoles}
              />
            ))
          )}
        </div>

        {visibleRoles.length > 0 && (
          <div className="add-user-section">
            <ProfileSelector
              type="user"
              className="user-add-picker"
              value={selectedUser}
              onChange={setSelectedUser}
              placeholder={t('userManagement.addUser.placeholder')}
              userSearchIncludeSelf
              portalDropdown
              allowRequestNew={false}
              disabled={isAdding}
            />
            <CustomSelect
              options={addRoleOptions}
              value={selectedAddRole}
              onChange={(option) => {
                if (option?.value) setAddRole(option.value);
              }}
              width="14rem"
              placeholder={t('userManagement.addUser.rolePlaceholder')}
              aria-label={t('userManagement.addUser.rolePlaceholder')}
              isDisabled={isAdding}
            />
            <button type="button" onClick={handleAddUser} disabled={isAdding}>
              {t('userManagement.addUser.button')}
            </button>
          </div>
        )}
    </PopupShell>
  );
};

export default UserManagementPopup;
