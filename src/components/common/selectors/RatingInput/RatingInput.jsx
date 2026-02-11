import { useState, useEffect, useCallback } from 'react';
import "./ratinginput.css";
import { useTranslation } from 'react-i18next';

export const RatingInput = ({ 
  disabled=false,
  value = "", 
  onChange, 
  showDiff=true, 
  difficulties=[],
  diffId=0,
  allowCustomInput=false,
  placeholder=""
}) => {
  const { t } = useTranslation('components');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRating, setSelectedRating] = useState([null,null]);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
    const hasMatch = difficulties?.some(d => d.name === value);
    setSelectedRating(hasMatch ? getSelectedRating(value, diffId) : [null, null]);
  }, [value, difficulties, diffId]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowDropdown(true);
    
    if (allowCustomInput) {
      onChange(newValue, false);
    }
  };

  const getSelectedRating = (rating, currentDiffId) => {
    if (difficulties) {
      // First try to find by diffId
      if (currentDiffId) {
        const diff = difficulties.find(d => d.id === currentDiffId);
        return diff ? [diff.name, diff.icon] : [null, null];
      }
      // Then try to find by name
      const diff = difficulties.find(d => d.name === rating);
      return diff ? [diff.name, diff.icon] : [null, null];
    }
    return [null, null];
  };

  const handleSelect = (rating) => {
    setInputValue(rating);
    onChange(rating, true);
    setShowDropdown(false);
  };

  const handleInputFinalize = () => {
    if (showDropdown) {
      if (allowCustomInput) {
        onChange(inputValue, true);
      } else if (filteredOptions.length > 0) {
        // First try to find an exact match (case-insensitive)
        const exactMatch = filteredOptions.find(([rating]) => 
          rating.toLowerCase() === inputValue.toLowerCase()
        );
        
        // If exact match found, use it, otherwise use first item
        handleSelect(exactMatch ? exactMatch[0] : filteredOptions[0][0]);
      }
    }
    setShowDropdown(false);
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (showDropdown) {
      e.stopPropagation();
      
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInputFinalize();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
      }
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.rating-input-wrapper')) {
        handleInputFinalize();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleInputFinalize]);

  // Filter options based on input
  const filteredOptions = difficulties
    ?.filter(diff => diff.type !== 'LEGACY')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(diff => 
      diff.name.toLowerCase().includes(inputValue.toLowerCase())
    )
    .map(diff => [diff.name, diff.icon]);

  return (
    <div className={`rating-input-wrapper ${disabled ? 'disabled' : ''}`}>
      <div className={`rating-input-container ${disabled ? 'disabled' : ''}`}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('rating.detailPopup.placeholders.difficultyInput')}
        />
        <button 
          className="dropdown-toggle"
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
        >
          <div className={`dropdown-toggle-icon ${showDropdown ? 'open' : ''}`}>▼</div>
        </button>
        {selectedRating[1] && showDiff && (
          <img src={selectedRating[1]} alt={selectedRating[0]} className="rating-option-image" />
        )}

      </div>
      {showDropdown && filteredOptions.length > 0 && (
        <div className="rating-dropdown">
          {filteredOptions.map(([rating, imageUrl]) => (
            <div
              key={rating}
              className="rating-option"
              onClick={() => handleSelect(rating)}
            >
              <span>{rating}</span>
              <img src={imageUrl} alt={rating} className="rating-option-image" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
  