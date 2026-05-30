import { useLayoutEffect, useRef, useState } from "react";
import { MIN_TEXT_FONT_SIZE } from "@/utils/bioCanvas/blocks/text.js";

/**
 * Measure text at user font sizes, grow frame when content exceeds it,
 * and scale fonts down when content overflows a shorter frame.
 */
export function useTextBlockFit({
  containerRef,
  innerRef,
  headingRef,
  bodyRef,
  frameHeight,
  headingSize,
  bodySize,
  contentKey,
  onContentHeight,
}) {
  const onContentHeightRef = useRef(onContentHeight);
  onContentHeightRef.current = onContentHeight;

  const [fitSizes, setFitSizes] = useState({
    heading: headingSize,
    body: bodySize,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    const headingEl = headingRef.current;
    const bodyEl = bodyRef.current;
    if (!container || !inner || !bodyEl) return;

    const applySizes = (nextHeading, nextBody) => {
      if (headingEl) headingEl.style.fontSize = `${nextHeading}px`;
      bodyEl.style.fontSize = `${nextBody}px`;
    };

    applySizes(headingSize, bodySize);
    const naturalHeight = inner.scrollHeight;
    onContentHeightRef.current?.(naturalHeight);

    const maxHeight = frameHeight > 0 ? frameHeight : naturalHeight;
    if (naturalHeight <= maxHeight) {
      setFitSizes({ heading: headingSize, body: bodySize });
      return;
    }

    let nextHeading = headingSize;
    let nextBody = bodySize;
    applySizes(nextHeading, nextBody);

    for (let i = 0; i < 48; i += 1) {
      const overflow = inner.scrollHeight - maxHeight;
      if (overflow <= 0) break;

      const scale = maxHeight / inner.scrollHeight;
      nextHeading = Math.max(MIN_TEXT_FONT_SIZE, Math.floor(headingSize * scale));
      nextBody = Math.max(MIN_TEXT_FONT_SIZE, Math.floor(bodySize * scale));
      applySizes(nextHeading, nextBody);

      if (nextHeading === MIN_TEXT_FONT_SIZE && nextBody === MIN_TEXT_FONT_SIZE) break;
    }

    setFitSizes({ heading: nextHeading, body: nextBody });
  }, [
    containerRef,
    innerRef,
    headingRef,
    bodyRef,
    frameHeight,
    headingSize,
    bodySize,
    contentKey,
  ]);

  return fitSizes;
}
