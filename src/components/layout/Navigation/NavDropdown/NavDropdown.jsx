import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronIcon } from "@/components/common/icons";
import "./navDropdown.css";
import { useTranslation } from 'react-i18next';

/**
 * Reusable dropdown component for navigation
 * @param {Object} props
 * @param {string} props.label - The label text for the dropdown button
 * @param {Array} props.items - Array of dropdown items { to, label, translationKey, disabled, badge }
 * @param {Function} props.isActive - Function to check if dropdown should be marked as active
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showAsLink - If true, shows as a link when no items provided
 * @param {string} props.linkTo - Route to navigate to when showAsLink is true
 */
const NavDropdown = ({
  label,
  items = [],
  isActive,
  className = "",
  showAsLink = false,
  linkTo = null,
}) => {
  const { t } = useTranslation('components');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const hasActiveItem = isActive ? isActive(location.pathname) : false;
  const activeClass = hasActiveItem ? "has-active" : "";
  const openClass = isOpen ? "open" : "";

  // If showAsLink is true and no items, render as a simple link
  if (showAsLink && (!items || items.length === 0) && linkTo) {
    return (
      <NavLink
        className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        to={linkTo}
      >
        <li className={`nav-list-item ${className}`}>{label}</li>
      </NavLink>
    );
  }

  return (
    <li
      className={`nav-list-item nav-dropdown ${openClass} ${activeClass} ${className}`}
      ref={dropdownRef}
    >
      <button
        className={`nav-dropdown-button ${hasActiveItem ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <ChevronIcon
          direction={isOpen ? "up" : "down"}
          className="nav-dropdown-arrow"
          size={16}
        />
      </button>
      {isOpen && items.length > 0 && (
        <div className="nav-dropdown-menu">
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`divider-${index}`} className="nav-dropdown-divider" />;
            }

            if (item.disabled) {
              return (
                <div
                  key={item.translationKey || item.label || index}
                  className="nav-dropdown-item nav-dropdown-item--disabled"
                >
                  {item.translationKey
                    ? t(item.translationKey)
                    : item.label}
                  {item.badge && (
                    <span className="nav-dropdown-badge">
                      {t(item.badge)}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to || item.translationKey || index}
                to={item.to}
                className={({ isActive }) =>
                  `nav-dropdown-item ${isActive ? "active" : ""}`
                }
                onClick={() => setIsOpen(false)}
              >
                {item.translationKey
                  ? t(item.translationKey)
                  : item.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </li>
  );
};

export default NavDropdown;
