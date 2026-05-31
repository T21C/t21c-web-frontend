import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
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
  hidePreviewControls = false,
  collapsible = false,
  collapsibleExpanded,
  onCollapsibleExpandedChange,
  controlRowClassName = "",
  sectionClassName = "settings-sub-page__block settings-sub-page__field",
  labelElement = "label",
}) {
  const { t } = useTranslation("pages");
  const [internalCollapsibleExpanded, setInternalCollapsibleExpanded] = useState(false);
  const isCollapsibleControlled = collapsibleExpanded !== undefined;
  const collapsibleOpen = isCollapsibleControlled ? collapsibleExpanded : internalCollapsibleExpanded;
  const setCollapsibleOpen = (next) => {
    const resolved = typeof next === "function" ? next(collapsibleOpen) : next;
    if (!isCollapsibleControlled) setInternalCollapsibleExpanded(resolved);
    onCollapsibleExpandedChange?.(resolved);
  };
  const collapsiblePanelId = `${inputId}-panel`;

  const LabelTag = labelElement;
  const controlRowClass = [
    "settings-sub-page__control-row",
    stack ? "settings-sub-page__control-row--stack" : "",
    controlRowClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const controlRow = (
    <div className={controlRowClass}>
      {children}
      {hideActions ? null : (
        <SettingsSaveButton saving={saving} matchesSaved={matchesSaved} onClick={onSave} />
      )}
    </div>
  );

  const headActions =
    hidePreviewControls && !collapsible ? null : (
      <div className="settings-sub-page__section-head-actions">
        {hidePreviewControls ? null : (
          <SettingsSectionPreviewControls
            sectionId={sectionId}
            headingId={inputId}
            title={previewTitle ?? (typeof label === "string" ? label : sectionId)}
          />
        )}
        {collapsible ? (
          <button
            type="button"
            className="settings-sub-page__banner-chevron"
            aria-expanded={collapsibleOpen}
            aria-controls={collapsiblePanelId}
            aria-label={
              collapsibleOpen
                ? t("settings.bioCanvas.sectionCollapseAria")
                : t("settings.bioCanvas.sectionExpandAria")
            }
            onClick={() => setCollapsibleOpen((v) => !v)}
          >
            <ChevronIcon direction={collapsibleOpen ? "down" : "right"} />
          </button>
        ) : null}
      </div>
    );

  return (
    <SettingsPreviewSection sectionId={sectionId} className={sectionClassName}>
      <div className="settings-sub-page__field-head">
        <LabelTag htmlFor={labelElement === "label" ? inputId : undefined}>{label}</LabelTag>
        {headActions}
      </div>
      {collapsible ? (
        <Collapsible
          open={collapsibleOpen}
          onOpenChange={setCollapsibleOpen}
          revealOverflow
          duration="0.4s"
        >
          <CollapsibleContent
            id={collapsiblePanelId}
            className="settings-sub-page__field-collapsible-region"
          >
            {controlRow}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        controlRow
      )}
      {fieldError ? (
        <p className="settings-sub-page__field-error" role="alert">
          {fieldError}
        </p>
      ) : null}
    </SettingsPreviewSection>
  );
}
