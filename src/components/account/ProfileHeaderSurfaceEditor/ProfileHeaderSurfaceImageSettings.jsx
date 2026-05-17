import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect, StateDisplay } from "@/components/common/selectors";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { UnlinkIcon } from "@/components/common/icons";
import {
  BLEND_MODES,
  IMAGE_DIMENSION_PERCENT_MAX,
  IMAGE_DIMENSION_PERCENT_MIN,
  IMAGE_POSITION_PERCENT_MAX,
  IMAGE_POSITION_PERCENT_MIN,
  IMAGE_POSITION_PIXEL_MAX,
  IMAGE_POSITION_PIXEL_MIN,
  IMAGE_REPEAT_TILE,
  IMAGE_SIZE_PRESETS,
  createDefaultImageSettings,
  defaultImagePositionForUnit,
  getImageSizeDimensions,
  imageSizeDimensionsFromValues,
  isImageTilingEnabled,
  normalizeImagePosition,
  normalizeImageSizeFit,
} from "@/utils/profileHeaderSurfaceStyle";
import { valuesToSelectOptions } from "./profileHeaderSurfaceEditorUtils";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";

const DEFAULT_IMAGE_SETTINGS = createDefaultImageSettings();

export default function ProfileHeaderSurfaceImageSettings({
  imageSettings,
  previewImageUrl,
  patchWorking,
  fileInputRef,
  saveBusy,
  onSelectImageFile,
  onMarkImageRemoved,
  hasImageInStack,
}) {
  const { t } = useTranslation(["pages"]);

  const imageSizeFitOptions = useMemo(() => valuesToSelectOptions(IMAGE_SIZE_PRESETS), []);
  const imageTileRepeatOptions = useMemo(() => valuesToSelectOptions(IMAGE_REPEAT_TILE), []);
  const blendModeOptions = useMemo(
    () => [
      { value: "normal", label: t("settings.headerSurface.blendModeNormal", { defaultValue: "normal" }) },
      ...valuesToSelectOptions(BLEND_MODES.filter((m) => m !== "normal")),
    ],
    [t],
  );

  if (!hasImageInStack || !imageSettings) {
    return (
      <div className="profile-header-surface-image-settings">
        <h4 className="profile-header-surface-image-settings__subtitle">
          {t("settings.headerSurface.imageTitle")}
        </h4>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="profile-header-surface-image-settings__file-input"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) onSelectImageFile(f);
          }}
        />
        <div className="profile-header-surface-image-settings__actions">
          <button
            type="button"
            className="btn-fill-primary"
            disabled={saveBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("settings.headerSurface.uploadImage")}
          </button>
        </div>
      </div>
    );
  }

  if (!previewImageUrl) {
    return (
      <div className="profile-header-surface-image-settings">
        <h4 className="profile-header-surface-image-settings__subtitle">
          {t("settings.headerSurface.imageTitle")}
        </h4>
        <p className="profile-header-surface-image-settings__hint">
          {t("settings.headerSurface.imageSaveHint")}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="profile-header-surface-image-settings__file-input"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) onSelectImageFile(f);
          }}
        />
        <div className="profile-header-surface-image-settings__actions">
          <button
            type="button"
            className="btn-fill-primary"
            disabled={saveBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("settings.headerSurface.uploadImage")}
          </button>
        </div>
      </div>
    );
  }

  const position = normalizeImagePosition(imageSettings.position);
  const sizeFitValue = normalizeImageSizeFit(imageSettings.sizeFit ?? imageSettings.size);
  const { sizeX, sizeY } = (() => {
    const dims = getImageSizeDimensions(imageSettings);
    return { sizeX: dims.widthPercent, sizeY: dims.heightPercent };
  })();
  const isPixelPosition = position.unit === "pixel";
  const positionSuffix = isPixelPosition ? "px" : "%";
  const positionInputMin = isPixelPosition ? IMAGE_POSITION_PIXEL_MIN : IMAGE_POSITION_PERCENT_MIN;
  const positionInputMax = isPixelPosition ? IMAGE_POSITION_PIXEL_MAX : IMAGE_POSITION_PERCENT_MAX;
  const positionSliderMin = positionInputMin;
  const positionSliderMax = positionInputMax;
  const sizeLinked = imageSettings.sizeDimensionsLinked === true;
  const tilingEnabled = isImageTilingEnabled(imageSettings.repeat ?? "no-repeat");
  const tileRepeatValue = tilingEnabled ? imageSettings.repeat : "repeat";

  return (
    <div className="profile-header-surface-image-settings">
      <h4 className="profile-header-surface-image-settings__subtitle">
        {t("settings.headerSurface.imageTitle")}
      </h4>
      <p className="profile-header-surface-image-settings__hint">
        {t("settings.headerSurface.imageSaveHint")}
      </p>
      <div className="profile-header-surface-image-settings__preview-wrap">
        <img src={previewImageUrl} alt="" className="profile-header-surface-image-settings__preview" />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="profile-header-surface-image-settings__file-input"
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) onSelectImageFile(f);
        }}
      />
      <div className="profile-header-surface-image-settings__actions">
        <button
          type="button"
          className="btn-fill-primary"
          disabled={saveBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {t("settings.headerSurface.replaceImage")}
        </button>
        <button
          type="button"
          className="btn-fill-secondary"
          disabled={saveBusy}
          onClick={onMarkImageRemoved}
        >
          {t("settings.headerSurface.removeImage")}
        </button>
      </div>
      <div className="profile-header-surface-image-settings__controls">
        <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select">
          <CustomSelect
            inputId="profile-header-surface-image-size-fit"
            label={t("settings.headerSurface.sizeFit")}
            direction="auto"
            options={imageSizeFitOptions}
            value={imageSizeFitOptions.find((o) => o.value === sizeFitValue) ?? null}
            onChange={(opt) => {
              if (!opt?.value) return;
              patchWorking((s) => {
                if (!s.image) return;
                s.image.sizeFit = opt.value;
                delete s.image.size;
              });
            }}
            width="100%"
          />
        </div>
        <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select">
          <CustomSelect
            inputId="profile-header-surface-image-blend-mode"
            label={t("settings.headerSurface.blendMode")}
            direction="auto"
            options={blendModeOptions}
            value={
              blendModeOptions.find((o) => o.value === (imageSettings.blendMode ?? "normal")) ?? null
            }
            onChange={(opt) => {
              if (!opt?.value) return;
              patchWorking((s) => {
                if (!s.image) return;
                if (opt.value === "normal") {
                  delete s.image.blendMode;
                } else {
                  s.image.blendMode = opt.value;
                }
              });
            }}
            width="100%"
          />
        </div>
        <div className="profile-header-surface-image-settings__position-group">
          <StateDisplay
            className="profile-header-surface-image-settings__position-unit"
            currentState={position.unit}
            states={["percent", "pixel"]}
            onChange={(unit) =>
              patchWorking((s) => {
                if (!s.image) return;
                s.image.position = defaultImagePositionForUnit(unit);
              })
            }
            label={t("settings.headerSurface.positionUnit")}
            width={72}
            showValue
          />
          <div className="profile-header-surface-image-settings__field-row profile-header-surface-image-settings__field-row--span">
            <ProfileHeaderSurfaceSliderField
              className="profile-header-surface-image-settings__field"
              label={t("settings.headerSurface.positionX")}
            value={position.x}
            sliderMin={positionSliderMin}
            sliderMax={positionSliderMax}
            inputMin={positionInputMin}
            inputMax={positionInputMax}
            suffix={positionSuffix}
            onChange={(n) =>
              patchWorking((s) => {
                if (!s.image) return;
                const current = normalizeImagePosition(s.image.position);
                s.image.position = { unit: current.unit, x: n, y: current.y };
              })
            }
          />
          <ProfileHeaderSurfaceSliderField
            className="profile-header-surface-image-settings__field"
            label={t("settings.headerSurface.positionY")}
            value={position.y}
            sliderMin={positionSliderMin}
            sliderMax={positionSliderMax}
            inputMin={positionInputMin}
            inputMax={positionInputMax}
            suffix={positionSuffix}
            onChange={(n) =>
              patchWorking((s) => {
                if (!s.image) return;
                const current = normalizeImagePosition(s.image.position);
                s.image.position = { unit: current.unit, x: current.x, y: n };
              })
            }
          />
            <button
              type="button"
              className="btn-fill-secondary profile-header-surface-image-settings__row-reset"
              onClick={() =>
                patchWorking((s) => {
                  if (!s.image) return;
                  s.image.position = { ...DEFAULT_IMAGE_SETTINGS.position };
                })
              }
            >
              {t("settings.headerSurface.resetRow")}
            </button>
          </div>
          <div className="profile-header-surface-image-settings__field-row profile-header-surface-image-settings__field-row--span profile-header-surface-image-settings__field-row--size">
            <ProfileHeaderSurfaceSliderField
              className="profile-header-surface-image-settings__field"
              label={t("settings.headerSurface.sizeX")}
              value={sizeX}
              sliderMin={IMAGE_DIMENSION_PERCENT_MIN}
              sliderMax={IMAGE_DIMENSION_PERCENT_MAX}
              inputMin={IMAGE_DIMENSION_PERCENT_MIN}
              inputMax={IMAGE_DIMENSION_PERCENT_MAX}
              suffix="%"
              onChange={(n) =>
                patchWorking((s) => {
                  if (!s.image) return;
                  if (sizeLinked) {
                    s.image.sizeDimensions = imageSizeDimensionsFromValues(n, n);
                  } else {
                    const dims = getImageSizeDimensions(s.image);
                    s.image.sizeDimensions = imageSizeDimensionsFromValues(n, dims.heightPercent);
                  }
                  delete s.image.size;
                })
              }
            />
            <button
              type="button"
              className={
                sizeLinked
                  ? "profile-header-surface-image-settings__size-link profile-header-surface-image-settings__size-link--active"
                  : "profile-header-surface-image-settings__size-link"
              }
              aria-pressed={sizeLinked}
              aria-label={
                sizeLinked
                  ? t("settings.headerSurface.unlinkSizeLinked")
                  : t("settings.headerSurface.linkSizeLinked")
              }
              title={
                sizeLinked
                  ? t("settings.headerSurface.unlinkSizeLinked")
                  : t("settings.headerSurface.linkSizeLinked")
              }
              onClick={() => {
                patchWorking((s) => {
                  if (!s.image) return;
                  const next = !sizeLinked;
                  if (next) {
                    const dims = getImageSizeDimensions(s.image);
                    s.image.sizeDimensionsLinked = true;
                    s.image.sizeDimensions = imageSizeDimensionsFromValues(
                      dims.widthPercent,
                      dims.widthPercent,
                    );
                  } else {
                    delete s.image.sizeDimensionsLinked;
                  }
                  delete s.image.size;
                });
              }}
            >
              {sizeLinked ? (
                <LinkIcon size={18} color="currentColor" />
              ) : (
                <UnlinkIcon size={18} color="currentColor" />
              )}
            </button>
            <ProfileHeaderSurfaceSliderField
              className="profile-header-surface-image-settings__field"
              label={t("settings.headerSurface.sizeY")}
              value={sizeY}
              sliderMin={IMAGE_DIMENSION_PERCENT_MIN}
              sliderMax={IMAGE_DIMENSION_PERCENT_MAX}
              inputMin={IMAGE_DIMENSION_PERCENT_MIN}
              inputMax={IMAGE_DIMENSION_PERCENT_MAX}
              suffix="%"
              onChange={(n) =>
                patchWorking((s) => {
                  if (!s.image) return;
                  if (sizeLinked) {
                    s.image.sizeDimensions = imageSizeDimensionsFromValues(n, n);
                  } else {
                    const dims = getImageSizeDimensions(s.image);
                    s.image.sizeDimensions = imageSizeDimensionsFromValues(dims.widthPercent, n);
                  }
                  delete s.image.size;
                })
              }
            />
            <button
              type="button"
              className="btn-fill-secondary profile-header-surface-image-settings__row-reset"
              onClick={() =>
                patchWorking((s) => {
                  if (!s.image) return;
                  s.image.sizeDimensions = { ...DEFAULT_IMAGE_SETTINGS.sizeDimensions };
                  delete s.image.size;
                })
              }
            >
              {t("settings.headerSurface.resetRow")}
            </button>
          </div>
        </div>
        <div className="profile-header-surface-image-settings__tiling-group">
          <label className="profile-header-surface-image-settings__toggle-field">
            <input
              type="checkbox"
              checked={tilingEnabled}
              onChange={(ev) => {
                const enabled = ev.target.checked;
                patchWorking((s) => {
                  if (!s.image) return;
                  if (!enabled) {
                    s.image.repeat = "no-repeat";
                    return;
                  }
                  if (!isImageTilingEnabled(s.image.repeat)) {
                    s.image.repeat = "repeat";
                  }
                });
              }}
            />
            <span>{t("settings.headerSurface.enableTiling")}</span>
          </label>
          {tilingEnabled ? (
            <div className="profile-header-surface-image-settings__tiling-settings">
              <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select">
                <CustomSelect
                  inputId="profile-header-surface-image-tile-mode"
                  label={t("settings.headerSurface.tileMode")}
                  direction="auto"
                  options={imageTileRepeatOptions}
                  value={imageTileRepeatOptions.find((o) => o.value === tileRepeatValue) ?? null}
                  onChange={(opt) => {
                    if (!opt?.value) return;
                    patchWorking((s) => {
                      if (s.image) s.image.repeat = opt.value;
                    });
                  }}
                  width="100%"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
