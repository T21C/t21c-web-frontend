// tuf-search: #FacetSimpleList #facetQueryBuilder #selectors #tagSelector
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compareSerializedTagOrder } from '@/utils/communityTags';
import './facetquerybuilder.css';

/**
 * Searchable grouped pill list used by FacetQueryBuilder simple mode
 * and TagVisibilityDropdown.
 *
 * @param {object} props
 * @param {{ id: number, name: string, color?: string, icon?: string, group?: string, groupSortOrder?: number }[]} props.items
 * @param {number[]} props.selectedIds
 * @param {(id: number) => void} props.onToggleId
 * @param {(ids: number[]) => void} props.onToggleGroupAll
 * @param {boolean} [props.enableGrouping]
 * @param {'select' | 'hide'} [props.mode='select'] - `select` shows chips + outline;
 *        `hide` omits chips and dims selected pills (opacity 0.6).
 */
const FacetSimpleList = ({
  items,
  selectedIds = [],
  onToggleId,
  onToggleGroupAll,
  enableGrouping = true,
  mode = 'select',
}) => {
  const { t } = useTranslation('components');
  const [addSearch, setAddSearch] = useState('');
  const isHideMode = mode === 'hide';

  const itemById = useMemo(() => {
    if (isHideMode) return null;
    const m = new Map();
    (items || []).forEach((it) => m.set(it.id, it));
    return m;
  }, [items, isHideMode]);

  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const filteredItems = items || [];

  const orderedGroups = useMemo(() => {
    const q = addSearch.toLowerCase();
    const list = q
      ? filteredItems.filter((it) => String(it.name).toLowerCase().includes(q))
      : filteredItems;
    if (!enableGrouping) return [['', { items: list, groupSortOrder: 0 }]];
    const itemGroups = list.reduce((acc, item) => {
      const group =
        item.group && String(item.group).trim() !== ''
          ? item.group
          : t('facetQueryBuilder.fallbackGroup');
      if (!acc[group]) acc[group] = { items: [], groupSortOrder: item.groupSortOrder ?? 999999 };
      acc[group].items.push(item);
      if (item.groupSortOrder != null && item.groupSortOrder < acc[group].groupSortOrder) {
        acc[group].groupSortOrder = item.groupSortOrder;
      }
      return acc;
    }, {});
    for (const data of Object.values(itemGroups)) {
      data.items.sort(compareSerializedTagOrder);
    }
    return Object.entries(itemGroups).sort((a, b) => a[1].groupSortOrder - b[1].groupSortOrder);
  }, [filteredItems, enableGrouping, t, addSearch]);

  return (
    <div
      className={`facet-query-builder__simple${
        isHideMode ? ' facet-query-builder__simple--hide' : ''
      }`}
    >
      <input
        type="search"
        className="facet-query-builder__search"
        placeholder={t('facetQueryBuilder.searchPlaceholder')}
        value={addSearch}
        onChange={(e) => setAddSearch(e.target.value)}
      />
      {!isHideMode && (
        <div className="facet-query-builder__chips">
          {(selectedIds || []).map((id) => {
            const it = itemById.get(id);
            if (!it) return null;
            return (
              <button
                key={id}
                type="button"
                className="facet-query-builder__chip"
                style={{ backgroundColor: `${it.color || '#444'}55` }}
                onClick={() => onToggleId(id)}
              >
                {it.icon && <img src={it.icon} alt="" className="facet-query-builder__chip-icon" />}
                {it.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="facet-query-builder__grid">
        {orderedGroups.map(([group, data]) => (
          <div key={group} className="facet-query-builder__group">
            <div className="facet-query-builder__group-head">
              {enableGrouping ? (
                <h4 className="facet-query-builder__group-title">{group}</h4>
              ) : (
                <span
                  className="facet-query-builder__group-title facet-query-builder__group-title--spacer"
                  aria-hidden
                />
              )}
              {data.items.length > 0 && (
                <button
                  type="button"
                  className="facet-query-builder__toggle-group-all"
                  onClick={() => onToggleGroupAll(data.items.map((it) => it.id))}
                >
                  {t('facetQueryBuilder.toggleGroupAll')}
                </button>
              )}
            </div>
            <div className="facet-query-builder__list">
              {data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`facet-query-builder__item ${
                    selectedSet.has(item.id)
                      ? isHideMode
                        ? 'is-hidden'
                        : 'is-selected'
                      : ''
                  }`}
                  style={{ backgroundColor: `${item.color}55` }}
                  onClick={() => onToggleId(item.id)}
                >
                  {item.icon && (
                    <img src={item.icon} alt="" className="facet-query-builder__item-icon" />
                  )}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacetSimpleList;
