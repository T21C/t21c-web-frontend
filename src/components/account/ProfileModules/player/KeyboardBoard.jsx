import { useEffect, useMemo, useRef, useState } from "react";

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
          const labelLines = String(key.label || "").split("\n");
          const longestLine = labelLines.reduce((max, line) => Math.max(max, line.length), 0);
          const fontScale = labelLines.length > 1
            ? (longestLine > 5 ? 0.15 : 0.2)
            : (longestLine > 7 ? 0.2 : 0.28);
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
            fontSize: `${boxH * fontScale}px`,
            lineHeight: 1,
          };
          const nodeKey = `${key.code}-${key.x}-${key.y}-${index}`;
          const lines = showLabels && key.label ? labelLines : [];
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
                aria-label={showLabels ? undefined : key.label}
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
