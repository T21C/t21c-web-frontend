// tuf-search: #SettingsContext #settingsContext
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "settings.layout.profileBannerExpanded";

const SettingsContext = createContext(null);

function readStoredExpanded() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return false;
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

function writeStoredExpanded(expanded) {
  try {
    localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export function SettingsProvider({ children }) {
  const [profileBannerExpanded, setProfileBannerExpandedState] = useState(readStoredExpanded);
  const [previewFocusSectionId, setPreviewFocusSectionId] = useState(null);
  /** True while the header-surface edit popup is open (survives tab visibility refetches). */
  const [headerSurfaceEditorOpen, setHeaderSurfaceEditorOpen] = useState(false);

  const setProfileBannerExpanded = useCallback((next) => {
    setProfileBannerExpandedState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const bool = Boolean(resolved);
      writeStoredExpanded(bool);
      return bool;
    });
  }, []);

  const value = useMemo(
    () => ({
      profileBannerExpanded,
      setProfileBannerExpanded,
      previewFocusSectionId,
      setPreviewFocusSectionId,
      headerSurfaceEditorOpen,
      setHeaderSurfaceEditorOpen,
    }),
    [
      profileBannerExpanded,
      setProfileBannerExpanded,
      previewFocusSectionId,
      headerSurfaceEditorOpen,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
