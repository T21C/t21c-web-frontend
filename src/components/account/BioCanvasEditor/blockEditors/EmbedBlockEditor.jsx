export default function EmbedBlockEditor({ block, onPatchData }) {
  const { url, title } = block.data ?? {};

  return (
    <div className="bio-canvas-editor__fields">
      <label className="bio-canvas-editor__field">
        <span>Video URL</span>
        <input
          type="url"
          value={url ?? ""}
          maxLength={2048}
          placeholder="YouTube or Bilibili video link"
          onChange={(ev) => onPatchData({ url: ev.target.value })}
        />
        <small className="bio-canvas-editor__hint">
          Only YouTube and Bilibili video links are supported.
        </small>
      </label>
      <label className="bio-canvas-editor__field">
        <span>Title (optional)</span>
        <input
          type="text"
          value={title ?? ""}
          maxLength={120}
          onChange={(ev) => onPatchData({ title: ev.target.value })}
        />
      </label>
    </div>
  );
}
