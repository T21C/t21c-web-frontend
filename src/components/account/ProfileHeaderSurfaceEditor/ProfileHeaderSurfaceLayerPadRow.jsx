import { useTranslation } from "react-i18next";
import { StateDisplay } from "@/components/common/selectors";
import {
  IMAGE_POSITION_PERCENT_MAX,
  IMAGE_POSITION_PERCENT_MIN,
  IMAGE_POSITION_PIXEL_MAX,
  IMAGE_POSITION_PIXEL_MIN,
  OFFSET_PERCENT_EXTREME_MAX,
  OFFSET_PERCENT_EXTREME_MIN,
  OFFSET_PIXEL_EXTREME_MAX,
  OFFSET_PIXEL_EXTREME_MIN,
  normalizeLayerPadAxis,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";

const EDGE_LABEL_KEYS = {
  top: "layerPadTop",
  right: "layerPadRight",
  bottom: "layerPadBottom",
  left: "layerPadLeft",
};

export default function ProfileHeaderSurfaceLayerPadRow({ edge, pad, onPatch }) {
  const { t } = useTranslation(["pages"]);
  const axis = normalizeLayerPadAxis(pad);
  const isPixel = axis.unit === "pixel";
  const sliderMin = isPixel ? IMAGE_POSITION_PIXEL_MIN : IMAGE_POSITION_PERCENT_MIN;
  const sliderMax = isPixel ? IMAGE_POSITION_PIXEL_MAX : IMAGE_POSITION_PERCENT_MAX;
  const inputMin = isPixel ? OFFSET_PIXEL_EXTREME_MIN : OFFSET_PERCENT_EXTREME_MIN;
  const inputMax = isPixel ? OFFSET_PIXEL_EXTREME_MAX : OFFSET_PERCENT_EXTREME_MAX;
  const suffix = isPixel ? "px" : "%";
  const labelKey = EDGE_LABEL_KEYS[edge] ?? "layerPadTop";

  return (
    <div className="profile-header-surface-image-settings__pad-from-top-row">
      <span className="profile-header-surface-image-settings__pad-from-top-label">
        {t(`settings.headerSurface.${labelKey}`)}
      </span>
      <div className="profile-header-surface-image-settings__pad-from-top-controls">
        <StateDisplay
          className="profile-header-surface-image-settings__pad-from-top-unit"
          currentState={axis.unit}
          states={["pixel", "percent"]}
          onChange={(unit) => onPatch({ unit })}
          label={t("settings.headerSurface.layerPadUnit")}
          width={72}
          showLabel={false}
          showValue
        />
        <ProfileHeaderSurfaceSliderField
          className="profile-header-surface-image-settings__field profile-header-surface-image-settings__pad-from-top-slider"
          label={t("settings.headerSurface.layerPadValue")}
          value={axis.value}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          inputMin={inputMin}
          inputMax={inputMax}
          suffix={suffix}
          onChange={(n) => onPatch({ value: n })}
        />
      </div>
    </div>
  );
}
