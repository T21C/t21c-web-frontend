// tuf-search: #LinkedLevelsPopup #linkedLevelsPopup #popups #levels #levelLinks
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { TrashIcon } from '@/components/common/icons';
import LevelSelectionPopup from '@/components/popups/Levels/LevelSelectionPopup/LevelSelectionPopup';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import './linkedlevelspopup.css';

function linkedSongLabel(level) {
  if (!level) return '';
  const song = level.song || '';
  return level.suffix ? `${song} ${level.suffix}` : song;
}

export default function LinkedLevelsPopup({
  currentLevelId,
  levels,
  canEdit,
  onClose,
  onChange,
}) {
  const { t } = useTranslation(['components', 'common']);
  const { difficultyDict } = useDifficultyContext();
  const [showPicker, setShowPicker] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    if (showPicker) {
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || isMutating) {
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
  }, [showPicker, isMutating, onClose]);

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget && !isMutating && !showPicker) {
      onClose();
    }
  };

  const applyResult = (data) => {
    if (onChange) {
      onChange(Array.isArray(data?.levels) ? data.levels : []);
    }
  };

  const handleLevelSelect = async ({ levelId, level }) => {
    if (Number(levelId) === Number(currentLevelId)) {
      toast.error(t('levelPopups.linkedLevels.errors.sameLevel'));
      return;
    }
    if (levels.some((item) => Number(item.id) === Number(levelId))) {
      toast.error(t('levelPopups.linkedLevels.errors.alreadyLinked'));
      setShowPicker(false);
      return;
    }
    setIsMutating(true);
    try {
      const response = await api.post(routes.database.levels.links(currentLevelId), {
        levelId,
      });
      applyResult(response.data);
      toast.success(t('levelPopups.linkedLevels.toastAdded', {
        name: linkedSongLabel(level) || `#${levelId}`,
      }));
      setShowPicker(false);
    } catch (err) {
      toast.error(err.response?.data?.error || t('levelPopups.linkedLevels.errors.add'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemove = async (memberLevelId) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      const response = await api.delete(
        routes.database.levels.linkMember(currentLevelId, memberLevelId),
      );
      applyResult(response.data);
      toast.success(t('levelPopups.linkedLevels.toastRemoved'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('levelPopups.linkedLevels.errors.remove'));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <Portal>
      <div className="linked-levels-popup" onClick={handleOverlayClick}>
        <div
          className="linked-levels-popup__dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="linked-levels-popup__header">
            <h2>{t('levelPopups.linkedLevels.title')}</h2>
            <CloseButton
              variant="floating"
              onClick={onClose}
              disabled={isMutating}
              aria-label={t('buttons.close', { ns: 'common' })}
            />
          </div>

          <div className="linked-levels-popup__list">
            {levels.length === 0 ? (
              <p className="linked-levels-popup__empty">
                {t('levelPopups.linkedLevels.empty')}
              </p>
            ) : (
              levels.map((level) => {
    const isCurrent = Number(level.id) === Number(currentLevelId);
                const icon =
                  level.difficulty?.icon ||
                  difficultyDict[level.diffId]?.icon ||
                  '/default-difficulty-icon.png';
                const rowInner = (
                  <>
                    <img
                      src={icon}
                      alt=""
                      className="linked-levels-popup__diff-icon"
                    />
                    <div className="linked-levels-popup__meta">
                      <span className="linked-levels-popup__song">
                        {linkedSongLabel(level) || t('levelPopups.linkedLevels.unknownSong')}
                      </span>
                      <span className="linked-levels-popup__sub">
                        #{level.id}
                        {level.artist ? ` — ${level.artist}` : ''}
                        {isCurrent ? ` · ${t('levelPopups.linkedLevels.current')}` : ''}
                      </span>
                    </div>
                  </>
                );

                return (
                  <div key={level.id} className="linked-levels-popup__row">
                    {isCurrent ? (
                      <div className="linked-levels-popup__row-main linked-levels-popup__row-main--current">
                        {rowInner}
                      </div>
                    ) : (
                      <Link
                        to={`/levels/${level.id}`}
                        className="linked-levels-popup__row-main"
                        onClick={onClose}
                      >
                        {rowInner}
                      </Link>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="linked-levels-popup__remove btn-fill-danger"
                        onClick={() => handleRemove(level.id)}
                        disabled={isMutating}
                        title={t('buttons.remove', { ns: 'common' })}
                        aria-label={t('buttons.remove', { ns: 'common' })}
                      >
                        <TrashIcon size={16} color="currentColor" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {canEdit && (
            <div className="linked-levels-popup__actions">
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => setShowPicker(true)}
                disabled={isMutating}
              >
                {t('buttons.add', { ns: 'common' })}
              </button>
            </div>
          )}
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
