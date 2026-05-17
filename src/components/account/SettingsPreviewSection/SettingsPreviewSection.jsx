import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";

/**
 * Wraps a settings block; hides when another section is in preview-focus mode.
 */
export function SettingsPreviewSection({ sectionId, className = "", children, as: Tag = "section", ...rest }) {
  const { previewFocusSectionId } = useSettings();
  const hidden = Boolean(previewFocusSectionId && previewFocusSectionId !== sectionId);
  const merged = [className, hidden ? "settings-sub-page__section--preview-hidden" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={merged} data-settings-section={sectionId} {...rest}>
      {children}
    </Tag>
  );
}

export function SettingsSectionPreviewControls({ sectionId, headingId, title }) {
  const { t } = useTranslation("pages");
  const { previewFocusSectionId, setPreviewFocusSectionId } = useSettings();
  const isFocused = previewFocusSectionId === sectionId;

  if (isFocused) {
    return (
      <button
        type="button"
        className="settings-sub-page__preview-exit-btn"
        onClick={() => setPreviewFocusSectionId(null)}
        aria-label={t("settings.preview.exitAria")}
      >
        {t("settings.preview.exit")}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="settings-sub-page__preview-enter-btn"
      aria-describedby={headingId}
      onClick={() => setPreviewFocusSectionId(sectionId)}
      aria-label={t("settings.preview.enterAria", { section: title })}
    >
      {t("settings.preview.enter")}
    </button>
  );
}
