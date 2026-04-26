import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getPortalRoot } from '@/utils/portalRoot';
import './facetitempicker.css';

/**
 * Modal: searchable list of facet items (tags / curation types) with icons.
 */
const FacetItemPicker = ({
  isOpen,
  onClose,
  overlayRef,
  items,
  excludeIds = new Set(),
  onPick,
  enableGrouping = true,
  title,
}) => {
  const { t } = useTranslation('components');
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = (items || []).filter((it) => !excludeIds.has(it.id));
    if (!q) return list;
    return list.filter((it) => String(it.name).toLowerCase().includes(q));
  }, [items, excludeIds, search]);

  const orderedGroups = useMemo(() => {
    if (!enableGrouping) return [['', { items: filtered, groupSortOrder: 0 }]];
    const itemGroups = filtered.reduce((acc, item) => {
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
    return Object.entries(itemGroups).sort((a, b) => a[1].groupSortOrder - b[1].groupSortOrder);
  }, [filtered, enableGrouping, t]);

  if (!isOpen) return null;

  const root = getPortalRoot();

  const setOverlayNode = (el) => {
    if (overlayRef) {
      if (typeof overlayRef === 'function') overlayRef(el);
      else overlayRef.current = el;
    }
  };

  return createPortal(
    <div ref={setOverlayNode} className="facet-item-picker" role="dialog" aria-modal="true">
      <button
        type="button"
        className="facet-item-picker__backdrop"
        aria-label="Close"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className="facet-item-picker__dialog"
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="facet-item-picker__header">
          <h3 className="facet-item-picker__title">{title}</h3>
          <button
            type="button"
            className="facet-item-picker__close"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>
        <input
          type="search"
          className="facet-item-picker__search"
          placeholder={t('facetQueryBuilder.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="facet-item-picker__scroll">
          {filtered.length === 0 ? (
            <p className="facet-item-picker__empty">{t('facetQueryBuilder.pickerEmpty')}</p>
          ) : (
            orderedGroups.map(([group, data]) => (
              <div key={group} className="facet-item-picker__group">
                {enableGrouping && <h4 className="facet-item-picker__group-title">{group}</h4>}
                <div className="facet-item-picker__list">
                  {data.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="facet-item-picker__item"
                      style={{ backgroundColor: `${item.color || '#444'}40` }}
                      onClick={() => {
                        onPick(item.id);
                        onClose();
                      }}
                    >
                      {item.icon && (
                        <img src={item.icon} alt="" className="facet-item-picker__item-icon" />
                      )}
                      <span className="facet-item-picker__item-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    root
  );
};

export default FacetItemPicker;
