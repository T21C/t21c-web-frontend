import { routes } from '@/api/routes';
// tuf-search: #CreatorManagementPopup #creatorManagementPopup #popups #creators #creatorManagement
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect } from '@/components/common/selectors';
import { CreatorStatusBadge } from '@/components/common/display/CreatorStatusBadge/CreatorStatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import api from '@/utils/api';
import './creatormanagementpopup.css';
import { userAvatarDisplayUrl } from '@/utils/playerAvatarDisplay';
import AliasListEditor from './AliasListEditor';
import CreatorProfileTab from './CreatorProfileTab';
import PlayerManagementPanel from './PlayerManagementPanel';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
};

const VERIFICATION_STATUSES = ['declined', 'pending', 'conditional', 'allowed'];

const roleOptions = Object.entries(CreditRole).map(([key, value]) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const TABS = [
  { id: 'update', i18nKey: 'modes.update' },
  { id: 'profile', i18nKey: 'modes.profile' },
  { id: 'user', i18nKey: 'modes.user' },
  { id: 'merge', i18nKey: 'modes.merge' },
  { id: 'split', i18nKey: 'modes.split' },
  { id: 'delete', i18nKey: 'modes.delete' },
];

export const CreatorManagementPopup = ({
  creator,
  player = null,
  onClose,
  onUpdate,
  onCreatorUserLinkedUpdate,
  curationProfileInitial = null,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const tt = (key, opts) => t(`creatorManagementPopup.${key}`, opts);
  const popupRef = useRef(null);
  const { user } = useAuth();
  const { curationTypesDict } = useDifficultyContext();

  if (player?.id) {
    return (
      <PlayerManagementPanel
        player={player}
        onClose={onClose}
        onUpdate={onUpdate}
        onCreatorUserLinkedUpdate={onCreatorUserLinkedUpdate}
      />
    );
  }

  const [mode, setMode] = useState('update');
  const [curationProfile, setCurationProfile] = useState(curationProfileInitial);
  const [curationProfileLoading, setCurationProfileLoading] = useState(false);

  const [name, setName] = useState(creator?.name || '');
  const [aliases, setAliases] = useState(creator?.creatorAliases?.map(a => a.name) || []);
  const [newAlias, setNewAlias] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(
    creator?.verificationStatus || 'allowed'
  );
  const [uploadConditions, setUploadConditions] = useState('');

  const [playerSearch, setPlayerSearch] = useState('');
  const [playerResults, setPlayerResults] = useState([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  const [discordId, setDiscordId] = useState('');
  const [pendingDiscordInfo, setPendingDiscordInfo] = useState(null);
  const [showDiscordConfirm, setShowDiscordConfirm] = useState(false);

  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeTargetSearch, setMergeTargetSearch] = useState('');
  const [availableCreators, setAvailableCreators] = useState([]);

  const [splitNames, setSplitNames] = useState(['', '']);
  const [splitRoles, setSplitRoles] = useState([]);
  const [defaultRole, setDefaultRole] = useState(CreditRole.CHARTER);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [superAdminDangerPassword, setSuperAdminDangerPassword] = useState('');

  useBodyScrollLock(true);

  useEffect(() => {
    if (curationProfileInitial) {
      setCurationProfile(curationProfileInitial);
    }
  }, [curationProfileInitial]);

  useEffect(() => {
    if (!creator?.id) return undefined;
    let cancelled = false;
    setCurationProfileLoading(true);
    const url = `${routes.creatorsV3.root()}/${creator.id}/profile`;
    api
      .get(url)
      .then((res) => {
        if (!cancelled) setCurationProfile(res.data);
      })
      .catch((err) => {
        if (!cancelled) console.error('Creator profile fetch for badges failed:', err);
      })
      .finally(() => {
        if (!cancelled) setCurationProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creator?.id]);

  const canEditHeaderBadges = useMemo(() => {
    if (!user || !creator) return false;
    const cid = Number(creator.id);
    if (!Number.isFinite(cid)) return false;
    const linkedCreator = user.creatorId != null && Number(user.creatorId) === cid;
    const linkedUser = creator.user?.id && user.id === creator.user.id;
    return (
      linkedCreator ||
      Boolean(linkedUser) ||
      hasFlag(user, permissionFlags.SUPER_ADMIN) ||
      hasFlag(user, permissionFlags.HEAD_CURATOR)
    );
  }, [user, creator]);

  const handleCurationBadgesSaved = useCallback(
    (ids) => {
      setCurationProfile((p) =>
        p && typeof p === 'object' ? { ...p, displayCurationTypeIds: ids } : p,
      );
      onUpdate?.();
    },
    [onUpdate],
  );

  useEffect(() => {
    if (creator?.credits?.length === 1) {
      const single = creator.credits[0];
      setDefaultRole(single.role || CreditRole.CHARTER);
    }
  }, [creator]);

  useEffect(() => {
    setName(creator?.name || '');
    setAliases(creator?.creatorAliases?.map(a => a.name) || []);
    setVerificationStatus(creator?.verificationStatus || 'allowed');
  }, [creator?.id, creator?.name, creator?.verificationStatus]);

  useEffect(() => {
    if (!creator?.id || curationProfile == null) return;
    const v =
      typeof curationProfile.uploadConditions === 'string'
        ? curationProfile.uploadConditions
        : '';
    setUploadConditions(v);
  }, [creator?.id, curationProfile]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e) => {
      if (e.button !== 0 && e.button !== undefined) return;
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        const isReactSelect =
          e.target.closest('.custom-select-menu') ||
          e.target.closest('[class*="react-select"]') ||
          e.target.closest('[id*="react-select"]');
        if (!isReactSelect) onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const nameChanged = name !== (creator?.name || '');
    const originalAliases = creator?.creatorAliases?.map(a => a.name) || [];
    const aliasesChanged = JSON.stringify([...aliases].sort()) !== JSON.stringify([...originalAliases].sort());
    const statusChanged = verificationStatus !== (creator?.verificationStatus || 'allowed');
    const savedUpload =
      curationProfile != null && typeof curationProfile.uploadConditions === 'string'
        ? curationProfile.uploadConditions
        : '';
    const uploadChanged = uploadConditions !== savedUpload;
    setHasPendingChanges(nameChanged || aliasesChanged || statusChanged || uploadChanged);
  }, [name, aliases, verificationStatus, uploadConditions, creator, curationProfile]);

  // Merge target search (mirrors old popup)
  useEffect(() => {
    let cancelToken;
    const fetchCreators = async () => {
      try {
        if (cancelToken) cancelToken.cancel('New search initiated');
        cancelToken = api.CancelToken.source();
        setAvailableCreators(null);
        const params = new URLSearchParams({
          page: 1,
          limit: 20,
          search: mergeTargetSearch,
          sort: 'NAME_ASC',
        });
        const res = await api.get(`${routes.database.creators.root()}?${params}`, {
          cancelToken: cancelToken.token,
        });
        setAvailableCreators(res.data.results.filter(c => c.id !== creator?.id));
      } catch (err) {
        if (!api.isCancel(err)) {
          console.error('Error fetching creators:', err);
          setError(tt('errors.loadCreatorsFailed'));
          setAvailableCreators([]);
        }
      }
    };
    if (mode === 'merge') fetchCreators();
    return () => {
      if (cancelToken) cancelToken.cancel('Component unmounted');
    };
  }, [creator?.id, mode, mergeTargetSearch]);

  // Player search for User Assignment tab
  useEffect(() => {
    if (mode !== 'user') return;
    const trimmed = playerSearch.trim();
    if (trimmed.length < 1) {
      setPlayerResults([]);
      return;
    }
    let cancelled = false;
    setPlayerSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(
          `${routes.playersV3.root()}/search?query=${encodeURIComponent(trimmed)}`
        );
        if (cancelled) return;
        const body = res.data;
        const results = Array.isArray(body) ? body : (body?.results ?? []);
        setPlayerResults(results);
      } catch (err) {
        if (!cancelled) {
          console.error('Player search failed:', err);
          setPlayerResults([]);
        }
      } finally {
        if (!cancelled) setPlayerSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, playerSearch]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleAddAlias = () => {
    const trimmed = newAlias.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (alias) => {
    setAliases(aliases.filter((a) => a !== alias));
  };

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    clearMessages();
    try {
      const res = await api.patch(
        `${routes.creatorsV3.root()}/${creator.id}/managed-update`,
        {
          name: name.trim(),
          aliases,
          verificationStatus,
          uploadConditions: uploadConditions.trim().length ? uploadConditions.trim() : null,
        },
      );
      if (res.status === 200) {
        setSuccess(tt('success.updated'));
        toast.success(tt('success.updated'));
        onUpdate?.();
      } else {
        setError(res.data?.error || tt('errors.updateFailed'));
      }
    } catch (err) {
      console.error('Error updating creator:', err);
      setError(err.response?.data?.error || tt('errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignPlayer = async (player) => {
    if (!player) return;
    setIsLoading(true);
    clearMessages();
    try {
      const userOrPlayerId = player.user?.id || player.id;
      const res = await api.put(
        routes.database.creators.assignCreatorToUser(userOrPlayerId, creator.id)
      );
      if (res.status === 200) {
        setSuccess(tt('success.userAssigned'));
        toast.success(tt('success.userAssigned'));
        onUpdate?.();
      }
    } catch (err) {
      console.error('Error assigning user to creator:', err);
      const msg = err.response?.data?.error || tt('errors.assignFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignUser = async () => {
    if (!creator?.user?.id) return;
    setIsLoading(true);
    clearMessages();
    try {
      const res = await api.delete(
        routes.database.creators.removeCreatorFromUser(creator.user.id)
      );
      if (res.status === 200) {
        setSuccess(tt('success.userUnassigned'));
        toast.success(tt('success.userUnassigned'));
        onUpdate?.();
      }
    } catch (err) {
      console.error('Error unassigning user:', err);
      toast.error(tt('errors.unassignFailed'));
    } finally {
      setIsLoading(false);
      setShowUnassignConfirm(false);
    }
  };

  const handleDiscordIdSubmit = async () => {
    if (!discordId) return;
    try {
      setIsLoading(true);
      const res = await api.get(routes.admin.users.discord(discordId));
      if (res.status !== 200) {
        toast.error(res.data?.details || tt('errors.fetchDiscordFailed'));
        return;
      }
      const user = res.data;
      setPendingDiscordInfo({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      });
      setShowDiscordConfirm(true);
    } catch (err) {
      console.error('Error fetching Discord ID:', err);
      toast.error(tt('errors.fetchDiscordFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordConfirm = async (confirmed) => {
    if (!confirmed || !pendingDiscordInfo) {
      setShowDiscordConfirm(false);
      setPendingDiscordInfo(null);
      return;
    }
    try {
      setIsLoading(true);
      const res = await api.put(
        routes.database.creators.discord(creator.id, pendingDiscordInfo.id)
      );
      if (res.status === 200) {
        toast.success(tt('success.discordUpdated'));
        setDiscordId('');
        onUpdate?.();
      }
    } catch (err) {
      console.error('Error updating Discord info:', err);
      toast.error(tt('errors.updateDiscordFailed'));
    } finally {
      setIsLoading(false);
      setShowDiscordConfirm(false);
      setPendingDiscordInfo(null);
    }
  };

  const handleMerge = async () => {
    if (!mergeTarget) return;
    setIsLoading(true);
    clearMessages();
    try {
      await api.post(routes.database.creators.merge(), {
        sourceId: creator.id,
        targetId: mergeTarget.id,
      });
      setSuccess(tt('success.merged'));
      onUpdate?.();
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error('Error merging creators:', err);
      setError(tt('errors.mergeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplit = async () => {
    const validNames = splitNames.filter((n) => n.trim());
    if (validNames.length < 1) return;
    setIsLoading(true);
    clearMessages();
    try {
      await api.post(routes.database.creators.split(), {
        creatorId: creator.id,
        newNames: validNames,
        roles: validNames.map((_, i) => splitRoles?.[i] || defaultRole),
      });
      setSuccess(tt('success.split'));
      onUpdate?.();
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error('Error splitting creator:', err);
      setError(tt('errors.splitFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const verificationOptions = VERIFICATION_STATUSES.map((s) => ({
    value: s,
    label: t(`verification.${s}`, { ns: 'common' }),
  }));

  const isSuperAdminViewer = Boolean(user && hasFlag(user, permissionFlags.SUPER_ADMIN));

  const hasLinkedUserAccount = Boolean(
    creator?.user?.id ||
      (creator?.userId != null &&
        creator.userId !== '' &&
        String(creator.userId).toLowerCase() !== 'null'),
  );

  const visibleTabs = useMemo(
    () =>
      TABS.filter((tab) => {
        if (tab.id === 'delete' && !isSuperAdminViewer) return false;
        if (tab.id === 'profile' && !canEditHeaderBadges) return false;
        return true;
      }),
    [isSuperAdminViewer, canEditHeaderBadges],
  );

  useEffect(() => {
    if (mode === 'delete' && !isSuperAdminViewer) {
      setMode('update');
    }
    if (mode === 'profile' && !canEditHeaderBadges) {
      setMode('update');
    }
  }, [mode, isSuperAdminViewer, canEditHeaderBadges]);

  const handleAdminPurgeCreator = async () => {
    if (!isSuperAdminViewer) return;
    if (!superAdminDangerPassword.trim()) {
      toast.error(tt('superAdminDanger.passwordRequired'));
      return;
    }
    if (!window.confirm(tt('superAdminDanger.confirmPurge'))) return;
    setIsLoading(true);
    clearMessages();
    try {
      await api.delete(routes.admin.creators.byId(creator.id), {
        headers: {'X-Super-Admin-Password': superAdminDangerPassword},
      });
      toast.success(tt('superAdminDanger.successPurge'));
      onUpdate?.();
      onClose();
    } catch (err) {
      const m = err.response?.data?.message || err.response?.data?.error;
      toast.error(m || tt('superAdminDanger.purgeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminUnlinkCreator = async () => {
    if (!isSuperAdminViewer) return;
    if (!superAdminDangerPassword.trim()) {
      toast.error(tt('superAdminDanger.passwordRequired'));
      return;
    }
    if (!window.confirm(tt('superAdminDanger.confirmUnlink'))) return;
    setIsLoading(true);
    clearMessages();
    try {
      await api.delete(`${routes.admin.creators.byId(creator.id)}?unlinkOnly=1`, {
        headers: {'X-Super-Admin-Password': superAdminDangerPassword},
      });
      toast.success(tt('superAdminDanger.successUnlink'));
      onUpdate?.();
      onClose();
    } catch (err) {
      const m = err.response?.data?.message || err.response?.data?.error;
      toast.error(m || tt('superAdminDanger.unlinkFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const linkedUserDisplayAvatar = creator?.user ? userAvatarDisplayUrl(creator.user) : null;

  return (
    <div className="creator-management-popup-container">
      <div className="creator-management-popup-overlay">
        <div className="creator-management-popup" ref={popupRef}>
          <CloseButton
            variant="floating"
            onClick={onClose}
            aria-label={tt('close')}
          />

          <div className="popup-header">
            <h2>
              {creator?.name}
              {creator?.verificationStatus && (
                <CreatorStatusBadge
                  status={creator.verificationStatus}
                  className="popup-header-status"
                />
              )}
            </h2>
            <div className="mode-selector popup-btn-grid">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`mode-btn ${mode === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setMode(tab.id);
                    clearMessages();
                  }}
                >
                  {tt(tab.i18nKey)}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="popup-content">
            {mode === 'update' && (
              <div className="update-form">
                <div className="form-group">
                  <label>{tt('update.name.label')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tt('update.name.placeholder')}
                  />
                </div>

                <div className="form-group">
                  <label>{tt('update.verificationStatus.label')}</label>
                  <CustomSelect
                    options={verificationOptions}
                    value={verificationOptions.find((o) => o.value === verificationStatus)}
                    onChange={(opt) => setVerificationStatus(opt?.value || 'allowed')}
                    placeholder={tt('update.verificationStatus.placeholder')}
                    width="100%"
                  />
                  <p className="status-help">
                    {t(`creators.verificationStatus.help.${verificationStatus}`, {
                      ns: 'pages',
                      defaultValue: '',
                    })}
                  </p>
                </div>

                <div className="form-group">
                  <label>{tt('update.uploadConditions.label')}</label>
                  <textarea
                    className="creator-management-popup__upload-conditions"
                    rows={4}
                    value={uploadConditions}
                    onChange={(e) => setUploadConditions(e.target.value)}
                    placeholder={tt('update.uploadConditions.placeholder')}
                    maxLength={2000}
                  />
                </div>

                <AliasListEditor
                  aliases={aliases}
                  newAlias={newAlias}
                  onNewAliasChange={setNewAlias}
                  onAdd={handleAddAlias}
                  onRemove={handleRemoveAlias}
                  disabled={isLoading}
                  label={tt('update.aliases.label')}
                  placeholder={tt('update.aliases.placeholder')}
                  addLabel={tt('update.aliases.add')}
                />

                <button
                  className={`action-button ${isLoading ? 'loading' : ''}`}
                  onClick={handleUpdate}
                  disabled={isLoading || !name.trim() || !hasPendingChanges}
                >
                  {isLoading ? (
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
                    </svg>
                  ) : (
                    tt('update.updateButton')
                  )}
                </button>
              </div>
            )}

            {mode === 'profile' && (
              <CreatorProfileTab
                creatorId={Number(creator.id)}
                canEdit={canEditHeaderBadges}
                curationProfile={curationProfile}
                curationProfileLoading={curationProfileLoading}
                curationTypesDict={curationTypesDict}
                onBadgesSaved={handleCurationBadgesSaved}
                tt={tt}
              />
            )}

            {mode === 'user' && (
              <div className="user-form">
                {creator?.user ? (
                  <div className="form-group">
                    <label>{tt('user.linked.label')}</label>
                    <div className="linked-user-info">
                      {linkedUserDisplayAvatar && (
                        <img
                          src={linkedUserDisplayAvatar}
                          alt={creator.user.username}
                          className="user-avatar"
                        />
                      )}
                      <div className="user-info-content">
                        <p className="user-username">@{creator.user.username}</p>
                        <p className="user-id">
                          {tt('user.linked.idLabel')} {creator.user.id}
                        </p>
                        <button
                          onClick={() => setShowUnassignConfirm(true)}
                          className="unlink-button"
                          type="button"
                          disabled={isLoading}
                        >
                          {tt('user.linked.unassignButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>{tt('user.search.label')}</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder={tt('user.search.placeholder')}
                      />
                    </div>

                    <div className="player-results-list">
                      {playerSearchLoading ? (
                        <div className="player-loading-row">
                          {t('loading.generic', { ns: 'common' })}
                        </div>
                      ) : playerResults.length === 0 ? (
                        <div className="player-empty-row">
                          {playerSearch.trim().length > 0
                            ? tt('user.search.noResults')
                            : tt('user.search.hint')}
                        </div>
                      ) : (
                        playerResults.map((player) => {
                          const alreadyLinked = !!player.user?.creatorId;
                          return (
                            <div key={player.id} className="player-result-row">
                              <img
                                src={userAvatarDisplayUrl(player) || ''}
                                alt={player.name}
                                className="player-pfp"
                              />
                              <div className="player-result-info">
                                <span className="player-name">
                                  {player.user?.nickname || player.name}
                                </span>
                                {player.user?.username && (
                                  <span className="player-handle">
                                    @{player.user.username}
                                  </span>
                                )}
                                {alreadyLinked && (
                                  <span className="player-warning">
                                    {tt('user.search.alreadyLinked')}
                                  </span>
                                )}
                              </div>
                              <button
                                className="assign-row-button"
                                onClick={() => handleAssignPlayer(player)}
                                disabled={isLoading}
                              >
                                {tt('user.search.assignButton')}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="discord-fallback">
                      <div className="form-group">
                        <label>{tt('user.discordFallback.label')}</label>
                        <div className="discord-input-group">
                          <input
                            type="text"
                            value={discordId}
                            onChange={(e) => setDiscordId(e.target.value)}
                            placeholder={tt('user.discordFallback.placeholder')}
                            disabled={isLoading || showDiscordConfirm}
                          />
                          <button
                            onClick={handleDiscordIdSubmit}
                            disabled={isLoading || showDiscordConfirm || !discordId}
                            className="fetch-discord-button"
                          >
                            {tt('user.discordFallback.lookupButton')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {showDiscordConfirm && pendingDiscordInfo && (
                      <div className="discord-confirm-container">
                        <div className="discord-preview">
                          {pendingDiscordInfo.avatarUrl && (
                            <img
                              src={pendingDiscordInfo.avatarUrl}
                              alt={tt('discord.confirm.avatarAlt')}
                              className="discord-avatar"
                            />
                          )}
                          <div>
                            <p className="discord-username">@{pendingDiscordInfo.username}</p>
                            <p className="discord-id">
                              {tt('discord.currentUser.idLabel')} {pendingDiscordInfo.id}
                            </p>
                          </div>
                        </div>
                        <p className="discord-confirm-message">{tt('discord.confirm.message')}</p>
                        <div className="discord-confirm-buttons popup-btn-grid">
                          <button
                            type="button"
                            onClick={() => handleDiscordConfirm(true)}
                            disabled={isLoading}
                            className="discord-confirm-button"
                          >
                            {tt('discord.confirm.confirmButton')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscordConfirm(false)}
                            disabled={isLoading}
                            className="discord-cancel-button"
                          >
                            {tt('discord.confirm.cancelButton')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {showUnassignConfirm && (
                  <div className="confirm-dialog">
                    <div className="confirm-content">
                      <p>{tt('user.linked.unassignConfirm')}</p>
                      <div className="confirm-buttons popup-btn-grid">
                        <button
                          onClick={handleUnassignUser}
                          className="confirm-yes"
                          disabled={isLoading}
                        >
                          {tt('user.linked.unassignYes')}
                        </button>
                        <button
                          onClick={() => setShowUnassignConfirm(false)}
                          className="confirm-no"
                          disabled={isLoading}
                        >
                          {tt('user.linked.unassignCancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'delete' && isSuperAdminViewer && (
              <div className="delete-tab super-admin-danger">
                <h3 className="super-admin-danger__title">{tt('superAdminDanger.title')}</h3>
                <p className="super-admin-danger__hint">{tt('superAdminDanger.hint')}</p>
                <input
                  type="password"
                  name="superadmin-creator-danger-password"
                  autoComplete="off"
                  className="super-admin-danger__password"
                  value={superAdminDangerPassword}
                  onChange={(e) => setSuperAdminDangerPassword(e.target.value)}
                  placeholder={tt('superAdminDanger.passwordPlaceholder')}
                  disabled={isLoading}
                />
                <div className="super-admin-danger__actions popup-btn-grid">
                  <button
                    type="button"
                    className="super-admin-danger__btn super-admin-danger__btn--purge btn-fill-danger"
                    onClick={handleAdminPurgeCreator}
                    disabled={isLoading}
                  >
                    {tt('superAdminDanger.purgeButton')}
                  </button>
                  {hasLinkedUserAccount ? (
                    <button
                      type="button"
                      className="super-admin-danger__btn super-admin-danger__btn--unlink btn-fill-neutral-heavy"
                      onClick={handleAdminUnlinkCreator}
                      disabled={isLoading}
                    >
                      {tt('superAdminDanger.unlinkButton')}
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {mode === 'merge' && (
              <div className="merge-form">
                <div className="warning-notice">
                  <div className="warning-notice-icon">!</div>
                  <div className="warning-notice-content">
                    <strong>{tt('merge.warning.title')}</strong>{' '}
                    {tt('merge.warning.message', { creatorName: creator?.name || '' })}
                  </div>
                </div>

                <div className="form-group">
                  <label>{tt('merge.selectTarget.label')}</label>
                  <CustomSelect
                    options={
                      availableCreators === null
                        ? []
                        : availableCreators.map((c) => ({
                            value: c.id,
                            label: tt('merge.creatorLabel', {
                              name: c.name,
                              id: c.id,
                              count: c.credits?.length || 0,
                              aliases:
                                c.aliases?.length > 0
                                  ? ` [${c.aliases.join(', ')}]`
                                  : '',
                            }),
                          }))
                    }
                    value={
                      mergeTarget
                        ? {
                            value: mergeTarget.id,
                            label: `${mergeTarget.name} (ID: ${mergeTarget.id})`,
                          }
                        : null
                    }
                    onChange={(opt) => {
                      const target = availableCreators?.find((c) => c.id === opt?.value);
                      setMergeTarget(target);
                    }}
                    placeholder={tt('merge.selectTarget.placeholder')}
                    onInputChange={(value) => setMergeTargetSearch(value)}
                    isSearchable={true}
                    width="100%"
                    isLoading={availableCreators === null}
                    noOptionsMessage={() =>
                      availableCreators === null
                        ? t('loading.generic', { ns: 'common' })
                        : tt('merge.selectTarget.noOptions')
                    }
                  />
                </div>

                <button
                  className={`action-button warning ${isLoading ? 'loading' : ''}`}
                  onClick={handleMerge}
                  disabled={isLoading || !mergeTarget}
                >
                  {isLoading ? (
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
                    </svg>
                  ) : (
                    tt('merge.mergeButton')
                  )}
                </button>
              </div>
            )}

            {mode === 'split' && (
              <div className="split-form">
                <div className="form-group">
                  <label>{tt('split.newNamesAndRoles.label')}</label>
                  <div className="split-names-list">
                    {splitNames.map((nm, index) => (
                      <div key={index} className="split-name-input">
                        <div className="split-name-role-container">
                          <input
                            type="text"
                            value={nm}
                            onChange={(e) => {
                              const newNames = [...splitNames];
                              newNames[index] = e.target.value;
                              setSplitNames(newNames);
                            }}
                            placeholder={tt('split.newNamesAndRoles.namePlaceholder', {
                              index: index + 1,
                            })}
                          />
                          <CustomSelect
                            options={roleOptions}
                            value={roleOptions.find(
                              (o) => o.value === (splitRoles?.[index] || defaultRole)
                            )}
                            onChange={(opt) => {
                              const newRoles = [
                                ...(splitRoles || splitNames.map(() => defaultRole)),
                              ];
                              newRoles[index] = opt ? opt.value : defaultRole;
                              setSplitRoles(newRoles);
                            }}
                            placeholder={tt('split.newNamesAndRoles.rolePlaceholder')}
                            width="100%"
                          />
                        </div>
                        {splitNames.length > 2 && (
                          <button
                            onClick={() => {
                              setSplitNames(splitNames.filter((_, i) => i !== index));
                              setSplitRoles((prev) => {
                                const newRoles = [
                                  ...(prev || splitNames.map(() => defaultRole)),
                                ];
                                newRoles.splice(index, 1);
                                return newRoles;
                              });
                            }}
                            className="remove-name-button"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSplitNames([...splitNames, '']);
                        setSplitRoles((prev) => [
                          ...(prev || splitNames.map(() => defaultRole)),
                          defaultRole,
                        ]);
                      }}
                      className="add-name-button"
                    >
                      {tt('split.newNamesAndRoles.addAnother')}
                    </button>
                  </div>
                </div>

                <button
                  className={`action-button ${isLoading ? 'loading' : ''}`}
                  onClick={handleSplit}
                  disabled={
                    isLoading || splitNames.filter((n) => n.trim()).length < 1
                  }
                >
                  {isLoading ? (
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
                    </svg>
                  ) : (
                    tt('split.splitButton')
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorManagementPopup;
