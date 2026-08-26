// tuf-search: #navigationConfig #layout #navigation
import { ExternalLinkIcon, TUFHelperLiteIcon } from "@/components/common/icons";
import { ChromeIcon } from "@/components/common/icons/ChromeIcon";
import { FirefoxIcon } from "@/components/common/icons/FirefoxIcon";
import { showTufHelperLiteIntegrationBanner } from "@/hooks/useTufHelperLiteIpc";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

/**
 * Navigation configuration
 * Centralized configuration for navigation items
 *
 * This config completely defines the navigation structure.
 * The Navigation component is data-driven and renders based on this config.
 */

const tufExtensionLinks = {
  chrome: {
    to: "https://chromewebstore.google.com/detail/tufextension/nfbkilgekbcbaipecmehlnlakccgbcfa",
    translationKey: "navigation.main.dropdowns.more.tufExtension",
    attachIcon: <ExternalLinkIcon size={16} color="var(--color-white-t80)" />,
    icon: <ChromeIcon size={24} />,
  },
  firefox: {
    to: "https://addons.mozilla.org/en-US/firefox/addon/tufextension/",
    translationKey: "navigation.main.dropdowns.more.tufExtension",
    attachIcon: <ExternalLinkIcon size={16} color="var(--color-white-t80)" />,
    icon: <FirefoxIcon size={24} />,
  },
};

function getTufExtensionVer() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("chrome") || ua.includes("edg") || ua.includes("opr")) {
    return tufExtensionLinks.chrome;
  }
  if (ua.includes("firefox")) {
    return tufExtensionLinks.firefox;
  }
  return null;
}

export function isInternalNavPath(to) {
  return typeof to === "string" && to.startsWith("/") && !to.startsWith("//");
}

export function isExternalNavPath(to) {
  return typeof to === "string" && /^https?:\/\//i.test(to);
}

function isNavItemVisible(item) {
  if (!item || typeof item !== "object") return false;
  if (item.divider) return true;
  return Boolean(item.to || item.onClick || item.disabled || item.translationKey || item.label);
}

export function getSectionParentTo(items = []) {
  const first = items.find(
    (item) =>
      isNavItemVisible(item) &&
      !item.divider &&
      isInternalNavPath(item.to) &&
      !item.onClick &&
      !item.suppressActive,
  );
  return first?.to ?? null;
}

