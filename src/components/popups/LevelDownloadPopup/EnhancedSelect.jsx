import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './EnhancedSelect.css';

const EnhancedSelect = ({ 
    options, 
    value, 
    onChange, 
    searchField,
    position = "bottom",
    placeholder,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartIndex, setDragStartIndex] = useState(null);
    const [dragEndIndex, setDragEndIndex] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(position);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(option => 
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMouseDown = (index) => {
        setIsDragging(true);
        setDragStartIndex(index);
        setDragEndIndex(index);
    };

    const handleMouseEnter = (index) => {
        if (isDragging) {
            setDragEndIndex(index);
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            const start = Math.min(dragStartIndex, dragEndIndex);
            const end = Math.max(dragStartIndex, dragEndIndex);
            const selectedRange = filteredOptions.slice(start, end + 1);
            
            // Get the state of the first item in the range
            const firstItem = filteredOptions[start];
            const shouldSelect = !value.includes(firstItem);
            
            // Create a new Set of current values for faster lookups
            const currentValues = new Set(value);
            
            // Set all items in range to the same state as the first item
            const newValue = [...value];
            selectedRange.forEach(option => {
                const index = newValue.indexOf(option);
                if (shouldSelect) {
                    // Add if not already selected
                    if (index === -1) {
                        newValue.push(option);
                    }
                } else {
                    // Remove if selected
                    if (index !== -1) {
                        newValue.splice(index, 1);
                    }
                }
            });
            
            onChange(newValue);
            setIsDragging(false);
            setDragStartIndex(null);
            setDragEndIndex(null);
        }
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragStartIndex(null);
                setDragEndIndex(null);
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging]);

    const updatePosition = () => {
        const containerRect = containerRef.current.getBoundingClientRect();
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check available space
        const spaceBelow = viewportHeight - containerRect.bottom;
        const spaceAbove = containerRect.top;
        
        // Try preferred position first, fall back to alternative if it would go off-screen
        if (position === "top") {
            if (spaceAbove >= dropdownRect.height) {
                // Enough space above, position there
                dropdownRef.current.style.top = `${containerRect.top - dropdownRect.height}px`;
                setCurrentPosition("top");
            } else if (spaceBelow >= dropdownRect.height) {
                // Not enough space above but enough below, position below
                dropdownRef.current.style.top = `${containerRect.bottom}px`;
                setCurrentPosition("bottom");
            } else {
                // Not enough space in either direction, position where there's more space
                if (spaceAbove > spaceBelow) {
                    dropdownRef.current.style.top = `${containerRect.top - dropdownRect.height}px`;
                    setCurrentPosition("top");
                } else {
                    dropdownRef.current.style.top = `${containerRect.bottom}px`;
                    setCurrentPosition("bottom");
                }
            }
        } else { // position === "bottom"
            if (spaceBelow >= dropdownRect.height) {
                // Enough space below, position there
                dropdownRef.current.style.top = `${containerRect.bottom}px`;
                setCurrentPosition("bottom");
            } else if (spaceAbove >= dropdownRect.height) {
                // Not enough space below but enough above, position above
                dropdownRef.current.style.top = `${containerRect.top - dropdownRect.height}px`;
                setCurrentPosition("top");
            } else {
                // Not enough space in either direction, position where there's more space
                if (spaceBelow > spaceAbove) {
                    dropdownRef.current.style.top = `${containerRect.bottom}px`;
                    setCurrentPosition("bottom");
                } else {
                    dropdownRef.current.style.top = `${containerRect.top - dropdownRect.height}px`;
                    setCurrentPosition("top");
                }
            }
        }
        
        dropdownRef.current.style.left = `${containerRect.left}px`;
        dropdownRef.current.style.width = `${containerRect.width}px`;
    };

    // Position dropdown
    useEffect(() => {
        if (isOpen && containerRef.current && dropdownRef.current) {
            // Initial position
            updatePosition();

            // Update position after a short delay to allow for content changes
            const timeoutId = setTimeout(updatePosition, 0);

            // Update position on window resize
            const handleResize = () => {
                updatePosition();
            };
            window.addEventListener('resize', handleResize);

            // Handle clicks outside
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                    containerRef.current && !containerRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);

            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('resize', handleResize);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, searchTerm, filteredOptions]);

    const isOptionSelected = (option) => value.includes(option);

    const isInDragRange = (index) => {
        if (!isDragging || dragStartIndex === null || dragEndIndex === null) return false;
        const start = Math.min(dragStartIndex, dragEndIndex);
        const end = Math.max(dragStartIndex, dragEndIndex);
        return index >= start && index <= end;
    };

    const handleDropdownClick = (e) => {
        e.stopPropagation();
    };

    const handleResetClick = (e) => {
        e.stopPropagation();
        if (value.length === 0) {
            // Select all if none are selected
            onChange([...options]);
        } else {
            // Deselect all if any are selected
            onChange([]);
        }
    };

    return (
        <div className="enhanced-select" ref={containerRef}>
            <div 
                className="enhanced-select-header"
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="enhanced-select-value">
                    {value.length > 0 ? (
                        <span>{value.length} selected</span>
                    ) : (
                        <span className="placeholder">{placeholder}</span>
                    )}
                </div>
                <div className="enhanced-select-controls">
                    <button 
                        className="enhanced-select-reset"
                        onClick={handleResetClick}
                        title={value.length === 0 ? "Select All" : "Deselect All"}
                    >
                        {value.length === 0 ? "✓" : "×"}
                    </button>
                    <div className="enhanced-select-arrow">
                        {isOpen ? '▲' : '▼'}
                    </div>
                </div>
            </div>
            
            {isOpen && createPortal(
                <div 
                    className="enhanced-select-dropdown" 
                    ref={dropdownRef}
                    onMouseDown={handleDropdownClick}
                >
                    <div className="enhanced-select-content">
                        {currentPosition === "bottom" && (
                            <input
                                type="text"
                                className="enhanced-select-search"
                                placeholder={`Search ${searchField}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                        <div 
                            className="enhanced-select-options"
                            onMouseUp={handleMouseUp}
                        >
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={option}
                                    className={`enhanced-select-option ${
                                        isOptionSelected(option) ? 'selected' : ''
                                    } ${isInDragRange(index) ? 'in-range' : ''}`}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        handleMouseDown(index);
                                    }}
                                    onMouseEnter={() => handleMouseEnter(index)}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                        {currentPosition === "top" && (
                            <input
                                type="text"
                                className="enhanced-select-search"
                                placeholder={`Search ${searchField}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default EnhancedSelect; 