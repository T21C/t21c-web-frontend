import React, { useRef, useState, useCallback, useEffect } from 'react';
import './rangeselector.css';

const RangeSelector = ({ 
  values = [0, 100],  // [min, max]
  onChange,
  onChangeComplete,
  min = 0,
  max = 100,
  step = 1,
  minLabel = "Min",
  maxLabel = "Max"
}) => {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeKnob, setActiveKnob] = useState(null);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragStartValue, setDragStartValue] = useState(null);
  const [localValues, setLocalValues] = useState(values);

  // Update local values when prop values change (only if not dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalValues(prevValues => {
        // Only update if values actually changed (deep comparison)
        if (values[0] !== prevValues[0] || values[1] !== prevValues[1]) {
          return values;
        }
        return prevValues;
      });
    }
  }, [values[0], values[1], isDragging]);

  const clampValue = useCallback((value) => {
    return Math.max(min, Math.min(max, Math.round(value / step) * step));
  }, [min, max, step]);

  const valueToPercent = useCallback((value) => {
    return ((value - min) / (max - min)) * 100;
  }, [min, max]);

  const percentToValue = useCallback((percent) => {
    return min + (percent / 100) * (max - min);
  }, [min, max]);

  // Handle pointer move during drag
  const handlePointerMove = useCallback((e) => {
    if (!isDragging || activeKnob === null || !trackRef.current) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = trackRef.current.getBoundingClientRect();
    const pixelRange = rect.width;
    const valueRange = max - min;
    const pixelMoved = clientX - dragStartX;
    const valueMoved = Math.round((pixelMoved / pixelRange) * valueRange / step) * step;
    const newValue = clampValue(dragStartValue + valueMoved);
    
    const newValues = [...localValues];
    newValues[activeKnob] = newValue;
    
    // Ensure min doesn't exceed max and vice versa
    if (activeKnob === 0 && newValue > localValues[1]) {
      newValues[0] = localValues[1];
    } else if (activeKnob === 1 && newValue < localValues[0]) {
      newValues[1] = localValues[0];
    }
    
    setLocalValues(newValues);
    onChange?.(newValues);
  }, [isDragging, activeKnob, dragStartX, dragStartValue, localValues, min, max, step, onChange, clampValue]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      const newValues = [
        Math.min(localValues[0], localValues[1]),
        Math.max(localValues[0], localValues[1])
      ];
      setLocalValues(newValues);
      onChange?.(newValues);
      onChangeComplete?.(newValues);
      setIsDragging(false);
      setActiveKnob(null);
      setDragStartX(null);
      setDragStartValue(null);
    }
  }, [isDragging, localValues, onChange, onChangeComplete]);

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

  // Handle click on the slider track
  const handleTrackClick = useCallback((e) => {
    if (!trackRef.current || isDragging) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickPosition = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const percentage = (clickPosition / rect.width) * 100;
    const clickedValue = clampValue(percentToValue(percentage));
    
    // Find which knob is closer to the clicked position
    const distanceToFirst = Math.abs(localValues[0] - clickedValue);
    const distanceToSecond = Math.abs(localValues[1] - clickedValue);
    const closerKnobIndex = distanceToFirst <= distanceToSecond ? 0 : 1;
    
    const newValues = [...localValues];
    newValues[closerKnobIndex] = clickedValue;
    
    const sortedValues = [
      Math.min(newValues[0], newValues[1]),
      Math.max(newValues[0], newValues[1])
    ];
    
    setLocalValues(sortedValues);
    onChange?.(sortedValues);
    onChangeComplete?.(sortedValues);
  }, [isDragging, localValues, onChange, onChangeComplete, clampValue, percentToValue]);

  // Handle drag start
  const handleDragStart = useCallback((index, e) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveKnob(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartValue(localValues[index]);
  }, [localValues]);

  // Handle input change
  const handleInputChange = useCallback((index, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const clampedValue = clampValue(numValue);
    const newValues = [...localValues];
    newValues[index] = clampedValue;
    
    // Ensure min doesn't exceed max and vice versa
    if (index === 0 && clampedValue > localValues[1]) {
      newValues[0] = localValues[1];
    } else if (index === 1 && clampedValue < localValues[0]) {
      newValues[1] = localValues[0];
    }
    
    setLocalValues(newValues);
    onChange?.(newValues);
    onChangeComplete?.(newValues);
  }, [localValues, onChange, onChangeComplete, clampValue]);

  // Prevent default drag behavior
  const preventDrag = (e) => {
    e.preventDefault();
    return false;
  };

  const rangeLeft = valueToPercent(Math.min(...localValues));
  const rangeWidth = valueToPercent(Math.max(...localValues)) - rangeLeft;

  return (
    <div className={`range-selector-container ${isDragging ? 'dragging' : ''}`}>
      <div className="input-row">
        <div className="manual-input-container">
          <input
            type="number"
            className="range-input"
            value={localValues[0]}
            onChange={(e) => handleInputChange(0, e.target.value)}
            onBlur={(e) => handleInputChange(0, e.target.value)}
            min={min}
            max={max}
            step={step}
          />
          <label className="label">{minLabel}</label>
        </div>

        <div className="slider-wrapper">
          <div 
            ref={trackRef}
            className="slider-track"
          >
            <div 
              className="range-highlight"
              style={{
                left: `${rangeLeft}%`,
                width: `${rangeWidth}%`
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
                style={{ left: `${valueToPercent(localValues[0])}%` }}
                onMouseDown={(e) => handleDragStart(0, e)}
                onTouchStart={(e) => handleDragStart(0, e)}
              >
                <div className="knob" />
                {isDragging && activeKnob === 0 && (
                  <div className="value-display">{localValues[0]}</div>
                )}
              </div>
              <div 
                className="knob-container" 
                style={{ left: `${valueToPercent(localValues[1])}%` }}
                onMouseDown={(e) => handleDragStart(1, e)}
                onTouchStart={(e) => handleDragStart(1, e)}
              >
                <div className="knob" />
                {isDragging && activeKnob === 1 && (
                  <div className="value-display">{localValues[1]}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="manual-input-container">
          <input
            type="number"
            className="range-input"
            value={localValues[1]}
            onChange={(e) => handleInputChange(1, e.target.value)}
            onBlur={(e) => handleInputChange(1, e.target.value)}
            min={min}
            max={max}
            step={step}
          />
          <label className="label">{maxLabel}</label>
        </div>
      </div>
    </div>
  );
};

export default RangeSelector;

