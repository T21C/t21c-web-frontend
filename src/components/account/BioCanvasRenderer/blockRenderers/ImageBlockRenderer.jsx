import { normalizeImageCrop } from "@/utils/bioCanvas/blocks/image.js";

export default function ImageBlockRenderer({ block, imageAssets }) {
  const asset = imageAssets?.[block.id];
  const url = typeof asset?.url === "string" ? asset.url.trim() : "";
  const alt = block.data?.alt?.trim() || "";
  const crop = normalizeImageCrop(block.data?.crop);

  if (!url) return null;

  return (
    <div className="bio-canvas-block bio-canvas-block--image">
      <div className="bio-canvas-block__image-crop-frame">
        <img
          className="bio-canvas-block__image"
          src={url}
          alt={alt}
          loading="lazy"
          style={{
            objectFit: crop.fit,
            objectPosition: `${crop.focalX}% ${crop.focalY}%`,
            transform: `scale(${crop.zoom})`,
            transformOrigin: `${crop.focalX}% ${crop.focalY}%`,
          }}
        />
      </div>
    </div>
  );
}
