import React, { useState, useRef, useEffect } from 'react';
import './specialdifficulties.css';

// Define group order and their display names
const GROUP_ORDER = {
  'Quantum': 0,
  'Extra': 1,
  'Hidden': 2
};

const SpecialDifficulties = ({ 
  difficulties, 
  selectedDiffs, 
  onToggle 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group difficulties by type with ordering
  const difficultyGroups = difficulties.reduce((groups, diff) => {
    let group;
    if (diff.name.startsWith('Q')) {
      group = 'Quantum';
    } else if (['-2', '-21', 'Unranked'].includes(diff.name)) {
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
      // If any are selected, deselect all
      difficulties.forEach(diff => {
        if (selectedDiffs.includes(diff.name)) {
          onToggle(diff.name);
        }
      });
    } else {
      // If none are selected, select all
      difficulties.forEach(diff => {
        if (!selectedDiffs.includes(diff.name)) {
          onToggle(diff.name);
        }
      });
    }
  };

  return (
    <div className="special-difficulties-dropdown" ref={dropdownRef}>
      <button 
        className="dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Special Difficulties</span>
        <span className="selected-count">
          {selectedDiffs.length > 0 && `(${selectedDiffs.length})`}
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
        <div className="difficulties-grid">
          <div className="difficulties-header">
            <h3>Special Difficulties</h3>
            <button 
              className="select-all-button"
              onClick={handleSelectAll}
            >
              {selectedDiffs.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          {orderedGroups.map(([group, diffs]) => (
            <div key={group} className="difficulty-group">
              <h3 className="group-title">{group}</h3>
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
      )}
    </div>
  );
};

export default SpecialDifficulties; 