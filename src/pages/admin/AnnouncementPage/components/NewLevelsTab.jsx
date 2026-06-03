import { routes } from '@/api/routes';
// tuf-search: #NewLevelsTab #newLevelsTab #admin #announcement — Announcements
import '../announcementpage.css';
import api from '@/utils/api';
import { useState } from 'react';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';

const NewLevelsTab = ({
  entries,
  selectedQueueRowIds,
  onCheckboxChange,
  isLoading,
  onRemove,
  onEdit,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const { difficultyDict } = useDifficultyContext();

  const [removingIds, setRemovingIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleSilentRemove = async (entry) => {
    const level = entry.level;
    try {
      setRemovingIds(prev => new Set([...prev, entry.queueRowId]));
      setError('');
      onRemove(entry.queueRowId);
      await api.post(`${routes.webhook.root()}/silent-remove/levels`, {
        queueRowIds: [entry.queueRowId],
      });
    } catch (err) {
      console.error('Error silently removing level:', err);
      setError(t('newLevelsTab.errors.removeLevel', { song: level?.song }));
      window.location.reload();
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.queueRowId);
        return next;
      });
    }
  };

  return (
    <div className="announcement-section">
      {error && <div className="error-message">{error}</div>}
      <div className="items-list">
        {entries.length > 0 ? (
          entries.map(entry => {
            const level = entry.level;
            if (!level) return null;
            return (
              <div key={entry.queueRowId} className="announcement-item">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedQueueRowIds.includes(entry.queueRowId)}
                    onChange={() => onCheckboxChange(entry.queueRowId)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                  />
                  <span className="checkmark"></span>
                  <div className="item-details">
                    <div className="item-title">
                      {level.song} - {level.artist}
                    </div>
                    <div className="item-subtitle">
                      {difficultyDict[level.diffId]?.name}
                      {level.team &&
                        t('newLevelsTab.card.team', { team: level.team })}
                    </div>
                  </div>
                </label>
                <div className="button-group">
                  <button
                    className="edit-button"
                    onClick={() => onEdit(level)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                    aria-label={t('buttons.edit', { ns: 'common' })}
                  >
                    <EditIcon color="#fff" size="24px" />
                  </button>
                  <button
                    className="trash-button"
                    onClick={() => handleSilentRemove(entry)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                    style={{ width: '40px', height: '40px' }}
                    aria-label={t('newLevelsTab.buttons.remove')}
                    title={t('newLevelsTab.buttons.removeTooltip')}
                  >
                    {removingIds.has(entry.queueRowId) ? (
                      <svg className="spinner spinner-svg" viewBox="0 0 50 50">
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          fill="none"
                          strokeWidth="5"
                        />
                      </svg>
                    ) : (
                      <TrashIcon color="#fff" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-items-message">{t('newLevelsTab.noLevels')}</div>
        )}
      </div>
    </div>
  );
};

export default NewLevelsTab;
