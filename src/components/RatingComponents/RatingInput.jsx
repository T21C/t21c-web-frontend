import { useState, useEffect, useCallback } from 'react';
import { inputDataRaw, inputPguDictRaw } from "@/Repository/RemoteRepository";

import "./ratinginput.css";

export const RatingInput = ({ 
  value, 
  onChange, 
  isLegacy, 
  showDiff=true, 
  pguOnly=false,
  difficulties,
  diffId,
  allowCustomInput=false,
  placeholder="Enter difficulty..."
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRating, setSelectedRating] = useState([null,null]);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (allowCustomInput) {
      onChange(newValue, false);
    }
    setShowDropdown(true);
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
    // Original logic for non-difficulties case
    const dataRaw = pguOnly ? inputPguDictRaw : inputDataRaw;
    const matchingEntry = dataRaw.find(([key]) => key === rating);
    return matchingEntry ? matchingEntry : [null,null];
  };

  useEffect(() => {
    // Clear selected rating if input doesn't match any difficulty
    const hasMatch = difficulties?.some(d => d.name === value);
    setSelectedRating(hasMatch ? getSelectedRating(value, diffId) : [null, null]);
  }, [value, difficulties, diffId]);

  // Filter options based on input
  const filteredOptions = difficulties 
    ? difficulties.filter(diff => 
        diff.name.toLowerCase().includes(inputValue.toLowerCase())
      ).map(diff => [diff.name, diff.icon])
    : dataRaw.filter(([rating]) => 
        rating.toLowerCase().includes(inputValue.toLowerCase())
      );

  const handleSelect = (rating) => {
    onChange(rating, true);
    setShowDropdown(false);
  };

  const handleInputFinalize = () => {
    if (showDropdown) {
      if (allowCustomInput) {
        onChange(inputValue, true);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0][0]);
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

  return (
    <div className="rating-input-wrapper">
      <div className="rating-input-container">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
  