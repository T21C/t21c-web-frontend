import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ItemPickManager } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { withoutUnrequestableTagIds } from './levelRequestShared';

const normalizeIds = (ids) =>
  [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

const LevelRequestTags = ({ ids = [], onChange, variant = 'picker' }) => {
  const { t } = useTranslation(['pages', 'components', 'common']);
  const { tags, tagsLoading } = useDifficultyContext();
  const selectedIds = useMemo(() => withoutUnrequestableTagIds(normalizeIds(ids), tags), [ids, tags]);
  const items = useMemo(
    () => (tags || []).filter((tag) => tag && !tag.isCommunity && !tag.isAutomatic),
    [tags],
  );

  const pickLabels = useMemo(
    () => ({
      sectionCurrent: t('levelRequests.form.tagsCurrent'),
      sectionAdd: t('levelRequests.form.tagsAdd'),
      searchPlaceholder: t('levelRequests.form.tagsSearchPlaceholder'),
      emptySelected: t('levelRequests.form.tagsNoneSelected'),
      emptyPool: t('levelRequests.form.tagsNoneAvailable'),
      noResults: t('levelRequests.form.tagsNoResults'),
      removeItem: t('levelRequests.form.removeTag'),
      addItem: t('levelRequests.form.addTag'),
      loading: t('loading.generic', { ns: 'common' }),
    }),
    [t],
  );

  const fallbackGroupLabel = t('facetQueryBuilder.fallbackGroup', { ns: 'components' });

  if (variant === 'picker') {
    return (
      <ItemPickManager
        className="level-requests__item-pick"
        items={items}
        selectedIds={selectedIds}
        onSelectedIdsChange={onChange}
        enableGrouping
        fallbackGroupLabel={fallbackGroupLabel}
        labels={pickLabels}
        isLoading={tagsLoading}
      />
    );
  }

  if (selectedIds.length === 0) return null;

  if (variant === 'display') {
    return (
      <ItemPickManager
        className="level-requests__item-pick level-requests__item-pick--inline"
        items={items}
        selectedIds={selectedIds}
        enableGrouping
        readOnly
        fallbackGroupLabel={fallbackGroupLabel}
        labels={{
          ...pickLabels,
          sectionCurrent: t('levelRequests.form.tags'),
        }}
      />
    );
  }

  const iconItems = selectedIds.map((id) => items.find((entry) => entry.id === id)).filter(Boolean);

  return (
    <div className="level-requests__chips">
      {iconItems.map((item) => (
        <span
          key={item.id}
          className="item-pick-manager__chip item-pick-manager__chip--readonly level-requests__tag-icon"
          style={{
            '--ipm-bg': `${item.color || '#888'}50`,
            '--ipm-border': item.color || '#888',
            '--ipm-text': item.color || '#888',
          }}
          title={item.name}
        >
          {item.icon && (
            <img src={selectIconSize(item.icon, ICON_SIZE.SMALL)} alt="" className="item-pick-manager__chip-icon" />
          )}
          <span className="item-pick-manager__chip-name">{item.name}</span>
        </span>
      ))}
    </div>
  );
};

export const LevelRequestTagDiff = ({ addIds = [], removeIds = [] }) => {
  const { t } = useTranslation('pages');
  const { tags } = useDifficultyContext();
  const rows = [
    { key: 'add', label: t('levelRequests.form.toAdd'), ids: withoutUnrequestableTagIds(addIds, tags) },
    { key: 'remove', label: t('levelRequests.form.toRemove'), ids: withoutUnrequestableTagIds(removeIds, tags) },
  ];

  return (
    <div className="level-requests__tag-diff">
      {rows.map((row) => (
        <div key={row.key} className="level-requests__tag-diff-row">
          <span className="level-requests__tag-diff-label">{row.label}</span>
          {row.ids.length > 0 && <LevelRequestTags ids={row.ids} variant="icons" />}
          {row.ids.length === 0 && (
            <span className="level-requests__hint">{t('levelRequests.form.tagsNone')}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default LevelRequestTags;
