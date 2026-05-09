// tuf-search: #useSvgTextDimensions
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Attach `textRef` to an SVG `<text>` element; after layout, exposes its `getBBox()`
 * in the current SVG user space. Updates on window resize, SVG size changes, font load,
 * and whenever any `deps` argument changes.
 *
 * @param {...unknown} deps Values that should trigger a remeasure when they change (e.g. text content, `dx`, `textAnchor`, breakpoint).
 * @returns {{ textRef: React.RefObject<SVGTextElement>, dimensions: { x: number, y: number, width: number, height: number } | null, remeasure: () => void }}
 */
export function useSvgTextDimensions(...deps) {
  const textRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el || typeof el.getBBox !== "function") {
      setDimensions(null);
      return;
    }
    try {
      const box = el.getBBox();
      setDimensions({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      });
    } catch {
      setDimensions(null);
    }
  }, []);

  useLayoutEffect(() => {
    let alive = true;
    const run = () => {
      if (alive) measure();
    };

    const afterFonts = () => {
      if (document.fonts?.ready) {
        document.fonts.ready.then(run).catch(run);
      } else {
        run();
      }
    };

    afterFonts();
    const raf = requestAnimationFrame(run);

    const svg = textRef.current?.ownerSVGElement ?? textRef.current?.closest?.("svg");
    const ro =
      typeof ResizeObserver !== "undefined" && svg
        ? new ResizeObserver(() => {
            requestAnimationFrame(run);
          })
        : null;
    if (ro && svg) ro.observe(svg);

    window.addEventListener("resize", run);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [measure, ...deps]);

  return { textRef, dimensions, remeasure: measure };
}
