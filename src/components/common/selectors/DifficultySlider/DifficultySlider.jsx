import React, { useRef, useState, useCallback, useEffect } from 'react';
import './difficultyslider.css';
import { useDifficultyContext } from '@/contexts/DifficultyContext';

const DifficultySlider = ({ 
  values,  // [min, max] or a list
  onChange,
  onChangeComplete,  // New callback for when changes are complete
  mode = "pgu"
}) => {
  
  const trackRef = useRef(null);
  const { difficulties } = useDifficultyContext();
  const [isDragging, setIsDragging] = useState(false);
  const [activeKnob, setActiveKnob] = useState(null);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragStartValue, setDragStartValue] = useState(null);
  
  // Get min and max based on mode
  const getMinMax = () => {
    if (mode === "pgu") {
      return {
        min: difficulties.find(d => d.name === "P1")?.sortOrder,
        max: difficulties.find(d => d.name === "U20")?.sortOrder
      };
    } else if (mode === "q") {
      const qDifficulties = difficulties
        .filter(d => d.name.startsWith('Q'))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        min: qDifficulties[0]?.sortOrder,
        max: qDifficulties[qDifficulties.length - 1]?.sortOrder
      };
    }
    return { min: 0, max: 0 };
  };

  const { min, max } = getMinMax();
  
  // Convert values to sortOrder values if they're difficulty names
  const convertToSortOrders = React.useCallback((vals) => {
    if (!vals || vals.length === 0) return [min, min];
    
    // Check if the first value is a string (difficulty name) or number (sortOrder)
    const isDifficultyNames = typeof vals[0] === 'string';
    
    if (isDifficultyNames) {
      // Convert difficulty names to sortOrder values
      return vals.map(name => {
        const diff = difficulties.find(d => d.name === name);
        return diff ? diff.sortOrder : min;
      });
    } else {
      // Already sortOrder values
      return vals;
    }
  }, [difficulties, min]);

  // Ensure values is always an array with at least two elements
  const safeValues = React.useMemo(() => {
    const sortOrderValues = convertToSortOrders(values);
    
    if (sortOrderValues.length === 0) {
      // If no values provided, use min for both
      return [min, min];
    } else if (sortOrderValues.length === 1) {
      // If only one value, duplicate it
      return [sortOrderValues[0], sortOrderValues[0]];
    } else {
      // If two or more values, use first two
      return [sortOrderValues[0], sortOrderValues[1]];
    }
  }, [values, min, convertToSortOrders]);

  // Find the current difficulties based on the values
  const [minDiff, maxDiff] = safeValues.map(value => 
    difficulties.find(d => d.sortOrder === value)
  );
  
  // Calculate background gradient based on surrounding difficulties
  const getSliderBackground = (selectedRange = false) => {
    let sortedDiffs;
    if (mode === "pgu") {
      sortedDiffs = difficulties
        .filter(d => d.type === 'PGU')
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    else if (mode === "q") {
      sortedDiffs = difficulties
        .filter(d => d.name.startsWith('Q'))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    else {
      sortedDiffs = difficulties
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    if (!selectedRange) {
      // Full gradient for the track
      const gradientStops = sortedDiffs.map(diff => {
        const position = ((diff.sortOrder - min) / (max - min)) * 100;
        return `${diff.color} ${position}%`;
      });
      return `linear-gradient(to right, ${gradientStops.join(', ')})`;
    } else {
      // Partial gradient for the selected range
      const [rangeMin, rangeMax] = [Math.min(...safeValues), Math.max(...safeValues)];
      const rangeWidth = rangeMax - rangeMin;
      
      // Filter and adjust difficulties within the selected range
      const rangeStops = sortedDiffs
        .filter(diff => diff.sortOrder >= rangeMin && diff.sortOrder <= rangeMax)
        .map(diff => {
          const position = ((diff.sortOrder - rangeMin) / rangeWidth) * 100;
          return `${diff.color} ${position}%`;
        });

      // Add boundary colors if needed
      if (rangeStops.length === 0) return 'transparent';
      
      const firstDiff = sortedDiffs.find(d => d.sortOrder >= rangeMin);
      const lastDiff = sortedDiffs.reverse().find(d => d.sortOrder <= rangeMax);
      
      if (firstDiff && !rangeStops[0].startsWith(firstDiff.color)) {
        rangeStops.unshift(`${firstDiff.color} 0%`);
      }
      if (lastDiff && !rangeStops[rangeStops.length - 1].startsWith(lastDiff.color)) {
        rangeStops.push(`${lastDiff.color} 100%`);
      }

      return `linear-gradient(to right, ${rangeStops.join(', ')})`;
    }
  };

  // Calculate the range highlight position and width
  const rangeLeft = ((Math.min(...safeValues) - min) / (max - min)) * 100;
  const rangeWidth = ((Math.max(...safeValues) - Math.min(...safeValues)) / (max - min)) * 100;

  // Handle pointer move during drag (works for both mouse and touch)
  const handlePointerMove = useCallback((e) => {
    if (!isDragging || activeKnob === null || !trackRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = trackRef.current.getBoundingClientRect();
    const pixelRange = rect.width;
    const valueRange = max - min;
    const pixelMoved = clientX - dragStartX;
    const valueMoved = Math.round((pixelMoved / pixelRange) * valueRange);
    const newValue = Math.max(min, Math.min(max, dragStartValue + valueMoved));

    const newValues = [...safeValues];
    newValues[activeKnob] = newValue;
    onChange(newValues);
  }, [isDragging, activeKnob, dragStartX, dragStartValue, min, max, safeValues, onChange]);

  // Handle pointer up (works for both mouse and touch)
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      const newValues = [
        Math.min(safeValues[0], safeValues[1]),
        Math.max(safeValues[0], safeValues[1])
      ];
      
      if (mode === "q") {
        // For Q mode, return all Q difficulties within the range
        const qDifficulties = difficulties
          .filter(d => d.name.startsWith('Q'))
          .filter(d => d.sortOrder >= newValues[0] && d.sortOrder <= newValues[1])
          .map(d => d.name);
        
        // First call onChange with the sortOrder values to update the slider position
        onChange(newValues);
        
        // Then call onChangeComplete with the difficulty names for the API request

        onChangeComplete?.(qDifficulties);
      } else {
        onChange(newValues);
        onChangeComplete?.(newValues);
      }
      
      setIsDragging(false);
      setActiveKnob(null);
      setDragStartX(null);
      setDragStartValue(null);
    }
  }, [isDragging, safeValues, onChange, onChangeComplete, mode, difficulties]);

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Handle click/tap on the slider track
  const handleTrackClick = useCallback((e) => {
    if (!trackRef.current || isDragging) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickPosition = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const percentage = clickPosition / rect.width;
    const clickedValue = Math.round(Math.min(Math.max(min, min + (max - min) * percentage), max));

    // Find which knob is closer to the clicked position
    const distanceToFirst = Math.abs(safeValues[0] - clickedValue);
    const distanceToSecond = Math.abs(safeValues[1] - clickedValue);
    const closerKnobIndex = distanceToFirst <= distanceToSecond ? 0 : 1;

    const newValues = [...safeValues];
    newValues[closerKnobIndex] = clickedValue;
    
    if (mode === "q") {
      // For Q mode, return all Q difficulties within the range
      const qDifficulties = difficulties
        .filter(d => d.name.startsWith('Q'))
        .filter(d => d.sortOrder >= Math.min(...newValues) && d.sortOrder <= Math.max(...newValues))
        .map(d => d.name);
      
      // First call onChange with the sortOrder values to update the slider position
      onChange(newValues);
      
      // Then call onChangeComplete with the difficulty names for the API request
      onChangeComplete?.(qDifficulties);
    } else {
      onChange(newValues);
      onChangeComplete?.(newValues);
    }
  }, [isDragging, safeValues, onChange, onChangeComplete, min, max, mode, difficulties]);

  // Handle drag/touch start
  const handleDragStart = useCallback((index, e) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveKnob(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartValue(safeValues[index]);
  }, [safeValues]);

  // Prevent default drag behavior
  const preventDrag = (e) => {
    e.preventDefault();
    return false;
  };

  const getGlowColor = (diff) => {
    if (!diff) return "#FFFFFF";
    if (diff.name[0] === "U") {
      const number = parseInt(diff.name.slice(1));
      
      if (number > 14) {
        return "#FFFFFF";
      }
    }
    if (diff.name.startsWith('Q') && !/^Q2$/.test(diff.name)) {
      return "#FFFFFF";
    }
    return diff.color;
  }

  if (difficulties.length === 0) {
    return null;
  }

  return (
    <div className="difficulty-slider-container">
      <div className="difficulty-display">
        <div className="difficulty-value" style={{ left: `${((safeValues[0] - min) / (max - min)) * 100}%` }}>
          <span 
            className="difficulty-name" 
            style={{ 
                color: minDiff?.color,
                textShadow: `0 0 10px ${getGlowColor(minDiff)}`
             }}
            data-difficulty={minDiff?.name}
          >
            {minDiff?.name}
          </span>
        </div>
        <div className="difficulty-value" style={{ left: `${((safeValues[1] - min) / (max - min)) * 100}%` }}>
          <span 
            className="difficulty-name" 
            style={{ 
                color: maxDiff?.color,
                textShadow: `0 0 2px #000, 0 1px 2px #000, 0 0 12px ${getGlowColor(maxDiff)}, 0 0 12px ${getGlowColor(maxDiff)}`
             }}
            data-difficulty={maxDiff?.name}
          >
            {maxDiff?.name}
          </span>
        </div>
      </div>

      <div 
        ref={trackRef}
        className="slider-track" 
        style={{ background: getSliderBackground() }}
      >
        <div 
          className="range-highlight"
          style={{
            left: `${rangeLeft}%`,
            width: `${rangeWidth}%`,
            background: getSliderBackground(true)
          }}
        />
        <div 
          className="slider-track-clickable" 
          onClick={handleTrackClick}
          onTouchStart={handleTrackClick}
        />
        <div className="slider-knobs">
          <div 
            className="knob-container" 
            style={{ left: `${((safeValues[0] - min) / (max - min)) * 100}%` }}
            onMouseDown={(e) => handleDragStart(0, e)}
            onTouchStart={(e) => handleDragStart(0, e)}
          >
            {minDiff?.icon && (
              <img 
                src={minDiff.icon} 
                alt={minDiff.name} 
                className="difficulty-icon knob"
                onDragStart={preventDrag}
                draggable="false"
              />
            )}
          </div>
          <div 
            className="knob-container" 
            style={{ left: `${((safeValues[1] - min) / (max - min)) * 100}%` }}
            onMouseDown={(e) => handleDragStart(1, e)}
            onTouchStart={(e) => handleDragStart(1, e)}
          >
            {maxDiff?.icon && (
              <img 
                src={maxDiff.icon} 
                alt={maxDiff.name} 
                className="difficulty-icon knob"
                onDragStart={preventDrag}
                draggable="false"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DifficultySlider; 