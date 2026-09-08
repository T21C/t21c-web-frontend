import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import { DifficultyGraph } from "@/components/common/display";
import { useTranslation } from "react-i18next";

export default function PlayerDifficultyModule({
  graphData,
  includeDupes,
  onIncludeDupesChange,
  collapsed,
  onCollapsedChange,
}) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  return (
    <section className="player-page__difficulty-section">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("profile.sections.difficultyBreakdown.title")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("profile.sections.difficultyBreakdown.expand")
              : t("profile.sections.difficultyBreakdown.collapse")
          }
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => onCollapsedChange(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div className="account-profile-page__collapsible player-page__difficulty-collapsible">
            <label className="player-page__difficulty-dupes-toggle">
              <input
                type="checkbox"
                checked={includeDupes}
                onChange={(e) => onIncludeDupesChange(e.target.checked)}
              />
              <span>{t("profile.sections.difficultyBreakdown.includeDupes")}</span>
            </label>
            <DifficultyGraph data={graphData} mode="passes" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
