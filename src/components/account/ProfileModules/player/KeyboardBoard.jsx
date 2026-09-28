import { useEffect, useMemo, useRef, useState } from "react";

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

export default function KeyboardBoard({
  keys = [],
  activeKeys,
  emptySockets,
  onKeyToggle,
  maxUnit = 42,
  showLabels = true,
}) {
  const frameRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [fontTick, setFontTick] = useState(0);

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
    if (!keys.length) return { unit: 32, height: 0, maxX: 1 };
    const maxX = Math.max(...keys.map((key) => (key.x || 0) + (key.w || 1) + (key.offsetX || 0)), 1);
    const maxY = Math.max(...keys.map((key) => (key.y || 0) + (key.h || 1)), 1);
    const unit = width > 0 ? Math.min(maxUnit, width / maxX) : Math.min(32, maxUnit);
    const gap = unit * 0.045;
    return { unit, height: maxY * unit, maxX, gap };
  }, [keys, width, maxUnit]);

  const active = activeKeys instanceof Set ? activeKeys : new Set(activeKeys || []);
  const empty = emptySockets instanceof Set ? emptySockets : new Set(emptySockets || []);

  return (
    <div className="keyboard-setup__board" ref={frameRef}>
      <div
        className={`keyboard-setup__board-inner${onKeyToggle ? " keyboard-setup__board-inner--interactive" : ""}`}
        style={{ height: `${layout.height}px` }}
      >
        {keys.map((key, index) => {
          const bindable = key.bindable !== false;
          const isActive = active.has(key.code);
          const isEmpty = empty.has(key.code);
          const className = [
            "keyboard-setup__key",
            isActive ? "is-active" : "",
            !bindable ? "is-decorative" : "",
            isEmpty ? "is-empty" : "",
            key.variant ? `is-${key.variant}` : "",
            onKeyToggle && bindable && !isEmpty ? "is-clickable" : "",
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
          };
          const nodeKey = `${key.code}-${key.x}-${key.y}-${index}`;
          const lines = showLabels && key.label ? labelLines.filter((line) => line.trim()) : [];
          const shown = lines.join("\n");
          const accessible = String(key.label || "").trim();
          const ariaLabel = !showLabels || (accessible && shown !== accessible) ? accessible || undefined : undefined;
          const glyph = (
            <>
              {lines.length > 1 && (
                <span className="keyboard-setup__glyph is-stacked">
                  {lines.map((line, lineIndex) => (
                    <span key={`${nodeKey}-${lineIndex}`}>{line}</span>
                  ))}
                </span>
              )}
              {lines.length === 1 && <span className="keyboard-setup__glyph">{lines[0]}</span>}
            </>
          );
          if (onKeyToggle && bindable && !isEmpty) {
            return (
              <button
                key={nodeKey}
                type="button"
                className={className}
                style={style}
                aria-pressed={isActive}
                aria-label={ariaLabel}
                onClick={() => onKeyToggle(key.code)}
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
      </div>
    </div>
  );
}
