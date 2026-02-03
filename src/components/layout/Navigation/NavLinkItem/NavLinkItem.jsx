import React from "react";
import { NavLink } from "react-router-dom";

/**
 * Simple navigation link item
 * @param {Object} props
 * @param {string} props.to - Route path
 * @param {string} props.label - Link text or translation key
 * @param {Function} props.getTranslation - Function to get translation (optional)
 * @param {string} props.className - Additional CSS classes for the list item
 * @param {string} props.linkClassName - Additional CSS classes for the NavLink
 */
const NavLinkItem = ({ 
  to, 
  label, 
  getTranslation, 
  className = "",
  linkClassName = "" 
}) => {
  const displayLabel = getTranslation ? getTranslation(label) : label;
  const combinedLinkClass = linkClassName 
    ? `nav-link ${linkClassName}` 
    : "nav-link";

  return (
    <NavLink
      className={({ isActive }) => `${combinedLinkClass} ${isActive ? "active" : ""}`}
      to={to}
    >
      <li className={`nav-list-item ${className}`}>{displayLabel}</li>
    </NavLink>
  );
};

export default NavLinkItem;
