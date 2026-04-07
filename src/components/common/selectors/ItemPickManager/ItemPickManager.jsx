import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { TrashIcon } from '@/components/common/icons';
import './itemPickManager.css';

/**
 * @typedef {{ id: number, name: string, color?: string, icon?: string, group?: string, groupSortOrder?: number, sortOrder?: number }} PickableItem
 */

function comparePickableBySort(a, b) {
  const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (so !== 0) return so;
  return (a.id ?? 0) - (b.id ?? 0);
}

/**
 * Group items for the "add" pool (by group + group sort order; items within a group by sortOrder).
 * @param {PickableItem[]} items
 * @param {string} fallbackGroupLabel
 */
function buildGroupedPool(items, fallbackGroupLabel) {
  const itemGroups = items.reduce((acc, item) => {
    const group =
      item.group && String(item.group).trim() !== ''
        ? item.group
        : fallbackGroupLabel;
    if (!acc[group]) {
      acc[group] = { items: [], groupSortOrder: item.groupSortOrder ?? 999999 };
    }
    acc[group].items.push(item);
    if (item.groupSortOrder != null && item.groupSortOrder < acc[group].groupSortOrder) {
      acc[group].groupSortOrder = item.groupSortOrder;
    }
    return acc;
  }, {});
  for (const data of Object.values(itemGroups)) {
    data.items.sort(comparePickableBySort);
  }
  return Object.entries(itemGroups).sort((a, b) => a[1].groupSortOrder - b[1].groupSortOrder);
}

/**
 * Group selected items preserving selection order within each group.
 * @param {number[]} selectedIds
 * @param {Map<number, PickableItem>} itemById
 * @param {string} fallbackGroupLabel
 */
function buildGroupedSelected(selectedIds, itemById, fallbackGroupLabel) {
  const groupOrder = [];
  const buckets = new Map();
  for (const id of selectedIds) {
    const it = itemById.get(id);
    if (!it) continue;
    const g =
      it.group && String(it.group).trim() !== '' ? it.group : fallbackGroupLabel;
    if (!buckets.has(g)) {
      buckets.set(g, []);
      groupOrder.push(g);
    }
    buckets.get(g).push(it);
  }
  return groupOrder.map((g) => [g, buckets.get(g)]);
}

/**
 * Unified tag / curation-type style picker: selected chips + search + add pool.
 *
 * @param {object} props
 * @param {PickableItem[]} props.items - Full catalog (used to resolve ids and build pool)
 * @param {number[]} props.selectedIds - Ordered ids
 * @param {(ids: number[]) => void} props.onSelectedIdsChange
 * @param {(item: PickableItem) => boolean} [props.poolFilter] - If set, only items passing this may appear in "add" (still need to be in `items`)
 * @param {boolean} [props.enableGrouping=true] - Group headers in both sections
 * @param {string} props.fallbackGroupLabel - Ungrouped label (caller passes i18n string)
 * @param {object} props.labels
 * @param {string} props.labels.sectionCurrent
 * @param {string} props.labels.sectionAdd
 * @param {string} props.labels.searchPlaceholder
 * @param {string} props.labels.emptySelected
 * @param {string} props.labels.emptyPool
 * @param {string} props.labels.noResults
 * @param {string} props.labels.removeItem
 * @param {string} props.labels.addItem
 * @param {string} [props.labels.loading] - Shown when isLoading
 * @param {boolean} [props.isLoading=false]
 * @param {string} [props.colorFallback='#888']
 * @param {string} [props.className='']
 * @param {unknown} [props.resetSearchSignal] - When this value changes, internal search is cleared
 */
