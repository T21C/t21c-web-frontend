import { useCallback, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  MIN_BLOCK_H,
  computeStageContentHeight,
  getBlockDescriptor,
  normalizeLayout,
} from "@/utils/bioCanvas";
import { getAspectRatio } from "@/utils/bioCanvas/layout.js";
import { getBlockRenderer } from "../BioCanvasRenderer/blockRenderers/index.js";
import { useStageScale } from "../BioCanvasRenderer/useStageScale.js";
import { BLOCK_TYPE_LABELS } from "./blockEditors/index.js";

const DRAG_THRESHOLD_PX = 4;

const ASPECT_RESIZE = {
  top: true,
  right: true,
  bottom: true,
  left: true,
  topRight: true,
  bottomRight: true,
  bottomLeft: true,
  topLeft: true,
};

const FREE_RESIZE = { ...ASPECT_RESIZE };

const RESIZE_HANDLE_CLASS = "react-resizable-handle";
const RESIZE_HANDLE_CLASSES = {
  top: RESIZE_HANDLE_CLASS,
  right: RESIZE_HANDLE_CLASS,
  bottom: RESIZE_HANDLE_CLASS,
  left: RESIZE_HANDLE_CLASS,
  topRight: RESIZE_HANDLE_CLASS,
  bottomRight: RESIZE_HANDLE_CLASS,
  bottomLeft: RESIZE_HANDLE_CLASS,
  topLeft: RESIZE_HANDLE_CLASS,
};

const WIDTH_ONLY_RESIZE = {
  top: false,
  right: true,
  bottom: false,
  left: true,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false,
};

function getResizeHandles(resizeBehavior) {
  if (resizeBehavior === "aspect") return ASPECT_RESIZE;
  if (resizeBehavior === "free" || resizeBehavior === "text") return FREE_RESIZE;
  return WIDTH_ONLY_RESIZE;
}

function isBlockEmptyInEditor(block, imageAssets) {
  const data = block.data ?? {};
  switch (block.type) {
    case "social":
      return !Array.isArray(data.links) || data.links.length === 0;
    case "image":
      return !imageAssets?.[block.id]?.url;
    case "embed":
      return !data.url;
    case "link":
      return !data.label?.trim() || !data.url;
    case "featuredLevels":
      return !Array.isArray(data.levelIds) || data.levelIds.length === 0;
    default:
      return false;
  }
}

function getEditorPlaceholderLabel(block) {
  const typeLabel = BLOCK_TYPE_LABELS[block.type] ?? block.type;
  return `${typeLabel} block`;
}

/** Block ids at a stage point, topmost first (matches paint order). */
function getBlocksAtPoint(blocks, px, py) {
  const hits = [];
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    const descriptor = getBlockDescriptor(block.type);
    if (!descriptor) continue;
    const { x, y, w, h, rotation = 0 } = normalizeLayout(block.layout, descriptor);
    let localX = px;
    let localY = py;
    if (rotation) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const theta = (-rotation * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const dx = px - cx;
      const dy = py - cy;
      localX = cx + dx * cos - dy * sin;
      localY = cy + dx * sin + dy * cos;
    }
    if (localX >= x && localX < x + w && localY >= y && localY < y + h) {
      hits.push(block.id);
    }
  }
  return hits;
}

function pickStackSelection(hits, selectedBlockId) {
  if (!hits.length) return null;
  const index = hits.indexOf(selectedBlockId);
  if (index === -1) return hits[0];
  return hits[(index + 1) % hits.length];
}

function isResizeHandleTarget(target) {
  return target instanceof Element && Boolean(target.closest(".react-resizable-handle"));
}

