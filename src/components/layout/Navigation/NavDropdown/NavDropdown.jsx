// tuf-search: #NavDropdown #navDropdown #layout #navigation
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useSubmissionMinimalMotion } from "@/hooks/useMinimalMotionPreference";
import { isExternalNavPath } from "../navigationConfig";
import {
  NAV_DROP_DURATION_MS,
  useNavHoverMenu,
} from "../useNavHoverMenu";
import "./navDropdown.css";

function itemLabel(item, t) {
  return item.translationKey ? t(item.translationKey) : item.label;
}

export function NavMenuItems({ items = [], onItemClick, t }) {
  return items.map((item, index) => {
    if (item.divider) {
      return <div key={`divider-${index}`} className="nav-dropdown-divider" />;
    }

    if (item.disabled) {
      return (
        <div
          key={item.translationKey || item.label || index}
          className="nav-dropdown-item nav-dropdown-item--disabled"
        >
          {itemLabel(item, t)}
          {item.badge && (
            <span className="nav-dropdown-badge">{t(item.badge)}</span>
          )}
        </div>
      );
    }

    if (!item.to && item.onClick) {
      return (
        <button
          key={item.translationKey || item.label || index}
          type="button"
          role="menuitem"
          className="nav-dropdown-item nav-dropdown-item--button"
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

    const classNameFor = (isActive) =>
      `nav-dropdown-item ${isActive && !item.suppressActive ? "active" : ""}`;

    const content = (
      <>
        <span className="nav-dropdown-item-label">
          {itemLabel(item, t)}
          {item.attachIcon}
        </span>
        {item.icon}
      </>
    );

    if (isExternalNavPath(item.to)) {
      return (
        <a
          key={item.to || item.translationKey || index}
          href={item.to}
          role="menuitem"
          className={classNameFor(false)}
          onClick={() => {
            item.onClick?.();
            onItemClick?.();
          }}
        >
          {content}
        </a>
      );
    }

    return (
      <NavLink
        key={item.to || item.translationKey || index}
        to={item.to}
        role="menuitem"
        className={({ isActive }) => classNameFor(isActive)}
        onClick={() => {
          item.onClick?.();
          onItemClick?.();
        }}
      >
        {content}
      </NavLink>
    );
  });
}

export function NavDropdownPanel({
  id,
  phase,
  zIndex,
  align = "left",
  reducedMotion = false,
  children,
  onCloseAnimationEnd,
  panelRef,
}) {
  const [expanded, setExpanded] = useState(
    Boolean(reducedMotion && phase === "open"),
  );

  useEffect(() => {
    if (phase === "open") {
      if (reducedMotion) {
        setExpanded(true);
        return undefined;
      }
      let frame2 = 0;
      const frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        cancelAnimationFrame(frame1);
        cancelAnimationFrame(frame2);
      };
    }
    if (phase === "closing") {
      setExpanded(false);
      if (reducedMotion) {
        onCloseAnimationEnd?.();
        return undefined;
      }
      const timeout = setTimeout(
        () => onCloseAnimationEnd?.(),
        NAV_DROP_DURATION_MS,
      );
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [phase, reducedMotion, onCloseAnimationEnd]);

  const handleTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (
      event.propertyName !== "clip-path" &&
      event.propertyName !== "-webkit-clip-path"
    ) {
      return;
    }
    if (phase === "closing") onCloseAnimationEnd?.();
  };

  return (
    <div
      className={`nav-dropdown-panel nav-dropdown-panel--${align} ${
        reducedMotion ? "is-reduced-motion" : ""
      } ${expanded ? "is-expanded" : ""} ${phase === "closing" ? "is-closing" : ""}`}
      style={{ zIndex }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        ref={panelRef}
        id={id}
        role="menu"
        className="nav-dropdown-shell"
      >
        <div className="nav-dropdown-menu">{children}</div>
      </div>
    </div>
  );
}

/**
 * Desktop section dropdown. Hover opens the panel; click pins it so mouseleave
 * will not close until a click outside. `linkTo` is kept for callers but the
 * label itself does not navigate — section pages live in the menu.
 */
const NavDropdown = ({
  label,
  items = [],
  isActive,
  className = "",
  linkTo: _linkTo = null,
  menuAlign = "left",
  asItem = true,
  triggerContent = null,
  triggerClassName = "nav-dropdown-button",
}) => {
  const { t } = useTranslation("components");
  const location = useLocation();
  const isFinePointer = useFinePointer();
  const reducedMotion = useSubmissionMinimalMotion();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const menu = useNavHoverMenu({
    reducedMotion,
    enabled: isFinePointer,
    rootRef,
  });

  useEffect(() => {
    menu.closeNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on navigate only
  }, [location]);

  const hasActiveItem = isActive ? isActive(location.pathname) : false;
  const openClass = menu.isOpen ? "open" : "";
  const pinnedClass = menu.isPinned ? "pinned" : "";
  const activeClass = hasActiveItem ? "has-active" : "";

  const focusFirstItem = () => {
    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector(
          '.nav-dropdown-item:not(.nav-dropdown-item--disabled), .nav-dropdown-item--button',
        )
        ?.focus();
    });
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      menu.open();
      focusFirstItem();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      menu.dismiss();
      triggerRef.current?.focus();
    }
  };

  const triggerClass = `${triggerClassName} ${hasActiveItem ? "active" : ""}`;
  const triggerInner = triggerContent || label;

  const body = (
    <div
      className={`nav-dropdown ${openClass} ${pinnedClass} ${activeClass} ${className}`.trim()}
      ref={rootRef}
      onMouseEnter={menu.scheduleOpen}
      onMouseLeave={menu.scheduleClose}
      onBlur={menu.handleRootBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        aria-expanded={menu.isOpen}
        aria-haspopup="menu"
        aria-controls={menu.panelId}
        onClick={menu.handleTriggerClick}
        onFocus={() => {
          if (isFinePointer) menu.open();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {triggerInner}
      </button>
      {menu.isVisible && (
        <NavDropdownPanel
          id={menu.panelId}
          phase={menu.phase}
          zIndex={menu.zIndex}
          align={menuAlign}
          reducedMotion={reducedMotion}
          onCloseAnimationEnd={menu.handleCloseAnimationEnd}
          panelRef={panelRef}
        >
          <NavMenuItems items={items} t={t} onItemClick={menu.closeNow} />
        </NavDropdownPanel>
      )}
    </div>
  );

  if (!asItem) return body;

  return <li className="nav-list-item">{body}</li>;
};

export default NavDropdown;

export { NAV_DROP_DURATION_MS };
