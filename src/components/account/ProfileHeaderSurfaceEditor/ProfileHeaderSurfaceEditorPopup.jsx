// tuf-search: #ProfileHeaderSurfaceEditorPopup
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CloseButton } from "@/components/common/buttons";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { useProfileHeaderSurfaceEditor } from "./useProfileHeaderSurfaceEditor";
import ProfileHeaderSurfaceLayerList from "./ProfileHeaderSurfaceLayerList";
import ProfileHeaderSurfaceLayerSettings from "./ProfileHeaderSurfaceLayerSettings";
import ProfileHeaderSurfaceImageSettings from "./ProfileHeaderSurfaceImageSettings";
import {
  SURFACE_STACK_KIND_GRADIENT,
  SURFACE_STACK_KIND_IMAGE,
  findStackIndexById,
} from "@/utils/profileHeaderSurfaceStyle";
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
  surfaceImageAssets,
  onApplied,
  profilePreviewProps,
  snapshotPendingImages = null,
  onPendingImagesChange,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const panelRef = useRef(null);
  const [selectedStackId, setSelectedStackId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const editor = useProfileHeaderSurfaceEditor({
    variant,
    creatorId,
    authUser,
    surfaceStyle,
    styleDraft,
    onStyleDraftChange,
    surfaceImageAssets,
    onApplied,
    isOpen,
    snapshotAtOpen,
    snapshotPendingImages,
    selectedImageLayerId: selectedStackId,
  });

  const {
    workingStack,
    patchWorking,
    patchStackEntry,
    gradientTypeOptions,
    addLayer,
    insertImageLayer,
    reorderStack,
    removeLayer,
    imageSettings,
    previewImageAssets,
    patchImageSettings,
    fileInputRef,
    saveBusy,
    handleSaveStyle,
    handleResetStyle,
    selectImageFile,
    markImageRemovedForLayer,
    isDirtySinceOpen,
    canAddStackEntry,
    canAddImageLayer,
    activeImageLayerId,
  } = editor;

  useEffect(() => {
    onPendingImagesChange?.(editor.pendingImages);
  }, [editor.pendingImages, onPendingImagesChange]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setDrawerOpen(false);
    if (workingStack.length > 0) {
      setSelectedStackId(workingStack[0].id);
    } else {
      setSelectedStackId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedStackId) {
      if (workingStack.length > 0) setSelectedStackId(workingStack[0].id);
      return;
    }
    if (findStackIndexById(workingStack, selectedStackId) < 0) {
      setSelectedStackId(workingStack[0]?.id ?? null);
    }
  }, [workingStack, selectedStackId]);

  const selectedStackIndex = useMemo(
    () => findStackIndexById(workingStack, selectedStackId),
    [workingStack, selectedStackId],
  );

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
    const confirmMessage =
      entry?.kind === SURFACE_STACK_KIND_IMAGE
        ? t("settings.headerSurface.removeImageLayerConfirm")
        : t("settings.headerSurface.removeLayerConfirm");
    if (!window.confirm(confirmMessage)) return;

    if (entry?.kind === SURFACE_STACK_KIND_IMAGE && entry.id) {
      markImageRemovedForLayer(entry.id);
    }
    const removedId = entry?.id;
    removeLayer(stackIndex);
    if (selectedStackId === removedId) {
      const nextStack = workingStack.filter((_, i) => i !== stackIndex);
      setSelectedStackId(nextStack[0]?.id ?? null);
    }
  };

  if (!isOpen) return null;

  const selectedEntry = selectedStackIndex >= 0 ? workingStack[selectedStackIndex] : null;
  const isImageSelected = selectedEntry?.kind === SURFACE_STACK_KIND_IMAGE;

  const previewProps = {
    ...profilePreviewProps,
    headerSurfaceStyle: styleDraft === undefined ? surfaceStyle : styleDraft,
    headerSurfaceImageAssets: previewImageAssets,
  };

  const handleAddImageLayer = () => {
    const newId = insertImageLayer();
    if (newId) setSelectedStackId(newId);
  };

  const layerListProps = {
    stack: workingStack,
    selectedStackId,
    onSelectStackId: setSelectedStackId,
    onAddLayer: addLayer,
    onAddImage: handleAddImageLayer,
    canAddStackEntry,
    canAddImageLayer,
    previewImageAssets,
    onReorderStack: reorderStack,
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
                imageLayerId={activeImageLayerId}
                previewImageUrl={activeImageLayerId ? previewImageAssets[activeImageLayerId]?.url : null}
                patchImageSettings={(fn) => patchImageSettings(activeImageLayerId, fn)}
                fileInputRef={fileInputRef}
                saveBusy={saveBusy}
                onSelectImageFile={selectImageFile}
                onMarkImageRemoved={() => {
                  if (activeImageLayerId) markImageRemovedForLayer(activeImageLayerId);
                }}
              />
            ) : (
              <ProfileHeaderSurfaceLayerSettings
                layer={selectedEntry?.kind === SURFACE_STACK_KIND_GRADIENT ? selectedEntry : null}
                stackIndex={selectedStackIndex >= 0 ? selectedStackIndex : 0}
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
            disabled={!isDirtySinceOpen || saveBusy}
            onClick={handleResetStyle}
          >
            {t("settings.headerSurface.revertDraft")}
          </button>
          <button
            type="button"
            className="btn-fill-primary"
            disabled={!isDirtySinceOpen || saveBusy}
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
