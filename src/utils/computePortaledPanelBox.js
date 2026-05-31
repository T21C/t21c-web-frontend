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
 * @param {DOMRect | null} [params.boundaryRect] - optional container to clamp horizontal size/position
 * @param {'start' | 'end'} [params.horizontalAlign='start'] - anchor panel to start or end of trigger
 * @returns {object | null}
 */
function getHorizontalClipBounds(boundaryRect, vw, margin) {
  const viewportClipLeft = margin;
  const viewportClipRight = vw - margin;
  const clipLeft = boundaryRect
    ? Math.max(viewportClipLeft, boundaryRect.left + margin)
    : viewportClipLeft;
  const clipRight = boundaryRect
    ? Math.min(viewportClipRight, boundaryRect.right - margin)
    : viewportClipRight;
  return {
    clipLeft,
    clipRight,
    availableWidth: Math.max(0, clipRight - clipLeft),
  };
}

function clampHorizontalLeft(left, panelWidth, clipLeft, clipRight) {
  const maxLeft = clipRight - panelWidth;
  return Math.min(Math.max(left, clipLeft), Math.max(clipLeft, maxLeft));
}

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
  boundaryRect = null,
  horizontalAlign = "start",
}) {
  const vw = viewport.width;
  const vh = viewport.height;
  const { clipLeft, clipRight, availableWidth } = getHorizontalClipBounds(boundaryRect, vw, margin);

  if (fullWidthBelow != null && vw <= fullWidthBelow) {
    const top = anchorRect.bottom + margin * 0.5;
    const maxHeight = Math.min(maxHeightCap, Math.max(minHeight, vh - top - margin));
    return {
      top,
      left: clipLeft,
      width: availableWidth > 0 ? availableWidth : Math.max(0, vw - 2 * margin),
      maxHeight,
      fullWidth: true,
      placement: "bottom",
    };
  }

  let width;
  let left;

  if (maxPanelWidth != null) {
    width = Math.min(maxPanelWidth, availableWidth || vw - 2 * margin, vw - 2 * margin);
    left = horizontalAlign === "end" ? anchorRect.right - width : anchorRect.left;
    left = clampHorizontalLeft(left, width, clipLeft, clipRight);
  } else {
    if (!panelRect) return null;

    let panelWidth = panelRect.width;
    if (availableWidth > 0 && panelWidth > availableWidth) {
      panelWidth = availableWidth;
    }

    left = horizontalAlign === "end" ? anchorRect.right - panelWidth : anchorRect.left;
    left = clampHorizontalLeft(left, panelWidth, clipLeft, clipRight);

    if (availableWidth > 0 && panelRect.width > availableWidth) {
      width = availableWidth;
    }
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
  if (availableWidth > 0) box.maxWidth = availableWidth;
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
  if (panelBox.maxWidth != null) style.maxWidth = panelBox.maxWidth;
  if (panelBox.maxHeight != null) style.maxHeight = panelBox.maxHeight;
  return style;
}
