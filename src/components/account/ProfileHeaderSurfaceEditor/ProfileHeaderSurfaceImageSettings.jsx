import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/common/selectors";
import {
  BLEND_MODES,
  IMAGE_REPEAT,
  IMAGE_SIZE_PRESETS,
} from "@/utils/profileHeaderSurfaceStyle";
import { valuesToSelectOptions } from "./profileHeaderSurfaceEditorUtils";

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

  const imageSizeOptions = useMemo(() => valuesToSelectOptions(IMAGE_SIZE_PRESETS), []);
  const imageRepeatOptions = useMemo(() => valuesToSelectOptions(IMAGE_REPEAT), []);
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

  const position = imageSettings.position ?? { xPercent: 50, yPercent: 50 };
  const sizeValue = typeof imageSettings.size === "string" ? imageSettings.size : "custom";

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
            inputId="profile-header-surface-image-size"
            label={t("settings.headerSurface.size")}
            options={imageSizeOptions}
            value={imageSizeOptions.find((o) => o.value === sizeValue) ?? null}
            onChange={(opt) => {
              if (!opt?.value) return;
              patchWorking((s) => {
                if (!s.image) return;
                if (opt.value === "custom") {
                  s.image.size = { widthPercent: 100, heightPercent: 100 };
                } else {
                  s.image.size = opt.value;
                }
              });
            }}
            width="100%"
          />
        </div>
        {typeof imageSettings.size === "object" ? (
          <div className="profile-header-surface-image-settings__field-row profile-header-surface-image-settings__field-row--span">
            <label className="profile-header-surface-image-settings__field">
              <span>{t("settings.headerSurface.widthPercent")}</span>
              <input
                type="range"
                min={10}
                max={200}
                value={imageSettings.size.widthPercent}
                onChange={(ev) =>
                  patchWorking((s) => {
                    if (s.image && typeof s.image.size === "object") {
                      s.image.size.widthPercent = Number(ev.target.value);
                    }
                  })
                }
              />
            </label>
            <label className="profile-header-surface-image-settings__field">
              <span>{t("settings.headerSurface.heightPercent")}</span>
              <input
                type="range"
                min={10}
                max={200}
                value={imageSettings.size.heightPercent}
                onChange={(ev) =>
                  patchWorking((s) => {
                    if (s.image && typeof s.image.size === "object") {
                      s.image.size.heightPercent = Number(ev.target.value);
                    }
                  })
                }
              />
            </label>
          </div>
        ) : null}
        <div className="profile-header-surface-image-settings__field-row profile-header-surface-image-settings__field-row--span">
          <label className="profile-header-surface-image-settings__field">
            <span>{t("settings.headerSurface.positionX")}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={position.xPercent}
              onChange={(ev) =>
                patchWorking((s) => {
                  if (s.image && typeof s.image.position === "object") {
                    s.image.position.xPercent = Number(ev.target.value);
                  }
                })
              }
            />
          </label>
          <label className="profile-header-surface-image-settings__field">
            <span>{t("settings.headerSurface.positionY")}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={position.yPercent}
              onChange={(ev) =>
                patchWorking((s) => {
                  if (s.image && typeof s.image.position === "object") {
                    s.image.position.yPercent = Number(ev.target.value);
                  }
                })
              }
            />
          </label>
        </div>
        <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select">
          <CustomSelect
            inputId="profile-header-surface-image-repeat"
            label={t("settings.headerSurface.repeat")}
            options={imageRepeatOptions}
            value={imageRepeatOptions.find((o) => o.value === imageSettings.repeat) ?? null}
            onChange={(opt) => {
              if (!opt?.value) return;
              patchWorking((s) => {
                if (s.image) s.image.repeat = opt.value;
              });
            }}
            width="100%"
          />
        </div>
        <div className="profile-header-surface-image-settings__field profile-header-surface-image-settings__field--select">
          <CustomSelect
            inputId="profile-header-surface-image-blend-mode"
            label={t("settings.headerSurface.blendMode")}
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
      </div>
    </div>
  );
}
