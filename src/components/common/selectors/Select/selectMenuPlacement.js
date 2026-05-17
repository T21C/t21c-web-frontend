const DEFAULT_MENU_HEIGHT = 220;
const MENU_GAP_PX = 8;

/**
 * Walk ancestors and intersect visible rects (fixed/sticky/scroll/hidden overflow).
 * Used so portaled menus flip based on the popup, not the document scroll height.
 */
function getClippingBounds(controlEl) {
  let top = 0;
  let bottom = window.innerHeight;
  let left = 0;
  let right = window.innerWidth;

  let el = controlEl;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const clipsVertically =
      style.position === "fixed" ||
      style.position === "sticky" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflowY === "overlay" ||
      style.overflowY === "hidden";
    const clipsHorizontally =
      style.overflowX === "auto" ||
      style.overflowX === "scroll" ||
      style.overflowX === "overlay" ||
      style.overflowX === "hidden";

    if (clipsVertically || clipsHorizontally || style.position === "fixed" || style.position === "sticky") {
      const rect = el.getBoundingClientRect();
      if (clipsVertically || style.position === "fixed" || style.position === "sticky") {
        top = Math.max(top, rect.top);
        bottom = Math.min(bottom, rect.bottom);
      }
      if (clipsHorizontally || style.position === "fixed" || style.position === "sticky") {
        left = Math.max(left, rect.left);
        right = Math.min(right, rect.right);
      }
    }
    el = el.parentElement;
  }

  return { top, bottom, left, right };
}

function parseMaxHeightPx(maxHeight) {
  if (maxHeight == null || maxHeight === "") return null;
  if (typeof maxHeight === "number" && Number.isFinite(maxHeight)) return maxHeight;
  const s = String(maxHeight).trim();
  const match = s.match(/^([\d.]+)\s*px$/i);
  if (match) return Number(match[1]);
  return null;
}

export function estimateSelectMenuHeight({ optionCount = 0, maxHeight = "" } = {}) {
  const capped = parseMaxHeightPx(maxHeight);
  if (capped != null) return capped;
  const fromOptions = optionCount * 36 + 12;
  return Math.min(Math.max(fromOptions, 120), DEFAULT_MENU_HEIGHT);
}

/**
 * @returns {"top" | "bottom"}
 */
export function computeSelectMenuPlacement(controlEl, menuHeight = DEFAULT_MENU_HEIGHT) {
  if (!controlEl) return "bottom";

  const controlRect = controlEl.getBoundingClientRect();
  const bounds = getClippingBounds(controlEl);
  const needed = menuHeight + MENU_GAP_PX;

  const spaceBelow = bounds.bottom - controlRect.bottom;
  const spaceAbove = controlRect.top - bounds.top;

  if (spaceBelow >= needed) return "bottom";
  if (spaceAbove >= needed) return "top";
  return spaceAbove > spaceBelow ? "top" : "bottom";
}
