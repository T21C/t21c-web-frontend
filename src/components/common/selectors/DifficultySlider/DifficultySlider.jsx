import React, { useRef, useState, useCallback, useEffect } from 'react';
import './difficultyslider.css';

const DifficultySlider = ({ 
  values,  // [min, max]
  onChange,
  onChangeComplete,  // New callback for when changes are complete
  difficulties
}) => {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeKnob, setActiveKnob] = useState(null);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragStartValue, setDragStartValue] = useState(null);
  const min = difficulties.find(d => d.name === "P1")?.sortOrder;
  const max = difficulties.find(d => d.name === "U20")?.sortOrder;
  // Find the current difficulties based on the values
  const [minDiff, maxDiff] = values.map(value => 
    difficulties.find(d => d.sortOrder === value)
  );
  
  // Calculate background gradient based on surrounding difficulties
  const getSliderBackground = (selectedRange = false) => {
    const sortedDiffs = difficulties
      .filter(d => d.type === 'PGU')
      .sort((a, b) => a.sortOrder - b.sortOrder);
    
    if (!selectedRange) {
      // Full gradient for the track
      const gradientStops = sortedDiffs.map(diff => {
        const position = ((diff.sortOrder - min) / (max - min)) * 100;
        return `${diff.color} ${position}%`;
      });
      return `linear-gradient(to right, ${gradientStops.join(', ')})`;
    } else {
      // Partial gradient for the selected range
      const [rangeMin, rangeMax] = [Math.min(...values), Math.max(...values)];
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
  const rangeLeft = ((Math.min(...values) - min) / (max - min)) * 100;
  const rangeWidth = ((Math.max(...values) - Math.min(...values)) / (max - min)) * 100;

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

    const newValues = [...values];
    newValues[activeKnob] = newValue;
    onChange(newValues);
  }, [isDragging, activeKnob, dragStartX, dragStartValue, min, max, values, onChange]);

  // Handle pointer up (works for both mouse and touch)
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      const newValues = [
        Math.min(values[0], values[1]),
        Math.max(values[0], values[1])
      ];
      onChange(newValues);
      onChangeComplete?.(newValues);
      setIsDragging(false);
      setActiveKnob(null);
      setDragStartX(null);
      setDragStartValue(null);
    }
  }, [isDragging, values, onChange, onChangeComplete]);

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
    const distanceToFirst = Math.abs(values[0] - clickedValue);
    const distanceToSecond = Math.abs(values[1] - clickedValue);
    const closerKnobIndex = distanceToFirst <= distanceToSecond ? 0 : 1;

    const newValues = [...values];
    newValues[closerKnobIndex] = clickedValue;
    onChange(newValues);
    onChangeComplete?.(newValues);
  }, [isDragging, values, onChange, onChangeComplete, min, max]);

  // Handle drag/touch start
  const handleDragStart = useCallback((index, e) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveKnob(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartValue(values[index]);
  }, [values]);

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
    return diff.color;
  }

  if (difficulties.length === 0) {
    return null;
  }

  return (
    <div className="difficulty-slider-container">
      <div className="difficulty-display">
        <div className="difficulty-value" style={{ left: `${((values[0] - min) / (max - min)) * 100}%` }}>
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
        <div className="difficulty-value" style={{ left: `${((values[1] - min) / (max - min)) * 100}%` }}>
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
            style={{ left: `${((values[0] - min) / (max - min)) * 100}%` }}
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
            style={{ left: `${((values[1] - min) / (max - min)) * 100}%` }}
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