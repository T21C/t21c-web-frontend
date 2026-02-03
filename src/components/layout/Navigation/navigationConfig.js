import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

/**
 * Navigation configuration
 * Centralized configuration for navigation items
 * 
 * This config completely defines the navigation structure.
 * The Navigation component is data-driven and renders based on this config.
 */

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
      translationKey: "dropdowns.user.myProfile",
    },
    {
      disabled: true,
      badge: "badges.underConstruction",
      to: "/submission",
      translationKey: "dropdowns.user.mySubmissions",
    },
    { divider: true },
    {
      disabled: true,
      translationKey: "dropdowns.user.notifications",
      badge: "badges.underConstruction",
    },
    {
      disabled: true,
      translationKey: "dropdowns.user.settings",
      badge: "badges.underConstruction",
    },
    { divider: true },
    ...(isAdmin
      ? [
          {
            to: "/admin",
            translationKey: "dropdowns.user.admin",
          },
          { divider: true },
        ]
      : []),
  ];
};

/**
 * Creates a navigation configuration
 * @param {Function} getTranslation - Function to get translations
 * @param {Object} context - Context object with user, location, etc.
 * @returns {Object} Complete navigation configuration
 */
export const createNavigationConfig = (getTranslation, context = {}) => {
  const { user, location } = context;

  return {
    // Logo configuration
    logo: {
      to: "/",
      component: null, // Will use default LogoFullOutlineSVG
    },

    // Left navigation items
    leftNav: [
      {
        type: "link",
        to: "/levels",
        translationKey: "links.levels",
      },
      {
        type: "link",
        to: "/leaderboard",
        translationKey: "links.leaderboard",
      },
      {
        type: "dropdown",
        label: "links.creators",
        items: [
          //{ to: "/admin/creators", translationKey: "dropdowns.creators.adofaiCreators" },
          { to: "/artists", translationKey: "dropdowns.creators.artists" },
          { to: "/songs", translationKey: "dropdowns.creators.songs" },
        ],
        isActive: (pathname) =>
          //pathname.startsWith("/admin/creators") ||
          pathname.startsWith("/artists") ||
          pathname.startsWith("/songs"),
      },
      {
        type: "link",
        to: "/packs",
        translationKey: "links.packs",
      },
      {
        type: "dropdown",
        label: "links.more",
        items: [
          { to: "/passes", translationKey: "dropdowns.more.passes" },
          { to: "/admin/rating", translationKey: "dropdowns.more.rating" },
          { divider: true },
          {
            disabled: true,
            translationKey: "dropdowns.more.tufHelper",
            badge: "badges.underConstruction",
          },
          { divider: true },
          { to: "/terms-of-service", translationKey: "dropdowns.more.tos" },
          { to: "/privacy-policy", translationKey: "dropdowns.more.privacyPolicy" },
          { to: "/about", translationKey: "dropdowns.more.aboutUs" },
        ],
        isActive: (pathname) =>
          pathname.startsWith("/passes") ||
          pathname.startsWith("/admin/rating") ||
          pathname.startsWith("/terms-of-service") ||
          pathname.startsWith("/privacy-policy") ||
          pathname === "/about",
      },
    ],

    // Right navigation items
    rightNav: [
      {
        type: "dropdown",
        label: "links.admin.admin",
        items: [
          { to: "/admin/submissions", translationKey: "dropdowns.admin.submissions" },
          { to: "/admin/announcements", translationKey: "dropdowns.admin.announcements" },
          { to: "/admin/curations", translationKey: "dropdowns.admin.curations" },
          { divider: true },
          { to: "/admin/songs", translationKey: "dropdowns.admin.songs" },
          { to: "/admin/artists", translationKey: "dropdowns.admin.artists" },
          { to: "/admin/creators", translationKey: "dropdowns.admin.creators" },
          { divider: true },
          { to: "/admin/difficulties", translationKey: "dropdowns.admin.difficulties" },
          { to: "/admin/backups", translationKey: "dropdowns.admin.backups" },
          { to: "/admin/audit-log", translationKey: "dropdowns.admin.auditLog" },
        ],
        isActive: (pathname) => pathname.startsWith("/admin"),
        // Only show admin dropdown if user is admin
        condition: () => hasFlag(user, permissionFlags.SUPER_ADMIN),
      },
      {
        type: "link",
        to: "/submission",
        translationKey: "links.submission",
        className: "nav-submit-button",
        linkClassName: "no-active",
        isActive: (pathname) => {return false},
      },
      {
        type: "component",
        component: "LanguageSelector",
        props: {
          variant: "desktop",
        },
      },
      {
        type: "component",
        component: "UserMenu",
        props: {
          isActive: (pathname) =>
            pathname.startsWith("/profile")
        },
        // Conditional rendering based on user
        condition: () => !!user,
        // Fallback when condition is false
        fallback: {
          type: "button",
          translationKey: "links.signIn",
          className: "nav-signin-button",
          onClick: (initiateLogin) => () => {
            initiateLogin(window.location.pathname);
          },
        },
      },
    ],

    // Mobile menu uses leftNav + rightNav directly
    // No separate mobileMenu.items needed - it's derived from the config above
  };
};

/**
 * Default navigation configuration (for backward compatibility)
 * Uses default values when context is not available
 */
export const navigationConfig = createNavigationConfig(() => {}, {});
