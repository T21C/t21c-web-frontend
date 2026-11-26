import { routes } from '@/api/routes';
// tuf-search: #TagManagementPopup #tagManagementPopup #popups #levels #editLevel
import { useState, useEffect, useMemo, useRef } from 'react';
import './editlevelpopup.css';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { ItemPickManager } from '@/components/common/selectors';
import { EyeIcon, EyeOffIcon } from '@/components/common/icons';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { sortTagsByGroupThenSortOrder } from '@/utils/communityTags';

function isCommunityVotableCatalogTag(tag) {
  return Boolean(tag?.isCommunity) && !tag?.isAutomatic;
}

export const TagManagementPopup = ({ levelId = null, currentTags = [], onClose, onSave, charterOnly = false }) => {
  const { t } = useTranslation(['components', 'common']);

  const [allTags, setAllTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [voteBlockedTagIds, setVoteBlockedTagIds] = useState(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const seededDraftSelection = useRef(false);
  const isDraft = levelId == null;
  const voteBlockControls = !isDraft && !charterOnly && levelId != null;

  const catalogById = useMemo(() => new Map(allTags.map((tag) => [tag.id, tag])), [allTags]);

  const communityWonTags = useMemo(() => {
    if (isDraft) return [];
    return sortTagsByGroupThenSortOrder(
      currentTags.filter((tag) => {
        const catalog = catalogById.get(tag.id) || tag;
        return Boolean(catalog.isCommunity) && !tag.pinned;
      }),
    );
  }, [currentTags, catalogById, isDraft]);

  const communityWonIds = useMemo(
    () => new Set(communityWonTags.map((tag) => tag.id)),
    [communityWonTags],
  );

  useEffect(() => {
    if (isDraft) {
      if (seededDraftSelection.current) return;
      seededDraftSelection.current = true;
      setSelectedIds(
        currentTags
          .filter((tag) => !tag.isAutomatic && (!charterOnly || tag.charterManagable))
          .map((tag) => tag.id),
      );
      return;
    }
    setSelectedIds(
      currentTags
        .filter((tag) => {
          const catalog = catalogById.get(tag.id) || tag;
          if (charterOnly && !catalog.charterManagable) return false;
          if (!catalog.isCommunity) return true;
          return Boolean(tag.pinned);
        })
        .map((tag) => tag.id),
    );
  }, [currentTags, catalogById, isDraft, charterOnly]);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`${routes.database.difficulties.root()}/tags`);
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

  useEffect(() => {
    if (!voteBlockControls) {
      setVoteBlockedTagIds(new Set());
      return undefined;
    }
    let cancelled = false;
    const fetchVoteBlocks = async () => {
      try {
        const response = await api.get(routes.database.difficulties.levelCommunityTagVoteBlocks(levelId));
        if (cancelled) return;
        const ids = Array.isArray(response.data?.tagIds) ? response.data.tagIds : [];
        setVoteBlockedTagIds(new Set(ids));
      } catch (err) {
        console.error('Error fetching community tag vote blocks:', err);
        if (!cancelled) {
          setError(t('levelPopups.edit.tags.errors.fetchTags'));
        }
      }
    };
    fetchVoteBlocks();
    return () => {
      cancelled = true;
    };
  }, [levelId, voteBlockControls, t]);

  useEffect(() => {
    if (!isDraft) return;
    const blockedIds = new Set(
      allTags
        .filter((tag) => tag.isAutomatic || (charterOnly && !tag.charterManagable))
        .map((tag) => tag.id),
    );
    if (blockedIds.size === 0) return;
    setSelectedIds((prev) => {
      const next = prev.filter((id) => !blockedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allTags, isDraft, charterOnly]);

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSaving(true);
    setError(null);

    try {
      if (levelId == null) {
        const tags = selectedIds
          .map((id) => {
            const catalog = catalogById.get(id) || currentTags.find((tag) => tag.id === id);
            if (!catalog || catalog.isAutomatic) return null;
            if (charterOnly && !catalog.charterManagable) return null;
            return catalog.isCommunity ? { ...catalog, pinned: true } : catalog;
          })
          .filter(Boolean);
        await onSave(tags);
        onClose();
        return;
      }

      const saveIds = charterOnly
        ? selectedIds.filter((id) => catalogById.get(id)?.charterManagable)
        : selectedIds;
      await api.post(
        `${routes.database.difficulties.root()}/levels/${levelId}/${charterOnly ? 'charter-tags' : 'tags'}`,
        {
          tagIds: saveIds,
          ...(voteBlockControls ? { blockedCommunityTagIds: [...voteBlockedTagIds] } : {}),
        },
      );

      const updatedTagsResponse = await api.get(
        `${routes.database.difficulties.root()}/levels/${levelId}/tags`
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
    onClose();
  };

  const toggleVoteBlock = (tagId) => {
    setVoteBlockedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const renderVoteBlockEye = (item) => {
    if (!voteBlockControls || !isCommunityVotableCatalogTag(item)) return null;
    const blocked = voteBlockedTagIds.has(item.id);
    return (
      <button
        type="button"
        className="tag-management-chip-eye"
        aria-label={blocked
          ? t('levelPopups.edit.tags.unblockVote')
          : t('levelPopups.edit.tags.blockVote')}
        title={blocked
          ? t('levelPopups.edit.tags.unblockVote')
          : t('levelPopups.edit.tags.blockVote')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleVoteBlock(item.id);
        }}
      >
        {blocked ? <EyeOffIcon size="12px" /> : <EyeIcon size="12px" />}
      </button>
    );
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
    <PopupShell
      onClose={handleCancel}
      closeDisabled={isSaving}
      overlayClassName="edit-level-popup-overlay"
      panelClassName="edit-level-popup tag-management-popup"
    >
        <CloseButton
          variant="floating"
          onClick={handleCancel}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="popup-content">
          <h2>{t('levelPopups.edit.tags.title')}</h2>

          {isDraft && (
            <p className="tag-management-automatic-hint">{t('levelPopups.edit.tags.automaticTagsHint')}</p>
          )}

          {error && <div className="error-message">{error}</div>}

          <ItemPickManager
            items={allTags}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            poolFilter={(item) =>
              !communityWonIds.has(item.id)
              && !(isDraft && item.isAutomatic)
              && !(charterOnly && (!item.charterManagable || item.isAutomatic))
            }
            enableGrouping
            fallbackGroupLabel={t('facetQueryBuilder.fallbackGroup')}
            labels={pickLabels}
            isLoading={isLoading}
            resetSearchSignal={levelId ?? 'draft'}
            renderChipCorner={(item) => renderVoteBlockEye(item)}
            isAddDisabled={(item) => voteBlockedTagIds.has(item.id)}
            getChipClassName={(item) => (
              voteBlockedTagIds.has(item.id) ? 'item-pick-manager__chip--vote-blocked' : ''
            )}
          />

          {communityWonTags.length > 0 && (
            <div className="item-pick-manager__section tag-management-community">
              <h3 className="item-pick-manager__heading">
                {t('levelPopups.edit.tags.communityTags')}
              </h3>
              <p className="tag-management-community__hint">
                {t('levelPopups.edit.tags.communityTagsHint')}
              </p>
              <div className="item-pick-manager__chip-row">
                {communityWonTags.map((tag) => {
                  const catalog = catalogById.get(tag.id) || tag;
                  const color = catalog.color || '#888';
                  const blocked = voteBlockedTagIds.has(tag.id);
                  const eye = renderVoteBlockEye(catalog);
                  return (
                    <div
                      key={tag.id}
                      className={`item-pick-manager__chip item-pick-manager__chip--readonly${blocked ? ' item-pick-manager__chip--vote-blocked' : ''}`}
                      style={{
                        '--ipm-bg': `${color}50`,
                        '--ipm-border': color,
                        '--ipm-text': color,
                      }}
                      title={catalog.name}
                    >
                      {catalog.icon && (
                        <img src={selectIconSize(catalog.icon, ICON_SIZE.SMALL)} alt="" className="item-pick-manager__chip-icon" />
                      )}
                      <span className="item-pick-manager__chip-name">{catalog.name}</span>
                      {eye && (
                        <span className="item-pick-manager__chip-corner">{eye}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              disabled={isSaving || (isDraft && isLoading)}
            >
              {isSaving ? t('buttons.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
            </button>
          </div>
        </div>
    </PopupShell>
  );
};
