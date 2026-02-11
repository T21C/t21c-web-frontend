import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/layout";
import { createUserMenuItems } from "../navigationConfig";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import MobileDropdown from "../MobileDropdown/MobileDropdown";
import "./mobileMenu.css";
import { useTranslation } from 'react-i18next';

/**
 * Mobile navigation menu component
 * Uses the same config structure as desktop navigation
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the menu is open
 * @param {Function} props.onClose - Function to close the menu
 * @param {Object} props.config - Navigation configuration object
 * @param {Function} props.initiateLogin - Function to initiate login (for sign in button)
 * @param {ReactNode} props.children - Additional children to render
 */
const MobileMenu = ({
  isOpen,
  onClose,
  config,
  initiateLogin,
  children,
}) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation('components');
  // Render navigation item based on type (same logic as desktop)
  const renderNavItem = (item, index) => {
    // Check condition if present
    if (item.condition && !item.condition()) {
      // Use fallback if available
      if (item.fallback) {
        return renderNavItem(item.fallback, index);
      }
      return null;
    }

    switch (item.type) {
      case "link":
        return (
          <li key={item.to || index} className="nav-list-item">
            <NavLink to={item.to} onClick={onClose}>
              {t(item.translationKey)}
            </NavLink>
          </li>
        );

      case "dropdown":
        return (
          <MobileDropdown
            key={item.label || index}
            label={t(item.label)}
            items={item.items}
            isActive={item.isActive}
            onItemClick={onClose}
          />
        );

      case "button":
        const onClickHandler = item.onClick
          ? item.onClick(initiateLogin)
          : undefined;
        return (
          <li key={item.translationKey || index} className="nav-list-item">
            <button
              className={item.className || "nav-signin-button"}
              onClick={() => {
                if (onClickHandler) {
                  onClickHandler();
                }
                onClose();
              }}
            >
              {t(item.translationKey)}
            </button>
          </li>
        );

      case "component":
        switch (item.component) {
          case "LanguageSelector":
            return (
              <LanguageSelector
                key="language-selector"
                variant="mobile"
              />
            );

          case "UserMenu":
            // Render UserMenu as a MobileDropdown in mobile view
            const userMenuItems = createUserMenuItems(user);
            if (!userMenuItems) return null;

            const userButtonContent = (
              <div className="nav-mobile-user-button-content">
                <UserAvatar
                  primaryUrl={user?.avatarUrl}
                  fallbackUrl={user?.pfp}
                  className="nav-mobile-user-avatar"
                />
                <div className="nav-mobile-user-info">
                  <div className="nav-mobile-user-name">{user?.nickname}</div>
                  <div className="nav-mobile-user-username">@{user?.username}</div>
                </div>
              </div>
            );

            return (
              <MobileDropdown
                key="user-menu"
                label={`${user?.nickname} (@${user?.username})`}
                buttonContent={userButtonContent}
                items={[
                  ...userMenuItems,
                  {
                    translationKey: "dropdowns.user.logout",
                    onClick: () => {
                      logout();
                      onClose();
                    },
                  },
                ]}
                isActive={item.props?.isActive}
                onItemClick={onClose}
              />
            );

          default:
            return null;
        }

      default:
        return null;
    }
  };

  // Combine leftNav and rightNav for mobile menu
  const mobileNavItems = [
    ...(config?.leftNav || []),
    ...(config?.rightNav || []),
  ];

  return (
    <>
      <div
        className={`nav-mobile-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
      />

      <div className={`nav-mobile ${isOpen ? "open" : ""}`}>
        <svg
          className="nav-mobile__close svg-stroke"
          onClick={onClose}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>

        <ul className="nav-mobile__list">
          {children}
          {mobileNavItems.map((item, index) => renderNavItem(item, index))}
        </ul>
      </div>
    </>
  );
};

export default MobileMenu;
