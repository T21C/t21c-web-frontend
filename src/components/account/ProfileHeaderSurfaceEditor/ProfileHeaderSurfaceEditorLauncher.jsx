import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  customProfileBannersEnabled,
  subjectHasCustomBannerEntitlement,
} from "@/utils/profileBanners";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import {
  countImageStackEntries,
  createDefaultProfileHeaderSurfaceStyle,
  getImageStackEntryIds,
  MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES,
  parseProfileHeaderSurfaceStyle,
} from "@/utils/profileHeaderSurfaceStyle";
import { useSettings } from "@/contexts/SettingsContext";
import { deepCloneStyle } from "./profileHeaderSurfaceEditorUtils";
import ProfileHeaderSurfaceEditorPopup from "./ProfileHeaderSurfaceEditorPopup";
import "./profileHeaderSurfaceEditorLauncher.css";

export default function ProfileHeaderSurfaceEditorLauncher({
  variant,
  creatorId = null,
  authUser,
  surfaceStyle,
  styleDraft,
  onStyleDraftChange,
  surfaceImageAssets,
  onApplied,
  profilePreviewProps,
  onPreviewImageAssetsChange,
}) {
  const { t } = useTranslation(["pages"]);
  const { setHeaderSurfaceEditorOpen } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const snapshotAtOpenRef = useRef(null);
  const snapshotFollowServerRef = useRef(false);
  const snapshotImageAssetsRef = useRef(null);
  const snapshotPendingImagesRef = useRef(null);
  const [pendingImages, setPendingImages] = useState({});

  const canEdit = useMemo(() => {
    if (!customProfileBannersEnabled()) return false;
    if (!authUser) return false;
    if (variant === "player") return subjectHasCustomBannerEntitlement(authUser);
    return (
      subjectHasCustomBannerEntitlement(authUser) ||
      hasFlag(authUser, permissionFlags.HEAD_CURATOR)
    );
  }, [authUser, variant]);

  const serverStyle = useMemo(
    () => parseProfileHeaderSurfaceStyle(surfaceStyle) ?? null,
    [surfaceStyle],
  );

  const effectiveStyle = useMemo(() => {
    if (styleDraft === undefined) return serverStyle;
    if (styleDraft === null) return null;
    return parseProfileHeaderSurfaceStyle(styleDraft);
  }, [styleDraft, serverStyle]);

  const previewImageAssets = useMemo(() => {
    const base =
      surfaceImageAssets && typeof surfaceImageAssets === "object" ? { ...surfaceImageAssets } : {};
    const stack = effectiveStyle?.stack ?? [];
    for (const layerId of getImageStackEntryIds(stack)) {
      const pending = pendingImages[layerId];
      if (pending?.remove) {
        delete base[layerId];
      } else if (pending?.previewUrl) {
        base[layerId] = { assetId: base[layerId]?.assetId ?? "pending", url: pending.previewUrl };
      }
    }
    return base;
  }, [surfaceImageAssets, pendingImages, effectiveStyle?.stack]);

  useEffect(() => {
    onPreviewImageAssetsChange?.(previewImageAssets);
  }, [previewImageAssets, onPreviewImageAssetsChange]);

  useEffect(() => {
    setHeaderSurfaceEditorOpen(isOpen);
    return () => setHeaderSurfaceEditorOpen(false);
  }, [isOpen, setHeaderSurfaceEditorOpen]);

  const summaryText = useMemo(() => {
    const draft = effectiveStyle;
    const stackCount = draft?.stack?.length ?? 0;
    const imageCount = draft ? countImageStackEntries(draft.stack) : 0;
    if (!stackCount && !imageCount) {
      return t("settings.headerSurface.hint");
    }
    return t("settings.headerSurface.layersLabel", {
      count: stackCount,
      max: MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES,
    });
  }, [effectiveStyle, t]);

  const restoreOpenSnapshot = useCallback(() => {
    if (snapshotFollowServerRef.current) {
      onStyleDraftChange(undefined);
    } else if (snapshotAtOpenRef.current === null) {
      onStyleDraftChange(null);
    } else {
      onStyleDraftChange(deepCloneStyle(snapshotAtOpenRef.current));
    }
    setPendingImages(snapshotPendingImagesRef.current ?? {});
  }, [onStyleDraftChange]);

  const handleOpen = useCallback(() => {
    snapshotFollowServerRef.current = styleDraft === undefined;
    if (styleDraft === null) {
      snapshotAtOpenRef.current = null;
    } else {
      const resolved =
        styleDraft === undefined
          ? parseProfileHeaderSurfaceStyle(surfaceStyle)
          : parseProfileHeaderSurfaceStyle(styleDraft);
      snapshotAtOpenRef.current = deepCloneStyle(
        resolved ?? createDefaultProfileHeaderSurfaceStyle(),
      );
    }
    snapshotImageAssetsRef.current = surfaceImageAssets ? { ...surfaceImageAssets } : null;
    snapshotPendingImagesRef.current = pendingImages
      ? Object.fromEntries(
          Object.entries(pendingImages).map(([id, entry]) => [id, { ...entry, file: entry.file ?? null }]),
        )
      : null;
    setIsOpen(true);
  }, [styleDraft, surfaceStyle, surfaceImageAssets, pendingImages]);

  const handleDiscardDraft = useCallback(() => {
    restoreOpenSnapshot();
  }, [restoreOpenSnapshot]);

  const mergedPreviewProps = useMemo(
    () => ({
      ...profilePreviewProps,
      headerSurfaceImageAssets: previewImageAssets,
    }),
    [profilePreviewProps, previewImageAssets],
  );

  if (!canEdit) {
    return (
      <div className="profile-header-surface-launcher profile-header-surface-launcher--locked">
        <p className="profile-header-surface-launcher__hint">{t("settings.headerSurface.lockedHint")}</p>
        {serverStyle || Object.keys(surfaceImageAssets ?? {}).length > 0 ? (
          <p className="profile-header-surface-launcher__hint">
            {t("settings.headerSurface.lockedHasSaved")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="profile-header-surface-launcher">
      <p className="profile-header-surface-launcher__summary">{summaryText}</p>
      <button type="button" className="btn-fill-primary" onClick={handleOpen}>
        {t("settings.headerSurface.openEditor")}
      </button>

      <ProfileHeaderSurfaceEditorPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        snapshotAtOpen={snapshotAtOpenRef.current}
        snapshotFollowServer={snapshotFollowServerRef.current}
        onRestoreOpenSnapshot={restoreOpenSnapshot}
        onDiscardDraft={handleDiscardDraft}
        variant={variant}
        creatorId={creatorId}
        authUser={authUser}
        surfaceStyle={surfaceStyle}
        styleDraft={styleDraft}
        onStyleDraftChange={onStyleDraftChange}
        surfaceImageAssets={surfaceImageAssets}
        onApplied={onApplied}
        profilePreviewProps={mergedPreviewProps}
        snapshotPendingImages={snapshotPendingImagesRef.current}
        onPendingImagesChange={setPendingImages}
      />
    </div>
  );
}

