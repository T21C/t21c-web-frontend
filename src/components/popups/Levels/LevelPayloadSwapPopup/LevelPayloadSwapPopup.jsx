// tuf-search: #LevelPayloadSwapPopup #levelPayloadSwapPopup #popups #levels #payloadSwap
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import LevelSelectionPopup from '@/components/popups/Levels/LevelSelectionPopup/LevelSelectionPopup';
import { getSongDisplayName } from '@/utils/levelHelpers';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import './levelpayloadswappopup.css';

function levelSummaryLabel(level) {
  if (!level) return '';
  const song = getSongDisplayName(level) || level.song || level.name || '';
  return `#${level.id}${song ? ` — ${song}` : ''}`;
}

/**
 * Super-admin popup: pick another level and swap chart/metadata payloads
 * while keeping both IDs fixed.
 */
export default function LevelPayloadSwapPopup({ sourceLevel, onClose, onSuccess }) {
  const { t } = useTranslation(['components', 'common']);
  const [targetLevel, setTargetLevel] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    if (showPicker) {
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || isSwapping) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [showPicker, isSwapping, onClose]);

  const handleLevelSelect = ({ levelId, level }) => {
    if (levelId === sourceLevel?.id) {
      toast.error(t('levelPopups.payloadSwap.errors.sameLevel'));
      return;
    }
    setTargetLevel(
      level
        ? { ...level, id: levelId }
        : { id: levelId, song: `Level #${levelId}` },
    );
    setShowPicker(false);
  };

  const handleConfirm = async () => {
    if (!sourceLevel?.id || !targetLevel?.id || isSwapping) return;
    setIsSwapping(true);
    try {
      const response = await api.post(routes.database.levels.swapPayload(sourceLevel.id), {
        targetLevelId: targetLevel.id,
      });
      const levelA = response.data?.levelA;
      toast.success(t('levelPopups.payloadSwap.toastSuccess'));
      if (onSuccess) {
        onSuccess(levelA || { id: sourceLevel.id });
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || t('levelPopups.payloadSwap.errors.swap'),
      );
    } finally {
      setIsSwapping(false);
    }
  };

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget && !isSwapping && !showPicker) {
      onClose();
    }
  };

  return (
    <Portal>
      <div className="level-payload-swap-popup" onClick={handleOverlayClick}>
        <div
          className="level-payload-swap-popup__dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="level-payload-swap-popup__header">
            <h2>{t('levelPopups.payloadSwap.title')}</h2>
            <CloseButton
              variant="floating"
              onClick={onClose}
              disabled={isSwapping}
              aria-label={t('levelPopups.payloadSwap.close')}
            />
          </div>

          <div className="level-payload-swap-popup__body">
            <p className="level-payload-swap-popup__explanation">
              {t('levelPopups.payloadSwap.explanation')}
            </p>
            <p className="level-payload-swap-popup__note">
              {t('levelPopups.payloadSwap.note')}
            </p>

            <div className="level-payload-swap-popup__pair">
              <div className="level-payload-swap-popup__slot">
                <span className="level-payload-swap-popup__slot-label">
                  {t('levelPopups.payloadSwap.thisLevel')}
                </span>
                <span className="level-payload-swap-popup__slot-value">
                  {levelSummaryLabel(sourceLevel)}
                </span>
              </div>

              <div className="level-payload-swap-popup__slot">
                <span className="level-payload-swap-popup__slot-label">
                  {t('levelPopups.payloadSwap.otherLevel')}
                </span>
                {targetLevel ? (
                  <span className="level-payload-swap-popup__slot-value">
                    {levelSummaryLabel(targetLevel)}
                  </span>
                ) : (
                  <span className="level-payload-swap-popup__slot-placeholder">
                    {t('levelPopups.payloadSwap.noTarget')}
                  </span>
                )}
                <button
                  type="button"
                  className="level-payload-swap-popup__pick-btn btn-fill-primary"
                  onClick={() => setShowPicker(true)}
                  disabled={isSwapping}
                >
                  {targetLevel
                    ? t('levelPopups.payloadSwap.changeTarget')
                    : t('levelPopups.payloadSwap.chooseTarget')}
                </button>
              </div>
            </div>
          </div>

          <div className="level-payload-swap-popup__actions">
            <button
              type="button"
              className="btn-fill-neutral-muted"
              onClick={onClose}
              disabled={isSwapping}
            >
              {t('levelPopups.payloadSwap.cancel')}
            </button>
            <button
              type="button"
              className="btn-fill-danger"
              onClick={handleConfirm}
              disabled={!targetLevel || isSwapping}
            >
              {isSwapping
                ? t('levelPopups.payloadSwap.swapping')
                : t('levelPopups.payloadSwap.confirm')}
            </button>
          </div>
        </div>
      </div>

      <LevelSelectionPopup
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onLevelSelect={handleLevelSelect}
        variant="pick"
      />
    </Portal>
  );
}
