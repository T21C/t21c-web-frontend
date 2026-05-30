import { useEffect, useRef, useState } from "react";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { UnlinkIcon } from "@/components/common/icons";
import {
  MAX_BLOCK_ROTATION,
  MIN_BLOCK_ROTATION,
  STAGE_WIDTH,
  STAGE_HEIGHT,
  clampBlockRotation,
  getAspectRatio,
  normalizeLayout,
} from "@/utils/bioCanvas/layout.js";

function layoutToDraft(layout, normalized) {
  return {
    x: String(layout?.x ?? normalized.x),
    y: String(layout?.y ?? normalized.y),
    w: String(layout?.w ?? normalized.w),
    h: String(layout?.h ?? normalized.h),
  };
}

export default function BioCanvasLayoutControls({
  blockId,
  layout,
  descriptor,
  onChange,
  onResetCrop,
  onFillCanvas,
}) {
  const normalized = normalizeLayout(layout, descriptor);
  const locked = normalized.locked ?? false;
  const rotation = normalized.rotation ?? 0;
  const resizeBehavior = descriptor?.resizeBehavior ?? "widthOnly";
  const heightDisabled = resizeBehavior === "widthOnly";
  const supportsAspectLock = resizeBehavior === "aspect" || resizeBehavior === "free";
  const showAspectLink = supportsAspectLock && !heightDisabled;

  const [draft, setDraft] = useState(() => layoutToDraft(layout, normalized));
  const focusedKeyRef = useRef(null);

  useEffect(() => {
    setDraft((prev) => {
      const fresh = layoutToDraft(layout, normalized);
      const active = focusedKeyRef.current;
      if (active && prev[active] !== undefined) {
        fresh[active] = prev[active];
      }
      return fresh;
    });
  }, [blockId, normalized.x, normalized.y, normalized.w, normalized.h]);

  const commitField = (key, rawValue) => {
    if (rawValue === "" || rawValue === "-") {
      onChange({ ...layout, [key]: undefined });
      return;
    }

    const n = parseInt(rawValue, 10);
    if (!Number.isFinite(n)) return;

    let next = { ...layout, [key]: n };

    if (supportsAspectLock && locked && (key === "w" || key === "h")) {
      const ratio = getAspectRatio(layout);
      if (key === "w") {
        next.h = Math.round(n / ratio);
      } else {
        next.w = Math.round(n * ratio);
      }
    }

    onChange(next);
    setDraft((prev) => {
      const synced = { ...prev, [key]: String(n) };
      if (next.h !== undefined && key === "w") synced.h = String(next.h);
      if (next.w !== undefined && key === "h") synced.w = String(next.w);
      return synced;
    });
  };

  const setRotation = (nextRotation) => {
    onChange({ ...layout, rotation: clampBlockRotation(nextRotation, 0) });
  };

  const resetPosition = () => {
    onChange({ ...layout, x: 0, y: 0 });
    setDraft((prev) => ({ ...prev, x: "0", y: "0" }));
  };

  const getRotatedBounds = () => {
    const { w, h } = normalized;
    const theta = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(theta));
    const sin = Math.abs(Math.sin(theta));
    return {
      bboxW: w * cos + h * sin,
      bboxH: w * sin + h * cos,
    };
  };

  const alignHorizontal = (mode) => {
    const { w } = normalized;
    const { bboxW } = getRotatedBounds();
    const margin = (bboxW - w) / 2;
    let x = Math.round(margin);
    if (mode === "center") x = Math.round((STAGE_WIDTH - w) / 2);
    else if (mode === "right") x = Math.round(STAGE_WIDTH - w - margin);
    onChange({ ...layout, x });
    setDraft((prev) => ({ ...prev, x: String(x) }));
  };

  const alignVertical = (mode) => {
    const { h } = normalized;
    const { bboxH } = getRotatedBounds();
    const margin = (bboxH - h) / 2;
    let y = Math.round(margin);
    if (mode === "center") y = Math.round((STAGE_HEIGHT - h) / 2);
    else if (mode === "bottom") y = Math.round(STAGE_HEIGHT - h - margin);
    onChange({ ...layout, y });
    setDraft((prev) => ({ ...prev, y: String(y) }));
  };

  const bumpRotation = (delta) => {
    setRotation((layout?.rotation ?? rotation ?? 0) + delta);
  };

  const renderField = (key) => (
    <label key={key} className="bio-canvas-editor__field bio-canvas-editor__field--inline">
      <span>{key.toUpperCase()}</span>
      <input
        type="number"
        value={draft[key] ?? ""}
        onFocus={() => {
          focusedKeyRef.current = key;
        }}
        onChange={(ev) => setDraft((prev) => ({ ...prev, [key]: ev.target.value }))}
        onBlur={() => {
          focusedKeyRef.current = null;
          commitField(key, draft[key]);
        }}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            commitField(key, draft[key]);
            ev.currentTarget.blur();
          }
        }}
      />
    </label>
  );

  return (
    <div className="bio-canvas-editor__layout-controls">
      <div className="bio-canvas-editor__position-grid">
        {renderField("x")}
        {renderField("y")}
        <div className="bio-canvas-editor__align-group" role="group" aria-label="Align horizontally">
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Align left"
            title="Align left"
            onClick={() => alignHorizontal("left")}
          >
            &#8676;
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Align horizontal center"
            title="Align horizontal center"
            onClick={() => alignHorizontal("center")}
          >
            &#8596;
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Align right"
            title="Align right"
            onClick={() => alignHorizontal("right")}
          >
            &#8677;
          </button>
        </div>
        <div className="bio-canvas-editor__align-group" role="group" aria-label="Align vertically">
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Align top"
            title="Align top"
            onClick={() => alignVertical("top")}
          >
            &#10514;
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Align vertical center"
            title="Align vertical center"
            onClick={() => alignVertical("center")}
          >
            &#8597;
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Align bottom"
            title="Align bottom"
            onClick={() => alignVertical("bottom")}
          >
            &#10515;
          </button>
        </div>
      </div>
      <div className="bio-canvas-editor__size-fields">
        {renderField("w")}
        {showAspectLink ? (
          <button
            type="button"
            className={
              locked
                ? "bio-canvas-editor__aspect-link bio-canvas-editor__aspect-link--active"
                : "bio-canvas-editor__aspect-link"
            }
            aria-pressed={locked}
            aria-label={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
            title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
            onClick={() => onChange({ ...layout, locked: !locked })}
          >
            {locked ? (
              <LinkIcon size={16} color="currentColor" />
            ) : (
              <UnlinkIcon size={16} color="currentColor" />
            )}
          </button>
        ) : null}
        {!heightDisabled ? renderField("h") : null}
      </div>
      <div className="bio-canvas-editor__position-controls">
        <button
          type="button"
          className="btn-fill-secondary bio-canvas-editor__position-controls-reset"
          aria-label="Reset position to origin"
          onClick={resetPosition}
        >
          Reset position
        </button>
        {onResetCrop ? (
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Reset image crop"
            onClick={() => onResetCrop()}
          >
            Reset crop
          </button>
        ) : null}
        {onFillCanvas ? (
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Fill canvas with image"
            onClick={() => onFillCanvas()}
          >
            Fill canvas
          </button>
        ) : null}
      </div>
      <label className="bio-canvas-editor__field bio-canvas-editor__field--rotation">
        <span>Rotate ({rotation}°)</span>
        <input
          type="range"
          min={MIN_BLOCK_ROTATION}
          max={MAX_BLOCK_ROTATION}
          step={1}
          value={rotation}
          onChange={(ev) => setRotation(Number(ev.target.value))}
        />
        <div className="bio-canvas-editor__rotation-controls">
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Rotate 10 degrees counterclockwise"
            onClick={() => bumpRotation(-10)}
          >
            &lt;&lt;
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Rotate 1 degree counterclockwise"
            onClick={() => bumpRotation(-1)}
          >
            &lt;
          </button>
          <button
            type="button"
            className="btn-fill-secondary"
            aria-label="Reset rotation"
            onClick={() => setRotation(0)}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Rotate 1 degree clockwise"
            onClick={() => bumpRotation(1)}
          >
            &gt;
          </button>
          <button
            type="button"
            className="btn-fill-neutral"
            aria-label="Rotate 10 degrees clockwise"
            onClick={() => bumpRotation(10)}
          >
            &gt;&gt;
          </button>
        </div>
      </label>
    </div>
  );
}
