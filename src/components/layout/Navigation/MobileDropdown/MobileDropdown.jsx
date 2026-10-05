// tuf-search: #MobileDropdown #mobileDropdown #layout #navigation
import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronIcon } from "@/components/common/icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/common/Collapsible";
import { getProfileCycleTos, isExternalNavPath, isProfilePairItem } from "../navigationConfig";
import { ProfilePairMenuRow } from "../ProfilePairMenuRow";
import { useNavProfileCycle } from "../useNavProfileCycle";
import "./mobileDropdown.css";
import { useTranslation } from "react-i18next";

function itemLabel(item, t) {
  if (item.content) return item.content;
  return item.translationKey ? t(item.translationKey) : item.label;
}

/**
 * In-flow accordion section for the mobile drawer (osu-style).
 * Parent is a toggle only — never a navigation link.
 */
const MobileDropdown = ({
  label,
  items = [],
  isActive,
  onItemClick,
  buttonContent,
  open = false,
  onOpenChange,
}) => {
  const { t } = useTranslation("components");
  const location = useLocation();
  const hasActiveItem = isActive ? isActive(location.pathname) : false;
  const profileCycleTos = useMemo(() => getProfileCycleTos(items), [items]);
  const profileCycle = useNavProfileCycle(profileCycleTos);

  return (
    <li
      className={`nav-mobile-dropdown ${open ? "open" : ""} ${
        hasActiveItem ? "has-active" : ""
      }`}
    >
      <Collapsible
        open={open}
        onOpenChange={onOpenChange}
        fade={false}
        duration="0.28s"
        className="nav-mobile-dropdown__collapsible"
      >
        <CollapsibleTrigger
          preset="none"
          className={`nav-mobile-dropdown-button ${hasActiveItem ? "active" : ""}`}
        >
          <ChevronIcon
            direction={open ? "down" : "right"}
            className="nav-mobile-dropdown-arrow"
            size={16}
          />
          {buttonContent || <span className="nav-mobile-dropdown-label">{label}</span>}
        </CollapsibleTrigger>
        <CollapsibleContent className="nav-mobile-dropdown-region">
          <div className="nav-mobile-dropdown-menu">
            {items.map((item, index) => {
              if (item.divider) {
                return (
                  <div
                    key={`divider-${index}`}
                    className="nav-mobile-dropdown-divider"
                  />
                );
              }

              const extraClass = item.className ? ` ${item.className}` : "";

              if (item.disabled) {
                return (
                  <div
                    key={item.translationKey || item.label || index}
                    className={`nav-mobile-dropdown-item nav-mobile-dropdown-item--disabled${extraClass}`}
                  >
                    {itemLabel(item, t)}
                    {item.badge && (
                      <span className="nav-mobile-dropdown-badge">
                        {t(item.badge)}
                      </span>
                    )}
                  </div>
                );
              }

              if (isProfilePairItem(item)) {
                return (
                  <ProfilePairMenuRow
                    key={item.translationKey || index}
                    item={item}
                    label={itemLabel(item, t)}
                    className="nav-mobile-dropdown-item nav-mobile-dropdown-item--button nav-profile-pair"
                    onCycle={(event) => {
                      const moved = profileCycle.advance(event);
                      if (moved) onItemClick?.();
                    }}
                  />
                );
              }

              if (!item.to && item.profileTargets?.length === 1) {
                item = { ...item, to: item.profileTargets[0].to };
              }

              if (!item.to && item.onClick) {
                return (
                  <button
                    key={item.translationKey || item.label || index}
                    type="button"
                    className={`nav-mobile-dropdown-item nav-mobile-dropdown-item--button${extraClass}`}
                    onClick={() => {
                      item.onClick();
                      onItemClick?.();
                    }}
                  >
                    {itemLabel(item, t)}
                  </button>
                );
              }

              if (!item.to) return null;

              const handleClick = () => {
                item.onClick?.();
                onItemClick?.();
              };

              if (isExternalNavPath(item.to)) {
                return (
                  <a
                    key={item.to || item.translationKey || index}
                    href={item.to}
                    className={`nav-mobile-dropdown-item${extraClass}`}
                    onClick={handleClick}
                  >
                    {itemLabel(item, t)}
                    {item.attachIcon}
                  </a>
                );
              }

              return (
                <NavLink
                  key={item.to || item.translationKey || index}
                  to={item.to}
                  className={({ isActive: linkActive }) =>
                    `nav-mobile-dropdown-item${extraClass} ${
                      linkActive && !item.suppressActive ? "active" : ""
                    }`
                  }
                  onClick={handleClick}
                >
                  {itemLabel(item, t)}
                  {item.attachIcon}
                </NavLink>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
};

export default MobileDropdown;
