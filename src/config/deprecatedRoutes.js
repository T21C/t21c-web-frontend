/**
 * Deprecated route definitions for redirecting old URLs to current routes.
 * Each entry: { path, redirect } where redirect(location) returns the target path.
 * @param {Location} location - react-router useLocation() result (pathname, search, hash, state)
 * @returns {string} Target path to navigate to (replace)
 */
export const DEPRECATED_ROUTES = [
  {
    path: "leveldetail",
    redirect: (location) => {
      const params = new URLSearchParams(location.search || "");
      const id = params.get("id");
      return id ? `/levels/${id}` : "/levels";
    },
  },

  {
    path: "admin/rating",
    redirect: (location) => `/rating${location.hash || ""}`,
  },
  {
    path: "admin/ratings",
    redirect: (location) => `/rating${location.hash || ""}`,
  },

  // Add more deprecated routes here, e.g.:
  // {
  //   path: "oldpass",
  //   redirect: (location) => {
  //     const id = new URLSearchParams(location.search || "").get("id");
  //     return id ? `/passes/${id}` : "/passes";
  //   },
  // },
];
