// tuf-search: #computePortaledPanelBox #portaledPanel
/**
 * Viewport-fixed panel box for content portaled under `.body`.
 * Re-anchor on scroll/resize (see usePortaledPanelAnchor).
 *
 * @param {object} params
 * @param {DOMRect} params.anchorRect
 * @param {DOMRect | null} [params.panelRect] - required when maxPanelWidth is not set
 * @param {number} [params.margin=8]
 * @param {number} [params.gap=6]
 * @param {number} [params.maxHeightCap=640]
 * @param {number} [params.minHeight=160]
 * @param {{ width: number, height: number }} [params.viewport]
 * @param {number | null} [params.fullWidthBelow] - at or below this vw, use full-bleed panel
 * @param {number | null} [params.maxPanelWidth] - fixed width (FacetQueryBuilder desktop); ignores panel width
 * @returns {object | null}
 */
export function computePortaledPanelBox({
  anchorRect,
  panelRect = null,
  margin = 8,
  gap = 6,
  maxHeightCap = 640,
  minHeight = 160,
  viewport = typeof window !== "undefined"
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 0, height: 0 },
  fullWidthBelow = null,
  maxPanelWidth = null,
}) {
  const vw = viewport.width;
  const vh = viewport.height;

  if (fullWidthBelow != null && vw <= fullWidthBelow) {
    const top = anchorRect.bottom + margin * 0.5;
    const maxHeight = Math.min(maxHeightCap, Math.max(minHeight, vh - top - margin));
    return {
      top,
      left: 0,
      width: "100%",
      maxHeight,
      fullWidth: true,
      placement: "bottom",
    };
  }

  let width;
  let left;

  if (maxPanelWidth != null) {
    width = Math.min(maxPanelWidth, vw - 2 * margin);
    left = anchorRect.left;
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - margin - width);
    }
    if (left < margin) left = margin;
  } else {
    if (!panelRect) return null;
    left = anchorRect.left;
    const maxLeft = vw - margin - panelRect.width;
    left = Math.min(Math.max(left, margin), Math.max(margin, maxLeft));
  }

  let top = anchorRect.bottom + gap;
  let placement = "bottom";
  const panelHeight = panelRect?.height ?? 0;

  if (panelRect && top + panelHeight > vh - margin) {
    const topAbove = anchorRect.top - gap - panelHeight;
    if (topAbove >= margin) {
      top = topAbove;
      placement = "top";
    } else {
      top = Math.max(margin, vh - margin - panelHeight);
    }
  }

  const maxHeight = Math.min(maxHeightCap, Math.max(minHeight, vh - top - margin));

  const box = { top, left, maxHeight, placement, fullWidth: false };
  if (width != null) box.width = width;
  return box;
}

/** Inline style for a portaled panel from computePortaledPanelBox result. */
export function portaledPanelBoxToStyle(panelBox) {
  if (!panelBox) return undefined;
  const style = {
    top: panelBox.top,
    left: panelBox.left,
  };
  if (panelBox.width != null) style.width = panelBox.width;
  if (panelBox.maxHeight != null) style.maxHeight = panelBox.maxHeight;
  return style;
}
