// tuf-search: #ProfileHeader #profileHeader #account
import "./profileheader.css";
import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import UserAvatar from "@/components/layout/UserAvatar/UserAvatar";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import { ExternalLinkIcon, HeartIcon, TUFStellarIcon } from "@/components/common/icons";
import { isoToEmoji } from "@/utils";
import {
  getDefaultProfileBannerUrl,
  isTufStellarAccessActive,
  normalizeTufStellarIconVariant,
} from "@/utils/profileBanners";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import { groupCurationTypesForPanel } from "@/utils/curationTypeUtils";
import ProfileHeaderIconPanelPortal from "./ProfileHeaderIconPanelPortal";
import { useSvgTextDimensions } from "@/hooks/useSvgTextDimensions";

const PROFILE_HEADER_STELLAR_TOOLTIP_ID = "profile-header-stellar-subscriber";
/** When `nameTooltipId` is `"default"`, name hits use this id and a local Tooltip shows the full `name`. */
const PROFILE_HEADER_NAME_DEFAULT_TOOLTIP_ID = "profile-header-name-default-tooltip";

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
 * @param {(row: { key: string }) => boolean} [statRowFilter] — Return false to omit a row from collapsed stats and expanded fun-fact groups.
 */
const ProfileHeader = ({
  mode = "player",
  className = "",
  /** Player doc, creator doc, or auth `user` — CDN + GIF / TUFStellar access + `pfp` resolved in one place. */
  avatarSubject = null,
  name = "",
  handle,
  country,
  badgeId,
  badgeLabel = "#",
  bannerUrl = null,
  iconSlots,
  statRows = [],
  statGroups = null,
  /** Collapsed `statRows` and each `statGroups[].rows` entry is kept when this returns true. */
  statRowFilter = () => true,
  actions = null,
  verificationBadge = null,
  /** Tooltip for the banner/display name: a string id for `react-tooltip`, or `"default"` for a built-in tooltip with the full `name`. */
  nameTooltipId = null,
  expandStatsAriaLabel = "Expand statistics",
  collapseStatsAriaLabel = "Collapse statistics",
  creatorCurationPanelItems = null,
  playerDifficultyPanelDifficulties = null,
  playerDifficultyPanelClearsByDifficulty = null,
  /** Shown only when `avatarSubject.user` has active TUFStellar; normalized to `1`|`2`|`3`. */
  stellarIconVariant = "1",
}) => {
  const { t } = useTranslation("pages");
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [iconPanelOpen, setIconPanelOpen] = useState(false);
  const [iconPanelPos, setIconPanelPos] = useState(null);
  const iconRowRef = useRef(null);
  const iconPanelPortalRef = useRef(null);

  const { primaryUrl: resolvedPrimaryAvatarUrl, fallbackUrl: resolvedFallbackAvatarUrl } = useMemo(
    () => userAvatarUrls(avatarSubject),
    [avatarSubject],
  );

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
      circleCx: "80.5",
      circleOffset: "0",
      circleCy: "9rem",
      circleR: "4rem",
    }
    if (viewportWidth <= 600) {
      return {
        ...defaultConfig,
        nameXPosition: "50%",
        nameYPosition: "0",
        textAlign: "middle",
        circleCx: "50%",
        circleOffset: "0.5"
      };
    }
    else if (viewportWidth <= 768) {
      return {
        ...defaultConfig,
        nameXPosition: "50%", 
        dxPos: "-64", 
        circleCx: "50%",
        circleOffset: "-147.5"
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

  /** Player difficulty portal: fixed width from CSS (see profileHeaderIconPanelPortal.css) instead of measured `--profile-header-icon-panel-min-width`. */
  const iconPanelPortalAnchorVariant = useMemo(() => {
    if (mode !== "player") return null;
    const c = className || "";
    if (c.includes("player-page__profile-header")) return "player-page";
    if (c.includes("settings-sub-page__profile-header")) return "settings-player";
    return null;
  }, [mode, className]);

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
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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

  const shellClass = `profile-header-shell ${className}`;
  const bannerImageSrc =
    bannerUrl != null && String(bannerUrl).trim().length > 0
      ? String(bannerUrl).trim()
      : getDefaultProfileBannerUrl();

  const displayName = name || "—";
  const isDefaultNameTooltip =
    typeof nameTooltipId === "string" && nameTooltipId.trim().toLowerCase() === "default";
  const fullNicknameTooltipText =
    name == null ? "" : (typeof name === "string" ? name : String(name)).trim();
  const nameTooltipProps =
    isDefaultNameTooltip && fullNicknameTooltipText.length > 0
      ? { "data-tooltip-id": PROFILE_HEADER_NAME_DEFAULT_TOOLTIP_ID }
      : typeof nameTooltipId === "string" &&
          nameTooltipId.trim().length > 0 &&
          !isDefaultNameTooltip
        ? { "data-tooltip-id": nameTooltipId.trim() }
        : {};

  const STELLAR_ICON_SIZE = 28;
  const STELLAR_ICON_GAP = 14;
  const STELLAR_ICON_HALF = STELLAR_ICON_SIZE / 2;
  /** Pin to the same local y as `<text>` (hanging baseline at 0). Do not use bbox height — stacked glyphs skew vertical centering. */
  const STELLAR_ICON_DY = 0;
  const isNarrowNameLayout = viewportWidth < 600;
  const showStellarInBannerOverlay = !isNarrowNameLayout;

  const showStellarBadge = isTufStellarAccessActive(avatarSubject?.user);
  const resolvedStellarVariant = useMemo(
    () => normalizeTufStellarIconVariant(stellarIconVariant),
    [stellarIconVariant],
  );

  /** Shift name slightly when a trailing stellar icon shares the row (middle anchor). */
  const stellarMiddleNameDxNudge =
    showStellarBadge && config.textAlign === "middle" ? -STELLAR_ICON_HALF : 0;
  const overlayNameDx = (Number(config.dxPos) || 0) + stellarMiddleNameDxNudge;

  const overlayNameDims = useSvgTextDimensions(
    displayName,
    String(overlayNameDx),
    config.textAlign,
    viewportWidth,
  );
  const verticalNameDims = useSvgTextDimensions(
    displayName,
    String(overlayNameDx),
    config.textAlign,
    viewportWidth,
  );

  const verticalNameFoRef = useRef(null);
  const [verticalFoBBox, setVerticalFoBBox] = useState(null);

  useLayoutEffect(() => {
    if (!isNarrowNameLayout || !showStellarBadge) {
      setVerticalFoBBox(null);
      return undefined;
    }
    const fo = verticalNameFoRef.current;
    if (!fo) {
      setVerticalFoBBox(null);
      return undefined;
    }
    const measure = () => {
      try {
        const b = fo.getBBox();
        setVerticalFoBBox({ x: b.x, y: b.y, width: b.width, height: b.height });
      } catch {
        setVerticalFoBBox(null);
      }
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            requestAnimationFrame(measure);
          })
        : null;
    if (ro) ro.observe(fo);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    isNarrowNameLayout,
    showStellarBadge,
    displayName,
    overlayNameDx,
    config.textAlign,
    config.nameXPosition,
    config.nameYPosition,
  ]);

  const profileNameTextDimensions = isNarrowNameLayout
    ? showStellarBadge
      ? verticalFoBBox
      : verticalNameDims.dimensions
    : overlayNameDims.dimensions;

  const stellarIconGroupTransform = useMemo(() => {
    if (profileNameTextDimensions == null) {
      return `translate(${STELLAR_ICON_GAP}, ${STELLAR_ICON_DY}) scale(1.5)`;
    }
    const { x, y, width, height } = profileNameTextDimensions;
    const tx = x + width + STELLAR_ICON_GAP;
    const scaledIcon = STELLAR_ICON_SIZE * 1.5;
    const alignStellarToFoBlock =
      isNarrowNameLayout && showStellarBadge && profileNameTextDimensions != null;
    const ty = alignStellarToFoBlock
      ? y + height / 2 - scaledIcon / 2
      : STELLAR_ICON_DY;
    return `translate(${tx}, ${ty}) scale(1.5)`;
  }, [profileNameTextDimensions, isNarrowNameLayout, showStellarBadge]);

  return (
    <div className={shellClass}>
      <div className="profile-header">
      {showStellarBadge ? (
              <Tooltip
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontWeight: "500",
                  fontSize: "1rem",
                  zIndex: "1000",
                }}
                id={PROFILE_HEADER_STELLAR_TOOLTIP_ID}
                place="top"
                noArrow
              >
                {t("profile.stellarSubscriberIconTooltip")}{" "}
                <HeartIcon size={18} color="#f44" fill="#f44" strokeWidth="2" />
              </Tooltip>
            ) : null}
      {isDefaultNameTooltip && fullNicknameTooltipText.length > 0 ? (
        <Tooltip
          id={PROFILE_HEADER_NAME_DEFAULT_TOOLTIP_ID}
          place="bottom-start"
          noArrow
          style={{ maxWidth: "min(24rem, 92vw)", zIndex: 20, marginTop: "-0.5rem" }}
        >
          {fullNicknameTooltipText}
        </Tooltip>
      ) : null}
        <div className="profile-header__banner-wrap" aria-hidden="true">
          <img
            className="profile-header__banner-img"
            src={bannerImageSrc}
            alt=""
            decoding="async"
          />
        </div>
        <div className="profile-header__name-mask-defs" aria-hidden="true">
          <div className="profile-header__name-wrap name-mask">
            <svg className="profile-header__name-svg" dominantBaseline="hanging">
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
                    dx={overlayNameDx}
                    strokeLinejoin="round"
                    className="profile-header__name-svg-text"
                    textAnchor={config.textAlign}
                  >
                    {displayName}
                  </text>
                  <g style={{ transform: `translate(${config.nameXPosition}, ${config.nameYPosition})` }}>
                    <text
                      dx={overlayNameDx}
                      className="profile-header__name-svg-text"
                      textAnchor={config.textAlign}
                    >
                      {displayName}
                    </text>
                    {showStellarBadge && showStellarInBannerOverlay ? (
                      <g transform={stellarIconGroupTransform}>
                        <circle
                          cx={STELLAR_ICON_GAP}
                          cy={STELLAR_ICON_DY + STELLAR_ICON_SIZE / 2}
                          r={(STELLAR_ICON_SIZE + 8) / 2}
                          fill="black"
                        />
                      </g>
                    ) : null}
                  </g>
                  <g transform={`translate(${config.circleOffset}, 0)`}>
                    <circle cy={config.circleCy} cx={config.circleCx} r={config.circleR} fill="black" />
                  </g>
                </mask>
              </defs>
            </svg>
          </div>
        </div>
        <div className="profile-header__inner">
          <div className="profile-header__body">
            <div className="profile-header__left">
              <div className="profile-header__avatar-ring">
                <div className="profile-header__avatar-wrap">
                  <UserAvatar
                    primaryUrl={resolvedPrimaryAvatarUrl || ""}
                    fallbackUrl={resolvedFallbackAvatarUrl || ""}
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
                <svg className="profile-header__name-svg profile-header__name-svg--vertical" dominantBaseline="hanging">
                  <g
                    style={{
                      transform: `translate(${config.nameXPosition}, ${config.nameYPosition})`,
                    }}
                  >
                    {isNarrowNameLayout && showStellarBadge || true ? (
                      <>
                        <foreignObject
                          ref={verticalNameFoRef}
                          x="-50%"
                          y="0"
                          width="100%"
                          height="12rem"
                        >
                          <div
                            xmlns="http://www.w3.org/1999/xhtml"
                            style={{
                              position: "relative",
                              display: "flex",
                              textAlign: "center",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.25rem",
                              width: "100%"
                            }}
                            {...nameTooltipProps}
                          >
                            <span className="profile-header__name-vertical-fo">
                            {displayName}
                            </span>
                            
                            {showStellarBadge ? (
                              <TUFStellarIcon
                                variant={resolvedStellarVariant}
                                className="profile-header__stellar-icon vertical"
                                size={STELLAR_ICON_SIZE*1.25}
                                color="#fff"
                                data-tooltip-id={PROFILE_HEADER_STELLAR_TOOLTIP_ID}
                                style={{ filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))" }}
                              />
                          ) : null}
                          </div>

                        </foreignObject>
                        <g
                          className="profile-header__stellar-hit profile-header__stellar-hit--vertical"
                          transform={stellarIconGroupTransform}
                        >
                          <TUFStellarIcon
                            svg
                            variant={resolvedStellarVariant}
                            className="profile-header__stellar-icon"
                            size={STELLAR_ICON_SIZE}
                            color="#fff"
                            data-tooltip-id={PROFILE_HEADER_STELLAR_TOOLTIP_ID}
                            style={{ filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))" }}
                          />
                        </g>
                      </>
                    ) : (
                      <text
                        ref={verticalNameDims.textRef}
                        dx={overlayNameDx}
                        className="profile-header__name-svg-text vertical"
                        textAnchor={config.textAlign}
                        {...nameTooltipProps}
                      >
                        {displayName}
                      </text>
                    )}
                  </g>
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
                  className={`profile-header__icon-slots-block ${showIconPanel ? "profile-header__icon-slots-block--curation" : ""}`}
                >
                  <div className="profile-header__icon-slots">
                    {resolvedSlots.map((slot, index) => (
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
                        {showIconPanel && index === resolvedSlots.length - 1 ? (
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
                      </div>
                    ))}
                  </div>
                </div>
                <ProfileHeaderIconPanelPortal
                  open={showIconPanel && iconPanelOpen}
                  pos={iconPanelPos}
                  mode={mode}
                  portalRef={iconPanelPortalRef}
                  anchorVariant={iconPanelPortalAnchorVariant}
                  creatorDialogLabel={t("creators.profile.curationPanel.dialogLabel")}
                  curationPanelGroups={curationPanelGroups}
                  playerDifficultyPanelDifficulties={playerDifficultyPanelDifficulties}
                  playerDifficultyPanelClearsByDifficulty={playerDifficultyPanelClearsByDifficulty}

                />
              </div>
            </div>

            <div className="profile-header__stats">
              <div className="profile-header__stat-rows">
                {statRows.filter(statRowFilter).map((row) => (
                  <div key={row.key} className="profile-header__stat-row">
                    <span className="profile-header__stat-label">{row.label}</span>
                    <span
                      className={`profile-header__stat-value ${row.valueClassName || ""}`}
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
                        {group.rows.filter(statRowFilter).map((row) => (
                          <div key={row.key} className="profile-header__stat-row">
                            <span className="profile-header__stat-label">{row.label}</span>
                            <span
                              className={`profile-header__stat-value ${row.valueClassName || ""}`}
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
        <div className="profile-header__name-overlay">
          <div className="profile-header__name-wrap">
            <svg className="profile-header__name-svg" dominantBaseline="hanging">
              <g
                style={{
                  transform: `translate(${config.nameXPosition}, ${config.nameYPosition})`,
                }}
              >
                <text
                  ref={overlayNameDims.textRef}
                  dx={overlayNameDx}
                  className="profile-header__name-svg-text"
                  textAnchor={config.textAlign}
                  {...nameTooltipProps}
                >
                  {displayName}
                </text>
                {showStellarBadge && showStellarInBannerOverlay ? (
                  <g className="profile-header__stellar-hit" transform={stellarIconGroupTransform}>
                    <TUFStellarIcon
                      svg
                      variant={resolvedStellarVariant}
                      className="profile-header__stellar-icon"
                      size={STELLAR_ICON_SIZE}
                      color="#fff"
                      data-tooltip-id={PROFILE_HEADER_STELLAR_TOOLTIP_ID}
                      style={{ filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))" }}
                    />
                  </g>
                ) : null}
              </g>
            </svg>
            
          </div>
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
