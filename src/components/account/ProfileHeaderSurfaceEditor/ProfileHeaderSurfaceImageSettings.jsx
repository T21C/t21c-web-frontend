import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/common/selectors";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { UnlinkIcon } from "@/components/common/icons";
import {
  BLEND_MODES,
  IMAGE_POSITION_HORIZONTAL_KEYWORDS,
  IMAGE_POSITION_VERTICAL_KEYWORDS,
  IMAGE_REPEAT_TILE,
  createDefaultImagePosition,
  createDefaultImageSizeDimensions,
  isImageTilingEnabled,
  normalizeImagePosition,
  normalizeImagePositionAxis,
  normalizeImageSizeDimensionAxis,
  normalizeImageSizeDimensions,
} from "@/utils/profileHeaderSurfaceStyle";
import { CDN_IMAGE_ACCEPT } from "@/constants/cdnImageAccept.js";
import { valuesToSelectOptions } from "./profileHeaderSurfaceEditorUtils";
import ProfileHeaderSurfaceAxisPositionRow from "./ProfileHeaderSurfaceAxisPositionRow";
import ProfileHeaderSurfaceAxisSizeRow from "./ProfileHeaderSurfaceAxisSizeRow";

export default function ProfileHeaderSurfaceImageSettings({
  imageSettings,
  previewImageUrl,
  patchImageSettings,
  fileInputRef,
  saveBusy,
  onSelectImageFile,
  onMarkImageRemoved,
  imageLayerId,
}) {
  const { t } = useTranslation(["pages"]);

  const imageTileRepeatOptions = useMemo(() => valuesToSelectOptions(IMAGE_REPEAT_TILE), []);
  const blendModeOptions = useMemo(
    () => [
      { value: "normal", label: t("settings.headerSurface.blendModeNormal", { defaultValue: "normal" }) },
      ...valuesToSelectOptions(BLEND_MODES.filter((m) => m !== "normal")),
    ],
    [t],
  );

  if (!imageLayerId || !imageSettings) {
    return (
      <div className="profile-header-surface-image-settings">
        <h4 className="profile-header-surface-image-settings__subtitle">
          {t("settings.headerSurface.imageTitle")}
        </h4>
        <input
          ref={fileInputRef}
          type="file"
          accept={CDN_IMAGE_ACCEPT}
          className="profile-header-surface-image-settings__file-input"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f && imageLayerId) onSelectImageFile(imageLayerId, f);
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
          accept={CDN_IMAGE_ACCEPT}
          className="profile-header-surface-image-settings__file-input"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f && imageLayerId) onSelectImageFile(imageLayerId, f);
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
  const sizeDimensions = normalizeImageSizeDimensions(imageSettings.sizeDimensions);
  const patchPositionAxis = (axisKey, partial) => {
    patchImageSettings((img) => {
      const current = normalizeImagePosition(img.position);
      const axis = normalizeImagePositionAxis(current[axisKey], axisKey);
      img.position = {
        ...current,
        [axisKey]: { ...axis, ...partial },
      };
    });
  };
  const patchSizeAxis = (axisKey, partial) => {
    patchImageSettings((img) => {
      const current = normalizeImageSizeDimensions(img.sizeDimensions);
      const axis = normalizeImageSizeDimensionAxis(current[axisKey], axisKey);
      const nextAxis = { ...axis, ...partial };
      const next = {
        ...current,
        [axisKey]: nextAxis,
      };
      if (img.sizeDimensionsLinked === true) {
        const otherKey = axisKey === "width" ? "height" : "width";
        next[otherKey] = { ...nextAxis };
      }
      img.sizeDimensions = next;
      delete img.size;
    });
  };
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
        <div className="profile-header-surface-image-settings__preview-media">
          <img src={previewImageUrl} alt="" className="profile-header-surface-image-settings__preview" />
        </div>
        <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select profile-header-surface-image-settings__preview-blend">
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
              patchImageSettings((img) => {
                if (opt.value === "normal") {
                  delete img.blendMode;
                } else {
                  img.blendMode = opt.value;
                }
              });
            }}
            width="100%"
          />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={CDN_IMAGE_ACCEPT}
        className="profile-header-surface-image-settings__file-input"
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f && imageLayerId) onSelectImageFile(imageLayerId, f);
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
        <label className="profile-header-surface-image-settings__toggle-field">
          <input
            type="checkbox"
            checked={imageSettings.padForBanner === true}
            onChange={(ev) => {
              patchImageSettings((img) => {
                if (ev.target.checked) {
                  img.padForBanner = true;
                } else {
                  delete img.padForBanner;
                }
              });
            }}
          />
          <span>{t("settings.headerSurface.padForBanner")}</span>
        </label>
      </div>
      <div className="profile-header-surface-image-settings__controls">
        <div className="profile-header-surface-image-settings__position-group">
          <ProfileHeaderSurfaceAxisPositionRow
            axis="x"
            axisKey="x"
            sideOptions={IMAGE_POSITION_HORIZONTAL_KEYWORDS}
            position={position}
            onPatchAxis={patchPositionAxis}
          />
          <ProfileHeaderSurfaceAxisPositionRow
            axis="y"
            axisKey="y"
            sideOptions={IMAGE_POSITION_VERTICAL_KEYWORDS}
            position={position}
            onPatchAxis={patchPositionAxis}
          />
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-image-settings__row-reset"
            onClick={() =>
              patchImageSettings((img) => {
                img.position = createDefaultImagePosition();
              })
            }
          >
            {t("settings.headerSurface.resetRow")}
          </button>
        </div>
        <div className="profile-header-surface-image-settings__size-group">
          <ProfileHeaderSurfaceAxisSizeRow
            axisKey="width"
            sizeDimensions={sizeDimensions}
            onPatchAxis={patchSizeAxis}
          />
          <div className="profile-header-surface-image-settings__size-link-row">
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
                patchImageSettings((img) => {
                  const next = !sizeLinked;
                  if (next) {
                    const dims = normalizeImageSizeDimensions(img.sizeDimensions);
                    img.sizeDimensionsLinked = true;
                    img.sizeDimensions = {
                      width: { ...dims.width },
                      height: { ...dims.width },
                    };
                  } else {
                    delete img.sizeDimensionsLinked;
                  }
                  delete img.size;
                });
              }}
            >
              {sizeLinked ? (
                <LinkIcon size={18} color="currentColor" />
              ) : (
                <UnlinkIcon size={18} color="currentColor" />
              )}
            </button>
          </div>
          <ProfileHeaderSurfaceAxisSizeRow
            axisKey="height"
            sizeDimensions={sizeDimensions}
            onPatchAxis={patchSizeAxis}
          />
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-image-settings__row-reset"
            onClick={() =>
              patchImageSettings((img) => {
                img.sizeDimensions = createDefaultImageSizeDimensions();
                delete img.sizeDimensionsLinked;
                delete img.size;
              })
            }
          >
            {t("settings.headerSurface.resetRow")}
          </button>
        </div>
        <div className="profile-header-surface-image-settings__tiling-group">
          <label className="profile-header-surface-image-settings__toggle-field">
            <input
              type="checkbox"
              checked={tilingEnabled}
              onChange={(ev) => {
                const enabled = ev.target.checked;
                patchImageSettings((img) => {
                  if (!enabled) {
                    img.repeat = "no-repeat";
                    return;
                  }
                  if (!isImageTilingEnabled(img.repeat)) {
                    img.repeat = "repeat";
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
                    patchImageSettings((img) => {
                      img.repeat = opt.value;
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
