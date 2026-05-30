import { useEffect, useMemo, useState } from "react";
import { useExternalLink } from "@/components/common/LinkConfirm";
import { getVideoDetails } from "@/utils";
import {
  getEmbedProvider,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "@/utils/bioCanvas/blocks/embed.js";

export default function EmbedBlockRenderer({ block }) {
  const openExternal = useExternalLink();
  const { url, title } = block.data ?? {};
  const [videoDetail, setVideoDetail] = useState(null);

  const provider = useMemo(() => (url ? getEmbedProvider(url) : null), [url]);
  const youtubeEmbed = useMemo(
    () => (provider === "youtube" && url ? getYouTubeEmbedUrl(url) : null),
    [provider, url],
  );
  const youtubeThumbnail = useMemo(
    () => (provider === "youtube" && url ? getYouTubeThumbnailUrl(url) : null),
    [provider, url],
  );

  useEffect(() => {
    let active = true;
    setVideoDetail(null);

    if (!url || provider !== "bilibili") {
      return () => {
        active = false;
      };
    }

    getVideoDetails(url)
      .then((detail) => {
        if (active) setVideoDetail(detail);
      })
      .catch(() => {
        if (active) setVideoDetail(null);
      });

    return () => {
      active = false;
    };
  }, [url, provider]);

  if (!url) return null;

  const embedSrc = youtubeEmbed ?? videoDetail?.embed ?? null;
  const thumbImage = youtubeThumbnail ?? videoDetail?.image ?? null;

  return (
    <div className="bio-canvas-block bio-canvas-block--embed">
      {title?.trim() ? <p className="bio-canvas-block__embed-title">{title}</p> : null}
      <div className="bio-canvas-block__embed-player">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title={title?.trim() || "Video player"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="bio-canvas-block__embed-thumb"
            style={thumbImage ? { backgroundImage: `url(${thumbImage})` } : undefined}
            onClick={() => openExternal(url)}
          >
            <span>{title?.trim() || videoDetail?.title || "Open video"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
