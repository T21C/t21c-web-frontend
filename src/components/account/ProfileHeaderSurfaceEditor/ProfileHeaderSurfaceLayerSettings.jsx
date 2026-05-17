import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/common/selectors";
import {
  BLEND_MODES,
  RADIAL_SHAPES,
  RADIAL_SIZES,
  MAX_PROFILE_HEADER_SURFACE_STOPS,
  createEmptyGradientLayer,
} from "@/utils/profileHeaderSurfaceStyle";
import { valuesToSelectOptions } from "./profileHeaderSurfaceEditorUtils";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";

export default function ProfileHeaderSurfaceLayerSettings({
  layer,
  stackIndex,
  patchStackEntry,
  gradientTypeOptions,
}) {
  const { t } = useTranslation(["pages"]);

  const radialShapeOptions = useMemo(() => valuesToSelectOptions(RADIAL_SHAPES), []);
  const radialSizeOptions = useMemo(
    () => [
      { value: "", label: t("settings.headerSurface.radialSizeDefault") },
      ...valuesToSelectOptions(RADIAL_SIZES),
    ],
    [t],
  );
  const blendModeOptions = useMemo(
    () => [
      { value: "normal", label: t("settings.headerSurface.blendModeNormal", { defaultValue: "normal" }) },
      ...valuesToSelectOptions(BLEND_MODES.filter((m) => m !== "normal")),
    ],
    [t],
  );

  if (!layer) {
    return (
      <p className="profile-header-surface-layer-settings__empty">
        {t("settings.headerSurface.selectLayer")}
      </p>
    );
  }

  return (
    <div className="profile-header-surface-layer-settings">
      <div className="profile-header-surface-layer-settings__field-row profile-header-surface-layer-settings__field-row--select-pair">
        <div className="profile-header-surface-layer-settings__field profile-header-surface-layer-settings__field--select">
          <CustomSelect
            inputId={`profile-header-surface-gradient-type-${stackIndex}`}
            label={t("settings.headerSurface.gradientType")}
            direction="auto"
            options={gradientTypeOptions}
            value={gradientTypeOptions.find((o) => o.value === layer.type) ?? null}
            onChange={(opt) => {
              if (!opt?.value) return;
              patchStackEntry(stackIndex, (entry) => {
                const stops = entry.stops;
                const opacity = entry.opacity;
                const visible = entry.visible;
                const blendMode = entry.blendMode;
                const id = entry.id;
                const label = entry.label;
                Object.assign(entry, createEmptyGradientLayer(opt.value));
                entry.id = id;
                entry.stops = stops;
                entry.opacity = opacity;
                entry.visible = visible;
                if (blendMode) entry.blendMode = blendMode;
                if (label) entry.label = label;
              });
            }}
            width="100%"
          />
        </div>
        <div className="profile-header-surface-layer-settings__field profile-header-surface-layer-settings__field--select">
          <CustomSelect
            inputId={`profile-header-surface-gradient-blend-${stackIndex}`}
            label={t("settings.headerSurface.blendMode")}
            direction="auto"
            options={blendModeOptions}
            value={blendModeOptions.find((o) => o.value === (layer.blendMode ?? "normal")) ?? null}
            onChange={(opt) => {
              if (!opt?.value) return;
              patchStackEntry(stackIndex, (entry) => {
                if (opt.value === "normal") {
                  delete entry.blendMode;
                } else {
                  entry.blendMode = opt.value;
                }
              });
            }}
            width="100%"
          />
        </div>
      </div>

      {(layer.type === "linear" ||
        layer.type === "repeating-linear" ||
        layer.type === "conic" ||
        layer.type === "repeating-conic") && (
        <ProfileHeaderSurfaceSliderField
          className="profile-header-surface-layer-settings__field"
          label={t("settings.headerSurface.angle")}
          value={layer.angleDeg ?? 0}
          sliderMin={0}
          sliderMax={360}
          inputMin={0}
          inputMax={360}
          suffix="°"
          onChange={(n) =>
            patchStackEntry(stackIndex, (entry) => {
              entry.angleDeg = n;
            })
          }
        />
      )}

      {(layer.type === "radial" ||
        layer.type === "repeating-radial" ||
        layer.type === "conic" ||
        layer.type === "repeating-conic") && (
        <div className="profile-header-surface-layer-settings__field-row">
          <ProfileHeaderSurfaceSliderField
            className="profile-header-surface-layer-settings__field"
            label={t("settings.headerSurface.centerX")}
            value={layer.position?.xPercent ?? 50}
            sliderMin={0}
            sliderMax={100}
            inputMin={0}
            inputMax={100}
            suffix="%"
            onChange={(n) =>
              patchStackEntry(stackIndex, (entry) => {
                entry.position = {
                  ...(entry.position ?? { xPercent: 50, yPercent: 50 }),
                  xPercent: n,
                };
              })
            }
          />
          <ProfileHeaderSurfaceSliderField
            className="profile-header-surface-layer-settings__field"
            label={t("settings.headerSurface.centerY")}
            value={layer.position?.yPercent ?? 50}
            sliderMin={0}
            sliderMax={100}
            inputMin={0}
            inputMax={100}
            suffix="%"
            onChange={(n) =>
              patchStackEntry(stackIndex, (entry) => {
                entry.position = {
                  ...(entry.position ?? { xPercent: 50, yPercent: 50 }),
                  yPercent: n,
                };
              })
            }
          />
        </div>
      )}

      {(layer.type === "radial" || layer.type === "repeating-radial") && (
        <div className="profile-header-surface-layer-settings__field-row">
          <div className="profile-header-surface-layer-settings__field profile-header-surface-layer-settings__field--select">
            <CustomSelect
              inputId={`profile-header-surface-radial-shape-${stackIndex}`}
              label={t("settings.headerSurface.radialShape")}
              direction="auto"
              options={radialShapeOptions}
              value={radialShapeOptions.find((o) => o.value === (layer.shape ?? "ellipse")) ?? null}
              onChange={(opt) => {
                if (!opt?.value) return;
                patchStackEntry(stackIndex, (entry) => {
                  entry.shape = opt.value;
                });
              }}
              width="100%"
            />
          </div>
          <div className="profile-header-surface-layer-settings__field profile-header-surface-layer-settings__field--select">
            <CustomSelect
              inputId={`profile-header-surface-radial-size-${stackIndex}`}
              label={t("settings.headerSurface.radialSize")}
              direction="auto"
              options={radialSizeOptions}
              value={radialSizeOptions.find((o) => o.value === (layer.size ?? "")) ?? radialSizeOptions[0]}
              onChange={(opt) => {
                if (opt == null) return;
                patchStackEntry(stackIndex, (entry) => {
                  entry.size = opt.value || undefined;
                });
              }}
              width="100%"
            />
          </div>
        </div>
      )}

      <div className="profile-header-surface-layer-settings__stops">
        <div className="profile-header-surface-layer-settings__stops-head">
          <span>{t("settings.headerSurface.colorStops")}</span>
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-settings__stop-add"
            disabled={layer.stops.length >= MAX_PROFILE_HEADER_SURFACE_STOPS}
            onClick={() =>
              patchStackEntry(stackIndex, (entry) => {
                entry.stops.push({
                  color: "#888888",
                  offsetPercent: 100,
                });
              })
            }
          >
            {t("settings.headerSurface.addStop")}
          </button>
        </div>
        {layer.stops.map((stop, stopIndex) => (
          <div key={stopIndex} className="profile-header-surface-layer-settings__stop-row">
            <input
              type="color"
              value={stop.color.startsWith("#") ? stop.color.slice(0, 7) : "#888888"}
              onChange={(ev) =>
                patchStackEntry(stackIndex, (entry) => {
                  entry.stops[stopIndex].color = ev.target.value;
                })
              }
              aria-label={t("settings.headerSurface.stopColor")}
            />
            <ProfileHeaderSurfaceSliderField
              variant="inline"
              aria-label={t("settings.headerSurface.stopOffset")}
              value={stop.offsetPercent}
              sliderMin={0}
              sliderMax={100}
              inputMin={0}
              inputMax={100}
              suffix="%"
              onChange={(n) =>
                patchStackEntry(stackIndex, (entry) => {
                  entry.stops[stopIndex].offsetPercent = n;
                })
              }
            />
            <button
              type="button"
              className="profile-header-surface-layer-settings__icon-btn profile-header-surface-layer-settings__icon-btn--danger"
              disabled={layer.stops.length <= 2}
              aria-label={t("settings.headerSurface.removeStop")}
              onClick={() =>
                patchStackEntry(stackIndex, (entry) => {
                  entry.stops.splice(stopIndex, 1);
                })
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}