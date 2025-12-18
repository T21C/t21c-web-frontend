import React, { useState, useRef, useEffect } from 'react';
import './tagselector.css';
import { useTranslation } from 'react-i18next';

// Define group order and their display names
const GROUP_ORDER = {
  'Quantum': 0,
  'Extra': 1,
  'Hidden': 2
};

const TagSelector = ({ 
  items, 
  selectedItems, 
  onToggle,
  disableQuantum = false,
  enableGrouping = true,
  title
}) => {
  const { t } = useTranslation('components');
  const tDiff = (key, params = {}) => t(`tagSelector.special.${key}`, params);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  if (!items) return null;

  const filteredItems = disableQuantum
    ? items.filter(item => !item.name.startsWith('Q'))
    : items;

  // Filter out non-existent items from selectedDiffs
  useEffect(() => {
    const validItems = filteredItems.map(item => item.name);
    const invalidSelections = selectedItems.filter(item => !validItems.includes(item));
    
    if (invalidSelections.length > 0) {
      // Remove invalid selections
      invalidSelections.forEach(item => onToggle(item));
    }
  }, [items, selectedItems, onToggle]);

  // Handle click/touch outside to close dropdown
  useEffect(() => {
    const handleOutsideEvent = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideEvent);
      document.addEventListener('touchstart', handleOutsideEvent);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideEvent);
      document.removeEventListener('touchstart', handleOutsideEvent);
    };
  }, [isOpen]);

  // Group items by type with ordering
  // Priority: Use item.group if available, otherwise fall back to hardcoded logic
  const itemGroups = filteredItems.reduce((groups, item) => {
    let group;
    
    // If item has a group field set, use it
    if (item.group && item.group.trim() !== '') {
      group = item.group;
    } else {
      // Backward compatibility: fall back to hardcoded grouping logic
      if (item.name.startsWith('Q')) {
        group = tDiff('groups.Quantum');
      } else if (['Unranked', 'Impossible', 'Censored'].includes(item.name)) {
        group = tDiff('groups.Hidden');
      } else {
        group = tDiff('groups.Extra');
      }
    }
    
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});

  // Sort groups: groups with explicit order first, then alphabetically
  const orderedGroups = Object.entries(itemGroups)
    .sort(([groupA], [groupB]) => {
      // If both groups have defined order, sort by order
      if (GROUP_ORDER[groupA] !== undefined && GROUP_ORDER[groupB] !== undefined) {
        return GROUP_ORDER[groupA] - GROUP_ORDER[groupB];
      }
      // If only groupA has order, it comes first
      if (GROUP_ORDER[groupA] !== undefined) return -1;
      // If only groupB has order, it comes first
      if (GROUP_ORDER[groupB] !== undefined) return 1;
      // Otherwise, sort alphabetically
      return groupA.localeCompare(groupB);
    });

  // Handle select/deselect all
  const handleSelectAll = () => {
    if (selectedItems.length > 0) {
      filteredItems.forEach(item => {
        if (selectedItems.includes(item.name)) {
          onToggle(item.name);
        }
      });
    } else {
      filteredItems.forEach(item => {
        if (!selectedItems.includes(item.name)) {
          onToggle(item.name);
        }
      });
    }
  };

  const handleBackdropClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
  };

  const handleBackdropTouch = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBackdropTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only close if it's a direct touch on the backdrop
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`tag-selector-dropdown ${isOpen ? 'open' : ''}`}>
      <button 
        className="dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title || tDiff('title')}</span>
        <span className="selected-count">
          &nbsp;{selectedItems.length > 0 && <>({selectedItems.length})</>}
        </span>
        <svg 
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
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

      {isOpen && (
        <>
          <div 
            className="tag-selector-backdrop" 
            onClick={handleBackdropClick}
            onTouchStart={handleBackdropTouch}
            onTouchMove={handleBackdropTouch}
            onTouchEnd={handleBackdropTouchEnd}
          />
          <div className="tag-selector-grid" ref={dropdownRef}>
            <div className="tag-selector-header">
              {enableGrouping && <h3>{title || tDiff('title')}</h3>}
              <button 
                className="select-all-button"
                onClick={handleSelectAll}
              >
                {selectedItems.length > 0 ? tDiff('buttons.deselectAll') : tDiff('buttons.selectAll')}
              </button>
            </div>
            {orderedGroups.map(([group, items]) => (
              <div key={group} className="tag-selector-group">
                {enableGrouping && <h3 className="group-title">{group}</h3>}
                <div className="tag-selector-list">
                  {items.map(item => (
                    <button
                      key={item.name}
                      className={`tag-selector-item ${selectedItems.includes(item.name) ? 'selected' : ''}`}
                      onClick={() => onToggle(item.name)}
                      style={{ 
                        backgroundColor: `${item.color}55`,
                        color: '#ffffff'
                      }}
                    >
                      {item.icon && (
                        <img 
                          src={item.icon} 
                          alt="" 
                          className="tag-selector-icon"
                        />
                      )}
                      <span className="tag-selector-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TagSelector; 