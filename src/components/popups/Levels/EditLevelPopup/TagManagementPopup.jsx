import { useState, useEffect } from 'react';
import './editlevelpopup.css';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { ItemPickManager } from '@/components/common/selectors';

export const TagManagementPopup = ({ levelId, currentTags = [], onClose, onSave }) => {
  const { t } = useTranslation(['components', 'common']);

  const [allTags, setAllTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => currentTags.map((tag) => tag.id));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSelectedIds(currentTags.map((tag) => tag.id));
  }, [currentTags]);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/tags`);
        setAllTags(response.data || []);
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError(t('levelPopups.edit.tags.errors.fetchTags'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [t]);

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSaving(true);
    setError(null);

    try {
      await api.post(`${import.meta.env.VITE_DIFFICULTIES}/levels/${levelId}/tags`, {
        tagIds: selectedIds,
      });

      const updatedTagsResponse = await api.get(
        `${import.meta.env.VITE_DIFFICULTIES}/levels/${levelId}/tags`
      );

      onSave(updatedTagsResponse.data || []);
      onClose();
    } catch (err) {
      console.error('Error saving tags:', err);
      setError(err.response?.data?.error || t('levelPopups.edit.tags.errors.saveTags'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedIds(currentTags.map((tag) => tag.id));
    onClose();
  };

  const pickLabels = {
    sectionCurrent: t('levelPopups.edit.tags.currentTags'),
    sectionAdd: t('levelPopups.edit.tags.addTags'),
    searchPlaceholder: t('levelPopups.edit.tags.searchPlaceholder'),
    emptySelected: t('levelPopups.edit.tags.noTags'),
    emptyPool: t('levelPopups.edit.tags.noAvailableTags'),
    noResults: t('levelPopups.edit.tags.noResults'),
    removeItem: t('levelPopups.edit.tags.removeTag'),
    addItem: t('levelPopups.edit.tags.addTag'),
    loading: t('loading.generic', { ns: 'common' }),
  };

  return (
    <div
      className="edit-level-popup-overlay"
      onClick={(e) => {
        if (e.target.className === 'edit-level-popup-overlay') {
          handleCancel();
        }
      }}
    >
      <div className="edit-level-popup tag-management-popup" onClick={(e) => e.stopPropagation()}>
        <CloseButton
          variant="floating"
          onClick={handleCancel}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="popup-content">
          <h2>{t('levelPopups.edit.tags.title')}</h2>

          {error && <div className="error-message">{error}</div>}

          <ItemPickManager
            items={allTags}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            enableGrouping
            fallbackGroupLabel={t('facetQueryBuilder.fallbackGroup')}
            labels={pickLabels}
            isLoading={isLoading}
            resetSearchSignal={levelId}
          />

          <div className="tag-management-actions">
            <button
              type="button"
              className="tag-management-cancel-btn"
              onClick={handleCancel}
              disabled={isSaving}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="tag-management-save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? t('buttons.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
