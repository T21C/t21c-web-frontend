import { useState, useEffect } from 'react';
import './editlevelpopup.css';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@/components/common/icons';

export const TagManagementPopup = ({ levelId, currentTags = [], onClose, onSave }) => {
  const { t } = useTranslation(['components', 'common']);

  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(new Set(currentTags.map(tag => tag.id)));
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all available tags
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
  }, []);

  // Filter tags based on search query and exclude already selected ones
  const availableTags = allTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notSelected = !selectedTagIds.has(tag.id);
    return matchesSearch && notSelected;
  });

  // Get selected tags data
  const selectedTags = allTags.filter(tag => selectedTagIds.has(tag.id));

  const handleAddTag = (tagId) => {
    setSelectedTagIds(prev => new Set([...prev, tagId]));
    setSearchQuery(''); // Clear search after adding
  };

  const handleRemoveTag = (tagId) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(tagId);
      return newSet;
    });
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSaving(true);
    setError(null);

    try {
      const tagIdsArray = Array.from(selectedTagIds);
      await api.post(`${import.meta.env.VITE_DIFFICULTIES}/levels/${levelId}/tags`, { tagIds: tagIdsArray });

      // Fetch updated tags to return to parent
      const updatedTagsResponse = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/levels/${levelId}/tags`);

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
    // Reset to original tags
    setSelectedTagIds(new Set(currentTags.map(tag => tag.id)));
    onClose();
  };

  return (
    <div className="edit-level-popup-overlay" onClick={(e) => {
      if (e.target.className === 'edit-level-popup-overlay') {
        handleCancel();
      }
    }}>
      <div className="edit-level-popup tag-management-popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-popup-btn" onClick={handleCancel}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="popup-content">
          <h2>{t('levelPopups.edit.tags.title')}</h2>

          {error && <div className="error-message">{error}</div>}

          {/* Current Tags Section */}
          <div className="tag-management-section">
            <h3>{t('levelPopups.edit.tags.currentTags')}</h3>
            {selectedTags.length === 0 ? (
              <p className="tag-management-empty">{t('levelPopups.edit.tags.noTags')}</p>
            ) : (
              <div className="tag-management-current-list">
                {selectedTags.map(tag => (
                  <div
                    key={tag.id}
                    className="tag-management-tag-item"
                    style={{
                      '--tag-bg-color': `${tag.color}50`,
                      '--tag-border-color': tag.color,
                      '--tag-text-color': tag.color,
                      '--tag-shadow': `0 0 10px ${tag.color}50`
                    }}
                  >
                    {tag.icon && (
                      <img 
                        src={tag.icon} 
                        alt={tag.name}
                        className="tag-management-tag-icon"
                      />
                    )}
                    <span className="tag-management-tag-name">{tag.name}</span>
                    <button
                      className="tag-management-remove-btn"
                      onClick={() => handleRemoveTag(tag.id)}
                      title={t('levelPopups.edit.tags.removeTag')}
                    >
                      <TrashIcon color="currentColor" size="16px" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search and Add Tags Section */}
          <div className="tag-management-section">
            <h3>{t('levelPopups.edit.tags.addTags')}</h3>
            <input
              type="text"
              className="tag-management-search"
              placeholder={t('levelPopups.edit.tags.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {isLoading ? (
              <p className="tag-management-loading">{t('loading', { ns: 'common' })}</p>
            ) : availableTags.length === 0 ? (
              <p className="tag-management-empty">
                {searchQuery ? t('levelPopups.edit.tags.noResults') : t('levelPopups.edit.tags.noAvailableTags')}
              </p>
            ) : (
              <div className="tag-management-available-list">
                {availableTags.map(tag => (
                  <div
                    key={tag.id}
                    className="tag-management-tag-item tag-management-tag-item-addable"
                    style={{
                      '--tag-bg-color': `${tag.color}50`,
                      '--tag-border-color': tag.color,
                      '--tag-text-color': tag.color,
                      '--tag-shadow': `0 0 10px ${tag.color}50`
                    }}
                    onClick={() => handleAddTag(tag.id)}
                  >
                    {tag.icon && (
                      <img 
                        src={tag.icon} 
                        alt={tag.name}
                        className="tag-management-tag-icon"
                      />
                    )}
                    <span className="tag-management-tag-name">{tag.name}</span>
                    <button
                      className="tag-management-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTag(tag.id);
                      }}
                      title={t('levelPopups.edit.tags.addTag')}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="tag-management-actions">
            <button
              className="tag-management-cancel-btn"
              onClick={handleCancel}
              disabled={isSaving}
              type="button"
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              className="tag-management-save-btn"
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              {isSaving ? t('buttons.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
