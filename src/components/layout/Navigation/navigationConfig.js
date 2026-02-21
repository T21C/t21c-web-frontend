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
      translationKey: "navigation.main.dropdowns.user.myProfile",
    },
    {
      disabled: true,
      badge: "navigation.main.badges.underConstruction",
      to: "/submission",
      translationKey: "navigation.main.dropdowns.user.mySubmissions",
    },
    { divider: true },
    {
      disabled: true,
      translationKey: "navigation.main.dropdowns.user.notifications",
      badge: "navigation.main.badges.underConstruction",
    },
    {
      disabled: true,
      translationKey: "navigation.main.dropdowns.user.settings",
      badge: "navigation.main.badges.underConstruction",
    },
    { divider: true },
    ...(isAdmin
      ? [
          {
            to: "/admin",
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
        translationKey: "navigation.main.links.levels",
      },
      {
        type: "link",
        to: "/leaderboard",
        translationKey: "navigation.main.links.leaderboard",
      },
      {
        type: "dropdown",
        label: "navigation.main.links.creators",
        items: [
          //{ to: "/admin/creators", translationKey: "navigation.main.dropdowns.creators.adofaiCreators" },
          { to: "/songs", translationKey: "navigation.main.dropdowns.creators.songs" },
          { to: "/artists", translationKey: "navigation.main.dropdowns.creators.artists" },
        ],
        isActive: (pathname) =>
          //pathname.startsWith("/admin/creators") ||
          pathname.startsWith("/artists") ||
          pathname.startsWith("/songs"),
      },
      {
        type: "link",
        to: "/packs",
        translationKey: "navigation.main.links.packs",
      },
      {
        type: "dropdown",
        label: "navigation.main.links.more",
        items: [
          { to: "/passes", translationKey: "navigation.main.dropdowns.more.passes" },
          { to: "/rating", translationKey: "navigation.main.dropdowns.more.rating" },
          { to: "/admin/curations", translationKey: "navigation.main.dropdowns.admin.curations" },
          { divider: true },
          {
            disabled: true,
            translationKey: "navigation.main.dropdowns.more.tufHelper",
            badge: "navigation.main.badges.underConstruction",
          },
          { divider: true },
          { to: "/terms-of-service", translationKey: "navigation.main.dropdowns.more.tos" },
          { to: "/privacy-policy", translationKey: "navigation.main.dropdowns.more.privacyPolicy" },
          { to: "/about", translationKey: "navigation.main.dropdowns.more.aboutUs" },
        ],
        isActive: (pathname) =>
          pathname.startsWith("/passes") ||
          pathname.startsWith("/admin/curations") ||
          pathname.startsWith("/rating") ||
          pathname.startsWith("/terms-of-service") ||
          pathname.startsWith("/privacy-policy") ||
          pathname === "/about",
      },
    ],

    // Right navigation items
    rightNav: [
      {
        type: "dropdown",
        label: "navigation.main.links.admin.admin",
        items: [
          { to: "/admin/submissions", translationKey: "navigation.main.dropdowns.admin.submissions" },
          { to: "/admin/announcements", translationKey: "navigation.main.dropdowns.admin.announcements" },
          { to: "/admin/curations", translationKey: "navigation.main.dropdowns.admin.curations" },
          { divider: true },
          { to: "/admin/songs", translationKey: "navigation.main.dropdowns.admin.songs" },
          { to: "/admin/artists", translationKey: "navigation.main.dropdowns.admin.artists" },
          { to: "/admin/creators", translationKey: "navigation.main.dropdowns.admin.creators" },
          { divider: true },
          { to: "/admin/difficulties", translationKey: "navigation.main.dropdowns.admin.difficulties" },
          { to: "/admin/backups", translationKey: "navigation.main.dropdowns.admin.backups" },
          { to: "/admin/audit-log", translationKey: "navigation.main.dropdowns.admin.auditLog" },
        ],
        isActive: (pathname) => pathname.startsWith("/admin"),
        // Only show admin dropdown if user is admin
        condition: () => hasFlag(user, permissionFlags.SUPER_ADMIN),
      },
      {
        type: "link",
        to: "/submission",
        translationKey: "navigation.main.links.submission",
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
          translationKey: "navigation.main.links.signIn",
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
