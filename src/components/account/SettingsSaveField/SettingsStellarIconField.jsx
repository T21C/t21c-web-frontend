import { TUFStellarIcon } from "@/components/common/icons";
import { normalizeTufStellarIconVariant } from "@/utils/profileBanners";
import {
  SettingsPreviewSection,
  SettingsSectionPreviewControls,
} from "@/components/account/SettingsPreviewSection/SettingsPreviewSection";
import { SettingsSaveButton } from "./SettingsSaveField";

const DEFAULT_VARIANTS = ["1", "2", "3"];

export function SettingsStellarIconField({
  sectionId = "stellar",
  title,
  hint,
  groupAriaLabel,
  value,
  onChange,
  onSave,
  saving = false,
  matchesSaved = false,
  fieldError = "",
  optionIds = DEFAULT_VARIANTS,
  getOptionAriaLabel,
  headingId,
}) {
  const resolvedHeadingId = headingId ?? `settings-stellar-icon-${sectionId}`;
  const previewVariant = normalizeTufStellarIconVariant(value);

  return (
    <SettingsPreviewSection
      sectionId={sectionId}
      className="settings-sub-page__stellar-variant"
      aria-labelledby={resolvedHeadingId}
    >
      <div className="settings-sub-page__stellar-variant-head">
        <h2 id={resolvedHeadingId} className="settings-sub-page__stellar-variant-title">
          {title}
        </h2>
        <SettingsSectionPreviewControls
          sectionId={sectionId}
          headingId={resolvedHeadingId}
          title={title}
        />
      </div>
      {hint ? <p className="settings-sub-page__text">{hint}</p> : null}
      <div
        className="settings-sub-page__stellar-variant-options"
        role="group"
        aria-label={groupAriaLabel}
      >
        {optionIds.map((id) => {
          const active = previewVariant === normalizeTufStellarIconVariant(id);
          return (
            <button
              key={id}
              type="button"
              className={
                active
                  ? "settings-sub-page__stellar-variant-btn settings-sub-page__stellar-variant-btn--active"
                  : "settings-sub-page__stellar-variant-btn"
              }
              onClick={() => onChange(id)}
              disabled={saving}
              aria-pressed={active}
              aria-label={getOptionAriaLabel?.(id) ?? `Variant ${id}`}
            >
              <TUFStellarIcon size={40} variant={id} />
            </button>
          );
        })}
      </div>
      <div className="settings-sub-page__stellar-variant-actions">
        <SettingsSaveButton saving={saving} matchesSaved={matchesSaved} onClick={onSave} />
      </div>
      {fieldError ? (
        <p className="settings-sub-page__field-error" role="alert">
          {fieldError}
        </p>
      ) : null}
    </SettingsPreviewSection>
  );
}
