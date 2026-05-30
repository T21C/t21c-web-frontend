import { useMemo, useRef } from "react";
import {
  clampTextFontSize,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_HEADING_FONT_SIZE,
} from "@/utils/bioCanvas/blocks/text.js";
import { useTextBlockFit } from "./useTextBlockFit.js";

function hasTextContent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export default function TextBlockRenderer({ block, frameHeight, onContentHeight }) {
  const { heading, body, fontSize, headingFontSize, align } = block.data ?? {};
  const layoutHeight = frameHeight ?? block.layout?.h ?? 120;
  const textAlign = align === "center" || align === "right" ? align : "left";
  const userHeadingSize = clampTextFontSize(headingFontSize, DEFAULT_TEXT_HEADING_FONT_SIZE);
  const userBodySize = clampTextFontSize(fontSize, DEFAULT_TEXT_FONT_SIZE);

  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const headingRef = useRef(null);
  const bodyRef = useRef(null);

  const showHeading = hasTextContent(heading);
  const showBody = hasTextContent(body);
  const bodyDisplay = showBody ? body : "Sample text";

  const contentKey = useMemo(
    () => [heading ?? "", body ?? "", userHeadingSize, userBodySize, layoutHeight, textAlign].join("\u0000"),
    [heading, body, userHeadingSize, userBodySize, layoutHeight, textAlign],
  );

  const fitSizes = useTextBlockFit({
    containerRef,
    innerRef,
    headingRef,
    bodyRef,
    frameHeight: layoutHeight,
    headingSize: userHeadingSize,
    bodySize: userBodySize,
    contentKey,
    onContentHeight,
  });

  return (
    <div
      ref={containerRef}
      className="bio-canvas-block bio-canvas-block--text"
      style={{ textAlign }}
    >
      <div ref={innerRef} className="bio-canvas-block__text-inner">
        {showHeading ? (
          <h3
            ref={headingRef}
            className="bio-canvas-block__heading"
            style={{ fontSize: `${fitSizes.heading}px` }}
          >
            {heading}
          </h3>
        ) : null}
        <p
          ref={bodyRef}
          className={[
            "bio-canvas-block__body",
            showBody ? "" : "bio-canvas-block__body--placeholder",
          ].filter(Boolean).join(" ")}
          style={{ fontSize: `${fitSizes.body}px` }}
        >
          {bodyDisplay}
        </p>
      </div>
    </div>
  );
}
