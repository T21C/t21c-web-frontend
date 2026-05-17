// tuf-search: #ProfileHeaderSurfaceEditorPopup
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CloseButton } from "@/components/common/buttons";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { useProfileHeaderSurfaceEditor } from "./useProfileHeaderSurfaceEditor";
import ProfileHeaderSurfaceLayerList from "./ProfileHeaderSurfaceLayerList";
import ProfileHeaderSurfaceLayerSettings from "./ProfileHeaderSurfaceLayerSettings";
import ProfileHeaderSurfaceImageSettings from "./ProfileHeaderSurfaceImageSettings";
import { SURFACE_STACK_KIND_GRADIENT, SURFACE_STACK_KIND_IMAGE } from "@/utils/profileHeaderSurfaceStyle";
import "./profileHeaderSurfaceEditorPopup.css";
import { getPortalRoot } from "@/utils/portalRoot";

export default function ProfileHeaderSurfaceEditorPopup({
  isOpen,
  onClose,
  snapshotAtOpen,
  onDiscardDraft,
  variant,
  creatorId = null,
  authUser,
  surfaceStyle,
  styleDraft,
  onStyleDraftChange,
  surfaceImageUrl,
  onApplied,
  profilePreviewProps,
  snapshotImageUrl = null,
  snapshotPendingImage = null,
  onPendingImageChange,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const panelRef = useRef(null);
  const [selectedStackIndex, setSelectedStackIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const editor = useProfileHeaderSurfaceEditor({
    variant,
    creatorId,
    authUser,
    surfaceStyle,
    styleDraft,
    onStyleDraftChange,
    surfaceImageUrl,
    onApplied,
    snapshotAtOpen,
    snapshotImageUrl,
    snapshotPendingImage,
  });

  const {
    workingStack,
    patchWorking,
    patchStackEntry,
    gradientTypeOptions,
    addLayer,
    insertImageLayer,
    moveLayer,
    removeLayer,
    imageSettings,
    previewImageUrl,
    fileInputRef,
    saveBusy,
    handleSaveStyle,
    handleResetStyle,
    handleClearStyle,
    selectImageFile,
    markImageRemoved,
    isDirtySinceOpen,
    hasStyleChanges,
    stackHasImageLayer,
  } = editor;

  useEffect(() => {
    onPendingImageChange?.(editor.pendingImage);
  }, [editor.pendingImage, onPendingImageChange]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setDrawerOpen(false);
    setSelectedStackIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (selectedStackIndex >= workingStack.length) {
      setSelectedStackIndex(Math.max(0, workingStack.length - 1));
    }
  }, [workingStack.length, selectedStackIndex]);

  const requestClose = useCallback(() => {
    if (isDirtySinceOpen && !window.confirm(t("settings.headerSurface.closeConfirm"))) {
      return;
    }
    if (isDirtySinceOpen) {
      onDiscardDraft?.();
    }
    onClose();
  }, [isDirtySinceOpen, onClose, onDiscardDraft, t]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        requestClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, requestClose]);

  const handleBackdropClick = (ev) => {
    if (panelRef.current && !panelRef.current.contains(ev.target)) {
      requestClose();
    }
  };

  const handleSaveAndClose = async () => {
    const ok = await handleSaveStyle();
    if (ok) onClose();
  };

  const handleRemoveStackLayer = (stackIndex) => {
    const entry = workingStack[stackIndex];
    if (entry?.kind === SURFACE_STACK_KIND_IMAGE) {
      markImageRemoved();
    }
    removeLayer(stackIndex);
    if (selectedStackIndex === stackIndex) {
      const nextLen = workingStack.length - 1;
      setSelectedStackIndex(nextLen > 0 ? Math.min(stackIndex, nextLen - 1) : 0);
    } else if (selectedStackIndex > stackIndex) {
      setSelectedStackIndex(selectedStackIndex - 1);
    }
  };

  if (!isOpen) return null;

  const selectedEntry = workingStack[selectedStackIndex];
  const isImageSelected = selectedEntry?.kind === SURFACE_STACK_KIND_IMAGE;

  const previewProps = {
    ...profilePreviewProps,
    headerSurfaceStyle: styleDraft === undefined ? surfaceStyle : styleDraft,
    headerSurfaceImageUrl: previewImageUrl,
  };

  const handleAddImageLayer = () => {
    if (stackHasImageLayer) return;
    const nextIndex = workingStack.length;
    insertImageLayer();
    setSelectedStackIndex(nextIndex);
  };

  const layerListProps = {
    stack: workingStack,
    selectedStackIndex,
    onSelectStackIndex: setSelectedStackIndex,
    onAddLayer: addLayer,
    onAddImage: handleAddImageLayer,
    stackHasImageLayer,
    previewImageUrl,
    imageSettings,
    onMoveLayer: moveLayer,
    onRemoveLayer: handleRemoveStackLayer,
    onPatchStackEntry: patchStackEntry,
  };

  return createPortal(
    <div
      className="profile-header-surface-popup-overlay"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="profile-header-surface-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-header-surface-popup-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <header className="profile-header-surface-popup__header">
          <h2 id="profile-header-surface-popup-title" className="profile-header-surface-popup__title">
            {t("settings.headerSurface.editorTitle")}
          </h2>
          <CloseButton onClick={requestClose} ariaLabel={t("settings.headerSurface.cancel")} />
        </header>

        <div className="profile-header-surface-popup__body">
          <div className="profile-header-surface-popup__preview">
            <ProfileHeader
              {...previewProps}
              className="profile-header-surface-popup__profile-header"
            />
          </div>

          <div className="profile-header-surface-popup__settings">
            {isImageSelected ? (
              <ProfileHeaderSurfaceImageSettings
                imageSettings={imageSettings}
                previewImageUrl={previewImageUrl}
                patchWorking={patchWorking}
                fileInputRef={fileInputRef}
                saveBusy={saveBusy}
                onSelectImageFile={selectImageFile}
                onMarkImageRemoved={markImageRemoved}
                hasImageInStack={stackHasImageLayer}
              />
            ) : (
              <ProfileHeaderSurfaceLayerSettings
                layer={selectedEntry?.kind === SURFACE_STACK_KIND_GRADIENT ? selectedEntry : null}
                stackIndex={selectedStackIndex}
                patchStackEntry={patchStackEntry}
                gradientTypeOptions={gradientTypeOptions}
              />
            )}
          </div>

          <div className="profile-header-surface-popup__layers--desktop">
            <ProfileHeaderSurfaceLayerList layout="rail" {...layerListProps} />
          </div>
        </div>

        <div
          className={
            drawerOpen
              ? "profile-header-surface-popup__drawer profile-header-surface-popup__drawer--open"
              : "profile-header-surface-popup__drawer"
          }
        >
          <button
            type="button"
            className="profile-header-surface-popup__drawer-toggle"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {t("settings.headerSurface.drawerToggle")}
          </button>
          <div className="profile-header-surface-popup__drawer-panel">
            <ProfileHeaderSurfaceLayerList layout="drawer" {...layerListProps} />
          </div>
        </div>

        <footer className="profile-header-surface-popup__footer">
          <button
            type="button"
            className="btn-fill-secondary"
            disabled={!hasStyleChanges || saveBusy}
            onClick={handleResetStyle}
          >
            {t("settings.headerSurface.revertDraft")}
          </button>
          <button
            type="button"
            className="btn-fill-secondary"
            disabled={saveBusy}
            onClick={handleClearStyle}
          >
            {t("settings.headerSurface.clearStyle")}
          </button>
          <button
            type="button"
            className="btn-fill-primary"
            disabled={!hasStyleChanges || saveBusy}
            onClick={handleSaveAndClose}
          >
            {t("settings.headerSurface.saveStyle")}
          </button>
        </footer>
      </div>
    </div>,
    getPortalRoot(),
  );
}
