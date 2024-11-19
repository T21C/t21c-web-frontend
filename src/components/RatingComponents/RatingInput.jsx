import { useState, useEffect } from 'react';
import { inputDataRaw } from "../../Repository/RemoteRepository";
import "./detailpopup.css";

export const RatingInput = ({ value, onChange, isLegacy, showDiff=true }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRating, setSelectedRating] = useState([null,null]);

  const getSelectedRating = (rating) => {
    // Find the matching URL for the rating
    const matchingEntry = inputDataRaw.find(([key]) => key === rating);
    return matchingEntry ? matchingEntry : [null,null]; // Return URL or empty string if not found
  };

  useEffect(() => {
    setSelectedRating(getSelectedRating(value));
  }, [value]);

  const handleSelect = (rating) => {
    onChange(rating);
    setShowDropdown(false);
  };

  // Filter options based on input
  const dataRaw = inputDataRaw;
  const filteredOptions = dataRaw.filter(([rating]) => 
    rating.toLowerCase().includes(value.toLowerCase())
  );

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (showDropdown) {
      e.stopPropagation(); // Prevent event from bubbling up when dropdown is open
      
      if (e.key === 'Enter' && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelect(filteredOptions[0][0]);
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

  return (
    <div className="rating-input-wrapper">
      <div className="rating-input-container">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            // Allow only numbers, decimal point, and hyphen
            const newValue = isLegacy ? e.target.value.replace(/[^0-9.-]/g, '') : e.target.value;
            onChange(newValue);
            setShowDropdown(true);
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
  