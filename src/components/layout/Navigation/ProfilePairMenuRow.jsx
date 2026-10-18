// tuf-search: #ProfilePairMenuRow #layout #navigation
import React from "react";
import { useLocation } from "react-router-dom";
import { AdofaiIcon } from "@/components/common/icons";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";
import { ShuffleIcon } from "@/components/common/icons/ShuffleIcon";
import { SubmissionIcon } from "@/components/common/icons/SubmissionIcon";

const PROFILE_PAIR_ICONS = {
  player: AdofaiIcon,
  creator: CreatorIcon,
  submissions: SubmissionIcon,
  requests: ShuffleIcon,
};

function targetPathname(to) {
  const queryIndex = to.indexOf("?");
  return queryIndex === -1 ? to : to.slice(0, queryIndex);
}

function queryTargetMatches(location, to) {
  const queryIndex = to.indexOf("?");
  if (queryIndex === -1) return false;
  if (location.pathname !== to.slice(0, queryIndex)) return false;
  const expected = new URLSearchParams(to.slice(queryIndex + 1));
  const actual = new URLSearchParams(location.search);
  for (const [key, value] of expected.entries()) {
    if (actual.get(key) !== value) return false;
  }
  return true;
}

function litTargetKey(location, targets) {
  const queryHit = targets.find((target) => queryTargetMatches(location, target.to));
  if (queryHit) return queryHit.key;
  const plain = targets.find(
    (target) => !String(target.to).includes("?") && location.pathname === target.to,
  );
  return plain?.key ?? null;
}

export function ProfilePairMenuRow({
  item,
  label,
  className,
  onCycle,
  role = "menuitem",
}) {
  const location = useLocation();
  const active = item.profileTargets.some(
    (target) => location.pathname === targetPathname(target.to),
  );
  const litKey = litTargetKey(location, item.profileTargets);

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
          const lit = target.key === litKey;
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
