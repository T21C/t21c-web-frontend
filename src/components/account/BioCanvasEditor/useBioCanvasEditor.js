import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import api from "@/utils/api";
import { ensureAuthSession, isNoTokenAuthError } from "@/utils/ensureAuthSession";
import { getBioCanvasApiRoutes } from "@/utils/bioCanvasApi";
import { getCdnErrorMessage } from "@/utils/uploadErrors";
import { validateCdnBannerImageFile } from "@/utils/validateCdnBannerImage.js";
import {
  BIO_CANVAS_VERSION,
  MAX_BIO_CANVAS_BLOCKS,
  MIN_BLOCK_H,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  createBlock,
  getBlockDescriptor,
  getImageBlockIds,
  parseBioCanvas,
  parseBioCanvasImageAssets,
} from "@/utils/bioCanvas";
import { readImageFileDimensions } from "@/utils/validateCdnBannerImage.js";
import { DEFAULT_IMAGE_CROP, FIT_IMAGE_TO_FRAME_CROP } from "@/utils/bioCanvas/blocks/image.js";

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
  profileKind = "player",
  canvas,
  canvasDraft,
  onCanvasDraftChange,
  imageAssets,
  onApplied,
  isOpen,
  snapshotAtOpen,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const bioCanvasRoutes = useMemo(() => getBioCanvasApiRoutes(profileKind), [profileKind]);
  const saveSuccessKey =
    profileKind === "creator" ? "settings.creator.bioCanvasSuccess" : "settings.player.bioCanvasSuccess";
  const saveErrorKey =
    profileKind === "creator" ? "settings.creator.bioCanvasError" : "settings.player.bioCanvasError";
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

  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const workingCanvasRef = useRef(workingCanvas);
  workingCanvasRef.current = workingCanvas;
  const suspendHistoryRef = useRef(false);
  const [historyDepth, setHistoryDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);

  useEffect(() => {
    if (isOpen) {
      historyRef.current = [];
      redoRef.current = [];
      suspendHistoryRef.current = false;
      setHistoryDepth(0);
      setRedoDepth(0);
    }
  }, [isOpen]);

  const pushHistorySnapshot = useCallback(() => {
    const prev = workingCanvasRef.current;
    if (!prev) return;
    historyRef.current.push(JSON.stringify(prev));
    if (historyRef.current.length > 100) historyRef.current.shift();
    setHistoryDepth(historyRef.current.length);
  }, []);

  const patchWorking = useCallback(
    (nextCanvas) => {
      if (!suspendHistoryRef.current) {
        pushHistorySnapshot();
        if (redoRef.current.length) {
          redoRef.current = [];
          setRedoDepth(0);
        }
      }
      onCanvasDraftChange?.(nextCanvas);
    },
    [onCanvasDraftChange, pushHistorySnapshot],
  );

  // Coalesce a continuous interaction (e.g. dragging) into one history entry:
  // record the pre-interaction state once, then suspend per-change snapshots.
  const beginHistoryStep = useCallback(() => {
    if (suspendHistoryRef.current) return;
    pushHistorySnapshot();
    if (redoRef.current.length) {
      redoRef.current = [];
      setRedoDepth(0);
    }
    suspendHistoryRef.current = true;
  }, [pushHistorySnapshot]);

  const endHistoryStep = useCallback(() => {
    suspendHistoryRef.current = false;
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const prevJson = historyRef.current.pop();
    setHistoryDepth(historyRef.current.length);
    const current = workingCanvasRef.current;
    if (current) {
      redoRef.current.push(JSON.stringify(current));
      setRedoDepth(redoRef.current.length);
    }
    try {
      onCanvasDraftChange?.(JSON.parse(prevJson));
    } catch {
      // ignore malformed history snapshot
    }
  }, [onCanvasDraftChange]);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    const nextJson = redoRef.current.pop();
    setRedoDepth(redoRef.current.length);
    const current = workingCanvasRef.current;
    if (current) {
      historyRef.current.push(JSON.stringify(current));
      setHistoryDepth(historyRef.current.length);
    }
    try {
      onCanvasDraftChange?.(JSON.parse(nextJson));
    } catch {
      // ignore malformed redo snapshot
    }
  }, [onCanvasDraftChange]);

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
      patchBlock(blockId, { layout: { ...block.layout, ...layoutPatch } });
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

  const fitImageToContainer = useCallback(
    (blockId) => {
      const block = workingCanvas?.blocks?.find((b) => b.id === blockId);
      if (!block || block.type !== "image") return;
      patchBlockData(blockId, { crop: { ...FIT_IMAGE_TO_FRAME_CROP } });
      patchLayout(blockId, { x: 0, y: 0, w: STAGE_WIDTH, h: STAGE_HEIGHT, rotation: 0 });
    },
    [workingCanvas, patchBlockData, patchLayout],
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

      await ensureAuthSession();

      const { data } = await api.patch(bioCanvasRoutes.patchCanvas(), { canvas: parsed });
      let nextAssets = data?.bioCanvasImageAssets ?? imageAssets;

      for (const blockId of getImageBlockIds(parsed)) {
        const pending = pendingImages[blockId];
        if (!pending?.file) continue;

        const form = new FormData();
        form.append("image", pending.file);
        form.append("blockId", blockId);

        const uploadRes = await api.post(bioCanvasRoutes.postImage(), form, {
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
      toast.success(t(saveSuccessKey, { defaultValue: "Bio canvas saved" }), { id: toastId });
    } catch (err) {
      const msg = isNoTokenAuthError(err)
        ? t("settings.bioCanvas.sessionExpired", {
            defaultValue: "Your session expired. Please sign in again and retry.",
          })
        : err?.response?.data?.error ||
          getCdnErrorMessage(err) ||
          t(saveErrorKey, { defaultValue: "Failed to save bio canvas" });
      toast.error(msg, { id: toastId });
    } finally {
      setSaveBusy(false);
    }
  }, [
    workingCanvas,
    pendingImages,
    imageAssets,
    onApplied,
    onCanvasDraftChange,
    t,
    bioCanvasRoutes,
    saveSuccessKey,
    saveErrorKey,
  ]);

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
    fitImageToContainer,
    saveBusy,
    handleSave,
    handleReset,
    handleClear,
    undo,
    redo,
    canUndo: historyDepth > 0,
    canRedo: redoDepth > 0,
    beginHistoryStep,
    endHistoryStep,
    isDirtySinceOpen,
    pendingImages,
  };
}
