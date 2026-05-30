import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { routes } from "@/api/routes";
import api from "@/utils/api";
import { getCdnErrorMessage } from "@/utils/uploadErrors";
import { validateCdnBannerImageFile } from "@/utils/validateCdnBannerImage.js";
import {
  BIO_CANVAS_VERSION,
  MAX_BIO_CANVAS_BLOCKS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  createBlock,
  getBlockDescriptor,
  getImageBlockIds,
  normalizeLayout,
  parseBioCanvas,
  parseBioCanvasImageAssets,
} from "@/utils/bioCanvas";
import { readImageFileDimensions } from "@/utils/validateCdnBannerImage.js";
import { DEFAULT_IMAGE_CROP } from "@/utils/bioCanvas/blocks/image.js";

function deepCloneCanvas(canvas) {
  return canvas ? JSON.parse(JSON.stringify(canvas)) : null;
}

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

function computeFrameFromNaturalDims(naturalWidth, naturalHeight) {
  let w = Math.min(Math.max(naturalWidth, 40), STAGE_WIDTH);
  let h = Math.round(w * (naturalHeight / naturalWidth));
  if (h > STAGE_HEIGHT) {
    h = STAGE_HEIGHT;
    w = Math.round(h * (naturalWidth / naturalHeight));
  }
  return { w, h, locked: false };
}

function readImageUrlDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

function buildPreviewImageAssets(serverAssets, pendingImages) {
  const assets = { ...parseBioCanvasImageAssets(serverAssets) };
  for (const [blockId, pending] of Object.entries(pendingImages ?? {})) {
    if (pending?.remove) {
      delete assets[blockId];
    } else if (pending?.previewUrl) {
      assets[blockId] = {
        assetId: assets[blockId]?.assetId ?? "pending",
        url: pending.previewUrl,
      };
    }
  }
  return assets;
}

