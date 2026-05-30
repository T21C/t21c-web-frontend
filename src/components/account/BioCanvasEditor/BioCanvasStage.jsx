import { Rnd } from "react-rnd";
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  MIN_BLOCK_H,
  computeStageContentHeight,
  getBlockDescriptor,
} from "@/utils/bioCanvas";
import { getAspectRatio } from "@/utils/bioCanvas/layout.js";
import { getBlockRenderer } from "../BioCanvasRenderer/blockRenderers/index.js";
import { useStageScale } from "../BioCanvasRenderer/useStageScale.js";
import { BLOCK_TYPE_LABELS } from "./blockEditors/index.js";

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
          className="bio-canvas-stage-editor__inner"
          style={{
            width: STAGE_WIDTH,
            height: contentHeight,
            transform: `scale(${scale})`,
          }}
        >
          {blocks.map((block) => {
            const descriptor = getBlockDescriptor(block.type);
            const Renderer = getBlockRenderer(block.type);
            if (!Renderer || !descriptor) return null;

            const layout = block.layout ?? {};
            const { x = 0, y = 0, w = 600, h = 120, locked = true } = layout;
            const isSelected = selectedBlockId === block.id;
            const resizeBehavior = descriptor.resizeBehavior ?? "widthOnly";
            const lockRatio =
              locked && resizeBehavior === "aspect" ? getAspectRatio(layout) : false;
            const showPlaceholder = isBlockEmptyInEditor(block, imageAssets);

            return (
              <Rnd
                key={block.id}
                size={{ width: w, height: h }}
                position={{ x, y }}
                scale={scale}
                bounds="parent"
                lockAspectRatio={lockRatio}
                enableResizing={getResizeHandles(resizeBehavior)}
                onDragStart={() => onSelectBlockId?.(block.id)}
                onResizeStart={() => onSelectBlockId?.(block.id)}
                onDragStop={(_e, data) => {
                  onPatchLayout?.(block.id, { x: data.x, y: data.y });
                }}
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
                onMouseDown={() => onSelectBlockId?.(block.id)}
              >
                <div className="bio-canvas-stage-editor__block">
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
