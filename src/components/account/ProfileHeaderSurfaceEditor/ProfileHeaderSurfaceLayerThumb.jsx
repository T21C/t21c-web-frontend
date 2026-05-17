import {
  SURFACE_STACK_KIND_GRADIENT,
  SURFACE_STACK_KIND_IMAGE,
  buildGradientLayerCss,
  buildImageLayerDomStyle,
} from "@/utils/profileHeaderSurfaceStyle";

export default function ProfileHeaderSurfaceLayerThumb({ entry, previewImageUrl, imageSettings }) {
  if (entry.kind === SURFACE_STACK_KIND_GRADIENT) {
    return (
      <span
        className="profile-header-surface-layer-list__thumb"
        style={{ background: buildGradientLayerCss(entry) }}
        aria-hidden
      />
    );
  }

  if (entry.kind === SURFACE_STACK_KIND_IMAGE && previewImageUrl && imageSettings) {
    return (
      <span
        className="profile-header-surface-layer-list__thumb"
        style={buildImageLayerDomStyle(previewImageUrl, imageSettings)}
        aria-hidden
      />
    );
  }

  return (
    <span
      className="profile-header-surface-layer-list__thumb profile-header-surface-layer-list__thumb--empty"
      aria-hidden
    />
  );
}
