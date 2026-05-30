import { useEffect, useState } from "react";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { UnlinkIcon } from "@/components/common/icons";
import {
  MAX_BLOCK_ROTATION,
  MIN_BLOCK_ROTATION,
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
  const hasImageActions = Boolean(onResetCrop || onFillCanvas);

  const [draft, setDraft] = useState(() => layoutToDraft(layout, normalized));

  useEffect(() => {
    setDraft(layoutToDraft(layout, normalized));
  }, [blockId]);

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

  const bumpRotation = (delta) => {
    setRotation((layout?.rotation ?? rotation ?? 0) + delta);
  };

  const renderField = (key) => (
    <label key={key} className="bio-canvas-editor__field bio-canvas-editor__field--inline">
      <span>{key.toUpperCase()}</span>
      <input
        type="number"
        value={draft[key] ?? ""}
        onChange={(ev) => setDraft((prev) => ({ ...prev, [key]: ev.target.value }))}
        onBlur={() => commitField(key, draft[key])}
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
      {renderField("x")}
      {renderField("y")}
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
