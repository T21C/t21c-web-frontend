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
  const { noLegacyDifficulties: difficulties } = useDifficultyContext();
  const [isDragging, setIsDragging] = useState(false);
  const [activeKnob, setActiveKnob] = useState(null);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragStartValue, setDragStartValue] = useState(null);
  
  // Filter difficulties by mode and always sort by sortOrder
  let filteredDifficulties = difficulties;
  if (mode === "pgu") {
    filteredDifficulties = difficulties.filter(d => d.type === 'PGU');
  } else if (mode === "q") {
    filteredDifficulties = difficulties.filter(d => d.name.includes('Q'));
  }
  filteredDifficulties = filteredDifficulties.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  // Build a sorted array of available sortOrders for the filtered set
  const availableSortOrders = filteredDifficulties.map(d => d.sortOrder);

  // Map from index to sortOrder and vice versa for the filtered set
  const indexToSortOrder = (index) => availableSortOrders[index];
  const sortOrderToIndex = (sortOrder) => availableSortOrders.indexOf(sortOrder);

  // Use index-based values for slider logic
  const convertToIndices = React.useCallback((vals) => {
    if (!vals || vals.length === 0) return [0, 0];
    const isDifficultyNames = typeof vals[0] === 'string';
    if (isDifficultyNames) {
      return vals.map(name => {
        const diff = filteredDifficulties.find(d => d.name === name);
        return diff ? sortOrderToIndex(diff.sortOrder) : 0;
      });
    } else {
      return vals.map(sortOrder => sortOrderToIndex(sortOrder));
    }
  }, [filteredDifficulties, availableSortOrders]);

  // Ensure values is always an array with at least two elements (indices)
  const clampIndex = (idx) => Math.max(0, Math.min(filteredDifficulties.length - 1, idx));
  const safeIndices = React.useMemo(() => {
    const idxValues = convertToIndices(values);
    let indices;
    if (idxValues.length === 0) {
      indices = [0, 0];
    } else if (idxValues.length === 1) {
      indices = [idxValues[0], idxValues[0]];
    } else {
      indices = [idxValues[0], idxValues[1]];
    }
    // Clamp both indices
    return indices.map(clampIndex);
  }, [values, convertToIndices, filteredDifficulties.length]);

  // Find the current difficulties based on the indices (filtered set)
  const [minDiff, maxDiff] = safeIndices.map(idx => filteredDifficulties[idx]);
  
  // Calculate background gradient based on surrounding difficulties
  const getSliderBackground = (selectedRange = false) => {
    let sortedDiffs = filteredDifficulties;
    if (!selectedRange) {
      // Full gradient for the track
      const gradientStops = sortedDiffs.map((diff, i) => {
        const position = (i / (sortedDiffs.length - 1)) * 100;
        return `${diff.color} ${position}%`;
      });
      return `linear-gradient(to right, ${gradientStops.join(', ')})`;
    } else {
      // Partial gradient for the selected range
      const [rangeMin, rangeMax] = [Math.min(...safeIndices), Math.max(...safeIndices)];
      const rangeWidth = rangeMax - rangeMin;
      const rangeStops = sortedDiffs
        .map((diff, i) => {
          if (i < rangeMin || i > rangeMax) return null;
          const position = ((i - rangeMin) / (rangeWidth || 1)) * 100;
          return `${diff.color} ${position}%`;
        })
        .filter(Boolean);
      if (rangeStops.length === 0) return 'transparent';
      if (!rangeStops[0].startsWith(sortedDiffs[rangeMin].color)) {
        rangeStops.unshift(`${sortedDiffs[rangeMin].color} 0%`);
      }
      if (!rangeStops[rangeStops.length - 1].startsWith(sortedDiffs[rangeMax].color)) {
        rangeStops.push(`${sortedDiffs[rangeMax].color} 100%`);
      }
      return `linear-gradient(to right, ${rangeStops.join(', ')})`;
    }
  };

  // Calculate the range highlight position and width (in %)
  const rangeLeft = (Math.min(...safeIndices) / (availableSortOrders.length - 1)) * 100;
  const rangeWidth = ((Math.max(...safeIndices) - Math.min(...safeIndices)) / (availableSortOrders.length - 1)) * 100;

  // Handle pointer move during drag (works for both mouse and touch)
  const handlePointerMove = useCallback((e) => {
    if (!isDragging || activeKnob === null || !trackRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = trackRef.current.getBoundingClientRect();
    const pixelRange = rect.width;
    const valueRange = availableSortOrders.length - 1;
    const pixelMoved = clientX - dragStartX;
    const valueMoved = Math.round((pixelMoved / pixelRange) * valueRange);
    const newIndex = clampIndex(dragStartValue + valueMoved);
    const newIndices = [...safeIndices];
    newIndices[activeKnob] = newIndex;
    // Map indices back to sortOrders for onChange
    onChange(newIndices.map(idx => indexToSortOrder(idx)));
  }, [isDragging, activeKnob, dragStartX, dragStartValue, availableSortOrders.length, safeIndices, onChange, indexToSortOrder, clampIndex]);

  // Handle pointer up (works for both mouse and touch)
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      const newIndices = [
        Math.min(safeIndices[0], safeIndices[1]),
        Math.max(safeIndices[0], safeIndices[1])
      ];
      if (mode === "q") {
        // For Q mode, return all difficulties within the range (includes GQ)
        const selectedDifficulties = filteredDifficulties
          .filter((_, i) => i >= newIndices[0] && i <= newIndices[1])
          .map(d => d.name);
        onChange(newIndices.map(idx => indexToSortOrder(idx)));
        onChangeComplete?.(selectedDifficulties);
      } else {
        onChange(newIndices.map(idx => indexToSortOrder(idx)));
        onChangeComplete?.(newIndices.map(idx => indexToSortOrder(idx)));
      }
      setIsDragging(false);
      setActiveKnob(null);
      setDragStartX(null);
      setDragStartValue(null);
    }
  }, [isDragging, safeIndices, onChange, onChangeComplete, mode, filteredDifficulties, indexToSortOrder]);

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
    const clickedIndex = clampIndex(Math.round(Math.min(Math.max(0, (availableSortOrders.length - 1) * percentage), availableSortOrders.length - 1)));
    // Find which knob is closer to the clicked position
    const distanceToFirst = Math.abs(safeIndices[0] - clickedIndex);
    const distanceToSecond = Math.abs(safeIndices[1] - clickedIndex);
    const closerKnobIndex = distanceToFirst <= distanceToSecond ? 0 : 1;
    const newIndices = [...safeIndices];
    newIndices[closerKnobIndex] = clickedIndex;
    if (mode === "q") {
      const selectedDifficulties = filteredDifficulties
        .filter((_, i) => i >= Math.min(...newIndices) && i <= Math.max(...newIndices))
        .map(d => d.name);
      onChange(newIndices.map(idx => indexToSortOrder(idx)));
      onChangeComplete?.(selectedDifficulties);
    } else {
      onChange(newIndices.map(idx => indexToSortOrder(idx)));
      onChangeComplete?.(newIndices.map(idx => indexToSortOrder(idx)));
    }
  }, [isDragging, safeIndices, onChange, onChangeComplete, availableSortOrders.length, mode, filteredDifficulties, indexToSortOrder, clampIndex]);

  // Handle drag/touch start
  const handleDragStart = useCallback((index, e) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveKnob(index);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartValue(safeIndices[index]);
  }, [safeIndices]);

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

  if (filteredDifficulties.length === 0) {
    return null;
  }

  return (
    <div className="difficulty-slider-container">
      <div className="difficulty-display">
        <div className="difficulty-value" style={{ left: `${((safeIndices[0] / (availableSortOrders.length - 1)) * 100)}%` }}>
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
        <div className="difficulty-value" style={{ left: `${((safeIndices[1] / (availableSortOrders.length - 1)) * 100)}%` }}>
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
            style={{ left: `${((safeIndices[0] / (availableSortOrders.length - 1)) * 100)}%` }}
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
            style={{ left: `${((safeIndices[1] / (availableSortOrders.length - 1)) * 100)}%` }}
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