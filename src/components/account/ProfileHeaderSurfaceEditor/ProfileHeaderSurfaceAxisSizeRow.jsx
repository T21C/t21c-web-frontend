import { useTranslation } from "react-i18next";
import { StateDisplay } from "@/components/common/selectors";
import {
  IMAGE_DIMENSION_PERCENT_MAX,
  IMAGE_DIMENSION_PERCENT_MIN,
  IMAGE_DIMENSION_PIXEL_MAX,
  IMAGE_DIMENSION_PIXEL_MIN,
  IMAGE_SIZE_OFFSET_UNITS,
  OFFSET_PERCENT_EXTREME_MAX,
  OFFSET_PERCENT_EXTREME_MIN,
  OFFSET_PIXEL_EXTREME_MAX,
  OFFSET_PIXEL_EXTREME_MIN,
  normalizeImageSizeDimensionAxis,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";
import "./profileHeaderSurfaceControlTray.css";

export default function ProfileHeaderSurfaceAxisSizeRow({
  axisKey,
  sizeDimensions,
  onPatchAxis,
}) {
  const { t } = useTranslation(["pages"]);
  const axisSize = normalizeImageSizeDimensionAxis(sizeDimensions[axisKey], axisKey);
  const isPixel = axisSize.unit === "pixel";
  const sliderMin = isPixel ? IMAGE_DIMENSION_PIXEL_MIN : IMAGE_DIMENSION_PERCENT_MIN;
  const sliderMax = isPixel ? IMAGE_DIMENSION_PIXEL_MAX : IMAGE_DIMENSION_PERCENT_MAX;
  const inputMin = isPixel ? OFFSET_PIXEL_EXTREME_MIN : OFFSET_PERCENT_EXTREME_MIN;
  const inputMax = isPixel ? OFFSET_PIXEL_EXTREME_MAX : OFFSET_PERCENT_EXTREME_MAX;
  const suffix = isPixel ? "px" : "%";
  const rowLabel =
    axisKey === "width"
      ? t("settings.headerSurface.sizeX")
      : t("settings.headerSurface.sizeY");

  return (
    <div className="profile-header-surface-image-settings__size-axis-row">
      <span className="profile-header-surface-image-settings__size-axis-label">{rowLabel}</span>
      <div className="profile-header-surface-image-settings__size-axis-controls">
        <StateDisplay
          className="profile-header-surface-image-settings__size-axis-unit"
          currentState={axisSize.unit}
          states={[...IMAGE_SIZE_OFFSET_UNITS]}
          onChange={(unit) => onPatchAxis(axisKey, { unit })}
          label={t("settings.headerSurface.sizeOffsetUnit")}
          width={72}
          showLabel={false}
          showValue
        />
        <ProfileHeaderSurfaceSliderField
          className="profile-header-surface-image-settings__field profile-header-surface-image-settings__size-axis-slider"
          label={t("settings.headerSurface.sizeValue")}
          value={axisSize.value}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          inputMin={inputMin}
          inputMax={inputMax}
          suffix={suffix}
          onChange={(n) => onPatchAxis(axisKey, { value: n })}
        />
      </div>
    </div>
  );
}
