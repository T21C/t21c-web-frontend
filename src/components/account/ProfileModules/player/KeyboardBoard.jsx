import { useEffect, useMemo, useRef, useState } from "react";
import SwitchTopPlaceholder from "./SwitchTopPlaceholder";

const SHORT_LABELS = {
  enter: "↵",
  return: "↵",
  "pause break": "Break",
  "caps lock": "Caps",
  backspace: "Bksp",
  "print screen": "PrtSc",
  "scroll lock": "ScrLk",
  "num lock": "NumLk",
  insert: "Ins",
  delete: "Del",
  "page up": "PgUp",
  "page down": "PgDn",
  escape: "Esc",
};

function shortKeyLines(label) {
  const raw = String(label || "");
  const key = raw.trim().toLocaleLowerCase().replace(/[\s\n]+/g, " ");
  const short = SHORT_LABELS[key];
  if (short) return [short];
  return raw.split("\n");
}

const GLYPH_FONT = "Roboto, sans-serif";
const glyphRatioCache = new Map();
const DRAG_SLOP = 4;

function glyphHeightOverWidth(text, fontTick) {
  const cacheKey = `${fontTick}\0${text}`;
  const cached = glyphRatioCache.get(cacheKey);
  if (cached) return cached;
  const ratio = readGlyphHeightOverWidth(text);
  glyphRatioCache.set(cacheKey, ratio);
  return ratio;
}

function readGlyphHeightOverWidth(text) {
  if (typeof document === "undefined") return 1;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 1;
  ctx.font = `700 100px ${GLYPH_FONT}`;
  const metrics = ctx.measureText(text);
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  if (!(width > 0) || !(height > 0)) return 1;
  return height / width;
}

function labelBasis(boxW, boxH, heightOverWidth) {
  if (heightOverWidth > 1) return Math.min(boxW, boxH);
  return boxH;
}

