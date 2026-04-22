import "./profileheader.css";
import { useState, useMemo, useEffect } from "react";
import UserAvatar from "@/components/layout/UserAvatar/UserAvatar";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import { isoToEmoji } from "@/utils";

/** Default banner when parent does not pass `bannerUrl` (replace when asset pipeline exists). */
const DEFAULT_BANNER_IMAGE = "https://placehold.co/600x400@2x.png";

function useViewportWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

const parseRankColor = (rank) => {
  switch (rank) {
    case 1:
      return "#efff63";
    case 2:
      return "#eeeeee";
    case 3:
      return "#ff834a";
    default:
      return "#777777";
  }
};

const DEFAULT_PLAYER_ICON_SLOTS = [
  { key: "p", letter: "P", count: "—", badge: 0 },
  { key: "g", letter: "G", count: "—", badge: 0 },
  { key: "u", letter: "U", count: "—", badge: 0 },
  { key: "gq", letter: "GQ", count: "—", badge: 0 },
  { key: "uq", letter: "UQ", count: "—", badge: 0 },
];

const DEFAULT_CREATOR_ICON_SLOTS = [
  { key: "c1", letter: "?", count: "", badge: 0 },
  { key: "c2", letter: "?", count: "", badge: 0 },
  { key: "c3", letter: "?", count: "", badge: 0 },
  { key: "c4", letter: "?", count: "", badge: 0 },
  { key: "c5", letter: "?", count: "", badge: 0 },
];

const padIconSlots = (slots, defaults) => {
  const list = Array.isArray(slots) && slots.length ? [...slots] : [...defaults];
  while (list.length < 5) {
    list.push(defaults[list.length] || defaults[defaults.length - 1]);
  }
  return list.slice(0, 5);
};

const formatPlayerBadgeText = (rank) => {
  if (
    rank === null ||
    rank === undefined ||
    rank === "" ||
    rank === "Unranked" ||
    rank === 0
  ) {
    return "Unranked";
  }
  return `#${rank}`;
};

/**
 * Shared profile / creator banner header (dual mode).
 * Presentational: parents supply statRows (collapsed), statGroups (expanded), actions, iconSlots.
 */
