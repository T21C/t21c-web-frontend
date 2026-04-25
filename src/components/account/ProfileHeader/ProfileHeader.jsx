import "./profileheader.css";
import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserAvatar from "@/components/layout/UserAvatar/UserAvatar";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import { ExternalLinkIcon } from "@/components/common/icons";
import { isoToEmoji } from "@/utils";
import { getDefaultProfileBannerUrl } from "@/utils/profileBanners";
import { getPortalRoot } from "@/utils/portalRoot";
import { groupCurationTypesForPanel } from "@/utils/curationTypeUtils";

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
}) => {
  const { t } = useTranslation("pages");
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [creatorCurationOpen, setCreatorCurationOpen] = useState(false);
  const [curationPanelPos, setCurationPanelPos] = useState(null);
  const iconSlotsBlockRef = useRef(null);
  const curationPortalRef = useRef(null);

  const showCreatorCurationPanel =
    mode === "creator" &&
    Array.isArray(creatorCurationPanelItems) &&
    creatorCurationPanelItems.length > 0;

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

  const defaults = DEFAULT_PLAYER_ICON_SLOTS;
  const resolvedSlots = useMemo(() => {
    if (mode === "creator") {
      return Array.isArray(iconSlots) ? iconSlots.filter(Boolean) : [];
    }
    return padIconSlots(iconSlots, defaults);
  }, [mode, iconSlots]);

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

  const measureCurationPanel = useCallback(() => {
    const el = iconSlotsBlockRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCurationPanelPos({
      top: Math.round(r.bottom + 6),
      left: Math.round(r.left),
      minWidth: Math.max(220, Math.round(r.width)),
    });
  }, []);

  useEffect(() => {
    if (!showCreatorCurationPanel) {
      setCreatorCurationOpen(false);
      setCurationPanelPos(null);
    }
  }, [showCreatorCurationPanel]);

  useLayoutEffect(() => {
    if (!creatorCurationOpen || !showCreatorCurationPanel) return undefined;
    measureCurationPanel();
    const el = iconSlotsBlockRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(() => measureCurationPanel()) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("scroll", measureCurationPanel, true);
    window.addEventListener("resize", measureCurationPanel);
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", measureCurationPanel, true);
      window.removeEventListener("resize", measureCurationPanel);
    };
  }, [creatorCurationOpen, showCreatorCurationPanel, measureCurationPanel]);

  useEffect(() => {
    if (!creatorCurationOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setCreatorCurationOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creatorCurationOpen]);

  useEffect(() => {
    if (!creatorCurationOpen) return undefined;
    const onPointerDown = (event) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (iconSlotsBlockRef.current?.contains(node)) return;
      if (curationPortalRef.current?.contains(node)) return;
      setCreatorCurationOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [creatorCurationOpen]);

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
              <div className="profile-header__icon-row">
                <div
                  className={[
                    "profile-header__icon-slots-block",
                    showCreatorCurationPanel ? "profile-header__icon-slots-block--curation" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  ref={iconSlotsBlockRef}
                >
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
                  {showCreatorCurationPanel ? (
                    <button
                      type="button"
                      className="profile-header__chevron-btn profile-header__chevron-btn--curation"
                      aria-expanded={creatorCurationOpen}
                      aria-haspopup="dialog"
                      aria-label={
                        creatorCurationOpen
                          ? t("creators.profile.curationPanel.collapseAria")
                          : t("creators.profile.curationPanel.expandAria")
                      }
                      onClick={() => setCreatorCurationOpen((v) => !v)}
                    >
                      <ChevronIcon
                        direction={creatorCurationOpen ? "up" : "down"}
                        color="var(--color-white)"
                        size={14}
                      />
                    </button>
                  ) : null}
                </div>
                {showCreatorCurationPanel && creatorCurationOpen && curationPanelPos
                  ? createPortal(
                      <div
                        ref={curationPortalRef}
                        className="profile-header__curation-portal-anchor"
                        style={{
                          position: "fixed",
                          top: `${curationPanelPos.top}px`,
                          left: `${curationPanelPos.left}px`,
                          minWidth: `${Math.min(curationPanelPos.minWidth, 416)}px`,
                          zIndex: 10050,
                        }}
                      >
                        <div
                          className="profile-header__curation-panel"
                          role="dialog"
                          aria-label={t("creators.profile.curationPanel.dialogLabel")}
                        >
                          <div className="profile-header__curation-panel-inner">
                            {curationPanelGroups.map(([group, data]) => (
                              <div key={group} className="profile-header__curation-group">
                                <h4 className="profile-header__curation-group-title">{group}</h4>
                                <div className="profile-header__curation-chips">
                                  {data.items.map((ct) => {
                                    const id = ct.id;
                                    const cnt = Number(ct.count) || 0;
                                    const nm = ct.name ?? `#${id}`;
                                    return (
                                      <div
                                        key={id}
                                        className="profile-header__curation-chip"
                                        title={nm}
                                      >
                                        {ct.icon ? (
                                          <img
                                            className="profile-header__curation-chip-icon"
                                            src={ct.icon}
                                            alt=""
                                            decoding="async"
                                          />
                                        ) : (
                                          <span className="profile-header__curation-chip-fallback">
                                            {nm.slice(0, 2)}
                                          </span>
                                        )}
                                        <span className="profile-header__curation-chip-count">{cnt}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>,
                      getPortalRoot(),
                    )
                  : null}
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
