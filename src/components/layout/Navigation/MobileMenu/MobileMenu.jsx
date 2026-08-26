// tuf-search: #MobileMenu #mobileMenu #layout #navigation
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import { createUserMenuItems } from "../navigationConfig";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import MobileDropdown from "../MobileDropdown/MobileDropdown";
import "./mobileMenu.css";
import { useTranslation } from "react-i18next";

/**
 * Mobile navigation menu component
 * Uses the same config structure as desktop navigation
 */
const MobileMenu = ({
  isOpen,
  onClose,
  config,
  initiateLogin,
  children,
}) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation("components");
  const [openSectionId, setOpenSectionId] = useState(null);

  useEffect(() => {
    if (!isOpen) setOpenSectionId(null);
  }, [isOpen]);

  const setSectionOpen = (id, next) => {
    setOpenSectionId(next ? id : null);
  };

  const renderNavItem = (item, index) => {
    if (item.condition && !item.condition()) {
      if (item.fallback) {
        return renderNavItem(item.fallback, index);
      }
      return null;
    }

    const sectionId = item.id || item.label || String(index);

    switch (item.type) {
      case "link":
        return (
          <li key={item.to || index} className={`nav-list-item ${item.className || ""}`.trim()}>
            <NavLink to={item.to} onClick={onClose}>
              {t(item.translationKey)}
            </NavLink>
          </li>
        );

      case "dropdown":
        return (
          <MobileDropdown
            key={sectionId}
            label={t(item.label)}
            items={item.items}
            isActive={item.isActive}
            onItemClick={onClose}
            open={openSectionId === sectionId}
            onOpenChange={(next) => setSectionOpen(sectionId, next)}
          />
        );

      case "button": {
        const onClickHandler = item.onClick
          ? item.onClick(initiateLogin)
          : undefined;
        return (
          <li key={item.translationKey || index} className="nav-list-item">
            <button
              className={item.className || "nav-signin-button"}
              onClick={() => {
                onClickHandler?.();
                onClose();
              }}
            >
              {t(item.translationKey)}
            </button>
          </li>
        );
      }

      case "component":
        switch (item.component) {
          case "LanguageSelector":
            return (
              <LanguageSelector
                key="language-selector"
                variant="mobile"
                open={openSectionId === "language"}
                onOpenChange={(next) => setSectionOpen("language", next)}
                onItemClick={onClose}
              />
            );

          case "UserMenu": {
            const userMenuItems = createUserMenuItems(user);
            if (!userMenuItems) return null;

            const userButtonContent = (
              <div className="nav-mobile-user-button-content">
                <UserAvatar
                  {...userAvatarUrls(user)}
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
                    translationKey: "navigation.main.dropdowns.user.logout",
                    onClick: () => {
                      logout();
                      onClose();
                    },
                  },
                ]}
                isActive={item.props?.isActive}
                onItemClick={onClose}
                open={openSectionId === "user"}
                onOpenChange={(next) => setSectionOpen("user", next)}
              />
            );
          }

          default:
            return null;
        }

      default:
        return null;
    }
  };

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
