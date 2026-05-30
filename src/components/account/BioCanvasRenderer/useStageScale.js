import { useLayoutEffect, useRef, useState } from "react";
import { STAGE_WIDTH } from "@/utils/bioCanvas";

/** Uniform scale so a fixed-width design stage fits its container. */
export function useStageScale() {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(STAGE_WIDTH);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;

    const update = () => {
      const width = el.getBoundingClientRect().width || el.clientWidth || STAGE_WIDTH;
      const nextWidth = Math.max(0, width);
      setContainerWidth(nextWidth);
      setScale(Math.min(1, nextWidth / STAGE_WIDTH));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { wrapperRef, scale, containerWidth };
}