export function pathMatchesNavTo(pathname, to, { exact = false } = {}) {
  if (!isInternalNavPath(to) || typeof pathname !== "string") return false;
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function sectionIsActive(items = [], pathname) {
  return items.some(
    (item) =>
      item &&
      !item.divider &&
      !item.suppressActive &&
      pathMatchesNavTo(pathname, item.to, { exact: item.exact }),
  );
}

function createSection({ id, label, items, condition, menuAlign, className }) {
  const cleaned = (items || []).filter(isNavItemVisible);
  return {
    type: "dropdown",
    id,
    label,
    items: cleaned,
    linkTo: getSectionParentTo(cleaned),
    isActive: (pathname) => sectionIsActive(cleaned, pathname),
    condition,
    menuAlign,
    className,
  };
}

/**
 * Creates user menu items configuration
 * @param {Object} user - User object
 * @returns {Array|null} Array of user menu items or null if no user
 */
export const createUserMenuItems = (user) => {
  if (!user) return null;

  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  return [
    {
      to: "/profile",
      translationKey: "navigation.main.dropdowns.user.myProfile",
    },
    ...(user.tufStellarEnabled
      ? [
          {
            to: "/tuf-stellar",
            translationKey: "navigation.main.dropdowns.user.tufStellar",
          },
        ]
      : []),
    {
      to: "/submissions",
      translationKey: "navigation.main.dropdowns.user.mySubmissions",
    },
    { divider: true },
    {
      to: "/notifications",
      translationKey: "navigation.main.dropdowns.user.notifications",
    },
    {
      translationKey: "navigation.main.dropdowns.user.settings",
      to: "/settings",
    },
    { divider: true },
    ...(isAdmin
      ? [
          {
            to: "/admin",
            exact: true,
            translationKey: "navigation.main.dropdowns.user.admin",
          },
          { divider: true },
        ]
      : []),
  ];
};

/**
 * Creates a navigation configuration
 * @param {Object} context - Context object with user, location, etc.
 * @returns {Object} Complete navigation configuration
 */
export const createNavigationConfig = (context = {}) => {
  const { user } = context;
  const tufExtension = getTufExtensionVer();

  return {
    logo: {
      to: "/",
      component: null,
    },

    leftNav: [
      createSection({
        id: "levels",
        label: "navigation.main.sections.levels",
        items: [
          { to: "/levels", translationKey: "navigation.main.dropdowns.levels.listing" },
          { to: "/packs", translationKey: "navigation.main.links.packs" },
          { to: "/passes", translationKey: "navigation.main.dropdowns.more.passes" },
          { to: "/rating", translationKey: "navigation.main.links.rating" },
          { to: "/admin/curations", translationKey: "navigation.main.dropdowns.admin.curations" },
        ],
      }),
      createSection({
        id: "rankings",
        label: "navigation.main.sections.rankings",
        items: [
          { to: "/leaderboard", translationKey: "navigation.main.links.leaderboard" },
        ],
      }),
      createSection({
        id: "creators",
        label: "navigation.main.sections.creators",
        items: [
          { to: "/creators", translationKey: "navigation.main.dropdowns.creators.listing" },
          { to: "/artists", translationKey: "navigation.main.dropdowns.creators.artists" },
          { to: "/songs", translationKey: "navigation.main.dropdowns.creators.songs" },
        ],
      }),
      createSection({
        id: "tools",
        label: "navigation.main.sections.tools",
        items: [
          {
            to: "/submission/pass/calculator",
            translationKey: "navigation.main.dropdowns.tools.scoreCalculator",
          },
          {
            to: "https://github.com/coyami-ke/TUFHelper/releases",
            translationKey: "navigation.main.dropdowns.more.tufHelper",
            attachIcon: <ExternalLinkIcon size={16} color="var(--color-white-t80)" />,
          },
          {
            to: "/levels",
            translationKey: "navigation.main.dropdowns.more.tufHelperLite",
            onClick: showTufHelperLiteIntegrationBanner,
            suppressActive: true,
            icon: <TUFHelperLiteIcon size={24} />,
          },
          tufExtension,
        ],
      }),
      createSection({
        id: "help",
        label: "navigation.main.sections.help",
        items: [
          { to: "/about", translationKey: "navigation.main.dropdowns.more.aboutUs" },
          { to: "/terms-of-service", translationKey: "navigation.main.dropdowns.more.tos" },
          { to: "/privacy-policy", translationKey: "navigation.main.dropdowns.more.privacyPolicy" },
          {
            to: "https://api.tuforums.com/docs/",
            translationKey: "navigation.main.dropdowns.more.apiDocs",
            attachIcon: <ExternalLinkIcon size={16} color="var(--color-white-t80)" />,
          },
          { to: "/asset-list", translationKey: "navigation.main.dropdowns.more.assets" },
          { to: "/developers", translationKey: "navigation.main.dropdowns.more.developers" },
        ],
      }),
    ],

    rightNav: [
      createSection({
        id: "admin",
        label: "navigation.main.links.admin.admin",
        menuAlign: "right",
        items: [
          { to: "/admin/submissions", translationKey: "navigation.main.dropdowns.admin.submissions" },
          { to: "/admin/announcements", translationKey: "navigation.main.dropdowns.admin.announcements" },
          { to: "/admin/curations", translationKey: "navigation.main.dropdowns.admin.curations" },
          { divider: true },
          { to: "/admin/songs", translationKey: "navigation.main.dropdowns.admin.songs" },
          { to: "/admin/artists", translationKey: "navigation.main.dropdowns.admin.artists" },
          { to: "/admin/creators", translationKey: "navigation.main.dropdowns.admin.creators" },
          { to: "/admin/tournaments", translationKey: "navigation.main.dropdowns.admin.tournaments" },
          { divider: true },
          { to: "/admin/difficulties", translationKey: "navigation.main.dropdowns.admin.difficulties" },
          { to: "/admin/backups", translationKey: "navigation.main.dropdowns.admin.backups" },
          { to: "/admin/audit-log", translationKey: "navigation.main.dropdowns.admin.auditLog" },
        ],
        condition: () => hasFlag(user, permissionFlags.SUPER_ADMIN),
      }),
      {
        type: "link",
        to: "/submission",
        translationKey: "navigation.main.links.submission",
        className: "nav-submit-button btn-fill-primary alt",
        linkClassName: "no-active",
        isActive: () => false,
      },
      {
        type: "component",
        id: "language",
        component: "LanguageSelector",
        props: {
          variant: "desktop",
        },
      },
      {
        type: "component",
        id: "user",
        component: "UserMenu",
        props: {
          isActive: (pathname) =>
            sectionIsActive(createUserMenuItems(user) || [], pathname),
        },
        condition: () => !!user,
        fallback: {
          type: "button",
          translationKey: "navigation.main.links.signIn",
          className: "nav-signin-button",
          onClick: (initiateLogin) => () => {
            initiateLogin(window.location.pathname);
          },
        },
      },
    ],
  };
};

/**
 * Default navigation configuration (for backward compatibility)
 * Uses default values when context is not available
 */
export const navigationConfig = createNavigationConfig({});
