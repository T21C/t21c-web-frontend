import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import api from "@/utils/api";
import { getCdnErrorMessage } from "@/utils/uploadErrors";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import {
  customProfileBannersEnabled,
  subjectHasCustomBannerEntitlement,
} from "@/utils/profileBanners";
import { validateCdnBannerImageFile } from "@/utils/validateCdnBannerImage.js";
import {
  GRADIENT_LAYER_TYPES,
  SURFACE_STACK_KIND_GRADIENT,
  SURFACE_STACK_KIND_IMAGE,
  MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES,
  addImageLayerToStyle,
  canAddImageLayer,
  canAddStackEntry,
  countGradientStackEntries,
  createDefaultImageSettings,
  createDefaultProfileHeaderSurfaceStyle,
  createEmptyGradientLayer,
  getImageStackEntryIds,
  parseProfileHeaderSurfaceImageAssets,
  parseProfileHeaderSurfaceStyle,
  removeImageLayerAtIndex,
} from "@/utils/profileHeaderSurfaceStyle";
import { deepCloneStyle } from "./profileHeaderSurfaceEditorUtils";

function revokePendingEntry(entry) {
  if (entry?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(entry.previewUrl);
  }
}

function revokeAllPending(pendingImages) {
  if (!pendingImages || typeof pendingImages !== "object") return;
  for (const entry of Object.values(pendingImages)) {
    revokePendingEntry(entry);
  }
}

function buildPreviewImageAssets(serverAssets, pendingImages, stack) {
  const assets = { ...parseProfileHeaderSurfaceImageAssets(serverAssets) };
  for (const layerId of getImageStackEntryIds(stack)) {
    const pending = pendingImages?.[layerId];
    if (pending?.remove) {
      delete assets[layerId];
    } else if (pending?.previewUrl) {
      assets[layerId] = {
        assetId: assets[layerId]?.assetId ?? "pending",
        url: pending.previewUrl,
      };
    }
  }
  return assets;
}

