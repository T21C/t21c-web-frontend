import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon, InfoIcon } from "@/components/common/icons";
import { Tooltip as ProfileTooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

export default function PlayerScoreBreakdownModule({
  playerId,
  tiles,
  collapsed,
  onCollapsedChange,
}) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  return (
    <section className="player-page__section player-page__score-breakdown">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("profile.sections.scoreBreakdown.title")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("profile.sections.scoreBreakdown.expand")
              : t("profile.sections.scoreBreakdown.collapse")
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
          <div className="account-profile-page__collapsible player-page__score-breakdown-collapsible">
            <div className="player-page__score-breakdown-grid">
              {tiles.map((tile) => {
                const tooltipId = `player-score-breakdown-${playerId}-${tile.key}`;
                return (
                  <div key={tile.key} className="player-page__score-breakdown-tile">
                    <div className="player-page__score-breakdown-label-row">
                      <span className="player-page__score-breakdown-label">{tile.label}</span>
                      <button
                        type="button"
                        className="player-page__score-breakdown-info-btn"
                        data-tooltip-id={tooltipId}
                        aria-label={t(`profile.sections.scoreBreakdown.tooltips.${tile.key}.aria`)}
                      >
                        <InfoIcon color="#fff8" size={16} />
                      </button>
                      <ProfileTooltip
                        id={tooltipId}
                        place="top"
                        className="player-page__score-breakdown-tooltip"
                        style={{ maxWidth: "min(22rem, 92vw)", zIndex: 30 }}
                      >
                        {t(`profile.sections.scoreBreakdown.tooltips.${tile.key}.description`)}
                      </ProfileTooltip>
                    </div>
                    <span className="player-page__score-breakdown-value">{tile.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
