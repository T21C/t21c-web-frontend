import { Navigate, useLocation } from "react-router-dom";

/**
 * Renders a redirect to the path returned by the given redirect function.
 * Use with deprecated route config so old URLs (e.g. /leveldetail?id=123) go to new routes (e.g. /levels/123).
 */
export function DeprecatedRedirect({ redirect }) {
  const location = useLocation();
  const to = redirect(location);
  return <Navigate to={to} replace />;
}
