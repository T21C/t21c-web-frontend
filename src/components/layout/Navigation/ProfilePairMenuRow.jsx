// tuf-search: #ProfilePairMenuRow #layout #navigation
import React from "react";
import { useLocation } from "react-router-dom";
import { AdofaiIcon } from "@/components/common/icons";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";

const PROFILE_PAIR_ICONS = {
  player: AdofaiIcon,
  creator: CreatorIcon,
};

export function ProfilePairMenuRow({
  item,
  label,
  className,
  onCycle,
  role = "menuitem",
}) {
  const { pathname } = useLocation();
  const active = item.profileTargets.some((target) => pathname === target.to);

  return (
    <button
      type="button"
      role={role}
      className={`${className}${active ? " active" : ""}`}
      onClick={onCycle}
    >
      <span className="nav-profile-pair__label">{label}</span>
      <span className="nav-profile-pair__icons" aria-hidden="true">
        {item.profileTargets.map((target) => {
          const Icon = PROFILE_PAIR_ICONS[target.key];
          if (!Icon) return null;
          const lit = pathname === target.to;
          return (
            <span
              key={target.key}
              className={`nav-profile-pair__icon${lit ? " is-lit" : ""}`}
            >
              <Icon size={20} color="currentColor" />
            </span>
          );
        })}
      </span>
    </button>
  );
}
