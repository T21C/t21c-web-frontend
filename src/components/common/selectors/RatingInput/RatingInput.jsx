// tuf-search: #RatingInput #ratingInput #selectors
import { useState, useEffect, useCallback, useRef } from 'react';
import "./ratinginput.css";
import { useTranslation } from 'react-i18next';
import { useDismissOnOutsidePointer } from '../useDismissOnOutsidePointer';

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
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const liveRef = useRef({ showDropdown: false });
  const suppressOpenRef = useRef(false);
  const suppressTimerRef = useRef(null);
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
    liveRef.current.showDropdown = false;
    setInputValue(rating);
    onChange(rating, true);
    setShowDropdown(false);
  };

  // Filter options based on input
  const filteredOptions = difficulties
    ?.filter(diff => diff.type !== 'LEGACY')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(diff =>
      diff.name.toLowerCase().includes(inputValue.toLowerCase())
    )
    .map(diff => [diff.name, diff.icon]);

  liveRef.current.showDropdown = showDropdown;
  liveRef.current.allowCustomInput = allowCustomInput;
  liveRef.current.inputValue = inputValue;
  liveRef.current.filteredOptions = filteredOptions;
  liveRef.current.onChange = onChange;

  const dismiss = useCallback(() => {
    const live = liveRef.current;
    if (!live.showDropdown) return;
    live.showDropdown = false;
    setShowDropdown(false);
    if (live.allowCustomInput) {
      live.onChange(live.inputValue, true);
    } else if (live.filteredOptions?.length > 0) {
      const exactMatch = live.filteredOptions.find(([rating]) =>
        rating.toLowerCase() === String(live.inputValue).toLowerCase()
      );
      const next = exactMatch ? exactMatch[0] : live.filteredOptions[0][0];
      setInputValue(next);
      live.onChange(next, true);
    }
  }, []);

  const dismissFromOutside = useCallback(() => {
    suppressOpenRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressOpenRef.current = false;
    }, 0);
    dismiss();
  }, [dismiss]);

  useDismissOnOutsidePointer(showDropdown, dismissFromOutside, { rootRef });

  useEffect(() => () => {
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
  }, []);

  const handleFocusOut = (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && rootRef.current?.contains(next)) return;
    // Iframe clicks (the rating video) never reach document pointer listeners.
    dismissFromOutside();
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (showDropdown) {
      e.stopPropagation();

      if (e.key === 'Enter') {
        e.preventDefault();
        dismiss();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        liveRef.current.showDropdown = false;
        setShowDropdown(false);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`rating-input-wrapper ${disabled ? 'disabled' : ''}`}
      onFocusOut={handleFocusOut}
    >
      <div className={`rating-input-container ${disabled ? 'disabled' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          autoComplete='off'
          value={inputValue}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (disabled || suppressOpenRef.current) return;
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('rating.detailPopup.placeholders.difficultyInput')}
        />
        <button
          className="dropdown-toggle"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) return;
            const next = !showDropdown;
            setShowDropdown(next);
            if (next) inputRef.current?.focus();
          }}
          type="button"
          disabled={disabled}
        >
          <div className={`dropdown-toggle-icon ${showDropdown ? 'open' : ''}`}>▼</div>
        </button>
        {selectedRating[1] && showDiff && (
          <img src={selectedRating[1]} alt={selectedRating[0]} className="rating-option-image" />
        )}

      </div>
      {showDropdown && filteredOptions.length > 0 && (
        <div
          className="rating-dropdown"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map(([rating, imageUrl]) => (
            <div
              key={rating}
              className="rating-option"
              onMouseDown={(event) => event.preventDefault()}
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
  