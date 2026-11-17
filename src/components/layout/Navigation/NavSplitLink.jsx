// tuf-search: #NavSplitLink #layout #navigation
import React from "react";
import { useTranslation } from "react-i18next";
import { isExternalNavPath } from "./navigationConfig";
import "./navSplitLink.css";

const VARIANT_CLASS = {
  desktop: {
    root: "nav-split-link--desktop",
    item: "nav-dropdown-item",
    label: "nav-dropdown-item-label",
  },
  mobile: {
    root: "nav-split-link--mobile",
    item: "nav-mobile-dropdown-item",
    label: "nav-mobile-dropdown-item-label",
  },
};

export function isSplitLinkItem(item) {
  return Boolean(
    item?.sideLink?.to &&
      isExternalNavPath(item.to) &&
      isExternalNavPath(item.sideLink.to),
  );
}

export function NavSplitLink({ item, label, variant = "desktop", onActivate }) {
  const { t } = useTranslation("components");
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.desktop;
  const side = item.sideLink;
  const sideLabel = side.ariaTranslationKey
    ? t(side.ariaTranslationKey)
    : side.label;

  const activate = (handler) => {
    handler?.();
    onActivate?.();
  };

  return (
    <div className={`nav-split-link ${variantClass.root}`} role="presentation">
      <a
        href={item.to}
        role="menuitem"
        className={[variantClass.item, item.className].filter(Boolean).join(" ")}
        onClick={() => activate(item.onClick)}
      >
        <span className={variantClass.label}>
          {label}
          {item.attachIcon}
        </span>
        {item.icon}
      </a>
      <a
        href={side.to}
        className="nav-split-link__action btn-fill-neutral btn-icon"
        aria-label={sideLabel}
        title={sideLabel}
        onClick={(event) => {
          event.stopPropagation();
          activate(side.onClick);
        }}
      >
        <span className="nav-split-link__icon" aria-hidden="true">
          {side.icon}
        </span>
      </a>
    </div>
  );
}
