import "./profileheader.css";
import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserAvatar from "@/components/layout/UserAvatar/UserAvatar";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import { ExternalLinkIcon } from "@/components/common/icons";
import { isoToEmoji } from "@/utils";
import { getDefaultProfileBannerUrl } from "@/utils/profileBanners";
import { groupCurationTypesForPanel } from "@/utils/curationTypeUtils";
import ProfileHeaderIconPanelPortal from "./ProfileHeaderIconPanelPortal";

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
  nameTooltipId = null,
  expandStatsAriaLabel = "Expand statistics",
  collapseStatsAriaLabel = "Collapse statistics",
  creatorCurationPanelItems = null,
  playerDifficultyPanelDifficulties = null,
  playerDifficultyPanelClearsByDifficulty = null,
}) => {
  const { t } = useTranslation("pages");
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [iconPanelOpen, setIconPanelOpen] = useState(false);
  const [iconPanelPos, setIconPanelPos] = useState(null);
  const iconRowRef = useRef(null);
  const iconPanelPortalRef = useRef(null);

  const defaults = DEFAULT_PLAYER_ICON_SLOTS;
  const resolvedSlots = useMemo(() => {
    if (mode === "creator") {
      return Array.isArray(iconSlots) ? iconSlots.filter(Boolean) : [];
    }
    return padIconSlots(iconSlots, defaults);
  }, [mode, iconSlots]);

  /** Creator panel lists every curation type with level count > 0; hide it when the icon row already shows all of those types. */
  const creatorHasCurationTypesNotOnIconRow = useMemo(() => {
    if (mode !== "creator" || !Array.isArray(creatorCurationPanelItems) || creatorCurationPanelItems.length === 0) {
      return false;
    }
    const displayed = new Set();
    for (const s of resolvedSlots) {
      const id = s?.curationTypeId;
      if (id == null) continue;
      const n = Number(id);
      if (Number.isFinite(n) && n > 0) displayed.add(n);
    }
    return creatorCurationPanelItems.some((item) => {
      const n = Number(item?.id);
      if (!Number.isFinite(n) || n <= 0) return false;
      return !displayed.has(n);
    });
  }, [mode, creatorCurationPanelItems, resolvedSlots]);

  const showCreatorCurationPanel =
    mode === "creator" &&
    Array.isArray(creatorCurationPanelItems) &&
    creatorCurationPanelItems.length > 0 &&
    creatorHasCurationTypesNotOnIconRow;

  const showPlayerDifficultyPanel =
    mode === "player" &&
    Array.isArray(playerDifficultyPanelDifficulties) &&
    playerDifficultyPanelDifficulties.length > 0;

  const showIconPanel = showCreatorCurationPanel || showPlayerDifficultyPanel;

  const viewportWidth = useViewportWidth();

  const config = useMemo(() => {
    const defaultConfig = {
      nameXPosition: "10.85rem", 
      nameYPosition: "7.65rem", 
      dxPos: "0", 
      textAlign: "left",
      circleCx: "5rem",
      circleOffset: "0",
      circleCy: "9rem",
      circleR: "4rem",
    }
    if (viewportWidth < 600) {
      return {
        ...defaultConfig,
        nameXPosition: "50%",
        nameYPosition: "0",
        textAlign: "middle",
        circleCx: "50%",
        circleOffset: "0"
      };
    }
    else if (viewportWidth < 768) {
      return {
        ...defaultConfig,
        nameXPosition: "60%", 
        dxPos: "16", 
        textAlign: "middle",
        circleCx: "50%",
        circleOffset: "-148"
      };
    } 
      else {
      return defaultConfig;
    }
  }, [viewportWidth]);

  const hasExpandableStats = useMemo(
    () => Array.isArray(statGroups) && statGroups.some((g) => g?.rows?.length),
    [statGroups],
  );

  const curationPanelGroups = useMemo(() => {
    if (!showCreatorCurationPanel) return [];
    return groupCurationTypesForPanel(
      creatorCurationPanelItems,
      t("settings.creator.curationBadges.fallbackGroup"),
    );
  }, [showCreatorCurationPanel, creatorCurationPanelItems, t]);

  const measureIconPanel = useCallback(() => {
    const row = iconRowRef.current;
    if (!row) return;
    const r = row.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 12;
    const maxW = Math.max(200, vw - margin * 2);
    const preferred = 360;
    const panelWidth = Math.min(preferred, maxW, Math.max(200, r.width));
    setIconPanelPos({
      top: Math.round(r.bottom + 6),
      rowCenter: Math.round(r.left + r.width / 2),
      minWidth: Math.round(panelWidth),
    });
  }, []);

  useEffect(() => {
    if (!showIconPanel) {
      setIconPanelOpen(false);
      setIconPanelPos(null);
    }
  }, [showIconPanel]);

  useLayoutEffect(() => {
    if (!iconPanelOpen || !showIconPanel) return undefined;
    measureIconPanel();
    const el = iconRowRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(() => measureIconPanel()) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("scroll", measureIconPanel, true);
    window.addEventListener("resize", measureIconPanel);
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", measureIconPanel, true);
      window.removeEventListener("resize", measureIconPanel);
    };
  }, [iconPanelOpen, showIconPanel, measureIconPanel]);

  useEffect(() => {
    if (!iconPanelOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setIconPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iconPanelOpen]);

  useEffect(() => {
    if (!iconPanelOpen) return undefined;
    const onPointerDown = (event) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (iconRowRef.current?.contains(node)) return;
      if (iconPanelPortalRef.current?.contains(node)) return;
      setIconPanelOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [iconPanelOpen]);

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
      : getDefaultProfileBannerUrl();

  const displayName = name || "—";
  const nameTooltipProps =
    typeof nameTooltipId === "string" && nameTooltipId.trim().length > 0
      ? { "data-tooltip-id": nameTooltipId }
      : {};

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
                      x={`${config.nameXPosition}`}
                      y={`${config.nameYPosition}`}
                      fill="black"
                      stroke="black"
                      strokeWidth="8px"
                      dx={config.dxPos}
                      strokeLinejoin="round"
                      className="profile-header__name-svg-text"
                      textAnchor={config.textAlign}
                      {...nameTooltipProps}
                    >
                      {displayName}
                    </text>
                    <text
                      x={`${config.nameXPosition}`}
                      y={`${config.nameYPosition}`}
                      fill="black"
                      stroke="black"
                      strokeWidth="16px"
                      dx={config.dxPos}
                      strokeLinejoin="round"
                      className="profile-header__name-svg-text"
                      textAnchor={config.textAlign}
                      {...nameTooltipProps}
                    >
                      {displayName}
                    </text>
                    <g transform={`translate(${config.circleOffset}, 0)`}>
                    <circle cy={config.circleCy} cx={config.circleCx} r={config.circleR} fill="black" />
                    </g>
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
                    x={`${config.nameXPosition}`}
                    y={`${config.nameYPosition}`}
                    dx={config.dxPos}
                    className="profile-header__name-svg-text"
                    textAnchor={config.textAlign}
                    {...nameTooltipProps}
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
              <div className="profile-header__name-vertical">
              <svg
                  className="profile-header__name-svg"
                  dominantBaseline="hanging"
                >
                  <text
                    x={`${config.nameXPosition}`}
                    y={`${config.nameYPosition}`}
                    dx={config.dxPos}
                    className="profile-header__name-svg-text vertical"
                    textAnchor={config.textAlign}
                    {...nameTooltipProps}
                  >
                    {displayName}
                  </text>
                </svg>
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
              <div className="profile-header__icon-row" ref={iconRowRef}>
                <div
                  className={[
                    "profile-header__icon-slots-block",
                    showIconPanel ? "profile-header__icon-slots-block--curation" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                    {showIconPanel ? (
                    <button
                      type="button"
                      className="profile-header__chevron-btn profile-header__chevron-btn--icon-panel"
                      aria-expanded={iconPanelOpen}
                      aria-haspopup="dialog"
                      aria-label={
                        iconPanelOpen
                          ? (mode === "creator"
                              ? t("creators.profile.curationPanel.collapseAria")
                              : t("profile.funFacts.collapseAria"))
                          : (mode === "creator"
                              ? t("creators.profile.curationPanel.expandAria")
                              : t("profile.funFacts.expandAria"))
                      }
                      onClick={() => setIconPanelOpen((v) => !v)}
                    >
                      <ChevronIcon
                        direction={iconPanelOpen ? "up" : "down"}
                        color="var(--color-white)"
                        size={14}
                      />
                    </button>
                  ) : null}
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
                <ProfileHeaderIconPanelPortal
                  open={showIconPanel && iconPanelOpen}
                  pos={iconPanelPos}
                  mode={mode}
                  portalRef={iconPanelPortalRef}
                  creatorDialogLabel={t("creators.profile.curationPanel.dialogLabel")}
                  curationPanelGroups={curationPanelGroups}
                  playerDifficultyPanelDifficulties={playerDifficultyPanelDifficulties}
                  playerDifficultyPanelClearsByDifficulty={playerDifficultyPanelClearsByDifficulty}
                />
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
                              {row.linkTo ? (
                                <span className="profile-fun-facts__linked-extreme">
                                  <span>{row.value}</span>
                                  <Link
                                    className="profile-fun-facts__linked-extreme-link"
                                    to={row.linkTo}
                                    aria-label={row.linkLabel || "View"}
                                    title={row.linkLabel || "View"}
                                  >
                                    <ExternalLinkIcon color="var(--color-white-t80)" size={14} />
                                  </Link>
                                </span>
                              ) : (
                                row.value
                              )}
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