export function useProfileHeaderSurfaceEditor({
  variant,
  creatorId = null,
  authUser,
  surfaceStyle,
  styleDraft,
  onStyleDraftChange,
  surfaceImageAssets,
  onApplied,
  isOpen = false,
  snapshotAtOpen = null,
  snapshotFollowServer = false,
  onRestoreOpenSnapshot,
  snapshotPendingImages = null,
  selectedImageLayerId = null,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const fileInputRef = useRef(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [pendingImages, setPendingImages] = useState({});
  const [touchedSinceOpen, setTouchedSinceOpen] = useState(false);

  useEffect(() => {
    if (snapshotPendingImages !== undefined) {
      setPendingImages(snapshotPendingImages ? { ...snapshotPendingImages } : {});
    }
  }, [snapshotPendingImages]);

  useEffect(() => {
    if (isOpen) setTouchedSinceOpen(false);
  }, [isOpen]);

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

  const effectiveDraft = useMemo(() => {
    if (styleDraft === undefined) return serverStyle;
    return styleDraft;
  }, [styleDraft, serverStyle]);

  const workingStyle = useMemo(
    () => effectiveDraft ?? createDefaultProfileHeaderSurfaceStyle(),
    [effectiveDraft],
  );

  const previewImageAssets = useMemo(
    () => buildPreviewImageAssets(surfaceImageAssets, pendingImages, workingStyle.stack),
    [surfaceImageAssets, pendingImages, workingStyle.stack],
  );

  const markTouched = useCallback(() => {
    setTouchedSinceOpen(true);
  }, []);

  const updateDraft = useCallback(
    (next) => {
      onStyleDraftChange(next);
    },
    [onStyleDraftChange],
  );

  const patchWorking = useCallback(
    (fn) => {
      const base = deepCloneStyle(workingStyle);
      fn(base);
      updateDraft(base);
      markTouched();
    },
    [workingStyle, updateDraft, markTouched],
  );

  const patchImageSettings = useCallback(
    (layerId, fn) => {
      if (!layerId) return;
      patchWorking((s) => {
        if (!s.images) s.images = {};
        const current = s.images[layerId] ?? createDefaultImageSettings();
        const next = { ...current };
        fn(next);
        s.images[layerId] = next;
      });
    },
    [patchWorking],
  );

  const selectImageFile = useCallback(
    async (layerId, file) => {
      if (!layerId || !file || !canEdit) return;
      const validation = await validateCdnBannerImageFile(file);
      if (!validation.ok) {
        const messageKeyByReason = {
          invalidFileType: "settings.headerSurface.invalidFileType",
          fileTooLarge: "settings.headerSurface.imageFileTooLarge",
          dimensionsTooSmall: "settings.headerSurface.imageDimensionsTooSmall",
          unreadable: "settings.headerSurface.imageUnreadable",
        };
        const messageKey =
          messageKeyByReason[validation.reason] ??
          "settings.headerSurface.imageUnreadable";
        toast.error(t(messageKey, validation));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setPendingImages((prev) => {
        revokePendingEntry(prev[layerId]);
        return {
          ...prev,
          [layerId]: {
            file,
            previewUrl: URL.createObjectURL(file),
            remove: false,
          },
        };
      });
      markTouched();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [canEdit, markTouched, t],
  );

  const markImageRemovedForLayer = useCallback(
    (layerId) => {
      if (!layerId) return;
      setPendingImages((prev) => {
        revokePendingEntry(prev[layerId]);
        const serverHadAsset = Boolean(parseProfileHeaderSurfaceImageAssets(surfaceImageAssets)[layerId]);
        if (!serverHadAsset) {
          const next = { ...prev };
          delete next[layerId];
          return next;
        }
        return {
          ...prev,
          [layerId]: { file: null, previewUrl: null, remove: true },
        };
      });
      markTouched();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [surfaceImageAssets, markTouched],
  );

  const deleteSurfaceImageForLayer = useCallback(
    async (layerId) => {
      const params = { layerId };
      if (variant === "player") {
        const res = await api.delete(`${import.meta.env.VITE_PROFILE}/player/header-surface-image`, {
          params,
        });
        return res.data;
      }
      const res = await api.delete(
        `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/header-surface-image`,
        { params },
      );
      return res.data;
    },
    [variant, creatorId],
  );

  const uploadSurfaceImageForLayer = useCallback(
    async (layerId, file) => {
      const form = new FormData();
      form.append("image", file);
      form.append("layerId", layerId);
      if (variant === "player") {
        const res = await api.post(
          `${import.meta.env.VITE_PROFILE}/player/header-surface-image`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        return res.data;
      }
      const res = await api.post(
        `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/header-surface-image`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    [variant, creatorId],
  );

  const handleSaveStyle = useCallback(async () => {
    if (!canEdit) return false;
    setSaveBusy(true);
    try {
      const payload = styleDraft === undefined ? workingStyle : styleDraft;

      let styleData;
      if (variant === "player") {
        const { data } = await api.patch(`${import.meta.env.VITE_PROFILE}/player/header-surface-style`, {
          style: payload,
        });
        styleData = data;
      } else {
        const { data } = await api.patch(
          `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/header-surface-style`,
          { style: payload },
        );
        styleData = data;
      }

      let latestAssets = parseProfileHeaderSurfaceImageAssets(
        styleData.profileHeaderSurfaceImageAssets,
      );

      for (const [layerId, pending] of Object.entries(pendingImages)) {
        if (pending?.remove) {
          const delData = await deleteSurfaceImageForLayer(layerId);
          latestAssets = parseProfileHeaderSurfaceImageAssets(delData?.profileHeaderSurfaceImageAssets);
        } else if (pending?.file) {
          const upData = await uploadSurfaceImageForLayer(layerId, pending.file);
          latestAssets = parseProfileHeaderSurfaceImageAssets(upData?.profileHeaderSurfaceImageAssets);
        }
      }

      onApplied?.({
        profileHeaderSurfaceStyle: styleData.profileHeaderSurfaceStyle ?? null,
        profileHeaderSurfaceImageAssets: Object.keys(latestAssets).length ? latestAssets : null,
      });

      onStyleDraftChange(undefined);
      setPendingImages((prev) => {
        revokeAllPending(prev);
        return {};
      });
      toast.success(t("settings.headerSurface.styleSaved"));
      return true;
    } catch (e) {
      console.error(e);
      toast.error(
        getCdnErrorMessage(e) || e?.response?.data?.error || t("settings.headerSurface.styleError"),
      );
      return false;
    } finally {
      setSaveBusy(false);
    }
  }, [
    canEdit,
    styleDraft,
    workingStyle,
    variant,
    creatorId,
    onApplied,
    onStyleDraftChange,
    pendingImages,
    deleteSurfaceImageForLayer,
    uploadSurfaceImageForLayer,
    t,
  ]);

  const resetPendingImagesToSnapshot = useCallback((snap) => {
    setPendingImages((prev) => {
      revokeAllPending(prev);
      if (!snap) return {};
      return { ...snap };
    });
  }, []);

  const handleResetStyle = useCallback(() => {
    if (typeof onRestoreOpenSnapshot === "function") {
      onRestoreOpenSnapshot();
    } else if (snapshotFollowServer) {
      onStyleDraftChange(undefined);
    } else if (snapshotAtOpen === null) {
      onStyleDraftChange(null);
    } else if (snapshotAtOpen) {
      onStyleDraftChange(deepCloneStyle(snapshotAtOpen));
    }
    resetPendingImagesToSnapshot(snapshotPendingImages);
    setTouchedSinceOpen(false);
  }, [
    snapshotAtOpen,
    snapshotFollowServer,
    snapshotPendingImages,
    onRestoreOpenSnapshot,
    onStyleDraftChange,
    resetPendingImagesToSnapshot,
  ]);

  /** Replace draft with the v3 default template (fixes legacy / invalid stored styles). */
  const handleResetToDefault = useCallback(() => {
    if (!window.confirm(t("settings.headerSurface.clearStyleConfirm"))) return;
    onStyleDraftChange(deepCloneStyle(createDefaultProfileHeaderSurfaceStyle()));
    resetPendingImagesToSnapshot(null);
    setTouchedSinceOpen(true);
  }, [onStyleDraftChange, resetPendingImagesToSnapshot, t]);

  const addLayer = useCallback(() => {
    patchWorking((s) => {
      if (!canAddStackEntry(s.stack)) return;
      s.stack.push(createEmptyGradientLayer("linear", s.stack));
    });
  }, [patchWorking]);

  const insertImageLayer = useCallback(() => {
    if (!canAddImageLayer(workingStyle.stack)) {
      toast.error(t("settings.headerSurface.maxImageLayers"));
      return null;
    }
    let newId = null;
    patchWorking((s) => {
      if (!canAddImageLayer(s.stack)) return;
      const { style: next, newLayerId } = addImageLayerToStyle(s);
      Object.assign(s, next);
      newId = newLayerId;
    });
    return newId;
  }, [patchWorking, workingStyle.stack, t]);

  const reorderStack = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      patchWorking((s) => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= s.stack.length ||
          toIndex >= s.stack.length
        ) {
          return;
        }
        const [item] = s.stack.splice(fromIndex, 1);
        s.stack.splice(toIndex, 0, item);
      });
    },
    [patchWorking],
  );

  const removeLayer = useCallback(
    (stackIndex) => {
      const entry = workingStyle.stack[stackIndex];
      let removedImageId = null;
      patchWorking((s) => {
        const target = s.stack[stackIndex];
        if (target?.kind === SURFACE_STACK_KIND_IMAGE) {
          removedImageId = target.id;
          const next = removeImageLayerAtIndex(s, stackIndex);
          s.stack = next.stack;
          s.images = next.images;
          if (!s.images) delete s.images;
          return;
        }
        if (countGradientStackEntries(s.stack) <= 1) return;
        s.stack.splice(stackIndex, 1);
      });
      if (removedImageId) {
        setPendingImages((prev) => {
          revokePendingEntry(prev[removedImageId]);
          const next = { ...prev };
          const serverHad = Boolean(
            parseProfileHeaderSurfaceImageAssets(surfaceImageAssets)[removedImageId],
          );
          if (serverHad) {
            next[removedImageId] = { file: null, previewUrl: null, remove: true };
          } else {
            delete next[removedImageId];
          }
          return next;
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [patchWorking, workingStyle.stack, surfaceImageAssets],
  );

  const patchStackEntry = useCallback(
    (stackIndex, fn) => {
      patchWorking((s) => {
        const entry = s.stack[stackIndex];
        if (!entry) return;
        fn(entry);
      });
    },
    [patchWorking],
  );

  const activeImageLayerId = useMemo(() => {
    if (selectedImageLayerId) return selectedImageLayerId;
    const ids = getImageStackEntryIds(workingStyle.stack);
    return ids[0] ?? null;
  }, [selectedImageLayerId, workingStyle.stack]);

  const imageSettings = useMemo(() => {
    if (!activeImageLayerId) return createDefaultImageSettings();
    return workingStyle.images?.[activeImageLayerId] ?? createDefaultImageSettings();
  }, [activeImageLayerId, workingStyle.images]);

  const gradientTypeOptions = useMemo(
    () =>
      GRADIENT_LAYER_TYPES.map((gt) => ({
        value: gt,
        label: t(`settings.headerSurface.gradientTypes.${gt}`, { defaultValue: gt }),
      })),
    [t],
  );

  return {
    canEdit,
    serverStyle,
    workingStyle,
    workingStack: workingStyle.stack,
    isDirtySinceOpen: touchedSinceOpen,
    patchWorking,
    patchStackEntry,
    patchImageSettings,
    handleSaveStyle,
    handleResetStyle,
    handleResetToDefault,
    selectImageFile,
    markImageRemovedForLayer,
    addLayer,
    insertImageLayer,
    reorderStack,
    removeLayer,
    imageSettings,
    activeImageLayerId,
    previewImageAssets,
    pendingImages,
    resetPendingImagesToSnapshot,
    gradientTypeOptions,
    fileInputRef,
    saveBusy,
    SURFACE_STACK_KIND_GRADIENT,
    SURFACE_STACK_KIND_IMAGE,
    canAddStackEntry: canAddStackEntry(workingStyle.stack),
    canAddImageLayer: canAddImageLayer(workingStyle.stack),
    stackEntryCount: workingStyle.stack.length,
    maxStackEntries: MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES,
  };
}
