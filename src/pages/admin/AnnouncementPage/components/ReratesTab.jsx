import { routes } from '@/api/routes';
// tuf-search: #ReratesTab #reratesTab #admin #announcement — Announcements
import api from '@/utils/api';
import '../announcementpage.css';
import { useState } from 'react';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import AnnouncementFacetChips from './AnnouncementFacetChips';

const ReratesTab = ({
  entries,
  selectedQueueRowIds,
  onCheckboxChange,
  isLoading,
  onRemove,
  onEdit,
}) => {
  const { t } = useTranslation('components');
  const { difficultyDict } = useDifficultyContext();

  const [removingIds, setRemovingIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleSilentRemove = async (entry) => {
    const level = entry.level;
    try {
      setRemovingIds(prev => new Set([...prev, entry.queueRowId]));
      setError('');
      onRemove(entry.queueRowId);
      await api.post(`${routes.webhook.root()}/silent-remove/rerates`, {
        queueRowIds: [entry.queueRowId],
      });
    } catch (err) {
      console.error('Error silently removing rerate:', err);
      setError(t('reratesTab.errors.removeLevel', { song: level?.song }));
      window.location.reload();
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.queueRowId);
        return next;
      });
    }
  };

  const renderChangeSummary = (entry) => {
    const { facets, before, after, level, curvePreview } = entry;
    const parts = [];

    if (facets?.includes('DIFF') && before?.diffId != null && after?.diffId != null) {
      parts.push(
        t('reratesTab.card.subtitle.difficulty', {
          oldDifficulty:
            difficultyDict[before.diffId]?.name ?? before.diffId,
          newDifficulty: difficultyDict[after.diffId]?.name ?? after.diffId,
        }),
      );
    } else if (level?.diffId) {
      parts.push(difficultyDict[level.diffId]?.name ?? '');
    }

    if (facets?.includes('BASE_SCORE')) {
      parts.push(
        t('reratesTab.card.subtitle.baseScore', {
          oldBaseScore:
            before?.baseScore ||
            before?.difficultyBaseScore ||
            difficultyDict[before?.diffId]?.baseScore ||
            0,
          newBaseScore:
            after?.baseScore ||
            after?.difficultyBaseScore ||
            difficultyDict[after?.diffId]?.baseScore ||
            0,
        }),
      );
    }

    if (facets?.includes('PP_BASE_SCORE')) {
      parts.push(
        t('reratesTab.card.subtitle.ppBaseScore', {
          oldPpBaseScore: before?.ppBaseScore || 0,
          newPpBaseScore: after?.ppBaseScore || 0,
        }),
      );
    }

    if (facets?.includes('CURVE') && curvePreview) {
      parts.push(
        <span key="curve" className="rerate-curve-preview">
          {curvePreview.split('\n').map((line, i) => (
            <span key={i} className="rerate-curve-preview-line">
              {line.replace(/\*\*/g, '')}
            </span>
          ))}
        </span>,
      );
    }

    return parts;
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
                      {t('reratesTab.card.title', {
                        song: level.song,
                        artist: level.artist,
                      })}
                    </div>
                    <AnnouncementFacetChips facets={entry.facets} />
                    <div className="item-subtitle">
                      <div className="rerate-values">
                        {renderChangeSummary(entry).map((part, idx) => (
                          <span key={idx} className="rerate-value">
                            {part}
                          </span>
                        ))}
                      </div>
                      {level.team &&
                        t('reratesTab.card.subtitle.team', { team: level.team })}
                    </div>
                  </div>
                </label>
                <div className="button-group">
                  <button
                    className="edit-button"
                    onClick={() => onEdit(level)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                    style={{ width: '40px', height: '40px' }}
                    aria-label={t('reratesTab.buttons.edit')}
                  >
                    <EditIcon color="#fff" size="24px" />
                  </button>
                  <button
                    className="trash-button"
                    onClick={() => handleSilentRemove(entry)}
                    disabled={isLoading || removingIds.has(entry.queueRowId)}
                    style={{ width: '40px', height: '40px' }}
                    aria-label={t('reratesTab.buttons.remove')}
                    title={t('reratesTab.buttons.removeTooltip', {
                      defaultValue: 'Remove without announcing',
                    })}
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
          <div className="no-items-message">{t('reratesTab.noRerates')}</div>
        )}
      </div>
    </div>
  );
};

export default ReratesTab;
