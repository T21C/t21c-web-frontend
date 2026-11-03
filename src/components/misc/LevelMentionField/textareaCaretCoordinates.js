// tuf-search: #textareaCaretCoordinates #levelMention
const MIRROR_PROPS = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontFamily',
  'lineHeight',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak',
];

function lineHeightPx(style) {
  const raw = style.lineHeight;
  const parsed = parseFloat(raw);
  if (Number.isFinite(parsed)) return parsed;
  const fontSize = parseFloat(style.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.2 : 16;
}

/**
 * Viewport rect of the caret (or a given offset) inside a textarea or input.
 * @param {HTMLTextAreaElement | HTMLInputElement} element
 * @param {number} position
 */
export function getCaretClientRect(element, position) {
  const doc = element.ownerDocument;
  const style = doc.defaultView.getComputedStyle(element);
  const isInput = element.tagName === 'INPUT';
  const mirror = doc.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');

  MIRROR_PROPS.forEach((prop) => {
    mirror.style[prop] = style[prop];
  });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.overflow = 'hidden';
  if (isInput) {
    mirror.style.whiteSpace = 'pre';
    mirror.style.wordWrap = 'normal';
  } else {
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
  }

  const value = element.value || '';
  const index = Math.max(0, Math.min(position, value.length));
  mirror.textContent = value.slice(0, index);
  const marker = doc.createElement('span');
  marker.textContent = value.slice(index) || '.';
  mirror.appendChild(marker);
  doc.body.appendChild(mirror);

  const height = lineHeightPx(style);
  const top = marker.offsetTop + parseFloat(style.borderTopWidth || '0');
  const left = marker.offsetLeft + parseFloat(style.borderLeftWidth || '0');
  doc.body.removeChild(mirror);

  const rect = element.getBoundingClientRect();
  const caretTop = rect.top + top - element.scrollTop;
  const caretLeft = rect.left + left - element.scrollLeft;
  const clampedTop = Math.min(Math.max(caretTop, rect.top), Math.max(rect.top, rect.bottom - height));
  const clampedLeft = Math.min(Math.max(caretLeft, rect.left), rect.right);

  return {
    top: clampedTop,
    left: clampedLeft,
    height,
    bottom: clampedTop + height,
    width: 0,
    right: clampedLeft,
  };
}

export function navbarOffsetPx() {
  if (typeof window === 'undefined') return 32;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height');
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 32;
}
