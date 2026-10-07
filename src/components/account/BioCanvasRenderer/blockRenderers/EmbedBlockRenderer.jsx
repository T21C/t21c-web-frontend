import { useMemo } from "react";
import { useExternalLink } from "@/components/common/LinkConfirm";
import { getLocalVideoPreview, getVideoEmbedModifierClass, getVideoIframeReferrerPolicy, getVideoIframeScrolling } from "@/utils/bioCanvas/blocks/embed";

export default function EmbedBlockRenderer({ block }) {
  const openExternal = useExternalLink();
  const { url, title } = block.data ?? {};
  const preview = useMemo(() => (url ? getLocalVideoPreview(url) : null), [url]);

  if (!url) return null;

  const embedSrc = preview?.embed ?? null;
  const thumbImage = preview?.image ?? null;

  return (
    <div className="bio-canvas-block bio-canvas-block--embed">
      {title?.trim() ? <p className="bio-canvas-block__embed-title">{title}</p> : null}
      <div className={`bio-canvas-block__embed-player ${getVideoEmbedModifierClass(url)}`.trim()}>
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title={title?.trim() || "Video player"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy={getVideoIframeReferrerPolicy(url)}
            scrolling={getVideoIframeScrolling(url)}
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="bio-canvas-block__embed-thumb"
            style={thumbImage ? { backgroundImage: `url(${thumbImage})` } : undefined}
            onClick={() => openExternal(url)}
          >
            <span>{title?.trim() || "Open video"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
