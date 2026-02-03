import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/layout";
import { createUserMenuItems } from "../navigationConfig";
import { ChevronIcon } from "@/components/common/icons";
import "./userMenu.css";

/**
 * User menu dropdown component
 * @param {Object} props
 * @param {Function} props.getTranslation - Function to get translation (tNav)
 * @param {Function} props.isActive - Function to check if menu should be marked as active
 */
const UserMenu = ({ getTranslation, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const dropdownRef = useRef(null);

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

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (!user) {
    return null;
  }

  const hasActiveItem = isActive ? isActive(location.pathname) : false;
  const activeClass = hasActiveItem ? "has-active" : "";
  const openClass = isOpen ? "open" : "";

  const menuItems = createUserMenuItems(user) || [];

  return (
    <li
      className={`nav-user-menu ${openClass} ${activeClass}`}
      ref={dropdownRef}
    >
      <button
        className={`nav-user-button ${hasActiveItem ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
      <UserAvatar
        primaryUrl={user?.avatarUrl}
        fallbackUrl={user?.pfp}
        className="nav-user-avatar"
      />
        <div className="nav-user-info">
          <div className="nav-user-name">{user?.nickname}</div>
          <div className="nav-user-username">@{user?.username}</div>
        </div>
        <ChevronIcon
          direction={isOpen ? "up" : "down"}
          className="nav-dropdown-arrow"
          color="#fffb"
          size={16}
        />
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu nav-user-dropdown">
          {menuItems.map((item, index) => {
            if (item.divider) {
              return (
                <div key={`divider-${index}`} className="nav-dropdown-divider" />
              );
            }

            if (item.disabled) {
              return (
                <div
                  key={item.translationKey || index}
                  className="nav-dropdown-item nav-dropdown-item--disabled"
                >
                  {getTranslation(item.translationKey)}
                  {item.badge && (
                    <span className="nav-dropdown-badge">
                      {getTranslation(item.badge)}
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
                {getTranslation(item.translationKey)}
              </NavLink>
            );
          })}
          <button
            className="nav-dropdown-item nav-dropdown-item--button"
            onClick={handleLogout}
          >
            {getTranslation("dropdowns.user.logout")}
          </button>
        </div>
      )}
    </li>
  );
};

export default UserMenu;
