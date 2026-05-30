import {
  MIN_BLOCK_H,
  MIN_BLOCK_W,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  getAspectRatio,
} from "@/utils/bioCanvas/layout.js";

export default function BioCanvasLayoutControls({ layout, descriptor, onChange }) {
  const { x = 0, y = 0, w = 600, h = 120, locked = true } = layout ?? {};
  const resizeBehavior = descriptor?.resizeBehavior ?? "widthOnly";
  const heightDisabled = resizeBehavior === "widthOnly";

  const patchField = (key, rawValue) => {
    const n = parseInt(rawValue, 10);
    if (!Number.isFinite(n)) return;

    let next = { ...layout, [key]: n };

    if (resizeBehavior === "aspect" && locked) {
      const ratio = getAspectRatio(layout);
      if (key === "w") {
        next.h = Math.max(MIN_BLOCK_H, Math.round(n / ratio));
      } else if (key === "h") {
        next.w = Math.max(MIN_BLOCK_W, Math.round(n * ratio));
      }
    }

    onChange(next);
  };

  return (
    <div className="bio-canvas-editor__layout-controls">
      <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
        <span>X</span>
        <input
          type="number"
          min={0}
          max={STAGE_WIDTH - MIN_BLOCK_W}
          value={x}
          onChange={(ev) => patchField("x", ev.target.value)}
        />
      </label>
      <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
        <span>Y</span>
        <input
          type="number"
          min={0}
          max={STAGE_HEIGHT - MIN_BLOCK_H}
          value={y}
          onChange={(ev) => patchField("y", ev.target.value)}
        />
      </label>
      <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
        <span>W</span>
        <input
          type="number"
          min={MIN_BLOCK_W}
          max={STAGE_WIDTH}
          value={w}
          onChange={(ev) => patchField("w", ev.target.value)}
        />
      </label>
      <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
        <span>H</span>
        <input
          type="number"
          min={MIN_BLOCK_H}
          max={STAGE_HEIGHT}
          value={h}
          disabled={heightDisabled}
          onChange={(ev) => patchField("h", ev.target.value)}
        />
      </label>
      {resizeBehavior === "aspect" ? (
        <label className="bio-canvas-editor__field bio-canvas-editor__field--checkbox">
          <input
            type="checkbox"
            checked={locked !== false}
            onChange={(ev) => onChange({ ...layout, locked: ev.target.checked })}
          />
          <span>Lock aspect ratio</span>
        </label>
      ) : null}
    </div>
  );
}