export function useBioCanvasEditor({
  canvas,
  canvasDraft,
  onCanvasDraftChange,
  imageAssets,
  onApplied,
  isOpen,
  snapshotAtOpen,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const fileInputRef = useRef(null);
  const pendingBlockIdRef = useRef(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [pendingImages, setPendingImages] = useState({});

  const workingCanvas = useMemo(() => {
    if (canvasDraft !== undefined) return deepCloneCanvas(canvasDraft);
    return deepCloneCanvas(canvas);
  }, [canvas, canvasDraft, isOpen]);

  const previewImageAssets = useMemo(
    () => buildPreviewImageAssets(imageAssets, pendingImages),
    [imageAssets, pendingImages],
  );

  const patchWorking = useCallback(
    (nextCanvas) => {
      onCanvasDraftChange?.(nextCanvas);
    },
    [onCanvasDraftChange],
  );

  const patchBlock = useCallback(
    (blockId, patch) => {
      if (!workingCanvas?.blocks) return;
      patchWorking({
        ...workingCanvas,
        blocks: workingCanvas.blocks.map((block) =>
          block.id === blockId ? { ...block, ...patch } : block,
        ),
      });
    },
    [workingCanvas, patchWorking],
  );

  const patchBlockData = useCallback(
    (blockId, dataPatch) => {
      const block = workingCanvas?.blocks?.find((b) => b.id === blockId);
      if (!block) return;
      patchBlock(blockId, { data: { ...block.data, ...dataPatch } });
    },
    [workingCanvas, patchBlock],
  );

  const patchLayout = useCallback(
    (blockId, layoutPatch) => {
      const block = workingCanvas?.blocks?.find((b) => b.id === blockId);
      if (!block) return;
      const descriptor = getBlockDescriptor(block.type);
      const nextLayout = normalizeLayout({ ...block.layout, ...layoutPatch }, descriptor);
      patchBlock(blockId, { layout: nextLayout });
    },
    [workingCanvas, patchBlock],
  );

  const reorderBlocks = useCallback(
    (fromIndex, toIndex) => {
      if (!workingCanvas?.blocks) return;
      const next = [...workingCanvas.blocks];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      patchWorking({ ...workingCanvas, blocks: next });
    },
    [workingCanvas, patchWorking],
  );

  const removeBlock = useCallback(
    (blockId) => {
      if (!workingCanvas?.blocks) return;
      patchWorking({
        ...workingCanvas,
        blocks: workingCanvas.blocks.filter((b) => b.id !== blockId),
      });
      setPendingImages((prev) => {
        const next = { ...prev };
        revokePendingEntry(next[blockId]);
        delete next[blockId];
        return next;
      });
    },
    [workingCanvas, patchWorking],
  );

  const addBlock = useCallback(
    (type) => {
      if (!workingCanvas?.blocks) return;
      if (workingCanvas.blocks.length >= MAX_BIO_CANVAS_BLOCKS) return;
      const descriptor = getBlockDescriptor(type);
      if (!descriptor) return;
      const count = workingCanvas.blocks.filter((b) => b.type === type).length;
      if (count >= descriptor.maxPerCanvas) return;
      const block = createBlock(type, undefined, workingCanvas.blocks);
      if (!block) return;
      patchWorking({
        ...workingCanvas,
        blocks: [...workingCanvas.blocks, block],
      });
      return block.id;
    },
    [workingCanvas, patchWorking],
  );

  const selectImageFile = useCallback((blockId) => {
    pendingBlockIdRef.current = blockId;
    fileInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    const blockId = pendingBlockIdRef.current;
    if (!file || !blockId) return;

    const validation = await validateCdnBannerImageFile(file);
    if (!validation.ok) {
      toast.error(t("settings.headerSurface.imageUnreadable", { defaultValue: "Invalid image file" }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImages((prev) => {
      revokePendingEntry(prev[blockId]);
      return {
        ...prev,
        [blockId]: { file, previewUrl, remove: false, naturalWidth: null, naturalHeight: null },
      };
    });

    try {
      const dims = await readImageFileDimensions(file);
      setPendingImages((prev) => ({
        ...prev,
        [blockId]: {
          ...prev[blockId],
          naturalWidth: dims.width,
          naturalHeight: dims.height,
        },
      }));
      patchBlockData(blockId, { crop: { ...DEFAULT_IMAGE_CROP } });
      patchLayout(blockId, computeFrameFromNaturalDims(dims.width, dims.height));
    } catch {
      // keep default block size if dimensions unreadable
    }
  }, [t, patchLayout, patchBlockData]);

  const resetImageCrop = useCallback(
    async (blockId) => {
      patchBlockData(blockId, { crop: { ...DEFAULT_IMAGE_CROP } });
      const pending = pendingImages[blockId];
      if (pending?.naturalWidth && pending?.naturalHeight) {
        patchLayout(blockId, computeFrameFromNaturalDims(pending.naturalWidth, pending.naturalHeight));
        return;
      }
      const url =
        buildPreviewImageAssets(imageAssets, pendingImages)[blockId]?.url ??
        parseBioCanvasImageAssets(imageAssets)[blockId]?.url;
      if (!url) return;
      try {
        const dims = await readImageUrlDimensions(url);
        patchLayout(blockId, computeFrameFromNaturalDims(dims.width, dims.height));
      } catch {
        // keep current frame if dimensions unreadable
      }
    },
    [pendingImages, imageAssets, patchBlockData, patchLayout],
  );

  const isDirtySinceOpen = useMemo(() => {
    const baseline = snapshotAtOpen ?? canvas;
    const current = canvasDraft !== undefined ? canvasDraft : canvas;
    return JSON.stringify(baseline) !== JSON.stringify(current) || Object.keys(pendingImages).length > 0;
  }, [snapshotAtOpen, canvas, canvasDraft, pendingImages]);

  const handleSave = useCallback(async () => {
    setSaveBusy(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      let parsed;
      try {
        parsed = parseBioCanvas(workingCanvas);
      } catch (err) {
        toast.error(err?.message ?? "Invalid canvas", { id: toastId });
        return;
      }

      const { data } = await api.patch(routes.playersV3.meBioCanvas(), { canvas: parsed });
      let nextAssets = data?.bioCanvasImageAssets ?? imageAssets;

      for (const blockId of getImageBlockIds(parsed)) {
        const pending = pendingImages[blockId];
        if (!pending?.file) continue;

        const form = new FormData();
        form.append("image", pending.file);
        form.append("blockId", blockId);

        const uploadRes = await api.post(routes.playersV3.meBioCanvasImage(), form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        nextAssets = uploadRes.data?.bioCanvasImageAssets ?? nextAssets;
      }

      revokeAllPending(pendingImages);
      setPendingImages({});
      onApplied?.({
        bioCanvas: data?.bioCanvas ?? parsed,
        bioCanvasImageAssets: nextAssets,
        bio: data?.bio ?? null,
      });
      onCanvasDraftChange?.(undefined);
      toast.success(t("settings.player.bioCanvasSuccess", { defaultValue: "Bio canvas saved" }), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || getCdnErrorMessage(err) || t("settings.player.bioCanvasError", { defaultValue: "Failed to save bio canvas" });
      toast.error(msg, { id: toastId });
    } finally {
      setSaveBusy(false);
    }
  }, [workingCanvas, pendingImages, imageAssets, onApplied, onCanvasDraftChange, t]);

  const handleReset = useCallback(() => {
    revokeAllPending(pendingImages);
    setPendingImages({});
    onCanvasDraftChange?.(deepCloneCanvas(snapshotAtOpen ?? canvas));
  }, [pendingImages, snapshotAtOpen, canvas, onCanvasDraftChange]);

  const handleClear = useCallback(() => {
    revokeAllPending(pendingImages);
    setPendingImages({});
    patchWorking({ version: BIO_CANVAS_VERSION, blocks: [] });
  }, [pendingImages, patchWorking]);

  return {
    workingCanvas,
    previewImageAssets,
    patchBlock,
    patchBlockData,
    patchLayout,
    reorderBlocks,
    removeBlock,
    addBlock,
    fileInputRef,
    selectImageFile,
    handleImageFileChange,
    resetImageCrop,
    saveBusy,
    handleSave,
    handleReset,
    handleClear,
    isDirtySinceOpen,
    pendingImages,
  };
}