export default function BioCanvasStage({
  canvas,
  imageAssets,
  selectedBlockId,
  onSelectBlockId,
  onPatchLayout,
  className = "",
}) {
  const blocks = canvas?.blocks ?? [];
  const { wrapperRef, scale } = useStageScale();
  const innerRef = useRef(null);
  const interactionRef = useRef(null);
  const selectedBlockIdRef = useRef(selectedBlockId);
  const blocksRef = useRef(blocks);
  const scaleRef = useRef(scale);

  selectedBlockIdRef.current = selectedBlockId;
  blocksRef.current = blocks;
  scaleRef.current = scale;

  const getStagePoint = useCallback((event) => {
    const rect = innerRef.current.getBoundingClientRect();
    return {
      px: (event.clientX - rect.left) / scaleRef.current,
      py: (event.clientY - rect.top) / scaleRef.current,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }, []);

  const handleInnerPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      if (isResizeHandleTarget(event.target)) return;
      if (event.target !== innerRef.current) return;

      const { px, py, clientX, clientY } = getStagePoint(event);
      const hits = getBlocksAtPoint(blocksRef.current, px, py);

      interactionRef.current = {
        hits,
        selectedAtDown: selectedBlockIdRef.current,
        startClientX: clientX,
        startClientY: clientY,
        originX: 0,
        originY: 0,
        blockId: null,
        dragging: false,
      };
    },
    [getStagePoint],
  );

  useEffect(() => {
    const beginDrag = (interaction, blockId) => {
      const block = blocksRef.current.find((row) => row.id === blockId);
      const descriptor = block ? getBlockDescriptor(block.type) : null;
      if (!block || !descriptor) return false;

      const { x, y } = normalizeLayout(block.layout, descriptor);
      interaction.blockId = blockId;
      interaction.originX = x;
      interaction.originY = y;
      interaction.dragging = true;
      onSelectBlockId?.(blockId);
      return true;
    };

    const handlePointerMove = (event) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const dx = event.clientX - interaction.startClientX;
      const dy = event.clientY - interaction.startClientY;
      if (!interaction.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

        const { hits, selectedAtDown } = interaction;
        const dragId =
          selectedAtDown && hits.includes(selectedAtDown) ? selectedAtDown : hits[0] ?? null;
        if (!dragId || !beginDrag(interaction, dragId)) {
          interactionRef.current = null;
        }
        return;
      }

      onPatchLayout?.(interaction.blockId, {
        x: Math.round(interaction.originX + dx / scaleRef.current),
        y: Math.round(interaction.originY + dy / scaleRef.current),
      });
    };

    const handlePointerUp = () => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (!interaction.dragging) {
        const nextId = pickStackSelection(interaction.hits, interaction.selectedAtDown);
        onSelectBlockId?.(nextId);
      }

      interactionRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onPatchLayout, onSelectBlockId]);

  if (!blocks.length) {
    return (
      <div className={["bio-canvas-stage-editor", className].filter(Boolean).join(" ")}>
        <p className="bio-canvas-stage-editor__empty">Add blocks to start arranging your bio canvas.</p>
      </div>
    );
  }

  const contentHeight = computeStageContentHeight(blocks);
  const scaledHeight = contentHeight * scale;

  return (
    <div
      ref={wrapperRef}
      className={["bio-canvas-stage-editor", className].filter(Boolean).join(" ")}
    >
      <div className="bio-canvas-stage-editor__viewport" style={{ height: scaledHeight }}>
        <div
          ref={innerRef}
          className="bio-canvas-stage-editor__inner"
          style={{
            width: STAGE_WIDTH,
            height: contentHeight,
            transform: `scale(${scale})`,
          }}
          onPointerDown={handleInnerPointerDown}
        >
          {blocks.map((block, index) => {
            const descriptor = getBlockDescriptor(block.type);
            const Renderer = getBlockRenderer(block.type);
            if (!Renderer || !descriptor) return null;

            const layout = block.layout ?? {};
            const normalized = normalizeLayout(layout, descriptor);
            const { x, y, w, h, locked = true, rotation = 0 } = normalized;
            const isSelected = selectedBlockId === block.id;
            const resizeBehavior = descriptor.resizeBehavior ?? "widthOnly";
            const lockRatio =
              locked && (resizeBehavior === "aspect" || resizeBehavior === "free")
                ? getAspectRatio(layout)
                : false;
            const showPlaceholder = isBlockEmptyInEditor(block, imageAssets);

            return (
              <Rnd
                key={block.id}
                style={{ zIndex: index + 1 }}
                size={{ width: w, height: h }}
                position={{ x, y }}
                scale={scale}
                lockAspectRatio={lockRatio}
                disableDragging
                resizeHandleClasses={RESIZE_HANDLE_CLASSES}
                enableResizing={isSelected ? getResizeHandles(resizeBehavior) : false}
                onResizeStop={(_e, _dir, ref, _delta, position) => {
                  onPatchLayout?.(block.id, {
                    x: position.x,
                    y: position.y,
                    w: Math.round(ref.offsetWidth),
                    h: Math.round(ref.offsetHeight),
                  });
                }}
                className={[
                  "bio-canvas-stage-editor__rnd",
                  isSelected ? "bio-canvas-stage-editor__rnd--selected" : "",
                ].filter(Boolean).join(" ")}
              >
                <div
                  className="bio-canvas-stage-editor__block"
                  style={
                    rotation
                      ? {
                          transform: `rotate(${rotation}deg)`,
                          transformOrigin: "center center",
                          width: "100%",
                          height: "100%",
                        }
                      : undefined
                  }
                >
                  {showPlaceholder ? (
                    <div className="bio-canvas-stage-editor__placeholder">
                      {getEditorPlaceholderLabel(block)}
                    </div>
                  ) : (
                    <Renderer
                      block={block}
                      imageAssets={imageAssets}
                      descriptor={descriptor}
                      frameHeight={h}
                      onContentHeight={
                        block.type === "text"
                          ? (naturalHeight) => {
                              const nextH = Math.min(
                                STAGE_HEIGHT,
                                Math.max(MIN_BLOCK_H, Math.ceil(naturalHeight)),
                              );
                              if (nextH > h) onPatchLayout?.(block.id, { h: nextH });
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              </Rnd>
            );
          })}
        </div>
      </div>
    </div>
  );
}
