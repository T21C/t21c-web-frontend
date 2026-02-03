import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronIcon } from "@/components/common/icons";
import "./mobileDropdown.css";

/**
 * Mobile dropdown component that displays items above the trigger
 * Handles viewport overflow by positioning above and adjusting if needed
 * @param {Object} props
 * @param {string} props.label - The label text for the dropdown button
 * @param {Array} props.items - Array of dropdown items
 * @param {Function} props.getTranslation - Function to get translation
 * @param {Function} props.isActive - Function to check if dropdown should be marked as active
 * @param {Function} props.onItemClick - Callback when item is clicked (to close mobile menu)
 * @param {ReactNode} props.buttonContent - Custom content for the button (overrides label)
 */
const MobileDropdown = ({
  label,
  items = [],
  getTranslation,
  isActive,
  onItemClick,
  buttonContent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const location = useLocation();

  // Close dropdown when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Handle viewport positioning
  useEffect(() => {
    if (isOpen && menuRef.current && dropdownRef.current) {
      const menu = menuRef.current;
      const trigger = dropdownRef.current;
      
      // Reset positioning
      menu.style.top = "";
      menu.style.bottom = "";
      menu.style.maxHeight = "";

      // Get viewport and element positions
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate space above and below
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const menuHeight = menuRect.height;

      // Position above by default
      menu.style.bottom = `${trigger.offsetHeight}px`;
      
      // If menu would overflow above, position below instead
      if (spaceAbove < menuHeight && spaceBelow > spaceAbove) {
        menu.style.bottom = "";
        menu.style.top = `${trigger.offsetHeight}px`;
      }

      // Limit max height to available space
      const maxAvailableSpace = Math.max(spaceAbove, spaceBelow);
      if (menuHeight > maxAvailableSpace) {
        menu.style.maxHeight = `${maxAvailableSpace - 10}px`;
        menu.style.overflowY = "auto";
      }
    }
  }, [isOpen, items]);

  const hasActiveItem = isActive ? isActive(location.pathname) : false;
  const activeClass = hasActiveItem ? "has-active" : "";
  const openClass = isOpen ? "open" : "";

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleItemClick = () => {
    setIsOpen(false);
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <li
      className={`nav-mobile-dropdown ${openClass} ${activeClass}`}
      ref={dropdownRef}
    >
      <button
        className={`nav-mobile-dropdown-button ${hasActiveItem ? "active" : ""}`}
        onClick={handleToggle}
      >
        {buttonContent || <span>{label}</span>}
        <ChevronIcon
          direction={isOpen ? "up" : "down"}
          className="nav-mobile-dropdown-arrow"
          size={16}
        />
      </button>
      {isOpen && items.length > 0 && (
        <div className="nav-mobile-dropdown-menu" ref={menuRef}>
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="nav-mobile-dropdown-divider"
                />
              );
            }

            if (item.disabled) {
              return (
                <div
                  key={item.translationKey || item.label || index}
                  className="nav-mobile-dropdown-item nav-mobile-dropdown-item--disabled"
                >
                  {item.translationKey
                    ? getTranslation(item.translationKey)
                    : item.label}
                  {item.badge && (
                    <span className="nav-mobile-dropdown-badge">
                      {getTranslation ? getTranslation(item.badge) : item.badge}
                    </span>
                  )}
                </div>
              );
            }

            // Handle button type items (like logout) - check for onClick without 'to'
            if (!item.to && item.onClick) {
              return (
                <button
                  key={item.translationKey || index}
                  className="nav-mobile-dropdown-item nav-mobile-dropdown-item--button"
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    }
                    handleItemClick();
                  }}
                >
                  {item.translationKey
                    ? getTranslation(item.translationKey)
                    : item.label}
                </button>
              );
            }

            // Regular link item
            if (item.to) {
              return (
                <NavLink
                  key={item.to || item.translationKey || index}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-mobile-dropdown-item ${isActive ? "active" : ""}`
                  }
                  onClick={handleItemClick}
                >
                  {item.translationKey
                    ? getTranslation(item.translationKey)
                    : item.label}
                </NavLink>
              );
            }

            // Fallback for items without 'to' or 'onClick'
            return null;
          })}
        </div>
      )}
    </li>
  );
};

export default MobileDropdown;
