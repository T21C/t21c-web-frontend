import React, { useState } from 'react';
import './adminplayerpopup.css';
import '@/components/popups/Creators/CreatorAssignmentPopup/creatorAssignmentPopup.css';
import { CloseButton } from '@/components/common/buttons';
import api from '@/utils/api';
import { CountrySelect } from '@/components/common/selectors';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { CreatorAssignmentPanel } from '@/components/popups/Creators/CreatorAssignmentPopup/CreatorAssignmentPanel';

const AdminPlayerPopup = ({ player = {}, onClose, onUpdate, onCreatorUserLinkedUpdate }) => {
  const { t } = useTranslation(['components', 'common']);
  const { user: authUser } = useAuth();
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
      setError(err.response?.data?.details || t('adminPopups.player.errors.nameUpdate'));
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
      setError(err.response?.data?.details || t('adminPopups.player.errors.countryUpdate'));
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
      setError(err.response?.data?.details || t('adminPopups.player.errors.banUpdate'));
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
      setError(err.response?.data?.details || t('adminPopups.player.errors.pauseUpdate'));
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

      toast.success(t('adminPopups.player.success.mergePlayer'));
      onClose();
      window.location.href = '/leaderboard';
    } catch (err) {
      console.error('Error merging player:', err);
      toast.error(err.response?.data?.details || t('adminPopups.player.errors.mergePlayer'));
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

  const handleCreatorAssignmentUserUpdate = (updatedUser) => {
    onUpdate?.({
      ...player,
      user: updatedUser,
    });
    onCreatorUserLinkedUpdate?.(updatedUser);
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
      await api.patch(`/v2/admin/users/${player.id}/rating-ban`, {
        isRatingBanned: pendingRatingBanState
      });

      setIsRatingBanned(pendingRatingBanState);
      onUpdate?.({
        ...player,
        isRatingBanned: pendingRatingBanState
      });
    } catch (err) {
      setError(err.response?.data?.details || t('adminPopups.player.errors.ratingBanUpdate'));
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
          <h2>{t('adminPopups.player.title')}</h2>
          <CloseButton
            variant="inline"
            onClick={onClose}
            aria-label={t('adminPopups.player.close')}
          />
        </div>

        <div className="admin-form">
          <div className="form-group name-section">
            <label htmlFor="playerName">{t('adminPopups.player.form.name.label')}</label>
            <div className="name-input-group">
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={t('adminPopups.player.form.name.placeholder')}
              />
              {playerName !== player.name && (
                <button
                  type="button"
                  onClick={handleNameUpdate}
                  disabled={isLoading || !playerName.trim()}
                  className="update-name-button"
                >
                  {t('adminPopups.player.form.name.button')}
                </button>
              )}
            </div>
          </div>

          <div className="form-group country-section">
            <label htmlFor="country">{t('adminPopups.player.form.country.label')}</label>
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
                  {t('adminPopups.player.form.country.button')}
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
                  <span>{t('adminPopups.player.form.ban.label')}</span>
                </label>
                {showBanConfirm && (
                  <div className="confirm-container">
                    <p className="confirm-message">
                      {pendingBanState ? t('adminPopups.player.form.ban.confirm.ban') : t('adminPopups.player.form.ban.confirm.unban')}
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        onClick={() => handleBanUpdate(true)}
                        disabled={isLoading}
                        className="confirm-button ban-confirm"
                      >
                        {t('buttons.confirm', { ns: 'common' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBanUpdate(false)}
                        disabled={isLoading}
                        className="cancel-button"
                      >
                        {t('buttons.cancel', { ns: 'common' })}
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
                  <span>{t('adminPopups.player.form.pause.label')}</span>
                </label>
                {showPauseConfirm && (
                  <div className="confirm-container">
                    <p className="confirm-message">
                      {pendingPauseState ? t('adminPopups.player.form.pause.confirm.pause') : t('adminPopups.player.form.pause.confirm.resume')}
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        onClick={() => handlePauseUpdate(true)}
                        disabled={isLoading}
                        className="confirm-button pause-confirm"
                      >
                        {t('buttons.confirm', { ns: 'common' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePauseUpdate(false)}
                        disabled={isLoading}
                        className="cancel-button"
                      >
                        {t('buttons.cancel', { ns: 'common' })}
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
                  <span>{t('adminPopups.player.form.ratingBan.label')}</span>
                </label>
                {showRatingBanConfirm && (
                  <div className="confirm-container">
                    <p className="confirm-message">
                      {pendingRatingBanState ? t('adminPopups.player.form.ratingBan.confirm.ban') : t('adminPopups.player.form.ratingBan.confirm.unban')}
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        onClick={() => handleRatingBanUpdate(true)}
                        disabled={isLoading}
                        className="confirm-button rating-ban-confirm"
                      >
                        {t('buttons.confirm', { ns: 'common' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRatingBanUpdate(false)}
                        disabled={isLoading}
                        className="cancel-button"
                      >
                        {t('buttons.cancel', { ns: 'common' })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasFlag(authUser, permissionFlags.SUPER_ADMIN) && player.user?.id && (
            <div className="form-group creator-assignment-embed-section">
              <label className="creator-assignment-embed-label">
                {t('adminPopups.player.form.creatorAssignment.sectionLabel', {
                  defaultValue: 'Creator assignment',
                })}
              </label>
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

          <div className="form-group merge-section">
            <button
              className="merge-button"
              onClick={() => setShowMergeModal(true)}
              disabled={isLoading}
            >
              {t('adminPopups.player.form.merge.button')}
            </button>
          </div>

          {showMergeModal && (
            <div className="merge-modal" onClick={() => !isLoading && handleMergePlayer(false)}>
              <div className="merge-modal-content" onClick={(e) => e.stopPropagation()}>
                {!showMergeInput ? (
                  <>
                    <div className="merge-warning">
                      <div className="warning-content">
                        {t('adminPopups.player.form.merge.confirm.message')}
                        <ul>
                          <li>{t('adminPopups.player.form.merge.confirm.warning')}</li>
                        </ul>
                      </div>
                      <button
                        className="understand-button"
                        onClick={() => setShowMergeInput(true)}
                        disabled={isLoading}
                      >
                        {t('adminPopups.player.form.merge.confirm.buttons.understand')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      className="merge-input"
                      placeholder={t('adminPopups.player.form.merge.placeholder')}
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
                        {t('buttons.confirm', { ns: 'common' })}
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => handleMergePlayer(false)}
                        disabled={isLoading}
                      >
                        {t('buttons.cancel', { ns: 'common' })}
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
            {t('buttons.done', { ns: 'common' })}
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
    user: PropTypes.object,
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onCreatorUserLinkedUpdate: PropTypes.func,
};

AdminPlayerPopup.defaultProps = {
  player: {
    name: '',
    country: 'XX',
    isBanned: false,
    isSubmissionsPaused: false,
    isRatingBanned: false,
  },
};

export default AdminPlayerPopup; 