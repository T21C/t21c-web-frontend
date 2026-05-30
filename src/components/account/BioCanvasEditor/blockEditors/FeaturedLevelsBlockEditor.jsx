import { useEffect, useState } from "react";
import { CustomSelect } from "@/components/common/selectors";
import { MAX_FEATURED_LEVELS, FEATURED_MODES } from "@/utils/bioCanvas";

const MODE_OPTIONS = FEATURED_MODES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

function parseIds(raw) {
  return [
    ...new Set(
      String(raw ?? "")
        .split(/[,\s]+/)
        .map((part) => parseInt(part.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, MAX_FEATURED_LEVELS),
    ),
  ];
}

export default function FeaturedLevelsBlockEditor({ block, onPatchData }) {
  const mode = block.data?.mode === "passes" ? "passes" : "levels";
  const idKey = mode === "passes" ? "passIds" : "levelIds";
  const ids = Array.isArray(block.data?.[idKey]) ? block.data[idKey] : [];
  const selectedMode = MODE_OPTIONS.find((o) => o.value === mode) ?? MODE_OPTIONS[0];

  const [draft, setDraft] = useState(() => ids.join(", "));

  useEffect(() => {
    setDraft(ids.join(", "));
  }, [block.id, mode]);

  const commitDraft = (raw) => {
    const parsed = parseIds(raw);
    onPatchData({ [idKey]: parsed });
    setDraft(parsed.join(", "));
  };

  const label = mode === "passes" ? "Pass" : "Level";

  return (
    <div className="bio-canvas-editor__fields">
      <div className="bio-canvas-editor__field">
        <span>Mode</span>
        <CustomSelect
          options={MODE_OPTIONS}
          value={selectedMode}
          onChange={(option) => onPatchData({ mode: option.value })}
          width="100%"
          backgroundColor="var(--color-black-t40)"
          isSearchable={false}
        />
      </div>
      <label className="bio-canvas-editor__field">
        <span>
          {label} IDs (comma-separated, max {MAX_FEATURED_LEVELS})
        </span>
        <input
          type="text"
          value={draft}
          placeholder="123, 456, 789"
          onChange={(ev) => setDraft(ev.target.value)}
          onBlur={() => commitDraft(draft)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              commitDraft(draft);
              ev.currentTarget.blur();
            }
          }}
        />
      </label>
    </div>
  );
}
