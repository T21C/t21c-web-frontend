import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ItemPickManager } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { isSilentCurationAnnouncementName } from '@/utils/curationTypeFamilies';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';

const normalizeIds = (ids) =>
  [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

const LevelRequestCurationTypes = ({
  ids = [],
  onChange,
  variant = 'picker',
  excludePlaceholders = false,
}) => {
  const { t } = useTranslation(['pages', 'components']);
  const { curationTypes } = useDifficultyContext();
  const placeholderIds = useMemo(
    () => new Set(
      (curationTypes || [])
        .filter((item) => isSilentCurationAnnouncementName(item.name))
        .map((item) => item.id),
    ),
    [curationTypes],
  );
  const selectedIds = useMemo(() => {
    const normalized = normalizeIds(ids);
    if (!excludePlaceholders) return normalized;
    return normalized.filter((id) => !placeholderIds.has(id));
  }, [excludePlaceholders, ids, placeholderIds]);
  const items = useMemo(() => {
    const catalog = curationTypes || [];
    const known = new Set(catalog.map((item) => item.id));
    const extras = selectedIds
      .filter((id) => !known.has(id))
      .map((id) => ({ id, name: `#${id}` }));
    return extras.length ? [...catalog, ...extras] : catalog;
  }, [curationTypes, selectedIds]);
  const poolFilter = useCallback(
    (item) => {
      if (!excludePlaceholders) return true;
      if (placeholderIds.has(item.id)) return false;
      return !isSilentCurationAnnouncementName(item.name);
    },
    [excludePlaceholders, placeholderIds],
  );
  const handleSelectedIdsChange = useCallback(
    (nextIds) => {
      if (!onChange) return;
      if (!excludePlaceholders) {
        onChange(nextIds);
        return;
      }
      onChange((nextIds || []).filter((id) => !placeholderIds.has(id)));
    },
    [excludePlaceholders, onChange, placeholderIds],
  );

  const pickLabels = useMemo(
    () => ({
      sectionCurrent: t('levelRequests.form.typesCurrent'),
      sectionAdd: t('levelRequests.form.typesAdd'),
      searchPlaceholder: t('levelRequests.form.typesSearchPlaceholder'),
      emptySelected: t('levelRequests.form.typesNoneSelected'),
      emptyPool: t('levelRequests.form.typesNoneAvailable'),
      noResults: t('levelRequests.form.typesNoResults'),
      removeItem: t('levelRequests.form.removeType'),
      addItem: t('levelRequests.form.addType'),
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
        onSelectedIdsChange={handleSelectedIdsChange}
        poolFilter={excludePlaceholders ? poolFilter : undefined}
        enableGrouping
        fallbackGroupLabel={fallbackGroupLabel}
        labels={pickLabels}
      />
    );
  }

  if (selectedIds.length === 0) return null;

  if (variant === 'display') {
    return (
      <ItemPickManager
        className="level-requests__item-pick level-requests__item-pick--readonly"
        items={items}
        selectedIds={selectedIds}
        enableGrouping
        readOnly
        fallbackGroupLabel={fallbackGroupLabel}
        labels={{
          ...pickLabels,
          sectionCurrent: t('levelRequests.form.curationTypes'),
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
          className="item-pick-manager__chip item-pick-manager__chip--readonly level-requests__curation-icon"
          title={item.name}
        >
          {item.icon && (
            <img src={selectIconSize(item.icon, ICON_SIZE.SMALL)} alt="" className="item-pick-manager__chip-icon" />
          )}
          {!item.icon && (
            <span className="item-pick-manager__chip-name">{item.name}</span>
          )}
        </span>
      ))}
    </div>
  );
};

export const LevelRequestCurationDiff = ({ addIds = [], removeIds = [] }) => {
  const { t } = useTranslation('pages');
  const rows = [
    { key: 'add', label: t('levelRequests.form.toAdd'), ids: addIds },
    { key: 'remove', label: t('levelRequests.form.toRemove'), ids: removeIds },
  ];

  return (
    <div className="level-requests__tag-diff">
      {rows.map((row) => (
        <div key={row.key} className="level-requests__tag-diff-row">
          <span className="level-requests__tag-diff-label">{row.label}</span>
          {row.ids.length > 0 && <LevelRequestCurationTypes ids={row.ids} variant="icons" />}
          {row.ids.length === 0 && (
            <span className="level-requests__hint">{t('levelRequests.form.tagsNone')}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default LevelRequestCurationTypes;
