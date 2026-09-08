import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import { DifficultyGraph } from "@/components/common/display";
import { useTranslation } from "react-i18next";

export default function CreatorDifficultyModule({
  graphData,
  collapsed,
  onCollapsedChange,
}) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  return (
    <section className="creator-profile-page__section creator-profile-page__section--difficulty">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("creators.profile.sections.difficultyBreakdown.title")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("creators.profile.sections.difficultyBreakdown.expand")
              : t("creators.profile.sections.difficultyBreakdown.collapse")
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
          <div className="account-profile-page__collapsible">
            <DifficultyGraph data={graphData} mode="levels" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
