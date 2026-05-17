import {
  SURFACE_STACK_KIND_GRADIENT,
  SURFACE_STACK_KIND_IMAGE,
  buildGradientLayerCss,
} from "@/utils/profileHeaderSurfaceStyle";

export default function ProfileHeaderSurfaceLayerThumb({ entry, previewImageUrl }) {
  if (entry.kind === SURFACE_STACK_KIND_GRADIENT) {
    return (
      <span
        className="profile-header-surface-layer-list__thumb"
        style={{ background: buildGradientLayerCss(entry, { ignorePosition: true }) }}
        aria-hidden
      />
    );
  }

  if (entry.kind === SURFACE_STACK_KIND_IMAGE && previewImageUrl) {
    return (
      <img
        src={previewImageUrl}
        alt=""
        className="profile-header-surface-layer-list__thumb profile-header-surface-layer-list__thumb--image"
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
