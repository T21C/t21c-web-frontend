import { useTranslation } from "react-i18next";
import {
  SettingsPreviewSection,
  SettingsSectionPreviewControls,
} from "@/components/account/SettingsPreviewSection/SettingsPreviewSection";

export function SettingsSaveButton({ saving = false, matchesSaved = false, disabled = false, onClick, className = "" }) {
  const { t } = useTranslation("common");
  return (
    <button
      type="button"
      className={["settings-sub-page__save-btn", className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled || saving || matchesSaved}
    >
      {saving ? t("buttons.saving") : t("buttons.save")}
    </button>
  );
}

/**
 * Standard settings block: preview section, label row, control + save, optional error.
 */
export function SettingsSaveField({
  sectionId,
  label,
  inputId,
  previewTitle,
  children,
  onSave,
  saving = false,
  matchesSaved = false,
  fieldError = "",
  stack = false,
  hideActions = false,
  controlRowClassName = "",
  sectionClassName = "settings-sub-page__block settings-sub-page__field",
  labelElement = "label",
}) {
  const LabelTag = labelElement;
  const controlRowClass = [
    "settings-sub-page__control-row",
    stack ? "settings-sub-page__control-row--stack" : "",
    controlRowClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SettingsPreviewSection sectionId={sectionId} className={sectionClassName}>
      <div className="settings-sub-page__field-head">
        <LabelTag htmlFor={labelElement === "label" ? inputId : undefined}>{label}</LabelTag>
        <SettingsSectionPreviewControls
          sectionId={sectionId}
          headingId={inputId}
          title={previewTitle ?? (typeof label === "string" ? label : sectionId)}
        />
      </div>
      <div className={controlRowClass}>
        {children}
        {hideActions ? null : (
          <SettingsSaveButton saving={saving} matchesSaved={matchesSaved} onClick={onSave} />
        )}
      </div>
      {fieldError ? (
        <p className="settings-sub-page__field-error" role="alert">
          {fieldError}
        </p>
      ) : null}
    </SettingsPreviewSection>
  );
}