function uniqueCodes(codes) {
  const seen = new Set();
  const out = [];
  for (const code of codes) {
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

function boxesIntersect(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function sameCodeSet(a, b) {
  if (a.size !== b.size) return false;
  for (const code of a) {
    if (!b.has(code)) return false;
  }
  return true;
}

function pointerLocal(event, node) {
  const rect = node.getBoundingClientRect();
  return {x: event.clientX - rect.left, y: event.clientY - rect.top};
}

export default function KeyboardBoard({
  keys = [],
  activeKeys,
  emptySockets,
  onKeyToggle,
  onPaintKeys,
  selectedKeys,
  selectMode = false,
  paintByCode,
  keepFillOnHover = false,
  maxUnit = 42,
  showLabels = true,
}) {
  const frameRef = useRef(null);
  const innerRef = useRef(null);
  const dragRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [fontTick, setFontTick] = useState(0);
  const [marquee, setMarquee] = useState(null);
  const [pendingCodes, setPendingCodes] = useState(() => new Set());

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts?.ready) return undefined;
    let active = true;
    fonts.ready.then(() => {
      if (active) setFontTick((tick) => tick + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width || 0;
      setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (!keys.length) return { unit: 32, height: 0, maxX: 1, gap: 0 };
    const maxX = Math.max(...keys.map((key) => (key.x || 0) + (key.w || 1) + (key.offsetX || 0)), 1);
    const maxY = Math.max(...keys.map((key) => (key.y || 0) + (key.h || 1)), 1);
    const unit = width > 0 ? Math.min(maxUnit, width / maxX) : Math.min(32, maxUnit);
    const gap = unit * 0.045;
    return { unit, height: maxY * unit, maxX, gap };
  }, [keys, width, maxUnit]);

  const boxes = useMemo(() => {
    const gap = layout.gap;
    return keys.map((key, index) => {
      const left = ((key.x || 0) + (key.offsetX || 0)) * layout.unit;
      const top = (key.y || 0) * layout.unit;
      return {
        index,
        code: key.code,
        bindable: key.bindable !== false,
        left,
        top,
        right: left + (key.w || 1) * layout.unit,
        bottom: top + (key.h || 1) * layout.unit,
        innerLeft: left + gap / 2,
        innerTop: top + gap / 2,
      };
    });
  }, [keys, layout]);

  const active = activeKeys instanceof Set ? activeKeys : new Set(activeKeys || []);
  const empty = emptySockets instanceof Set ? emptySockets : new Set(emptySockets || []);
  const selected = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys || []);
  const interactive = typeof onKeyToggle === "function" || typeof onPaintKeys === "function";
  const membership = selectMode ? selected : active;

  function hitBox(point) {
    for (let i = boxes.length - 1; i >= 0; i -= 1) {
      const box = boxes[i];
      if (point.x >= box.left && point.x < box.right && point.y >= box.top && point.y < box.bottom) {
        return box;
      }
    }
    return null;
  }

  function codesInRect(rect) {
    return uniqueCodes(
      boxes
        .filter((box) => box.bindable && !empty.has(box.code) && boxesIntersect(box, rect))
        .map((box) => box.code),
    );
  }

  function emitPaint(codes, turnedOn, kind) {
    const list = uniqueCodes(codes);
    if (typeof onPaintKeys === "function") {
      onPaintKeys(list, turnedOn, kind);
      return;
    }
    if (list.length === 1 && typeof onKeyToggle === "function") {
      onKeyToggle(list[0]);
    }
  }

  function clearPreview() {
    setMarquee(null);
    setPendingCodes((prev) => (prev.size ? new Set() : prev));
  }

  function previewRect(drag, point) {
    return {
      left: Math.min(drag.x0, point.x),
      top: Math.min(drag.y0, point.y),
      right: Math.max(drag.x0, point.x),
      bottom: Math.max(drag.y0, point.y),
    };
  }

  function wouldFlip(rect) {
    return codesInRect(rect);
  }

  function finishGesture(event, commit) {
    const drag = dragRef.current;
    dragRef.current = null;
    clearPreview();
    if (!drag) return;
    const inner = innerRef.current;
    if (inner && event.pointerId != null) {
      try {
        inner.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    }
    if (!commit) return;
    const point = inner ? pointerLocal(event, inner) : {x: drag.x1, y: drag.y1};
    const hit = hitBox(point);
    if (!drag.moved) {
      if (!hit || !hit.bindable || empty.has(hit.code)) return;
      emitPaint([hit.code], !membership.has(hit.code), "toggle");
      return;
    }
    if (!event.shiftKey) return;
    const codes = wouldFlip(previewRect(drag, point));
    if (!codes.length) return;
    emitPaint(codes, false, "toggle");
  }

  function startGesture(event) {
    if (!interactive || event.button !== 0) return;
    const inner = innerRef.current;
    if (!inner) return;
    event.preventDefault();
    const point = pointerLocal(event, inner);
    dragRef.current = {
      x0: point.x,
      y0: point.y,
      x1: point.x,
      y1: point.y,
      moved: false,
    };
    try {
      inner.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function moveGesture(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const inner = innerRef.current;
    if (!inner) return;
    const point = pointerLocal(event, inner);
    const dx = point.x - drag.x0;
    const dy = point.y - drag.y0;
    if (!drag.moved && (dx * dx + dy * dy) >= DRAG_SLOP * DRAG_SLOP) {
      drag.moved = true;
    }
    drag.x1 = point.x;
    drag.y1 = point.y;
    if (!drag.moved || !event.shiftKey) {
      clearPreview();
      return;
    }
    const rect = previewRect(drag, point);
    setMarquee({
      left: rect.left,
      top: rect.top,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
    });
    const next = new Set(wouldFlip(rect));
    setPendingCodes((prev) => (sameCodeSet(prev, next) ? prev : next));
  }

  return (
    <div className="keyboard-setup__board" ref={frameRef}>
      <div
        className={`keyboard-setup__board-inner${interactive ? " keyboard-setup__board-inner--interactive" : ""}`}
        style={{
          height: `${layout.height}px`,
          "--key-depth-size": `${Math.max(5, Math.round(layout.unit * 0.22))}px`,
        }}
        ref={innerRef}
        onPointerDown={interactive ? startGesture : undefined}
        onPointerMove={interactive ? moveGesture : undefined}
        onPointerUp={interactive ? (event) => finishGesture(event, true) : undefined}
        onPointerCancel={interactive ? (event) => finishGesture(event, false) : undefined}
      >
        {keys.map((key, index) => {
          const bindable = key.bindable !== false;
          const isActive = !selectMode && active.has(key.code);
          const isEmpty = empty.has(key.code);
          const isOutlined = selectMode && selected.has(key.code);
          const isPending = pendingCodes.has(key.code);
          const paint = paintByCode?.[key.code] || null;
          const switchTop = paint?.switchTop || null;
          const className = [
            "keyboard-setup__key",
            isActive ? "is-active" : "",
            isOutlined ? "is-outlined" : "",
            isPending ? "is-pending" : "",
            paint?.fill ? "is-painted" : "",
            keepFillOnHover ? "keeps-fill" : "",
            !bindable ? "is-decorative" : "",
            isEmpty ? "is-empty" : "",
            key.variant ? `is-${key.variant}` : "",
            interactive && bindable && !isEmpty ? "is-clickable" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const gap = layout.gap;
          const boxW = Math.max(1, (key.w || 1) * layout.unit - gap);
          const boxH = Math.max(1, (key.h || 1) * layout.unit - gap);
          const labelLines = shortKeyLines(key.label);
          const longestLine = labelLines.reduce((max, line) => Math.max(max, line.length), 0);
          const symbol = labelLines.length === 1 && labelLines[0] === "↵";
          const heightOverWidth = labelLines.length === 1 ? glyphHeightOverWidth(labelLines[0], fontTick) : 1;
          const fontScale = symbol
            ? 0.5
            : labelLines.length > 1
              ? (longestLine > 5 ? 0.15 : 0.2)
              : (longestLine > 7 ? 0.2 : 0.28);
          const basis = labelBasis(boxW, boxH, heightOverWidth);
          const style = {
            left: `${((key.x || 0) + (key.offsetX || 0)) * layout.unit + gap / 2}px`,
            top: `${(key.y || 0) * layout.unit + gap / 2}px`,
            width: `${boxW}px`,
            height: `${boxH}px`,
            minWidth: `${boxW}px`,
            maxWidth: `${boxW}px`,
            minHeight: `${boxH}px`,
            maxHeight: `${boxH}px`,
            padding: `${boxH * 0.06}px`,
            fontSize: `${basis * fontScale}px`,
            lineHeight: 1,
            "--key-fill": paint?.fill || undefined,
          };
          const nodeKey = `${key.code}-${key.x}-${key.y}-${index}`;
          const lines = showLabels && key.label && !switchTop ? labelLines.filter((line) => line.trim()) : [];
          const shown = lines.join("\n");
          const accessible = String(key.label || "").trim();
          const ariaLabel = !showLabels || (accessible && shown !== accessible) ? accessible || undefined : undefined;
          const glyph = (
            <>
              {switchTop && (
                <SwitchTopPlaceholder
                  absent={switchTop.absent}
                  base={switchTop.base}
                  top={switchTop.top}
                  stem={switchTop.stem}
                  opacity={switchTop.opacity}
                  size={Math.round(Math.min(boxW, boxH * 0.75))}
                />
              )}
              {lines.length > 1 && (
                <span className="keyboard-setup__glyph is-stacked">
                  {lines.map((line, lineIndex) => (
                    <span key={`${nodeKey}-${lineIndex}`}>{line}</span>
                  ))}
                </span>
              )}
              {lines.length === 1 && <span className="keyboard-setup__glyph">{lines[0]}</span>}
              {(paint?.labels || []).map((label, labelIndex) => (
                <span
                  key={`${nodeKey}-depth-${labelIndex}`}
                  className={`keyboard-setup__key-depth is-${label.corner || "tl"}`}
                  style={{color: label.color}}
                >
                  {label.text}
                </span>
              ))}
            </>
          );
          if (interactive && bindable && !isEmpty) {
            return (
              <button
                key={nodeKey}
                type="button"
                className={className}
                style={style}
                aria-pressed={selectMode ? isOutlined : isActive}
                aria-label={ariaLabel}
                onClick={(event) => event.preventDefault()}
              >
                {glyph}
              </button>
            );
          }
          return (
            <div key={nodeKey} className={className} style={style}>
              {glyph}
            </div>
          );
        })}
        {marquee ? (
          <div
            className="keyboard-setup__marquee"
            style={{
              left: `${marquee.left}px`,
              top: `${marquee.top}px`,
              width: `${marquee.width}px`,
              height: `${marquee.height}px`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
