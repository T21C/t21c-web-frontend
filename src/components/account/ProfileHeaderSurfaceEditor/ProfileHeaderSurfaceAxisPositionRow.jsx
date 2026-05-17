import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect, StateDisplay } from "@/components/common/selectors";
import {
  IMAGE_POSITION_OFFSET_UNITS,
  IMAGE_POSITION_PERCENT_MAX,
  IMAGE_POSITION_PERCENT_MIN,
  IMAGE_POSITION_PIXEL_MAX,
  IMAGE_POSITION_PIXEL_MIN,
  normalizeImagePositionAxis,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";

export default function ProfileHeaderSurfaceAxisPositionRow({
  axis,
  axisKey,
  sideOptions,
  position,
  onPatchAxis,
}) {
  const { t } = useTranslation(["pages"]);
  const axisPosition = normalizeImagePositionAxis(position[axisKey], axisKey);
  const isPixel = axisPosition.unit === "pixel";
  const sliderMin = isPixel ? IMAGE_POSITION_PIXEL_MIN : IMAGE_POSITION_PERCENT_MIN;
  const sliderMax = isPixel ? IMAGE_POSITION_PIXEL_MAX : IMAGE_POSITION_PERCENT_MAX;
  const suffix = isPixel ? "px" : "%";

  const sideSelectOptions = useMemo(
    () =>
      sideOptions.map((value) => ({
        value,
        label: t(`settings.headerSurface.position${axis === "x" ? "Horizontal" : "Vertical"}_${value}`, {
          defaultValue: value,
        }),
      })),
    [axis, sideOptions, t],
  );

  const rowLabel =
    axis === "x"
      ? t("settings.headerSurface.positionX")
      : t("settings.headerSurface.positionY");

  return (
    <div className="profile-header-surface-image-settings__position-axis-row">
      <span className="profile-header-surface-image-settings__position-axis-label">{rowLabel}</span>
      <div className="profile-header-surface-image-settings__position-axis-controls">
        <StateDisplay
          className="profile-header-surface-image-settings__position-axis-unit"
          currentState={axisPosition.unit}
          states={[...IMAGE_POSITION_OFFSET_UNITS]}
          onChange={(unit) => onPatchAxis(axisKey, { unit })}
          label={t("settings.headerSurface.positionOffsetUnit")}
          width={72}
          showLabel={false}
          showValue
        />
        <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select profile-header-surface-image-settings__position-axis-side">
          <CustomSelect
            inputId={`profile-header-surface-image-position-${axisKey}-side`}
            label={t(
              axis === "x"
                ? "settings.headerSurface.positionHorizontal"
                : "settings.headerSurface.positionVertical",
            )}
            direction="auto"
            options={sideSelectOptions}
            value={sideSelectOptions.find((o) => o.value === axisPosition.side) ?? null}
            onChange={(opt) => {
              if (!opt?.value) return;
              onPatchAxis(axisKey, { side: opt.value });
            }}
            width="100%"
          />
        </div>
        <ProfileHeaderSurfaceSliderField
          className="profile-header-surface-image-settings__field profile-header-surface-image-settings__position-axis-slider"
          label={t("settings.headerSurface.positionOffset")}
          value={axisPosition.value}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          inputMin={sliderMin}
          inputMax={sliderMax}
          suffix={suffix}
          onChange={(n) => onPatchAxis(axisKey, { value: n })}
        />
      </div>
    </div>
  );
}
