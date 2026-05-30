import { coerceBioCanvasForRender, parseBioCanvasImageAssets, STAGE_WIDTH, getBlockDescriptor } from "@/utils/bioCanvas";
import { computeStageContentHeight, getBlockPositionStyle } from "@/utils/bioCanvas/layout.js";
import { getBlockRenderer } from "./blockRenderers/index.js";
import { useStageScale } from "./useStageScale.js";

export default function BioCanvasRenderer({ canvas, imageAssets, className = "" }) {
  const doc = coerceBioCanvasForRender(canvas);
  const assets = parseBioCanvasImageAssets(imageAssets);
  const { wrapperRef, scale } = useStageScale();

  if (!doc?.blocks?.length) return null;

  const contentHeight = computeStageContentHeight(doc.blocks);
  const scaledHeight = contentHeight * scale;

  return (
    <div
      ref={wrapperRef}
      className={["bio-canvas-renderer", className].filter(Boolean).join(" ")}
    >
      <div className="bio-canvas-stage" style={{ height: scaledHeight }}>
        <div
          className="bio-canvas-stage__inner"
          style={{
            width: STAGE_WIDTH,
            height: contentHeight,
            transform: `scale(${scale})`,
          }}
        >
          {doc.blocks.map((block) => {
            const descriptor = getBlockDescriptor(block.type);
            const Renderer = getBlockRenderer(block.type);
            if (!Renderer || !descriptor) return null;
            return (
              <div
                key={block.id}
                className="bio-canvas-block-wrap"
                style={getBlockPositionStyle(block.layout, descriptor)}
              >
                <Renderer block={block} imageAssets={assets} descriptor={descriptor} frameHeight={block.layout?.h} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
