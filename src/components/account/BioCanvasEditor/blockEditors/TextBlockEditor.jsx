import { CustomSelect } from "@/components/common/selectors";
import {
  DEFAULT_TEXT_COLOR_PICKER,
  TEXT_ALIGNMENTS,
  parseTextBlockColor,
} from "@/utils/bioCanvas/blocks/text.js";

const ALIGN_OPTIONS = TEXT_ALIGNMENTS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export default function TextBlockEditor({ block, onPatchData }) {
  const { heading, body, fontSize, headingFontSize, align, color } = block.data ?? {};
  const selectedAlign = ALIGN_OPTIONS.find((option) => option.value === (align ?? "left")) ?? ALIGN_OPTIONS[0];
  const parsedColor = parseTextBlockColor(color);
  const pickerColor = parsedColor ?? DEFAULT_TEXT_COLOR_PICKER;

  const patchFontSize = (key, rawValue) => {
    if (rawValue === "") {
      onPatchData({ [key]: undefined });
      return;
    }
    const n = parseInt(rawValue, 10);
    if (!Number.isFinite(n)) return;
    onPatchData({ [key]: n });
  };

  return (
    <div className="bio-canvas-editor__fields">
      <label className="bio-canvas-editor__field">
        <span>Heading</span>
        <input
          type="text"
          value={heading ?? ""}
          maxLength={120}
          onChange={(ev) => onPatchData({ heading: ev.target.value || null })}
        />
      </label>
      <label className="bio-canvas-editor__field">
        <span>Body</span>
        <textarea
          rows={4}
          value={body ?? ""}
          maxLength={4000}
          onChange={(ev) => onPatchData({ body: ev.target.value })}
        />
      </label>
      <div className="bio-canvas-editor__layout-controls">
        <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
          <span>Body size</span>
          <input
            type="number"
            value={fontSize ?? ""}
            onChange={(ev) => patchFontSize("fontSize", ev.target.value)}
          />
        </label>
        <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
          <span>Heading size</span>
          <input
            type="number"
            value={headingFontSize ?? ""}
            onChange={(ev) => patchFontSize("headingFontSize", ev.target.value)}
          />
        </label>
      </div>
      <div className="bio-canvas-editor__field">
        <span>Alignment</span>
        <CustomSelect
          options={ALIGN_OPTIONS}
          value={selectedAlign}
          onChange={(option) => onPatchData({ align: option.value })}
          width="100%"
          backgroundColor="var(--color-black-t40)"
          isSearchable={false}
        />
      </div>
      <div className="bio-canvas-editor__field">
        <span>Text color</span>
        <div className="bio-canvas-editor__color-row">
          <input
            type="color"
            className="bio-canvas-editor__color-input"
            value={pickerColor}
            onChange={(ev) => onPatchData({ color: ev.target.value })}
            aria-label="Text color"
          />
          <span className="bio-canvas-editor__color-value">{parsedColor ?? "Default"}</span>
          <button
            type="button"
            className="bio-canvas-editor__color-reset"
            disabled={!parsedColor}
            onClick={() => onPatchData({ color: undefined })}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
