// tuf-search: #SettingsIndexRedirect #settingsIndexRedirect #account #settings
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultSettingsPath } from "./settingsNavConfig";

const SettingsIndexRedirect = () => {
  const { user } = useAuth();
  const path = getDefaultSettingsPath(user);
  return <Navigate to={`/settings/${path}`} replace />;
};

export default SettingsIndexRedirect;
