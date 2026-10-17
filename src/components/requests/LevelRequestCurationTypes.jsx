import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ItemPickManager } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';

const normalizeIds = (ids) =>
  [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

const LevelRequestCurationTypes = ({ ids = [], onChange, variant = 'picker' }) => {
  const { t } = useTranslation(['pages', 'components']);
  const { curationTypes } = useDifficultyContext();
  const selectedIds = useMemo(() => normalizeIds(ids), [ids]);
  const items = useMemo(() => {
    const catalog = curationTypes || [];
    const known = new Set(catalog.map((item) => item.id));
    const extras = selectedIds
      .filter((id) => !known.has(id))
      .map((id) => ({ id, name: `#${id}` }));
    return extras.length ? [...catalog, ...extras] : catalog;
  }, [curationTypes, selectedIds]);

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
        onSelectedIdsChange={onChange}
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

export default LevelRequestCurationTypes;
