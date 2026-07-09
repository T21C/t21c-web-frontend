// tuf-search: #TournamentPlacementsSection #tournamentPlacements
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { listVisiblePlacements, normalizePlacementCardLayout } from "@/utils/tournamentPlacements";
import TournamentPlacementCard from "./TournamentPlacementCard";
import "./tournamentPlacements.css";

/**
 * @param {{ placements?: Array<any>, cardLayout?: string, defaultCollapsed?: boolean, sectionClassName?: string }} props
 */
const TournamentPlacementsSection = ({
  placements = [],
  cardLayout = "default",
  defaultCollapsed = false,
  sectionClassName = "player-page__section",
}) => {
  const { t } = useTranslation("pages");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const expanded = !collapsed;

  const list = useMemo(() => listVisiblePlacements(placements), [placements]);
  const layout = normalizePlacementCardLayout(cardLayout);

  if (!list.length) return null;

  return (
    <section className={`${sectionClassName} tournament-placements`}>
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("profile.sections.tournaments.title")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("profile.sections.tournaments.expand")
              : t("profile.sections.tournaments.collapse")
          }
          onClick={() => setCollapsed((v) => !v)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible
        open={expanded}
        onOpenChange={(open) => setCollapsed(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div
            className={[
              "account-profile-page__collapsible",
              "tournament-placements",
              layout === "iconRail" ? "tournament-placements--icon-rail" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="tournament-placements__grid">
              {list.map((placement) => (
                <TournamentPlacementCard
                  key={placement.id}
                  placement={placement}
                  cardLayout={layout}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

export default TournamentPlacementsSection;
