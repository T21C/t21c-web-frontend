import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";

const PREVIEW_WIDTH_MIN_PX = 280;
/** Matches `.profile-header { max-width: 50rem }` */
const PROFILE_HEADER_MAX_PX = 800;

export default function ProfileHeaderSurfacePreviewFrame({ isOpen, previewProps }) {
  const { t } = useTranslation("pages");
  const stageRef = useRef(null);
  const [previewWidthPx, setPreviewWidthPx] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewWidthPx(null);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const syncToStage = () => {
      const stageWidth = stage.clientWidth;
      if (stageWidth <= 0) return;
      const defaultW = Math.min(stageWidth, PROFILE_HEADER_MAX_PX);
      setPreviewWidthPx((prev) => {
        if (prev == null) return defaultW;
        return Math.min(PROFILE_HEADER_MAX_PX, Math.max(PREVIEW_WIDTH_MIN_PX, prev));
      });
    };

    syncToStage();
    const ro = new ResizeObserver(syncToStage);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [isOpen]);

  const beginResize = useCallback(
    (ev) => {
      ev.preventDefault();
      const stage = stageRef.current;
      const startX = ev.clientX;
      const startW = previewWidthPx ?? stage?.clientWidth ?? PROFILE_HEADER_MAX_PX;

      const onMove = (moveEv) => {
        const dx = moveEv.clientX - startX;
        setPreviewWidthPx(
          Math.min(
            PROFILE_HEADER_MAX_PX,
            Math.max(PREVIEW_WIDTH_MIN_PX, startW + dx),
          ),
        );
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [previewWidthPx],
  );

  const displayWidth = previewWidthPx ?? PREVIEW_WIDTH_MIN_PX;

  return (
    <div className="profile-header-surface-popup__preview">
      <div className="profile-header-surface-popup__preview-head">
        <span className="profile-header-surface-popup__preview-label">
          {t("settings.headerSurface.previewWidthLabel")}
        </span>
        <span className="profile-header-surface-popup__preview-width-value" aria-live="polite">
          {Math.round(displayWidth)}px
        </span>
      </div>
      <div className="profile-header-surface-popup__preview-stage" ref={stageRef}>
        <div
          className="profile-header-surface-popup__preview-viewport"
          style={previewWidthPx != null ? { width: `${previewWidthPx}px` } : undefined}
        >
          <ProfileHeader
            {...previewProps}
            className="profile-header-surface-popup__profile-header"
          />
        </div>
        <button
          type="button"
          className="profile-header-surface-popup__preview-resize-handle"
          aria-label={t("settings.headerSurface.previewResizeAria")}
          onPointerDown={beginResize}
        />
      </div>
    </div>
  );
}
