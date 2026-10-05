// tuf-search: #UserMenu #userMenu #layout #navigation
import React, { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import { createUserMenuItems, getProfileCycleTos, getSectionCycleTos } from "../navigationConfig";
import { ChevronIcon } from "@/components/common/icons";
import InboxBell from "../InboxBell";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useSubmissionMinimalMotion } from "@/hooks/useMinimalMotionPreference";
import {
  NAV_DROPDOWN_CLICK_MODE_CYCLE,
  useNavDropdownClickModePreference,
} from "@/hooks/useNavDropdownClickModePreference";
import { useNavHoverMenu } from "../useNavHoverMenu";
import { useNavProfileCycle } from "../useNavProfileCycle";
import { NavDropdownPanel, NavMenuItems } from "../NavDropdown/NavDropdown";
import "./userMenu.css";
import { useTranslation } from "react-i18next";

const UserMenu = ({ isActive }) => {
  const { t } = useTranslation("components");
  const { user, logout } = useAuth();
  const location = useLocation();
  const isFinePointer = useFinePointer();
  const reducedMotion = useSubmissionMinimalMotion();
  const [clickMode] = useNavDropdownClickModePreference();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const menu = useNavHoverMenu({
    reducedMotion,
    enabled: isFinePointer,
    rootRef,
  });
  const menuItems = [
    ...(createUserMenuItems(user) || []),
    {
      translationKey: "navigation.main.dropdowns.user.logout",
      onClick: () => {
        logout();
      },
    },
  ];
  const menuCycleTos = getSectionCycleTos(menuItems);
  const profilePairTos = getProfileCycleTos(menuItems);
  const menuCycle = useNavProfileCycle(menuCycleTos, {
    pin: menu.pin,
    dismiss: menu.dismiss,
    clickMode,
  });
  const profilePairCycle = useNavProfileCycle(
    profilePairTos.length >= 2 ? profilePairTos : [],
    {
      pin: menu.pin,
      dismiss: menu.dismiss,
      clickMode,
    },
  );

  useEffect(() => {
    if (menuCycle.isTimerArmed() || profilePairCycle.isTimerArmed()) return;
    menu.closeNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on navigate only
  }, [location]);

  const handleTriggerClick = useCallback(
    (event) => {
      const canCycle =
        clickMode === NAV_DROPDOWN_CLICK_MODE_CYCLE && menuCycleTos.length > 0;
      if (!canCycle) {
        menu.handleTriggerClick(event);
        return;
      }
      menuCycle.advance(event);
    },
    [
      clickMode,
      menu.handleTriggerClick,
      menuCycle.advance,
      menuCycleTos.length,
    ],
  );

  const handleMouseEnter = useCallback(() => {
    menu.scheduleOpen();
    menuCycle.notePointerEnter();
    profilePairCycle.notePointerEnter();
  }, [menu.scheduleOpen, menuCycle.notePointerEnter, profilePairCycle.notePointerEnter]);

  const handleMouseLeave = useCallback(() => {
    const menuHeld = menuCycle.shortenOnLeave();
    const pairHeld = profilePairCycle.shortenOnLeave();
    if (menuHeld || pairHeld) return;
    menu.scheduleClose();
  }, [menu.scheduleClose, menuCycle.shortenOnLeave, profilePairCycle.shortenOnLeave]);

  if (!user) {
    return null;
  }

  const hasActiveItem = isActive ? isActive(location.pathname) : false;

  const focusFirstItem = () => {
    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector(
          ".nav-dropdown-item:not(.nav-dropdown-item--disabled)",
        )
        ?.focus();
    });
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      menu.open();
      focusFirstItem();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      menu.dismiss();
      triggerRef.current?.focus();
    }
  };

  return (
    <div className={`nav-user-menu ${menu.isOpen ? "open" : ""}`}>
      <div
        className="nav-user-menu__bell"
        onClick={() => menu.closeNow()}
      >
        <InboxBell />
      </div>
      <div
        className={`nav-dropdown ${menu.isPinned ? "pinned" : ""}`}
        ref={rootRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onBlur={menu.handleRootBlur}
      >
        <button
          ref={triggerRef}
          type="button"
          className={`nav-user-button ${hasActiveItem ? "active" : ""}`}
          aria-expanded={menu.isOpen}
          aria-haspopup="menu"
          aria-controls={menu.panelId}
          onClick={handleTriggerClick}
          onFocus={() => {
            if (isFinePointer) menu.open();
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <UserAvatar
            {...userAvatarUrls(user)}
            className="nav-user-avatar"
          />
          <div className="nav-user-info">
            <div className="nav-user-name">{user?.nickname}</div>
            <div className="nav-user-username">@{user?.username}</div>
          </div>
          <ChevronIcon
            direction={menu.isOpen ? "up" : "down"}
            className="nav-dropdown-arrow"
            color="#fffb"
            size={16}
          />
        </button>
        {menu.isVisible && (
          <NavDropdownPanel
            id={menu.panelId}
            phase={menu.phase}
            zIndex={menu.zIndex}
            align="right"
            reducedMotion={reducedMotion}
            onCloseAnimationEnd={menu.handleCloseAnimationEnd}
            panelRef={panelRef}
          >
            <NavMenuItems
              items={menuItems}
              t={t}
              onItemClick={menu.closeNow}
              onProfileCycle={profilePairCycle.advance}
            />
          </NavDropdownPanel>
        )}
      </div>
    </div>
  );
};

export default UserMenu;
