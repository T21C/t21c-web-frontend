import { useState, useEffect, useContext } from 'react';
import { DifficultyContext } from "@/context/DifficultyContext";
import "./ratinginput.css";

export const RatingInput = ({ 
  value, 
  onChange, 
  isLegacy=false, 
  showDiff=true, 
  pguOnly=false
}) => {
  const { difficultyList, loading } = useContext(DifficultyContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const getSelectedRating = (rating) => {
    if (!rating) return null;
    return difficultyList.find(d => d.name.toLowerCase() === rating.toLowerCase());
  };

  useEffect(() => {
    setSelectedRating(getSelectedRating(value));
  }, [value, difficultyList]);

  const handleSelect = (diff) => {
    onChange(diff.name);
    setShowDropdown(false);
  };

  // Filter options based on input and pguOnly flag
  const filteredOptions = difficultyList
    .filter(diff => {
      if (pguOnly && diff.type !== 'PGU') return false;
      return diff.name.toLowerCase().includes(inputValue.toLowerCase());
    });

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (showDropdown) {
      e.stopPropagation();
      
      if (e.key === 'Enter' && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelect(filteredOptions[0]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
      }
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.rating-input-wrapper')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="rating-input-wrapper">Loading difficulties...</div>;
  }

  return (
    <div className="rating-input-wrapper">
      <div className="rating-input-container">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            setShowDropdown(true);
            
            // Only trigger onChange when exact match is found
            const exactMatch = difficultyList.find(d => 
              d.name.toLowerCase() === newValue.toLowerCase()
            );
            if (exactMatch) {
              onChange(exactMatch.name);
            }
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Enter difficulty..."
        />
        <button 
          className="dropdown-toggle"
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
        >
          <div className={`dropdown-toggle-icon ${showDropdown ? 'open' : ''}`}>▼</div>
        </button>
        {selectedRating && showDiff && (
          <img 
            src={isLegacy && selectedRating.legacyIcon ? selectedRating.legacyIcon : selectedRating.icon} 
            alt={selectedRating.name} 
            className="rating-option-image" 
          />
        )}
      </div>
      {showDropdown && filteredOptions.length > 0 && (
        <div className="rating-dropdown">
          {filteredOptions.map((diff) => (
            <div
              key={diff.id}
              className="rating-option"
              onClick={() => handleSelect(diff)}
            >
              <span>{diff.name}</span>
              <img 
                src={isLegacy && diff.legacyIcon ? diff.legacyIcon : diff.icon} 
                alt={diff.name} 
                className="rating-option-image" 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
  