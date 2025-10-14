import React, { useState } from 'react';
import './adminplayerpopup.css';
import api from '@/utils/api';
import { CountrySelect } from '@/components/common/selectors';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

const AdminPlayerPopup = ({ player = {}, onClose, onUpdate }) => {
  const { t } = useTranslation('components');
  const tAdmin = (key) => t(`adminPopups.player.${key}`) || key;

  if (!player) {
    console.error('Player prop is undefined');
    return null;
  }

  const [selectedCountry, setSelectedCountry] = useState(player.country || 'XX');
  const [isBanned, setIsBanned] = useState(hasFlag(player.user, permissionFlags.BANNED) || player.isBanned || false);
  const [isSubmissionsPaused, setIsSubmissionsPaused] = useState(hasFlag(player.user, permissionFlags.SUBMISSIONS_PAUSED) || false);
  const [isRatingBanned, setIsRatingBanned] = useState(hasFlag(player.user, permissionFlags.RATING_BANNED) || false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showRatingBanConfirm, setShowRatingBanConfirm] = useState(false);
  const [pendingBanState, setPendingBanState] = useState(false);
  const [pendingPauseState, setPendingPauseState] = useState(false);
  const [pendingRatingBanState, setPendingRatingBanState] = useState(false);
  const [playerName, setPlayerName] = useState(player.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [discordInfo, setDiscordInfo] = useState({
    username: player.discordUsername || '',
    avatarUrl: player.discordAvatar || null,
    avatarId: player.discordAvatarId || null,
    id: player.discordId || null,
    isNewData: false
  });
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showMergeInput, setShowMergeInput] = useState(false);
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [pendingMergeState, setPendingMergeState] = useState(null);

  const handleClose = (e) => {
    if (isLoading) return;
    
    if (e.target.className === 'admin-player-popup-overlay') {
      onClose();
    }
  };

  const handleNameUpdate = async () => {
    if (!playerName.trim() || playerName === player.name) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/name`, {
        name: playerName
      });

      onUpdate?.({
        ...player,
        name: playerName
      });
    } catch (err) {
      setError(err.response?.data?.details || tAdmin('errors.nameUpdate'));
      setPlayerName(player.name);
      console.error('Error updating player name:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryUpdate = async () => {
    if (selectedCountry === player.country) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.put(`${import.meta.env.VITE_PLAYERS}/${player.id}/country`, {
        country: selectedCountry
      });

      onUpdate?.({
        ...player,
        country: selectedCountry
      });
    } catch (err) {
      setError(err.response?.data?.details || tAdmin('errors.countryUpdate'));
      setSelectedCountry(player.country);
      console.error('Error updating country:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanChange = (newBanState) => {
    setPendingBanState(newBanState);
    setShowBanConfirm(true);
  };

  const handleBanUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowBanConfirm(false);
      setPendingBanState(isBanned);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.patch(`${import.meta.env.VITE_PLAYERS}/${player.id}/ban`, {
        isBanned: pendingBanState
      });

      setIsBanned(pendingBanState);
      onUpdate?.({
        ...player,
        isBanned: pendingBanState
      });
    } catch (err) {
      setError(err.response?.data?.details || tAdmin('errors.banUpdate'));
      setPendingBanState(isBanned);
      console.error('Error updating ban status:', err);
    } finally {
      setIsLoading(false);
      setShowBanConfirm(false);
    }
  };

  const handlePauseChange = (newPauseState) => {
    setPendingPauseState(newPauseState);
    setShowPauseConfirm(true);
  };

  const handlePauseUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowPauseConfirm(false);
      setPendingPauseState(isSubmissionsPaused);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.patch(`${import.meta.env.VITE_PLAYERS}/${player.id}/pause-submissions`, {
        isSubmissionsPaused: pendingPauseState
      });

      setIsSubmissionsPaused(pendingPauseState);
      onUpdate?.({
        ...player,
        isSubmissionsPaused: pendingPauseState
      });
    } catch (err) {
      setError(err.response?.data?.details || tAdmin('errors.pauseUpdate'));
      setPendingPauseState(isSubmissionsPaused);
      console.error('Error updating pause status:', err);
    } finally {
      setIsLoading(false);
      setShowPauseConfirm(false);
    }
  };

  const handleMergePlayer = async (confirmed) => {
    if (!confirmed || !targetPlayerId) {
      setShowMergeModal(false);
      setShowMergeInput(false);
      setTargetPlayerId('');
      setPendingMergeState(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post(`${import.meta.env.VITE_PLAYERS}/${player.id}/merge`, {
        targetPlayerId: parseInt(targetPlayerId)
      });

      toast.success(tAdmin('success.mergePlayer'));
      onClose();
      window.location.href = '/leaderboard';
    } catch (err) {
      console.error('Error merging player:', err);
      toast.error(err.response?.data?.details || tAdmin('errors.mergePlayer'));
      setTargetPlayerId('');
      setPendingMergeState(null);
    } finally {
      setIsLoading(false);
      setShowMergeModal(false);
      setShowMergeInput(false);
    }
  };

  const handleRatingBanChange = (newRatingBanState) => {
    setPendingRatingBanState(newRatingBanState);
    setShowRatingBanConfirm(true);
  };

  const handleRatingBanUpdate = async (confirmed) => {
    if (!confirmed) {
      setShowRatingBanConfirm(false);
      setPendingRatingBanState(isRatingBanned);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.patch(`${import.meta.env.VITE_USERS}/${player.id}/rating-ban`, {
        isRatingBanned: pendingRatingBanState
      });

      setIsRatingBanned(pendingRatingBanState);
      onUpdate?.({
        ...player,
        isRatingBanned: pendingRatingBanState
      });
    } catch (err) {
      setError(err.response?.data?.details || tAdmin('errors.ratingBanUpdate'));
      setPendingRatingBanState(isRatingBanned);
      console.error('Error updating rating ban status:', err);
    } finally {
      setIsLoading(false);
      setShowRatingBanConfirm(false);
    }
  };

  return (
    <div className="admin-player-popup-overlay" onClick={handleClose}>
      <div className="admin-player-popup" onClick={(e) => e.stopPropagation()}>
        <div className="admin-player-popup-header">
          <h2>{tAdmin('title')}</h2>
          <button className="close-button" onClick={onClose}>{tAdmin('close')}</button>
        </div>

        <div className="admin-form">
          <div className="form-group name-section">
            <label htmlFor="playerName">{tAdmin('form.name.label')}</label>
            <div className="name-input-group">
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={tAdmin('form.name.placeholder')}
              />
              {playerName !== player.name && (
                <button
                  type="button"
                  onClick={handleNameUpdate}
                  disabled={isLoading || !playerName.trim()}
                  className="update-name-button"
                >
                  {tAdmin('form.name.button')}
                </button>
              )}
            </div>
          </div>

          <div className="form-group country-section">
            <label htmlFor="country">{tAdmin('form.country.label')}</label>
            <div className="country-input-group">
              <CountrySelect
                value={selectedCountry}
                onChange={setSelectedCountry}
              />
              {selectedCountry !== player.country && (
                <button
                  type="button"
                  onClick={handleCountryUpdate}
                  disabled={isLoading}
                  className="update-country-button"
                >
                  {tAdmin('form.country.button')}
                </button>
              )}
            </div>
          </div>

          <div className="form-group checkboxes-section">
            <div className="checkbox-group">
              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showBanConfirm ? pendingBanState : isBanned}
                    onChange={(e) => handleBanChange(e.target.checked)}
                    disabled={isLoading || showBanConfirm}
                  />
                  <span>{tAdmin('form.ban.label')}</span>
                </label>
                {showBanConfirm && (
                  <div className="confirm-container">
                    <p className="confirm-message">
                      {pendingBanState ? tAdmin('form.ban.confirm.ban') : tAdmin('form.ban.confirm.unban')}
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        onClick={() => handleBanUpdate(true)}
                        disabled={isLoading}
                        className="confirm-button ban-confirm"
                      >
                        {tAdmin('form.ban.confirm.buttons.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBanUpdate(false)}
                        disabled={isLoading}
                        className="cancel-button"
                      >
                        {tAdmin('form.ban.confirm.buttons.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPauseConfirm ? pendingPauseState : isSubmissionsPaused}
                    onChange={(e) => handlePauseChange(e.target.checked)}
                    disabled={isLoading || showPauseConfirm}
                  />
                  <span>{tAdmin('form.pause.label')}</span>
                </label>
                {showPauseConfirm && (
                  <div className="confirm-container">
                    <p className="confirm-message">
                      {pendingPauseState ? tAdmin('form.pause.confirm.pause') : tAdmin('form.pause.confirm.resume')}
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        onClick={() => handlePauseUpdate(true)}
                        disabled={isLoading}
                        className="confirm-button pause-confirm"
                      >
                        {tAdmin('form.pause.confirm.buttons.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePauseUpdate(false)}
                        disabled={isLoading}
                        className="cancel-button"
                      >
                        {tAdmin('form.pause.confirm.buttons.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showRatingBanConfirm ? pendingRatingBanState : isRatingBanned}
                    onChange={(e) => handleRatingBanChange(e.target.checked)}
                    disabled={isLoading || showRatingBanConfirm}
                  />
                  <span>{tAdmin('form.ratingBan.label')}</span>
                </label>
                {showRatingBanConfirm && (
                  <div className="confirm-container">
                    <p className="confirm-message">
                      {pendingRatingBanState ? tAdmin('form.ratingBan.confirm.ban') : tAdmin('form.ratingBan.confirm.unban')}
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        onClick={() => handleRatingBanUpdate(true)}
                        disabled={isLoading}
                        className="confirm-button rating-ban-confirm"
                      >
                        {tAdmin('form.ratingBan.confirm.buttons.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRatingBanUpdate(false)}
                        disabled={isLoading}
                        className="cancel-button"
                      >
                        {tAdmin('form.ratingBan.confirm.buttons.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group discord-section">
            <label htmlFor="discordId">{tAdmin('form.discord.label')}</label>
            {discordInfo.username && (
              <div className="discord-info">
                <div className="discord-info-header">
                  <div className="discord-info-header-content">
                    <p className="discord-username">@{discordInfo.username}</p>
                    <p className="discord-id">ID: {discordInfo.id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group merge-section">
            <button
              className="merge-button"
              onClick={() => setShowMergeModal(true)}
              disabled={isLoading}
            >
              {tAdmin('form.merge.button')}
            </button>
          </div>

          {showMergeModal && (
            <div className="merge-modal" onClick={() => !isLoading && handleMergePlayer(false)}>
              <div className="merge-modal-content" onClick={(e) => e.stopPropagation()}>
                {!showMergeInput ? (
                  <>
                    <div className="merge-warning">
                      <div className="warning-content">
                        {tAdmin('form.merge.confirm.message')}
                        <ul>
                          <li>{tAdmin('form.merge.confirm.warning')}</li>
                        </ul>
                      </div>
                      <button
                        className="understand-button"
                        onClick={() => setShowMergeInput(true)}
                        disabled={isLoading}
                      >
                        {tAdmin('form.merge.confirm.buttons.understand')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      className="merge-input"
                      placeholder={tAdmin('form.merge.placeholder')}
                      value={targetPlayerId}
                      onChange={(e) => setTargetPlayerId(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="button-group">
                      <button
                        className="merge-confirm-button"
                        onClick={() => handleMergePlayer(true)}
                        disabled={!targetPlayerId || isLoading}
                      >
                        {tAdmin('form.merge.confirm.buttons.confirm')}
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => handleMergePlayer(false)}
                        disabled={isLoading}
                      >
                        {tAdmin('form.merge.confirm.buttons.cancel')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button 
            type="button" 
            className="done-button"
            onClick={onClose}
          >
            {tAdmin('buttons.done')}
          </button>
        </div>
      </div>
    </div>
  );
};

AdminPlayerPopup.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    country: PropTypes.string,
    isBanned: PropTypes.bool,
    isSubmissionsPaused: PropTypes.bool,
    isRatingBanned: PropTypes.bool,
    discordUsername: PropTypes.string,
    discordAvatar: PropTypes.string,
    discordAvatarId: PropTypes.string,
    discordId: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired
};

AdminPlayerPopup.defaultProps = {
  player: {
    name: '',
    country: 'XX',
    isBanned: false,
    isSubmissionsPaused: false,
    isRatingBanned: false,
    discordUsername: '',
    discordAvatar: null,
    discordAvatarId: null,
    discordId: null
  }
};

export default AdminPlayerPopup; 