import React, { useState, useRef, useEffect } from 'react';
import './specialdifficulties.css';
import { useTranslation } from 'react-i18next';

// Define group order and their display names
const GROUP_ORDER = {
  'Quantum': 0,
  'Extra': 1,
  'Hidden': 2
};

const SpecialDifficulties = ({ 
  difficulties, 
  selectedDiffs, 
  onToggle,
  disableQuantum = false 
}) => {
  const { t } = useTranslation('components');
  const tDiff = (key, params = {}) => t(`difficulties.special.${key}`, params);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const filteredDifficulties = disableQuantum 
    ? difficulties.filter(diff => !diff.name.startsWith('Q'))
    : difficulties;
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

  // Group difficulties by type with ordering
  const difficultyGroups = filteredDifficulties.reduce((groups, diff) => {
    let group;
    if (diff.name.startsWith('Q')) {
      group = 'Quantum';
    } else if (['-2', '-21', 'Unranked', 'Impossible', 'Censor'].includes(diff.name)) {
      group = 'Hidden';
    } else {
      group = 'Extra';
    }
    if (!groups[group]) groups[group] = [];
    groups[group].push(diff);
    return groups;
  }, {});

  // Sort groups by defined order
  const orderedGroups = Object.entries(difficultyGroups)
    .sort(([groupA], [groupB]) => GROUP_ORDER[groupA] - GROUP_ORDER[groupB]);

  // Handle select/deselect all
  const handleSelectAll = () => {
    if (selectedDiffs.length > 0) {
      filteredDifficulties.forEach(diff => {
        if (selectedDiffs.includes(diff.name)) {
          onToggle(diff.name);
        }
      });
    } else {
      filteredDifficulties.forEach(diff => {
        if (!selectedDiffs.includes(diff.name)) {
          onToggle(diff.name);
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
    <div className={`special-difficulties-dropdown ${isOpen ? 'open' : ''}`}>
      <button 
        className="dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{tDiff('title')}</span>
        <span className="selected-count">
          {selectedDiffs.length > 0 && tDiff('selectedCount', { count: selectedDiffs.length })}
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
            className="difficulties-backdrop" 
            onClick={handleBackdropClick}
            onTouchStart={handleBackdropTouch}
            onTouchMove={handleBackdropTouch}
            onTouchEnd={handleBackdropTouchEnd}
          />
          <div className="difficulties-grid" ref={dropdownRef}>
            <div className="difficulties-header">
              <h3>{tDiff('title')}</h3>
              <button 
                className="select-all-button"
                onClick={handleSelectAll}
              >
                {selectedDiffs.length > 0 ? tDiff('buttons.deselectAll') : tDiff('buttons.selectAll')}
              </button>
            </div>
            {orderedGroups.map(([group, diffs]) => (
              <div key={group} className="difficulty-group">
                <h3 className="group-title">{tDiff(`groups.${group}`)}</h3>
                <div className="difficulties-list">
                  {diffs.map(diff => (
                    <button
                      key={diff.name}
                      className={`difficulty-item ${selectedDiffs.includes(diff.name) ? 'selected' : ''}`}
                      onClick={() => onToggle(diff.name)}
                      style={{ 
                        backgroundColor: `${diff.color}55`,
                        color: '#ffffff'
                      }}
                    >
                      {diff.icon && (
                        <img 
                          src={diff.icon} 
                          alt="" 
                          className="difficulty-icon"
                        />
                      )}
                      <span className="difficulty-name">{diff.name}</span>
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

export default SpecialDifficulties; 