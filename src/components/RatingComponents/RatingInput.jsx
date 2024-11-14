import { useState, useEffect } from 'react';
import { inputDataRaw } from "../../Repository/RemoteRepository";
import "./detailpopup.css";
export const RatingInput = ({ value, onChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);
  
    const handleSelect = (rating) => {
      onChange(rating);
      setShowDropdown(false);
    };
  
    const filteredOptions = inputDataRaw.filter(([rating]) => 
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
            type="string"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className="dropdown-toggle"
            onClick={() => setShowDropdown(!showDropdown)}
            type="button"
          >
            ▼
          </button>
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
  