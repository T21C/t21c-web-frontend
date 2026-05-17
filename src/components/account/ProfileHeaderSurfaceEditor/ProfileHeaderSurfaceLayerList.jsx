import { useTranslation } from "react-i18next";
import {
  MAX_PROFILE_HEADER_SURFACE_LAYERS,
  SURFACE_STACK_KIND_GRADIENT,
  SURFACE_STACK_KIND_IMAGE,
  countGradientStackEntries,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceLayerOpacityControl from "./ProfileHeaderSurfaceLayerOpacityControl";
import ProfileHeaderSurfaceLayerThumb from "./ProfileHeaderSurfaceLayerThumb";

export default function ProfileHeaderSurfaceLayerList({
  layout = "rail",
  stack,
  selectedStackIndex,
  onSelectStackIndex,
  onAddLayer,
  onAddImage,
  stackHasImageLayer,
  previewImageUrl,
  imageSettings,
  onMoveLayer,
  onRemoveLayer,
  onPatchStackEntry,
}) {
  const { t } = useTranslation(["pages"]);
  const isDrawer = layout === "drawer";
  const gradientCount = countGradientStackEntries(stack);

  return (
    <div
      className={
        isDrawer
          ? "profile-header-surface-layer-list profile-header-surface-layer-list--drawer"
          : "profile-header-surface-layer-list profile-header-surface-layer-list--rail"
      }
    >
      <div className="profile-header-surface-layer-list__head">
        {!isDrawer ? (
          <span className="profile-header-surface-layer-list__label">
            {t("settings.headerSurface.layersLabel", {
              count: gradientCount,
              max: MAX_PROFILE_HEADER_SURFACE_LAYERS,
            })}
          </span>
        ) : null}
        <div className="profile-header-surface-layer-list__head-actions">
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-list__add"
            disabled={gradientCount >= MAX_PROFILE_HEADER_SURFACE_LAYERS}
            onClick={onAddLayer}
          >
            {t("settings.headerSurface.addLayer")}
          </button>
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-list__add"
            disabled={stackHasImageLayer}
            onClick={onAddImage}
          >
            {t("settings.headerSurface.addImage")}
          </button>
        </div>
      </div>
      <ul
        className="profile-header-surface-layer-list__items"
        role="listbox"
        aria-label={t("settings.headerSurface.drawerLayersAria")}
      >
        {stack.map((entry, stackIndex) => {
          const selected = selectedStackIndex === stackIndex;
          const isImage = entry.kind === SURFACE_STACK_KIND_IMAGE;
          let gradientOrdinal = 0;
          if (!isImage) {
            for (let i = 0; i <= stackIndex; i += 1) {
              if (stack[i]?.kind === SURFACE_STACK_KIND_GRADIENT) gradientOrdinal += 1;
            }
          }

          return (
            <li key={stackIndex} role="presentation" className="profile-header-surface-layer-list__item">
              <div className="profile-header-surface-layer-list__chip-row">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={
                    selected
                      ? "profile-header-surface-layer-list__chip profile-header-surface-layer-list__chip--selected"
                      : "profile-header-surface-layer-list__chip"
                  }
                  onClick={() => onSelectStackIndex(stackIndex)}
                >
                  <ProfileHeaderSurfaceLayerThumb
                    entry={entry}
                    previewImageUrl={previewImageUrl}
                    imageSettings={imageSettings}
                  />
                  <span className="profile-header-surface-layer-list__chip-text">
                    <span className="profile-header-surface-layer-list__chip-label">
                      {isImage
                        ? t("settings.headerSurface.backgroundImageRow")
                        : t("settings.headerSurface.layerN", { n: gradientOrdinal })}
                    </span>
                    {!isImage ? (
                      <span className="profile-header-surface-layer-list__chip-type">{entry.type}</span>
                    ) : null}
                  </span>
                </button>
                <ProfileHeaderSurfaceLayerOpacityControl
                  visible={entry.visible !== false}
                  opacity={entry.opacity ?? 1}
                  onToggleVisible={() =>
                    onPatchStackEntry(stackIndex, (e) => {
                      e.visible = e.visible === false;
                    })
                  }
                  onOpacityChange={(next) =>
                    onPatchStackEntry(stackIndex, (e) => {
                      e.opacity = next;
                    })
                  }
                />
              </div>
              {!isDrawer ? (
                <div className="profile-header-surface-layer-list__item-actions">
                  <button
                    type="button"
                    className="profile-header-surface-layer-list__icon-btn"
                    disabled={stackIndex === 0}
                    aria-label={t("settings.headerSurface.moveUp")}
                    onClick={() => onMoveLayer(stackIndex, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="profile-header-surface-layer-list__icon-btn"
                    disabled={stackIndex >= stack.length - 1}
                    aria-label={t("settings.headerSurface.moveDown")}
                    onClick={() => onMoveLayer(stackIndex, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="profile-header-surface-layer-list__icon-btn profile-header-surface-layer-list__icon-btn--danger"
                    aria-label={
                      isImage
                        ? t("settings.headerSurface.removeImageLayer")
                        : t("settings.headerSurface.removeLayer")
                    }
                    onClick={() => onRemoveLayer(stackIndex)}
                  >
                    ×
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
