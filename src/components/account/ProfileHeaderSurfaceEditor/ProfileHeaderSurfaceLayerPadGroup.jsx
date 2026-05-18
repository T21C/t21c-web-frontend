import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LAYER_PAD_EDGES,
  createDefaultLayerPadAxis,
  normalizeLayerPadAxis,
  normalizeLayerPadForUi,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceLayerPadRow from "./ProfileHeaderSurfaceLayerPadRow";
import "./profileHeaderSurfaceControlTray.css";

function ensureLayerPadObject(img) {
  if (!img.layerPad) {
    img.layerPad = {};
    if (img.padFromTop) {
      img.layerPad.top = normalizeLayerPadAxis(img.padFromTop);
      delete img.padFromTop;
    }
  }
  return img.layerPad;
}

export default function ProfileHeaderSurfaceLayerPadGroup({
  layerPad,
  legacyPadFromTop,
  patchImageSettings,
}) {
  const { t } = useTranslation(["pages"]);
  const pads = useMemo(
    () => normalizeLayerPadForUi(layerPad, legacyPadFromTop),
    [layerPad, legacyPadFromTop],
  );

  return (
    <div className="profile-header-surface-image-settings__pad-from-top-group">
      <div className="profile-header-surface-image-settings__layer-pad-rows profile-header-surface-control-tray">
        {LAYER_PAD_EDGES.map((edge) => (
          <ProfileHeaderSurfaceLayerPadRow
            key={edge}
            edge={edge}
            pad={pads[edge]}
            onPatch={(partial) => {
              patchImageSettings((img) => {
                const padMap = ensureLayerPadObject(img);
                const base = padMap[edge] ?? createDefaultLayerPadAxis();
                padMap[edge] = normalizeLayerPadAxis({ ...base, ...partial });
              });
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn-fill-secondary profile-header-surface-image-settings__row-reset"
        onClick={() =>
          patchImageSettings((img) => {
            delete img.layerPad;
            delete img.padFromTop;
          })
        }
      >
        {t("settings.headerSurface.resetRow")}
      </button>
    </div>
  );
}
