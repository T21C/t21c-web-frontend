// tuf-search: #TagSelector #tagSelector #selectors
import React, { useState, useRef, useEffect } from "react";
import { Portal } from "@/components/common/Portal";
import "./tagselector.css";
import { useTranslation } from "react-i18next";
import { PORTALED_PANEL_CLASS, usePortaledPanelAnchor } from "@/hooks/usePortaledPanelAnchor";
//import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

// Define group order and their display names
const GROUP_ORDER = {
  Quantum: 0,
  Extra: 1,
  Hidden: 2,
};

const TagSelector = ({
  items,
  selectedItems,
  onToggle,
  disableQuantum = false,
  enableGrouping = true,
  title,
}) => {
  const { t } = useTranslation("components");

  const [isOpen, setIsOpen] = useState(false);
  //useBodyScrollLock(isOpen);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  const { panelStyle, fullWidth, portalRoot } = usePortaledPanelAnchor({
    open: isOpen,
    anchorRef: toggleRef,
    panelRef,
    fullWidthBelow: 768,
    maxPanelWidth: 480,
    reanchorDeps: [selectedItems.length, enableGrouping, items?.length],
  });

  const filteredItems = (items ?? []).filter((item) =>
    disableQuantum ? !item.name.includes("Q") : true,
  );

  // Filter out non-existent items from selectedDiffs
  useEffect(() => {
    const validItems = filteredItems.map((item) => item.name);
    const invalidSelections = selectedItems.filter((item) => !validItems.includes(item));

    if (invalidSelections.length > 0) {
      invalidSelections.forEach((item) => onToggle(item));
    }
  }, [items, selectedItems, onToggle, filteredItems]);

  useEffect(() => {
    const handleOutsideEvent = (event) => {
      const target = event.target;
      if (toggleRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideEvent);
      document.addEventListener("touchstart", handleOutsideEvent);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideEvent);
      document.removeEventListener("touchstart", handleOutsideEvent);
    };
  }, [isOpen]);

  // Sort items by groupSortOrder first, then sortOrder within groups
  const sortedFilteredItems = [...filteredItems].sort((a, b) => {
    const groupOrderA = a.groupSortOrder ?? Number.MAX_SAFE_INTEGER;
    const groupOrderB = b.groupSortOrder ?? Number.MAX_SAFE_INTEGER;
    if (groupOrderA !== groupOrderB) return groupOrderA - groupOrderB;
    const sortOrderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const sortOrderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return sortOrderA - sortOrderB;
  });

  const itemGroups = sortedFilteredItems.reduce((groups, item) => {
    let group;

    if (item.group && item.group.trim() !== "") {
      group = item.group;
    } else if (item.name.startsWith("Q")) {
      group = t("tagSelector.special.groups.Quantum");
    } else if (["Unranked", "Impossible", "Censored", "P0"].includes(item.name)) {
      group = t("tagSelector.special.groups.Hidden");
    } else {
      group = t("tagSelector.special.groups.Extra");
    }

    if (!groups[group]) {
      groups[group] = {
        items: [],
        groupSortOrder: item.groupSortOrder ?? Number.MAX_SAFE_INTEGER,
      };
    }
    groups[group].items.push(item);
    return groups;
  }, {});

  const orderedGroups = Object.entries(itemGroups)
    .sort(([groupA, dataA], [groupB, dataB]) => {
      if (dataA.groupSortOrder !== dataB.groupSortOrder) {
        return dataA.groupSortOrder - dataB.groupSortOrder;
      }
      if (GROUP_ORDER[groupA] !== undefined && GROUP_ORDER[groupB] !== undefined) {
        return GROUP_ORDER[groupA] - GROUP_ORDER[groupB];
      }
      if (GROUP_ORDER[groupA] !== undefined) return -1;
      if (GROUP_ORDER[groupB] !== undefined) return 1;
      return groupA.localeCompare(groupB);
    })
    .map(([group, data]) => [group, data.items]);

  const handleSelectAll = () => {
    if (selectedItems.length > 0) {
      filteredItems.forEach((item) => {
        if (selectedItems.includes(item.name)) {
          onToggle(item.name);
        }
      });
    } else {
      filteredItems.forEach((item) => {
        if (!selectedItems.includes(item.name)) {
          onToggle(item.name);
        }
      });
    }
  };

  if (!items) return null;

  const panelContent = (
    <div
      ref={panelRef}
      className={`tag-selector-panel ${PORTALED_PANEL_CLASS} portaled-panel--z-popover${
        fullWidth ? " tag-selector-panel--full-width" : ""
      }`}
      style={panelStyle}
    >
      <div className="tag-selector-header">
        {enableGrouping && <h3>{title || t("tagSelector.special.title")}</h3>}
        <button type="button" className="select-all-button" onClick={handleSelectAll}>
          {selectedItems.length > 0
            ? t("tagSelector.special.buttons.deselectAll")
            : t("tagSelector.special.buttons.selectAll")}
        </button>
      </div>
      {orderedGroups.map(([group, groupItems]) => (
        <div key={group} className="tag-selector-group">
          {enableGrouping && <h3 className="group-title">{group}</h3>}
          <div className="tag-selector-list">
            {groupItems.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`tag-selector-item ${selectedItems.includes(item.name) ? "selected" : ""}`}
                onClick={() => onToggle(item.name)}
                style={{
                  backgroundColor: `${item.color}55`,
                  color: "#ffffff",
                }}
              >
                {item.icon && (
                  <img src={item.icon} alt="" className="tag-selector-icon" />
                )}
                <span className="tag-selector-name">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`tag-selector-dropdown ${isOpen ? "open" : ""}`}>
      <button
        ref={toggleRef}
        type="button"
        className="dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{title || t("tagSelector.special.title")}</span>
        <span className="selected-count">
          &nbsp;{selectedItems.length > 0 && <>({selectedItems.length})</>}
        </span>
        <svg
          className={`dropdown-arrow ${isOpen ? "open" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <Portal when={isOpen} root={portalRoot}>{panelContent}</Portal>
    </div>
  );
};

export default TagSelector;
