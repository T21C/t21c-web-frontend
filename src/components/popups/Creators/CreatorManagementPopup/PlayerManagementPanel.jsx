import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import { CountrySelect } from '@/components/common/selectors';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import api from '@/utils/api';
import { CreatorAssignmentPanel } from '@/components/popups/Creators/CreatorAssignmentPopup/CreatorAssignmentPanel';
import AliasListEditor from './AliasListEditor';
import '@/components/popups/Creators/CreatorAssignmentPopup/creatorAssignmentPopup.css';

const PLAYER_TABS = [
  { id: 'update', i18nKey: 'player.modes.update' },
  { id: 'moderation', i18nKey: 'player.modes.moderation' },
  { id: 'link', i18nKey: 'player.modes.link' },
  { id: 'merge', i18nKey: 'player.modes.merge' },
];

const PlayerManagementPanel = ({ player, onClose, onUpdate, onCreatorUserLinkedUpdate }) => {
  const { t } = useTranslation(['components', 'common']);
  const tt = (key, opts) => t(`creatorManagementPopup.${key}`, opts);
  const popupRef = useRef(null);
  const { user: authUser } = useAuth();

  const [mode, setMode] = useState('update');
  const [playerName, setPlayerName] = useState(player?.name || '');
  const [selectedCountry, setSelectedCountry] = useState(player?.country || 'XX');
  const [aliases, setAliases] = useState(() => player?.playerAliases?.map((a) => a.name) ?? []);
  const [newAlias, setNewAlias] = useState('');
  const [isBanned, setIsBanned] = useState(
    hasFlag(player?.user, permissionFlags.BANNED) || player?.isBanned || false,
  );
  const [isSubmissionsPaused, setIsSubmissionsPaused] = useState(
    hasFlag(player?.user, permissionFlags.SUBMISSIONS_PAUSED) || false,
  );
  const [isRatingBanned, setIsRatingBanned] = useState(
    hasFlag(player?.user, permissionFlags.RATING_BANNED) || false,
  );
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showRatingBanConfirm, setShowRatingBanConfirm] = useState(false);
  const [pendingBanState, setPendingBanState] = useState(false);
  const [pendingPauseState, setPendingPauseState] = useState(false);
  const [pendingRatingBanState, setPendingRatingBanState] = useState(false);
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [showMergeInput, setShowMergeInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useBodyScrollLock(true);

  const isSuperAdminViewer = Boolean(authUser && hasFlag(authUser, permissionFlags.SUPER_ADMIN));
  const showLinkTab = isSuperAdminViewer && Boolean(player?.user?.id);

  const visibleTabs = useMemo(
    () =>
      PLAYER_TABS.filter((tab) => {
        if (tab.id === 'link') return showLinkTab;
        if (tab.id === 'merge') return isSuperAdminViewer;
        return true;
      }),
    [showLinkTab, isSuperAdminViewer],
  );

  const refreshPlayerAliasesFromServer = useCallback(async () => {
    if (!player?.id) return player?.playerAliases ?? [];
    const response = await api.get(`${import.meta.env.VITE_PLAYERS}/${player.id}`);
    const rows = response.data?.playerAliases ?? [];
    setAliases(rows.map((a) => a.name));
    return rows;
  }, [player?.id, player?.playerAliases]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshPlayerAliasesFromServer();
      } catch {
        // keep prop aliases
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPlayerAliasesFromServer]);

  useEffect(() => {
    setPlayerName(player?.name || '');
    setSelectedCountry(player?.country || 'XX');
    setIsBanned(hasFlag(player?.user, permissionFlags.BANNED) || player?.isBanned || false);
    setIsSubmissionsPaused(hasFlag(player?.user, permissionFlags.SUBMISSIONS_PAUSED) || false);
    setIsRatingBanned(hasFlag(player?.user, permissionFlags.RATING_BANNED) || false);
  }, [player?.id, player?.name, player?.country, player?.user, player?.isBanned]);

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
    if (!visibleTabs.some((tab) => tab.id === mode)) {
      setMode(visibleTabs[0]?.id || 'update');
    }
  }, [mode, visibleTabs]);

  const originalAliases = useMemo(
    () => player?.playerAliases?.map((a) => a.name) ?? [],
    [player?.playerAliases],
  );

  const hasPendingUpdateChanges = useMemo(() => {
    const nameChanged = playerName.trim() !== (player?.name || '').trim();
    const countryChanged = selectedCountry !== player?.country;
    const aliasesChanged =
      JSON.stringify([...aliases]) !== JSON.stringify([...originalAliases]);
    return nameChanged || countryChanged || aliasesChanged;
  }, [playerName, selectedCountry, aliases, player, originalAliases]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleAddAlias = () => {
    const trimmed = newAlias.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
    }
    setNewAlias('');
  };

  const handleRemoveAlias = (alias) => {
    setAliases(aliases.filter((a) => a !== alias));
  };

  const handlePlayerUpdate = async () => {
    if (!player?.id || !hasPendingUpdateChanges) return;
    setIsLoading(true);
    clearMessages();
    try {
      if (playerName.trim() !== (player.name || '').trim()) {
        await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/name`, {
          name: playerName.trim(),
        });
      }
      if (selectedCountry !== player.country) {
        await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/country`, {
          country: selectedCountry,
        });
      }
      const aliasesChanged =
        JSON.stringify([...aliases]) !== JSON.stringify([...originalAliases]);
      let playerAliases = player.playerAliases;
      if (aliasesChanged) {
        const response = await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/aliases`, {
          aliases,
        });
        playerAliases = response.data?.playerAliases ?? [];
        setAliases(playerAliases.map((a) => a.name));
      } else {
        try {
          playerAliases = await refreshPlayerAliasesFromServer();
        } catch {
          // best-effort
        }
      }

      onUpdate?.({
        ...player,
        name: playerName.trim(),
        country: selectedCountry,
        playerAliases,
      });
      setSuccess(tt('player.success.updated'));
      toast.success(tt('player.success.updated'));
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        tt('player.errors.updateFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowBanConfirm(false);
      setPendingBanState(isBanned);
      return;
    }
    setIsLoading(true);
    clearMessages();
    try {
      await api.patch(`${import.meta.env.VITE_PLAYERS}/${player.id}/ban`, {
        isBanned: pendingBanState,
      });
      setIsBanned(pendingBanState);
      onUpdate?.({ ...player, isBanned: pendingBanState });
      toast.success(tt('player.success.moderation'));
    } catch (err) {
      setError(err.response?.data?.details || tt('player.errors.banUpdate'));
    } finally {
      setIsLoading(false);
      setShowBanConfirm(false);
    }
  };

  const handlePauseUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowPauseConfirm(false);
      setPendingPauseState(isSubmissionsPaused);
      return;
    }
    setIsLoading(true);
    clearMessages();
    try {
      await api.patch(`${import.meta.env.VITE_PLAYERS}/${player.id}/pause-submissions`, {
        isSubmissionsPaused: pendingPauseState,
      });
      setIsSubmissionsPaused(pendingPauseState);
      onUpdate?.({ ...player, isSubmissionsPaused: pendingPauseState });
      toast.success(tt('player.success.moderation'));
    } catch (err) {
      setError(err.response?.data?.details || tt('player.errors.pauseUpdate'));
    } finally {
      setIsLoading(false);
      setShowPauseConfirm(false);
    }
  };

  const handleRatingBanUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowRatingBanConfirm(false);
      setPendingRatingBanState(isRatingBanned);
      return;
    }
    setIsLoading(true);
    clearMessages();
    try {
      await api.patch(`/v2/admin/users/${player.id}/rating-ban`, {
        isRatingBanned: pendingRatingBanState,
      });
      setIsRatingBanned(pendingRatingBanState);
      onUpdate?.({ ...player, isRatingBanned: pendingRatingBanState });
      toast.success(tt('player.success.moderation'));
    } catch (err) {
      setError(err.response?.data?.details || tt('player.errors.ratingBanUpdate'));
    } finally {
      setIsLoading(false);
      setShowRatingBanConfirm(false);
    }
  };

  const handleMergePlayer = async () => {
    if (!targetPlayerId.trim()) return;
    setIsLoading(true);
    clearMessages();
    try {
      await api.post(`${import.meta.env.VITE_PLAYERS}/${player.id}/merge`, {
        targetPlayerId: parseInt(targetPlayerId, 10),
      });
      toast.success(tt('player.success.merge'));
      onClose();
      window.location.href = '/leaderboard';
    } catch (err) {
      setError(err.response?.data?.details || tt('player.errors.mergeFailed'));
      toast.error(err.response?.data?.details || tt('player.errors.mergeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatorAssignmentUserUpdate = (updatedUser) => {
    onUpdate?.({ ...player, user: updatedUser });
    onCreatorUserLinkedUpdate?.(updatedUser);
  };

  const headerSubtitle = player?.user?.username ? `@${player.user.username}` : null;

  return (
    <div className="creator-management-popup-container">
      <div className="creator-management-popup-overlay">
        <div className="creator-management-popup" ref={popupRef}>
          <CloseButton variant="floating" onClick={onClose} aria-label={tt('close')} />

          <div className="popup-header">
            <h2>
              {player?.name || tt('player.titleFallback')}
              <span className="popup-header-meta">
                {tt('player.idLabel', { id: player?.id })}
                {headerSubtitle ? ` · ${headerSubtitle}` : ''}
              </span>
            </h2>
            <div className="mode-selector popup-btn-grid">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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

          {error ? <div className="error-message">{error}</div> : null}
          {success ? <div className="success-message">{success}</div> : null}

          <div className="popup-content">
            {mode === 'update' && (
              <div className="update-form">
                <div className="form-group">
                  <label>{tt('player.update.name.label')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={tt('player.update.name.placeholder')}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label>{tt('player.update.country.label')}</label>
                  <CountrySelect
                    value={selectedCountry}
                    onChange={setSelectedCountry}
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
                  type="button"
                  className={`action-button ${isLoading ? 'loading' : ''}`}
                  onClick={handlePlayerUpdate}
                  disabled={isLoading || !hasPendingUpdateChanges || !playerName.trim()}
                >
                  {isLoading ? (
                    <svg className="spinner spinner-svg spinner-medium" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
                    </svg>
                  ) : (
                    tt('player.update.saveButton')
                  )}
                </button>
              </div>
            )}

            {mode === 'moderation' && (
              <div className="player-moderation-form">
                <div className="moderation-option">
                  <label className="moderation-option__label">
                    <input
                      type="checkbox"
                      checked={showBanConfirm ? pendingBanState : isBanned}
                      onChange={(e) => {
                        setPendingBanState(e.target.checked);
                        setShowBanConfirm(true);
                      }}
                      disabled={isLoading || showBanConfirm}
                    />
                    <span>{tt('player.moderation.ban')}</span>
                  </label>
                  {showBanConfirm ? (
                    <div className="moderation-confirm">
                      <p>{pendingBanState ? tt('player.moderation.banConfirm') : tt('player.moderation.unbanConfirm')}</p>
                      <div className="moderation-confirm__actions popup-btn-grid">
                        <button type="button" className="action-button" onClick={() => handleBanUpdate(true)} disabled={isLoading}>
                          {t('buttons.confirm', { ns: 'common' })}
                        </button>
                        <button type="button" className="mode-btn" onClick={() => handleBanUpdate(false)} disabled={isLoading}>
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="moderation-option">
                  <label className="moderation-option__label">
                    <input
                      type="checkbox"
                      checked={showPauseConfirm ? pendingPauseState : isSubmissionsPaused}
                      onChange={(e) => {
                        setPendingPauseState(e.target.checked);
                        setShowPauseConfirm(true);
                      }}
                      disabled={isLoading || showPauseConfirm}
                    />
                    <span>{tt('player.moderation.pause')}</span>
                  </label>
                  {showPauseConfirm ? (
                    <div className="moderation-confirm">
                      <p>{pendingPauseState ? tt('player.moderation.pauseConfirm') : tt('player.moderation.resumeConfirm')}</p>
                      <div className="moderation-confirm__actions popup-btn-grid">
                        <button type="button" className="action-button" onClick={() => handlePauseUpdate(true)} disabled={isLoading}>
                          {t('buttons.confirm', { ns: 'common' })}
                        </button>
                        <button type="button" className="mode-btn" onClick={() => handlePauseUpdate(false)} disabled={isLoading}>
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="moderation-option">
                  <label className="moderation-option__label moderation-option__label--rating">
                    <input
                      type="checkbox"
                      checked={showRatingBanConfirm ? pendingRatingBanState : isRatingBanned}
                      onChange={(e) => {
                        setPendingRatingBanState(e.target.checked);
                        setShowRatingBanConfirm(true);
                      }}
                      disabled={isLoading || showRatingBanConfirm}
                    />
                    <span>{tt('player.moderation.ratingBan')}</span>
                  </label>
                  {showRatingBanConfirm ? (
                    <div className="moderation-confirm">
                      <p>
                        {pendingRatingBanState
                          ? tt('player.moderation.ratingBanConfirm')
                          : tt('player.moderation.ratingUnbanConfirm')}
                      </p>
                      <div className="moderation-confirm__actions popup-btn-grid">
                        <button type="button" className="action-button" onClick={() => handleRatingBanUpdate(true)} disabled={isLoading}>
                          {t('buttons.confirm', { ns: 'common' })}
                        </button>
                        <button type="button" className="mode-btn" onClick={() => handleRatingBanUpdate(false)} disabled={isLoading}>
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {mode === 'link' && showLinkTab && (
              <div className="player-link-form">
                <p className="form-hint">{tt('player.link.hint')}</p>
                <div className="creator-assignment-popup-host creator-assignment-popup-host--embedded">
                  <div className="creator-assignment-popup">
                    <CreatorAssignmentPanel
                      user={player.user}
                      onUserUpdate={handleCreatorAssignmentUserUpdate}
                      showIntro={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'merge' && isSuperAdminViewer && (
              <div className="merge-form">
                <div className="warning-notice">
                  <div className="warning-notice-icon">!</div>
                  <div className="warning-notice-content">
                    <strong>{tt('player.merge.warning.title')}</strong>{' '}
                    {tt('player.merge.warning.message', { name: player?.name || '' })}
                  </div>
                </div>

                {!showMergeInput ? (
                  <button
                    type="button"
                    className="mode-btn"
                    onClick={() => setShowMergeInput(true)}
                    disabled={isLoading}
                  >
                    {tt('player.merge.understandButton')}
                  </button>
                ) : (
                  <>
                    <div className="form-group">
                      <label>{tt('player.merge.targetId.label')}</label>
                      <input
                        type="text"
                        autoComplete="off"
                        className="merge-target-input"
                        value={targetPlayerId}
                        onChange={(e) => setTargetPlayerId(e.target.value)}
                        placeholder={tt('player.merge.targetId.placeholder')}
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="button"
                      className={`action-button warning ${isLoading ? 'loading' : ''}`}
                      onClick={handleMergePlayer}
                      disabled={isLoading || !targetPlayerId.trim()}
                    >
                      {tt('player.merge.mergeButton')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PlayerManagementPanel.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    country: PropTypes.string,
    isBanned: PropTypes.bool,
    isSubmissionsPaused: PropTypes.bool,
    isRatingBanned: PropTypes.bool,
    user: PropTypes.object,
    playerAliases: PropTypes.array,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
  onCreatorUserLinkedUpdate: PropTypes.func,
};

export default PlayerManagementPanel;
