// tuf-search: #usePortaledPanelAnchor #portaledPanel
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { getPortalRoot } from "@/utils/portalRoot";
import {
  computePortaledPanelBox,
  portaledPanelBoxToStyle,
} from "@/utils/computePortaledPanelBox";

/** Shared class: position fixed + viewport coords from panelStyle (import portaledPanel.css once in app). */
export const PORTALED_PANEL_CLASS = "portaled-panel";

/**
 * Anchors a portaled panel to a trigger with position:fixed coords that update on scroll/resize.
 *
 * @param {object} options
 * @param {boolean} options.open
 * @param {import('react').RefObject<HTMLElement>} options.anchorRef
 * @param {import('react').RefObject<HTMLElement>} [options.panelRef]
 * @param {unknown[]} [options.reanchorDeps] - extra deps that change panel size (content, toggles, …)
 * @param {number} [options.margin]
 * @param {number} [options.gap]
 * @param {number} [options.maxHeightCap]
 * @param {number} [options.minHeight]
 * @param {number | null} [options.fullWidthBelow] - full-bleed panel at or below this viewport width
 * @param {number | null} [options.maxPanelWidth] - fixed width mode (no panel measurement)
 * @param {import('react').RefObject<HTMLElement>} [options.boundaryRef] - clamp panel within this element
 * @param {'start' | 'end'} [options.horizontalAlign='start'] - horizontal alignment to anchor
 */
export function usePortaledPanelAnchor({
  open,
  anchorRef,
  panelRef,
  reanchorDeps = [],
  margin = 8,
  gap = 6,
  maxHeightCap = 640,
  minHeight = 160,
  fullWidthBelow = null,
  maxPanelWidth = null,
  boundaryRef = null,
  horizontalAlign = "start",
}) {
  const [panelBox, setPanelBox] = useState(null);

  const update = useCallback(() => {
    if (!open || !anchorRef?.current) {
      setPanelBox(null);
      return;
    }

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const panelRect = panelRef?.current?.getBoundingClientRect() ?? null;

    const boundaryRect = boundaryRef?.current?.getBoundingClientRect() ?? null;

    const box = computePortaledPanelBox({
      anchorRect,
      panelRect,
      margin,
      gap,
      maxHeightCap,
      minHeight,
      fullWidthBelow,
      maxPanelWidth,
      boundaryRect,
      horizontalAlign,
    });

    setPanelBox(box);
  }, [
    open,
    anchorRef,
    panelRef,
    margin,
    gap,
    maxHeightCap,
    minHeight,
    fullWidthBelow,
    maxPanelWidth,
    boundaryRef,
    horizontalAlign,
  ]);

  useLayoutEffect(() => {
    update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reanchorDeps are intentional extras
  }, [update, ...reanchorDeps]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  const portalRoot = typeof document !== "undefined" ? getPortalRoot() : null;

  return {
    panelBox,
    panelStyle: portaledPanelBoxToStyle(panelBox),
    placement: panelBox?.placement ?? "bottom",
    fullWidth: Boolean(panelBox?.fullWidth),
    portalRoot,
    update,
  };
}
