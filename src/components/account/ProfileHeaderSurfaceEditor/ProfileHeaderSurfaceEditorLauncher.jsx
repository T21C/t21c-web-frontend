import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  customProfileBannersEnabled,
  subjectHasCustomBannerEntitlement,
} from "@/utils/profileBanners";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import {
  countGradientStackEntries,
  parseProfileHeaderSurfaceStyle,
} from "@/utils/profileHeaderSurfaceStyle";
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
  surfaceImageUrl,
  onApplied,
  profilePreviewProps,
  onPreviewImageUrlChange,
}) {
  const { t } = useTranslation(["pages"]);
  const [isOpen, setIsOpen] = useState(false);
  const snapshotAtOpenRef = useRef(null);
  const snapshotImageUrlRef = useRef(null);
  const snapshotPendingImageRef = useRef(null);
  const [pendingImage, setPendingImage] = useState(null);

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

  const previewImageUrl = useMemo(() => {
    if (pendingImage?.remove) return null;
    if (pendingImage?.previewUrl) return pendingImage.previewUrl;
    return surfaceImageUrl ?? null;
  }, [pendingImage, surfaceImageUrl]);

  useEffect(() => {
    onPreviewImageUrlChange?.(previewImageUrl);
  }, [previewImageUrl, onPreviewImageUrlChange]);

  const summaryText = useMemo(() => {
    const draft =
      styleDraft === undefined
        ? serverStyle
        : styleDraft === null
          ? null
          : parseProfileHeaderSurfaceStyle(styleDraft);
    const gradientCount = draft ? countGradientStackEntries(draft.stack) : 0;
    const hasImage = Boolean(previewImageUrl);
    if (!gradientCount && !hasImage) {
      return t("settings.headerSurface.hint");
    }
    return t("settings.headerSurface.layersLabel", { count: gradientCount, max: 10 });
  }, [styleDraft, serverStyle, previewImageUrl, t]);

  const handleOpen = useCallback(() => {
    if (styleDraft === undefined) {
      snapshotAtOpenRef.current = undefined;
    } else if (styleDraft === null) {
      snapshotAtOpenRef.current = null;
    } else {
      snapshotAtOpenRef.current = deepCloneStyle(parseProfileHeaderSurfaceStyle(styleDraft));
    }
    snapshotImageUrlRef.current = surfaceImageUrl ?? null;
    snapshotPendingImageRef.current = pendingImage
      ? { ...pendingImage, file: pendingImage.file ?? null }
      : null;
    setIsOpen(true);
  }, [styleDraft, surfaceImageUrl, pendingImage]);

  const handleDiscardDraft = useCallback(() => {
    const snap = snapshotAtOpenRef.current;
    if (snap === undefined) {
      onStyleDraftChange(undefined);
    } else if (snap === null) {
      onStyleDraftChange(null);
    } else {
      onStyleDraftChange(deepCloneStyle(snap));
    }
    setPendingImage(snapshotPendingImageRef.current);
  }, [onStyleDraftChange]);

  const mergedPreviewProps = useMemo(
    () => ({
      ...profilePreviewProps,
      headerSurfaceImageUrl: previewImageUrl,
    }),
    [profilePreviewProps, previewImageUrl],
  );

  if (!canEdit) {
    return (
      <div className="profile-header-surface-launcher profile-header-surface-launcher--locked">
        <p className="profile-header-surface-launcher__hint">{t("settings.headerSurface.lockedHint")}</p>
        {serverStyle || surfaceImageUrl ? (
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
        onDiscardDraft={handleDiscardDraft}
        variant={variant}
        creatorId={creatorId}
        authUser={authUser}
        surfaceStyle={surfaceStyle}
        styleDraft={styleDraft}
        onStyleDraftChange={onStyleDraftChange}
        surfaceImageUrl={surfaceImageUrl}
        onApplied={onApplied}
        profilePreviewProps={mergedPreviewProps}
        snapshotImageUrl={snapshotImageUrlRef.current}
        snapshotPendingImage={snapshotPendingImageRef.current}
        onPendingImageChange={setPendingImage}
      />
    </div>
  );
}
