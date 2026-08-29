// tuf-search: #TagVisibilityDropdown #tagVisibility #selectors #tagSelector
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Portal } from '@/components/common/Portal';
import { EyeIcon, EyeOffIcon } from '@/components/common/icons';
import { PORTALED_PANEL_CLASS, usePortaledPanelAnchor } from '@/hooks/usePortaledPanelAnchor';
import FacetSimpleList from './FacetSimpleList';
import './facetquerybuilder.css';
import './tagvisibilitydropdown.css';

/**
 * Eye-button dropdown: selected tags are hidden on level cards.
 *
 * @param {object} props
 * @param {{ id: number, name: string, color?: string, icon?: string }[]} props.items
 * @param {number[]} props.hiddenIds
 * @param {(ids: number[]) => void} props.onChange
 */
const TagVisibilityDropdown = ({ items, hiddenIds = [], onChange }) => {
  const { t } = useTranslation('pages');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const panelContentRef = useRef(null);
  const hiddenCount = hiddenIds.length;
  const hasHidden = hiddenCount > 0;

  const { panelStyle, fullWidth, portalRoot } = usePortaledPanelAnchor({
    open: isOpen,
    anchorRef: toggleRef,
    panelRef: panelContentRef,
    fullWidthBelow: 768,
    maxPanelWidth: 512,
    horizontalAlign: 'end',
    reanchorDeps: [hiddenCount, items?.length],
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (panelContentRef.current?.contains(target)) return;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  const toggleId = useCallback(
    (id) => {
      const cur = hiddenIds || [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      onChange(next);
    },
    [hiddenIds, onChange]
  );

  const toggleGroupAll = useCallback(
    (idsInSubgroup) => {
      if (!idsInSubgroup.length) return;
      const cur = hiddenIds || [];
      const curSet = new Set(cur);
      const allOn = idsInSubgroup.every((id) => curSet.has(id));
      const next = allOn
        ? cur.filter((id) => !idsInSubgroup.includes(id))
        : [...new Set([...cur, ...idsInSubgroup])];
      onChange(next);
    },
    [hiddenIds, onChange]
  );

  return (
    <div
      ref={rootRef}
      className={`tags-visibility-dropdown ${isOpen ? 'tags-visibility-dropdown--open' : ''}`}
    >
      <button
        ref={toggleRef}
        type="button"
        className={`tags-visibility-toggle ${hasHidden ? 'hidden' : ''} ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t('level.toolTip.hideCardTags')}
        aria-label={t('level.toolTip.hideCardTags')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {hasHidden ? <EyeOffIcon size="18px" /> : <EyeIcon size="18px" />}
        {hasHidden ? (
          <span className="tags-visibility-toggle__count" aria-hidden>
            {hiddenCount}
          </span>
        ) : null}
      </button>

      <Portal when={isOpen} root={portalRoot}>
        <div
          ref={panelContentRef}
          className={`facet-query-builder__panel facet-query-builder__panel--portal ${PORTALED_PANEL_CLASS} portaled-panel--z-popover${
            fullWidth ? ' facet-query-builder__panel--full-width' : ''
          }`}
          style={panelStyle}
        >
          <FacetSimpleList
            items={items || []}
            selectedIds={hiddenIds}
            onToggleId={toggleId}
            onToggleGroupAll={toggleGroupAll}
            enableGrouping
            mode="hide"
          />
        </div>
      </Portal>
    </div>
  );
};

export default TagVisibilityDropdown;
