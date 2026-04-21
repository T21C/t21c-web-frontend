import "./profileheader.css";
import UserAvatar from "@/components/layout/UserAvatar/UserAvatar";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import { isoToEmoji } from "@/utils";

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
  { key: "p", letter: "P", count: 0, color: "#3b82f6" },
  { key: "g", letter: "G", count: 0, color: "#eab308" },
  { key: "u", letter: "U", count: 0, color: "#c4b5fd" },
  { key: "x", letter: "+", count: 0, color: "#f97316" },
  { key: "y", letter: "+", count: 0, color: "#4a2f63" },
];

const DEFAULT_CREATOR_ICON_SLOTS = [
  { key: "c1", letter: "?", count: 0, color: "var(--color-purple-1)" },
  { key: "c2", letter: "?", count: 0, color: "var(--color-purple-2)" },
  { key: "c3", letter: "?", count: 0, color: "var(--color-purple-3)" },
  { key: "c4", letter: "?", count: 0, color: "var(--color-gray-2)" },
  { key: "c5", letter: "?", count: 0, color: "var(--color-black-t50)" },
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
 * Presentational: parents supply statRows, actions, and optional iconSlots.
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
  actions = null,
  verificationBadge = null,
  showChevron = true,
}) => {
  const defaults =
    mode === "creator" ? DEFAULT_CREATOR_ICON_SLOTS : DEFAULT_PLAYER_ICON_SLOTS;
  const resolvedSlots = padIconSlots(iconSlots, defaults);

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

  const rootClass = ["profile-header", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div
        className="profile-header__banner"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
        aria-hidden
      />
      <div className="profile-header__inner">
        <div className="profile-header__actions" role="toolbar" aria-label="Profile actions">
          {actions}
        </div>
        <div className="profile-header__body">
        <div className="profile-header__left">
          <div className="profile-header__avatar-wrap">
            <UserAvatar
              primaryUrl={avatarUrl}
              fallbackUrl={fallbackAvatarUrl}
              className="profile-header__avatar"
            />
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
          <div className="profile-header__name-row">
            {showChevron ? (
              <button
                type="button"
                className="profile-header__chevron-btn"
                aria-hidden
                tabIndex={-1}
                disabled
              >
                <ChevronIcon direction="down" color="var(--color-white)" size={14} />
              </button>
            ) : null}
            <h1 className="profile-header__name">{name || "—"}</h1>
            {verificationBadge ? (
              <span className="profile-header__verification">{verificationBadge}</span>
            ) : null}
          </div>
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
          </div>
          <div className="profile-header__icon-row">
            <div className="profile-header__icon-slots">
              {resolvedSlots.map((slot) => (
                <div
                  key={slot.key}
                  className="profile-header__icon-slot"
                  style={{ background: slot.color }}
                  title={slot.title}
                >
                  <span className="profile-header__icon-slot-letter">{slot.letter}</span>
                  <span className="profile-header__icon-slot-count">{slot.count ?? 0}</span>
                  <span className="profile-header__icon-slot-badge">{slot.badge ?? slot.count ?? 0}</span>
                </div>
              ))}
            </div>
            {showChevron ? (
              <button
                type="button"
                className="profile-header__chevron-btn profile-header__chevron-btn--row"
                aria-hidden
                tabIndex={-1}
                disabled
              >
                <ChevronIcon direction="down" color="var(--color-white)" size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="profile-header__stats">
          <div className="profile-header__stat-rows">
            {statRows.map((row) => (
              <div key={row.key} className="profile-header__stat-row">
                <span className="profile-header__stat-label">{row.label}</span>
                <span className={["profile-header__stat-value", row.valueClassName || ""].filter(Boolean).join(" ")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          {showChevron ? (
            <button
              type="button"
              className="profile-header__chevron-btn profile-header__chevron-btn--stats"
              aria-hidden
              tabIndex={-1}
              disabled
            >
              <ChevronIcon direction="down" color="var(--color-white)" size={14} />
            </button>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
