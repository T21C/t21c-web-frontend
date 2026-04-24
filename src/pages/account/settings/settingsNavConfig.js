/**
 * Settings hub navigation. Add rows here for new areas (billing, security, …).
 * @typedef {{
 *   path: string;
 *   labelKey: string;
 *   shortLabelKey: string;
 *   visible?: (user: object | null) => boolean;
 * }} SettingsNavItem
 * @typedef {{ id: string; labelKey: string; items: SettingsNavItem[] }} SettingsNavGroup
 */

/** @type {(user: object | null) => boolean} */
export const alwaysVisible = () => true;

/** @type {(user: object | null) => boolean} */
export const hasPlayer = (user) =>
  user != null && user.playerId != null && Number.isFinite(Number(user.playerId));

/** @type {(user: object | null) => boolean} */
export const hasCreator = (user) =>
  user != null && user.creatorId != null && Number.isFinite(Number(user.creatorId));

/** @type {SettingsNavGroup[]} */
export const SETTINGS_NAV_GROUPS = [
  {
    id: "personal",
    labelKey: "settings.nav.groups.personal",
    items: [
      {
        path: "account",
        labelKey: "settings.nav.account",
        shortLabelKey: "settings.nav.short.account",
        visible: alwaysVisible,
      },
      {
        path: "player",
        labelKey: "settings.nav.player",
        shortLabelKey: "settings.nav.short.player",
        visible: hasPlayer,
      },
      {
        path: "creator",
        labelKey: "settings.nav.creator",
        shortLabelKey: "settings.nav.short.creator",
        visible: hasCreator,
      },
    ],
  },
];

/**
 * First settings path segment the user may open (for /settings index redirect).
 * @param {object | null} user
 * @returns {string}
 */
export function getDefaultSettingsPath(user) {
  for (const group of SETTINGS_NAV_GROUPS) {
    for (const item of group.items) {
      const ok = item.visible ? item.visible(user) : true;
      if (ok) return item.path;
    }
  }
  return "account";
}
