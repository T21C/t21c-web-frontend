import { routes } from '@/api/routes';
// tuf-search: #CurationsTab #curationsTab #admin #announcement — Announcements
import '../announcementpage.css';
import api from '@/utils/api';
import { useState } from 'react';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { announcedCurationTypeIds } from '@/utils/curationTypeFamilies';
import { toastError } from '@/utils/toastMessage';

function typeLabel(id, dict) {
  return dict?.[id]?.name || `#${id}`;
}

function formatTypes(ids, dict) {
  const list = Array.isArray(ids) ? ids.filter((id) => id != null) : [];
  if (list.length === 0) return '—';
  return list.map((id) => typeLabel(id, dict)).join(', ');
}

const CurationsTab = ({
  entries,
  selectedQueueRowIds,
  onCheckboxChange,
  isLoading,
  onRemove,
  onEdit,
  kind = 'NEW',
}) => {
  const { t } = useTranslation(['components', 'common']);
  const { curationTypesDict } = useDifficultyContext();
  const [removingIds, setRemovingIds] = useState(new Set());
  const isRerate = kind === 'RERATE';

  const handleSilentRemove = async (entry) => {
    const level = entry.level;
    try {
      setRemovingIds((prev) => new Set([...prev, entry.queueRowId]));
      onRemove(entry.queueRowId);
      await api.post(routes.webhook.silentRemoveCurations(), {
        queueRowIds: [entry.queueRowId],
      });
    } catch (err) {
      console.error('Error silently removing curation:', err);
      toastError(t('curationsTab.errors.removeLevel', { song: level?.song }));
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.queueRowId);
        return next;
      });
    }
  };

  return (
    <div className="announcement-section">
      <div className="items-list">
        {entries.length > 0 ? (
          entries.map((entry) => {
            const level = entry.level;
            if (!level) return null;
            const afterLabel = formatTypes(
              announcedCurationTypeIds(entry.afterTypeIds, curationTypesDict),
              curationTypesDict,
            );
            const beforeLabel = formatTypes(
              announcedCurationTypeIds(entry.beforeTypeIds, curationTypesDict),
              curationTypesDict,
            );
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
                      {t('curationsTab.card.title', {
                        song: level.song,
                        artist: level.artist,
                      })}
                    </div>
                    <div className="item-subtitle">
                      {isRerate
                        ? t('curationsTab.card.change', {
                            before: beforeLabel,
                            after: afterLabel,
                          })
                        : afterLabel}
                      {level.team &&
                        t('curationsTab.card.team', { team: level.team })}
                    </div>
                  </div>
                </label>
                <div className="button-group">
                  <button
                    className="edit-button"
                    onClick={() => onEdit(level)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                    aria-label={t('curationsTab.buttons.edit')}
                  >
                    <EditIcon color="#fff" size="24px" />
                  </button>
                  <button
                    className="trash-button"
                    onClick={() => handleSilentRemove(entry)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                    style={{ width: '40px', height: '40px' }}
                    aria-label={t('curationsTab.buttons.remove')}
                    title={t('curationsTab.buttons.removeTooltip')}
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
          <div className="no-items-message">
            {t(isRerate ? 'curationsTab.noRerates' : 'curationsTab.noCurations')}
          </div>
        )}
      </div>
    </div>
  );
};

export default CurationsTab;
