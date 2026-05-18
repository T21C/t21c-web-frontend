import { useTranslation } from "react-i18next";
import { StateDisplay } from "@/components/common/selectors";
import {
  PAD_FROM_TOP_OFFSET_UNITS,
  PAD_FROM_TOP_PERCENT_MAX,
  PAD_FROM_TOP_PERCENT_MIN,
  PAD_FROM_TOP_PIXEL_MAX,
  PAD_FROM_TOP_PIXEL_MIN,
  normalizePadFromTop,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";

export default function ProfileHeaderSurfacePadFromTopRow({ padFromTop, onPatch }) {
  const { t } = useTranslation(["pages"]);
  const pad = normalizePadFromTop(padFromTop);
  const isPixel = pad.unit === "pixel";
  const sliderMin = isPixel ? PAD_FROM_TOP_PIXEL_MIN : PAD_FROM_TOP_PERCENT_MIN;
  const sliderMax = isPixel ? PAD_FROM_TOP_PIXEL_MAX : PAD_FROM_TOP_PERCENT_MAX;
  const suffix = isPixel ? "px" : "%";

  return (
    <div className="profile-header-surface-image-settings__pad-from-top-row">
      <span className="profile-header-surface-image-settings__pad-from-top-label">
        {t("settings.headerSurface.padFromTop")}
      </span>
      <div className="profile-header-surface-image-settings__pad-from-top-controls">
        <StateDisplay
          className="profile-header-surface-image-settings__pad-from-top-unit"
          currentState={pad.unit}
          states={["pixel", "percent"]}
          onChange={(unit) => onPatch({ unit })}
          label={t("settings.headerSurface.padFromTopUnit")}
          width={72}
          showLabel={false}
          showValue
        />
        <ProfileHeaderSurfaceSliderField
          className="profile-header-surface-image-settings__field profile-header-surface-image-settings__pad-from-top-slider"
          label={t("settings.headerSurface.padFromTopValue")}
          value={pad.value}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          inputMin={sliderMin}
          inputMax={sliderMax}
          suffix={suffix}
          onChange={(n) => onPatch({ value: n })}
        />
      </div>
    </div>
  );
}