const ProfileHeader = ({
  mode = "player",
  className = "",
  avatarUrl,
  fallbackAvatarUrl = "",
  name = "",
  handle,
  country,
  badgeId,
  badgeLabel = "#",
  bannerUrl = null,
  iconSlots,
  statRows = [],
  statGroups = null,
  actions = null,
  verificationBadge = null,
  expandStatsAriaLabel = "Expand statistics",
  collapseStatsAriaLabel = "Collapse statistics",
}) => {
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const nameYPosition = "7.5rem";

  const viewportWidth = useViewportWidth();

  const nameXPosition = useMemo(() => {
    if (viewportWidth < 768) {
      return "50%";
    } else {
      return "10.85rem";
    }
  }, [viewportWidth]);

  const dxPos = useMemo(() => {
    if (viewportWidth < 768) {
      return "16";
    } else {
      return "0";
    }
  }, [viewportWidth]);

  const defaults =
    mode === "creator" ? DEFAULT_CREATOR_ICON_SLOTS : DEFAULT_PLAYER_ICON_SLOTS;
  const resolvedSlots = padIconSlots(iconSlots, defaults);

  const hasExpandableStats = useMemo(
    () => Array.isArray(statGroups) && statGroups.some((g) => g?.rows?.length),
    [statGroups],
  );

  const badgeText =
    mode === "creator"
      ? `${badgeLabel}${badgeId ?? ""}`.trim()
      : formatPlayerBadgeText(badgeId);

  const rankNum = Number(badgeId);
  const rankForColor =
    mode === "player" && Number.isFinite(rankNum) && rankNum > 0 ? rankNum : 0;
  const rankColor =
    mode === "player" && badgeText !== "Unranked" && rankForColor > 0
      ? parseRankColor(rankForColor)
      : "var(--color-white)";

  const handleDisplay =
    handle != null && String(handle).length ? String(handle).replace(/^@/, "") : "";

  const shellClass = ["profile-header-shell", className].filter(Boolean).join(" ");
  const bannerImageSrc =
    bannerUrl != null && String(bannerUrl).trim().length > 0
      ? String(bannerUrl).trim()
      : DEFAULT_BANNER_IMAGE;

  const displayName = name || "—";

  return (
    <div className={shellClass}>
      <div className="profile-header">
        <div className="profile-header__name-position">
              <div className="profile-header__name-wrap name-mask">
              <svg
                className="profile-header__name-svg"
                dominantBaseline="hanging"
              >
                <defs>
                  <mask 
                  id="name-cutout-mask"
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  >
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <text
                  x={`${nameXPosition}`}
                  y={`${nameYPosition}`}
                  fill="black"
                  stroke="black"
                  strokeWidth="8px"
                  dx={dxPos}
                  strokeLinejoin="round"
                  className="profile-header__name-svg-text"
                >
                  {displayName}
                </text>
                <text
                  x={`${nameXPosition}`}
                  y={`${nameYPosition}`}
                  fill="black"
                  stroke="black"
                  strokeWidth="16px"
                  dx={dxPos}
                  strokeLinejoin="round"
                  className="profile-header__name-svg-text"
                >
                  {displayName}
                </text>
                  </mask>
                </defs>
              </svg>
              </div>
              <div className="profile-header__name-wrap">
              <svg
                className="profile-header__name-svg"
                dominantBaseline="hanging"
              >
                <text
                  x={`${nameXPosition}`}
                  y={`${nameYPosition}`}
                  dx={dxPos}
                  className="profile-header__name-svg-text"
                >
                  {displayName}
                </text>
              </svg>
              </div>
        </div>
        <div className="profile-header__banner-wrap" aria-hidden="true">
          <img
            className="profile-header__banner-img"
            src={bannerImageSrc}
            alt=""
            decoding="async"
          />
        </div>
        <div className="profile-header__inner">
          <div className="profile-header__body">
            <div className="profile-header__left">
              <div className="profile-header__avatar-ring">
                <div className="profile-header__avatar-wrap">
                  <UserAvatar
                    primaryUrl={avatarUrl}
                    fallbackUrl={fallbackAvatarUrl}
                    className="profile-header__avatar"
                  />
                </div>
              </div>
              <div
                className="profile-header__badge"
                style={
                  mode === "player" && badgeText !== "Unranked"
                    ? {
                        color: rankColor,
                        backgroundColor: `${rankColor}27`,
                      }
                    : undefined
                }
              >
                {badgeText}
              </div>
            </div>

            <div className="profile-header__center">
              <div className="profile-header__handle-row">
                {country ? (
                  <img
                    src={isoToEmoji(country)}
                    alt=""
                    className="profile-header__flag"
                  />
                ) : null}
                {handleDisplay ? (
                  <span className="profile-header__handle">@{handleDisplay}</span>
                ) : null}
                {verificationBadge ? (
                    <span className="profile-header__verification">{verificationBadge}</span>
                  ) : null}
              </div>
              <div className="profile-header__icon-row">
                <div className="profile-header__icon-slots">
                  {resolvedSlots.map((slot) => (
                    <div
                      key={slot.key}
                      className="profile-header__icon-slot"
                      title={slot.tooltip ?? slot.title}
                    >
                      {slot.iconUrl ? (
                        <img
                          className="profile-header__icon-slot-img"
                          src={slot.iconUrl}
                          alt=""
                          decoding="async"
                        />
                      ) : (
                        <span className="profile-header__icon-slot-letter">{slot.letter}</span>
                      )}
                      <span className="profile-header__icon-slot-badge">{slot.badge ?? slot.count ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="profile-header__stats">
              <div className="profile-header__stat-rows">
                {statRows.map((row) => (
                  <div key={row.key} className="profile-header__stat-row">
                    <span className="profile-header__stat-label">{row.label}</span>
                    <span
                      className={["profile-header__stat-value", row.valueClassName || ""].filter(Boolean).join(" ")}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              {hasExpandableStats ? (
                <button
                  type="button"
                  className="profile-header__chevron-btn profile-header__chevron-btn--stats"
                  aria-expanded={isStatsExpanded}
                  aria-label={isStatsExpanded ? collapseStatsAriaLabel : expandStatsAriaLabel}
                  onClick={() => setIsStatsExpanded((v) => !v)}
                >
                  <ChevronIcon
                    direction={isStatsExpanded ? "up" : "down"}
                    color="var(--color-white)"
                    size={14}
                  />
                </button>
              ) : null}
            </div>
          </div>

          {hasExpandableStats ? (
            <div
              className="profile-header__expanded-wrap"
              data-expanded={isStatsExpanded ? "true" : "false"}
            >
              <div className="profile-header__expanded">
                <div className="profile-header__expanded-grid">
                  {statGroups.map((group) => (
                    <section key={group.key} className="profile-header__stat-group">
                      <h2 className="profile-header__stat-group-title">{group.label}</h2>
                      <div className="profile-header__stat-group-rows">
                        {group.rows.map((row) => (
                          <div key={row.key} className="profile-header__stat-row">
                            <span className="profile-header__stat-label">{row.label}</span>
                            <span
                              className={["profile-header__stat-value", row.valueClassName || ""]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {actions ? (
        <aside
          className="profile-header__actions"
          role="toolbar"
          aria-label="Profile actions"
        >
          {actions}
        </aside>
      ) : null}
    </div>
  );
};

export default ProfileHeader;
