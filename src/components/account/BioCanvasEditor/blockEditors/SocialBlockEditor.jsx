import { CustomSelect } from "@/components/common/selectors";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_SHAPES,
  SOCIAL_ALIGNMENTS,
} from "@/utils/bioCanvas";

const PLATFORM_OPTIONS = SOCIAL_PLATFORMS.map((platform) => ({
  value: platform,
  label: platform.charAt(0).toUpperCase() + platform.slice(1),
}));

const SHAPE_OPTIONS = SOCIAL_SHAPES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const ALIGN_OPTIONS = SOCIAL_ALIGNMENTS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export default function SocialBlockEditor({ block, onPatchData }) {
  const data = block.data ?? {};
  const links = Array.isArray(data.links) ? data.links : [];
  const showLabels = Boolean(data.showLabels);

  const selectedShape = SHAPE_OPTIONS.find((o) => o.value === (data.shape ?? "circle")) ?? SHAPE_OPTIONS[0];
  const selectedAlign = ALIGN_OPTIONS.find((o) => o.value === (data.align ?? "center")) ?? ALIGN_OPTIONS[0];

  const patchLink = (index, patch) => {
    const next = links.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onPatchData({ links: next });
  };

  const addLink = () => {
    onPatchData({ links: [...links, { platform: "website", url: "" }] });
  };

  const removeLink = (index) => {
    onPatchData({ links: links.filter((_, i) => i !== index) });
  };

  const patchNumber = (key, rawValue) => {
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
      {links.map((link, index) => {
        const selectedPlatform =
          PLATFORM_OPTIONS.find((option) => option.value === link.platform) ?? PLATFORM_OPTIONS[0];

        return (
          <div key={index} className="bio-canvas-editor__social-row">
            <div className="bio-canvas-editor__field">
              <span>Platform</span>
              <CustomSelect
                options={PLATFORM_OPTIONS}
                value={selectedPlatform}
                onChange={(option) => patchLink(index, { platform: option.value })}
                width="100%"
                backgroundColor="var(--color-black-t40)"
                isSearchable={false}
              />
            </div>
            <label className="bio-canvas-editor__field">
              <span>URL</span>
              <input
                type="url"
                value={link.url ?? ""}
                maxLength={2048}
                placeholder="https://"
                onChange={(ev) => patchLink(index, { url: ev.target.value })}
              />
            </label>
            {showLabels ? (
              <label className="bio-canvas-editor__field">
                <span>Label</span>
                <input
                  type="text"
                  value={link.label ?? ""}
                  maxLength={40}
                  placeholder={link.platform}
                  onChange={(ev) => patchLink(index, { label: ev.target.value })}
                />
              </label>
            ) : null}
            <button type="button" className="btn-fill-danger bio-canvas-editor__remove-link" onClick={() => removeLink(index)}>
              Remove
            </button>
          </div>
        );
      })}
      <button type="button" className="btn-fill-secondary" onClick={addLink}>
        Add social link
      </button>

      <div className="bio-canvas-editor__layout-controls">
        <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
          <span>Icon size</span>
          <input
            type="number"
            value={data.iconSize ?? ""}
            onChange={(ev) => patchNumber("iconSize", ev.target.value)}
          />
        </label>
        <label className="bio-canvas-editor__field bio-canvas-editor__field--inline">
          <span>Gap</span>
          <input
            type="number"
            value={data.gap ?? ""}
            onChange={(ev) => patchNumber("gap", ev.target.value)}
          />
        </label>
      </div>
      <div className="bio-canvas-editor__layout-controls">
        <div className="bio-canvas-editor__field bio-canvas-editor__field--inline">
          <span>Shape</span>
          <CustomSelect
            options={SHAPE_OPTIONS}
            value={selectedShape}
            onChange={(option) => onPatchData({ shape: option.value })}
            width="100%"
            backgroundColor="var(--color-black-t40)"
            isSearchable={false}
          />
        </div>
        <div className="bio-canvas-editor__field bio-canvas-editor__field--inline">
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
      </div>
      <label className="bio-canvas-editor__field bio-canvas-editor__field--checkbox">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(ev) => onPatchData({ showLabels: ev.target.checked })}
        />
        <span>Show labels</span>
      </label>
    </div>
  );
}
