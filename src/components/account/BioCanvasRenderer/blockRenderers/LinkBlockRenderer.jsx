import { useExternalLink } from "@/components/common/LinkConfirm";

export default function LinkBlockRenderer({ block }) {
  const openExternal = useExternalLink();
  const { label, url } = block.data ?? {};

  if (!label?.trim() || !url) return null;

  return (
    <div className="bio-canvas-block bio-canvas-block--link">
      <button
        type="button"
        className="bio-canvas-block__link-btn btn-fill-accent"
        onClick={() => openExternal(url)}
      >
        {label}
      </button>
    </div>
  );
}
