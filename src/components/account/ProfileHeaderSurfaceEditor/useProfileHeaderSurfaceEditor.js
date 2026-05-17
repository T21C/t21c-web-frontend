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
import { isCdnSupportedImageMimeType } from "@/constants/cdnImageAccept";
import {
  GRADIENT_LAYER_TYPES,
  SURFACE_STACK_KIND_GRADIENT,
  SURFACE_STACK_KIND_IMAGE,
  MAX_PROFILE_HEADER_SURFACE_LAYERS,
  countGradientStackEntries,
  createDefaultImageSettings,
  createDefaultProfileHeaderSurfaceStyle,
  createEmptyGradientLayer,
  createImageStackEntry,
  ensureImageStackEntry,
  parseProfileHeaderSurfaceStyle,
  removeImageStackEntry,
  stackHasImageLayer,
} from "@/utils/profileHeaderSurfaceStyle";
import { deepCloneStyle } from "./profileHeaderSurfaceEditorUtils";

export function useProfileHeaderSurfaceEditor({
  variant,
  creatorId = null,
  authUser,
  surfaceStyle,
  styleDraft,
  onStyleDraftChange,
  surfaceImageUrl,
  onApplied,
  isOpen = false,
  snapshotAtOpen = null,
  snapshotPendingImage = null,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const fileInputRef = useRef(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [touchedSinceOpen, setTouchedSinceOpen] = useState(false);

  useEffect(() => {
    if (snapshotPendingImage !== undefined) {
      setPendingImage(snapshotPendingImage);
    }
  }, [snapshotPendingImage]);

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

  const previewImageUrl = useMemo(() => {
    if (pendingImage?.remove) return null;
    if (pendingImage?.previewUrl) return pendingImage.previewUrl;
    return surfaceImageUrl ?? null;
  }, [pendingImage, surfaceImageUrl]);

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

  const revokePreviewUrl = useCallback((entry) => {
    if (entry?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(entry.previewUrl);
    }
  }, []);

  const selectImageFile = useCallback(
    (file) => {
      if (!file || !canEdit) return;
      if (!isCdnSupportedImageMimeType(file.type)) {
        toast.error(t("settings.banner.invalidFileType"));
        return;
      }
      setPendingImage((prev) => {
        revokePreviewUrl(prev);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          remove: false,
        };
      });
      patchWorking((s) => {
        const next = ensureImageStackEntry(s);
        Object.assign(s, next);
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [canEdit, patchWorking, revokePreviewUrl, t],
  );

  const markImageRemoved = useCallback(() => {
    setPendingImage((prev) => {
      revokePreviewUrl(prev);
      return { file: null, previewUrl: null, remove: true };
    });
    patchWorking((s) => {
      const next = removeImageStackEntry(s);
      Object.assign(s, next);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [patchWorking, revokePreviewUrl]);

  const deleteSurfaceImage = useCallback(async () => {
    if (variant === "player") {
      await api.delete(`${import.meta.env.VITE_PROFILE}/player/header-surface-image`);
    } else {
      await api.delete(`${import.meta.env.VITE_CREATORS_V3}/${creatorId}/header-surface-image`);
    }
    onApplied?.({
      profileHeaderSurfaceImageId: null,
      profileHeaderSurfaceImageUrl: null,
    });
  }, [variant, creatorId, onApplied]);

  const handleSaveStyle = useCallback(async () => {
    if (!canEdit) return false;
    setSaveBusy(true);
    try {
      const payload = styleDraft === undefined ? workingStyle : styleDraft;
      const hasImageLayerInPayload =
        payload != null && stackHasImageLayer(payload.stack);

      if (hasImageLayerInPayload && pendingImage?.file) {
        const form = new FormData();
        form.append("image", pendingImage.file);
        let data;
        if (variant === "player") {
          const res = await api.post(
            `${import.meta.env.VITE_PROFILE}/player/header-surface-image`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          data = res.data;
        } else {
          const res = await api.post(
            `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/header-surface-image`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          data = res.data;
        }
        onApplied?.({
          profileHeaderSurfaceImageId: data.profileHeaderSurfaceImageId,
          profileHeaderSurfaceImageUrl: data.profileHeaderSurfaceImageUrl,
        });
      } else if (
        surfaceImageUrl &&
        (!hasImageLayerInPayload || pendingImage?.remove)
      ) {
        await deleteSurfaceImage();
      }
      if (variant === "player") {
        const { data } = await api.patch(`${import.meta.env.VITE_PROFILE}/player/header-surface-style`, {
          style: payload,
        });
        onApplied?.({
          profileHeaderSurfaceStyle: data.profileHeaderSurfaceStyle ?? null,
          ...(data.profileHeaderSurfaceImageId === null
            ? { profileHeaderSurfaceImageId: null, profileHeaderSurfaceImageUrl: null }
            : {}),
        });
      } else {
        const { data } = await api.patch(
          `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/header-surface-style`,
          { style: payload },
        );
        onApplied?.({
          profileHeaderSurfaceStyle: data.profileHeaderSurfaceStyle ?? null,
          ...(data.profileHeaderSurfaceImageId === null
            ? { profileHeaderSurfaceImageId: null, profileHeaderSurfaceImageUrl: null }
            : {}),
        });
      }

      onStyleDraftChange(undefined);
      setPendingImage((prev) => {
        revokePreviewUrl(prev);
        return null;
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
    pendingImage,
    surfaceImageUrl,
    deleteSurfaceImage,
    revokePreviewUrl,
    t,
  ]);

  const resetPendingImageToSnapshot = useCallback(
    (snap) => {
      setPendingImage((prev) => {
        revokePreviewUrl(prev);
        if (!snap) return null;
        return { ...snap };
      });
    },
    [revokePreviewUrl],
  );

  const handleResetStyle = useCallback(() => {
    if (snapshotAtOpen === undefined) {
      onStyleDraftChange(undefined);
    } else if (snapshotAtOpen === null) {
      onStyleDraftChange(null);
    } else {
      updateDraft(deepCloneStyle(snapshotAtOpen));
    }
    resetPendingImageToSnapshot(snapshotPendingImage);
    setTouchedSinceOpen(false);
  }, [
    snapshotAtOpen,
    snapshotPendingImage,
    onStyleDraftChange,
    updateDraft,
    resetPendingImageToSnapshot,
  ]);

  const addLayer = useCallback(() => {
    patchWorking((s) => {
      if (countGradientStackEntries(s.stack) >= MAX_PROFILE_HEADER_SURFACE_LAYERS) return;
      s.stack.push(createEmptyGradientLayer("linear", s.stack));
    });
  }, [patchWorking]);

  const insertImageLayer = useCallback(() => {
    if (stackHasImageLayer(workingStyle.stack)) {
      toast.error(t("settings.headerSurface.imageLayerExists"));
      return null;
    }
    let newId = null;
    patchWorking((s) => {
      if (stackHasImageLayer(s.stack)) return;
      const next = ensureImageStackEntry(s);
      Object.assign(s, next);
      const imageEntry = s.stack.find((e) => e.kind === SURFACE_STACK_KIND_IMAGE);
      newId = imageEntry?.id ?? null;
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
      let removedImageLayer = false;
      patchWorking((s) => {
        const entry = s.stack[stackIndex];
        if (entry?.kind === SURFACE_STACK_KIND_IMAGE) {
          s.stack.splice(stackIndex, 1);
          delete s.image;
          removedImageLayer = true;
          return;
        }
        if (countGradientStackEntries(s.stack) <= 1 && !stackHasImageLayer(s.stack)) return;
        s.stack.splice(stackIndex, 1);
      });
      if (removedImageLayer) {
        setPendingImage((prev) => {
          revokePreviewUrl(prev);
          return surfaceImageUrl ? { file: null, previewUrl: null, remove: true } : null;
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [patchWorking, revokePreviewUrl, surfaceImageUrl],
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

  const imageSettings = workingStyle.image ?? createDefaultImageSettings();

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
    handleSaveStyle,
    handleResetStyle,
    selectImageFile,
    markImageRemoved,
    addLayer,
    insertImageLayer,
    reorderStack,
    removeLayer,
    imageSettings,
    previewImageUrl,
    pendingImage,
    resetPendingImageToSnapshot,
    gradientTypeOptions,
    fileInputRef,
    saveBusy,
    SURFACE_STACK_KIND_GRADIENT,
    SURFACE_STACK_KIND_IMAGE,
    stackHasImageLayer: stackHasImageLayer(workingStyle.stack),
  };
}
