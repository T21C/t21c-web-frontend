export default function LinkBlockEditor({ block, onPatchData }) {
  const { label, url } = block.data ?? {};

  return (
    <div className="bio-canvas-editor__fields">
      <label className="bio-canvas-editor__field">
        <span>Label</span>
        <input
          type="text"
          value={label ?? ""}
          maxLength={80}
          onChange={(ev) => onPatchData({ label: ev.target.value })}
        />
      </label>
      <label className="bio-canvas-editor__field">
        <span>URL</span>
        <input
          type="url"
          value={url ?? ""}
          maxLength={2048}
          placeholder="https://"
          onChange={(ev) => onPatchData({ url: ev.target.value })}
        />
      </label>
    </div>
  );
}
