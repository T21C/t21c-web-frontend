// tuf-search: #TufStellarRoute #PrivateRoute
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isTufStellarEnabledForUser } from "@/utils/tufStellarFeature";

/**
 * Renders children only when the server reports TUFStellar is enabled for this session.
 */
export function TufStellarRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loader loader-level-detail" />;
  }
  if (!isTufStellarEnabledForUser(user)) {
    return <Navigate to="/settings/billing" replace />;
  }
  return children;
}