const ItemPickManager = ({
  items = [],
  selectedIds = [],
  onSelectedIdsChange,
  poolFilter,
  enableGrouping = true,
  fallbackGroupLabel,
  labels,
  isLoading = false,
  colorFallback = '#888',
  className = '',
  resetSearchSignal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [resetSearchSignal]);

  const itemById = useMemo(() => {
    const m = new Map();
    (items || []).forEach((it) => m.set(it.id, it));
    return m;
  }, [items]);

  const selectedOrdered = useMemo(
    () => selectedIds.map((id) => itemById.get(id)).filter(Boolean),
    [selectedIds, itemById]
  );

  const poolFiltered = useMemo(() => {
    const selected = new Set(selectedIds);
    const q = searchQuery.toLowerCase().trim();
    const filtered = (items || []).filter((it) => {
      if (selected.has(it.id)) return false;
      if (poolFilter && !poolFilter(it)) return false;
      if (!q) return true;
      return String(it.name).toLowerCase().includes(q);
    });
    if (!enableGrouping) {
      const byGroupThenSort = (a, b) => {
        const ga = a.groupSortOrder ?? 0;
        const gb = b.groupSortOrder ?? 0;
        if (ga !== gb) return ga - gb;
        return comparePickableBySort(a, b);
      };
      return [...filtered].sort(byGroupThenSort);
    }
    return filtered;
  }, [items, selectedIds, searchQuery, poolFilter, enableGrouping]);

  const groupedSelected = useMemo(
    () =>
      buildGroupedSelected(selectedIds, itemById, fallbackGroupLabel || '—'),
    [selectedIds, itemById, fallbackGroupLabel]
  );

  const groupedPool = useMemo(
    () => buildGroupedPool(poolFiltered, fallbackGroupLabel || '—'),
    [poolFiltered, fallbackGroupLabel]
  );

  const removeId = useCallback(
    (id) => {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id));
    },
    [selectedIds, onSelectedIdsChange]
  );

  const addId = useCallback(
    (id) => {
      if (selectedIds.includes(id)) return;
      onSelectedIdsChange([...selectedIds, id]);
      setSearchQuery('');
    },
    [selectedIds, onSelectedIdsChange]
  );

  const chipStyle = useCallback(
    (item) => {
      const c = item.color || colorFallback;
      return {
        '--ipm-bg': `${c}50`,
        '--ipm-border': c,
        '--ipm-text': c,
        '--ipm-shadow': `0 0 10px ${c}50`,
      };
    },
    [colorFallback]
  );

  const renderChip = (item, { addable = false } = {}) => {
    const actionLabel = addable ? labels.addItem : labels.removeItem;
    return (
    <div
      key={`${addable ? 'a' : 's'}-${item.id}`}
      role="button"
      tabIndex={0}
      className={`item-pick-manager__chip ${addable ? 'item-pick-manager__chip--addable' : 'item-pick-manager__chip--removable'}`}
      style={chipStyle(item)}
      title={actionLabel}
      aria-label={`${actionLabel}: ${item.name}`}
      onClick={() => (addable ? addId(item.id) : removeId(item.id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (addable) addId(item.id);
          else removeId(item.id);
        }
      }}
    >
      {item.icon && (
        <img src={item.icon} alt="" className="item-pick-manager__chip-icon" />
      )}
      <span className="item-pick-manager__chip-name">{item.name}</span>
      {addable ? (
        <span className="item-pick-manager__chip-action item-pick-manager__chip-action--add" aria-hidden>
          +
        </span>
      ) : (
        <span className="item-pick-manager__chip-action item-pick-manager__chip-action--remove" aria-hidden>
          <TrashIcon color="currentColor" size="16px" />
        </span>
      )}
    </div>
    );
  };

  return (
    <div className={`item-pick-manager ${className}`.trim()}>
      <div className="item-pick-manager__section">
        <h3 className="item-pick-manager__heading">{labels.sectionCurrent}</h3>
        {selectedOrdered.length === 0 ? (
          <p className="item-pick-manager__empty">{labels.emptySelected}</p>
        ) : enableGrouping ? (
          <div className="item-pick-manager__grouped">
            {groupedSelected.map(([groupName, groupItems]) => (
              <div key={groupName || 'ungrouped'} className="item-pick-manager__group">
                <h4 className="item-pick-manager__group-title">{groupName}</h4>
                <div className="item-pick-manager__chip-row">{groupItems.map((it) => renderChip(it))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="item-pick-manager__chip-row">
            {selectedOrdered.map((it) => renderChip(it))}
          </div>
        )}
      </div>

      <div className="item-pick-manager__section">
        <h3 className="item-pick-manager__heading">{labels.sectionAdd}</h3>
        <input
          type="search"
          className="item-pick-manager__search"
          placeholder={labels.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
        {isLoading ? (
          <p className="item-pick-manager__loading">{labels.loading ?? '…'}</p>
        ) : poolFiltered.length === 0 ? (
          <p className="item-pick-manager__empty">
            {searchQuery.trim() ? labels.noResults : labels.emptyPool}
          </p>
        ) : enableGrouping ? (
          <div className="item-pick-manager__grouped item-pick-manager__grouped--scroll">
            {groupedPool.map(([groupName, data]) => (
              <div key={groupName || 'ungrouped'} className="item-pick-manager__group">
                <h4 className="item-pick-manager__group-title">{groupName}</h4>
                <div className="item-pick-manager__chip-row">{data.items.map((it) => renderChip(it, { addable: true }))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="item-pick-manager__chip-row item-pick-manager__chip-row--scroll">
            {poolFiltered.map((it) => renderChip(it, { addable: true }))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemPickManager;
