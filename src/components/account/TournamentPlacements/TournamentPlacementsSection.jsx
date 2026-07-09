// tuf-search: #TournamentPlacementsSection #tournamentPlacements
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronIcon, PackIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import {
  getCreditId,
  groupPlacementsByHierarchy,
  listVisiblePlacements,
  resolvePackHref,
  sortPlacementsByOrder,
} from "@/utils/tournamentPlacements";
import TournamentPlacementCard from "./TournamentPlacementCard";
import "./tournamentPlacements.css";

/**
 * @param {{
 *   placements?: Array<any>,
 *   orderIds?: number[],
 *   defaultCollapsed?: boolean,
 *   sectionClassName?: string,
 * }} props
 */
const TournamentPlacementsSection = ({
  placements = [],
  orderIds = [],
  defaultCollapsed = false,
  sectionClassName = "player-page__section",
}) => {
  const { t } = useTranslation("pages");
  const [sectionCollapsed, setSectionCollapsed] = useState(defaultCollapsed);
  const [collapsedSeriesKeys, setCollapsedSeriesKeys] = useState(() => new Set());
  const [collapsedTournamentKeys, setCollapsedTournamentKeys] = useState(() => new Set());
  const collapseInitializedRef = useRef(false);

  const sectionExpanded = !sectionCollapsed;

  const list = useMemo(() => {
    const visible = listVisiblePlacements(placements);
    return sortPlacementsByOrder(visible, orderIds);
  }, [placements, orderIds]);

  const hierarchy = useMemo(() => groupPlacementsByHierarchy(list), [list]);

  useEffect(() => {
    if (collapseInitializedRef.current || !hierarchy.length) return;
    collapseInitializedRef.current = true;
    setCollapsedSeriesKeys(new Set(hierarchy.map((group) => group.key)));
    setCollapsedTournamentKeys(
      new Set(hierarchy.flatMap((group) => group.tournaments.map((tournament) => tournament.key))),
    );
  }, [hierarchy]);

  if (!list.length) return null;

  const toggleSeries = (seriesKey) => {
    setCollapsedSeriesKeys((prev) => {
      const next = new Set(prev);
      if (next.has(seriesKey)) next.delete(seriesKey);
      else next.add(seriesKey);
      return next;
    });
  };

  const toggleTournament = (tournamentKey) => {
    setCollapsedTournamentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(tournamentKey)) next.delete(tournamentKey);
      else next.add(tournamentKey);
      return next;
    });
  };

  const resolveSeriesLabel = (seriesGroup) => {
    if (seriesGroup.series?.name) return seriesGroup.series.name;
    return t("profile.sections.tournaments.unseriesed");
  };

  const resolveTournamentLabel = (tournamentGroup) =>
    tournamentGroup.tournament?.fullName ||
    tournamentGroup.tournament?.shortName ||
    t("profile.sections.tournaments.unknownTournament");

  return (
    <section className={`${sectionClassName} tournament-placements`}>
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("profile.sections.tournaments.title")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={sectionExpanded}
          aria-label={
            sectionCollapsed
              ? t("profile.sections.tournaments.expand")
              : t("profile.sections.tournaments.collapse")
          }
          onClick={() => setSectionCollapsed((v) => !v)}
        >
          <ChevronIcon direction={sectionExpanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible
        open={sectionExpanded}
        onOpenChange={(open) => setSectionCollapsed(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div className="account-profile-page__collapsible tournament-placements">
            <div className="tournament-placements__hierarchy">
              {hierarchy.map((seriesGroup) => {
                const seriesCollapsed = collapsedSeriesKeys.has(seriesGroup.key);
                const seriesCreditCount = seriesGroup.tournaments.reduce(
                  (sum, tg) => sum + tg.credits.length,
                  0,
                );
                const seriesExpanded = !seriesCollapsed;

                return (
                  <section key={seriesGroup.key} className="tournament-placements__series-group">
                    <button
                      type="button"
                      className="tournament-placements__group-header tournament-placements__series-header"
                      aria-expanded={seriesExpanded}
                      onClick={() => toggleSeries(seriesGroup.key)}
                    >
                      <ChevronIcon
                        direction={seriesExpanded ? "down" : "right"}
                        className="tournament-placements__group-chevron"
                      />
                      <span className="tournament-placements__group-title">
                        {resolveSeriesLabel(seriesGroup)}
                      </span>
                      <span className="tournament-placements__group-count">
                        {seriesCreditCount}
                      </span>
                    </button>

                    {seriesExpanded ? (
                      <div className="tournament-placements__series-body">
                        {seriesGroup.tournaments.map((tournamentGroup) => {
                          const tournamentCollapsed = collapsedTournamentKeys.has(
                            tournamentGroup.key,
                          );
                          const tournamentExpanded = !tournamentCollapsed;
                          const packHref = resolvePackHref(tournamentGroup.packRef);

                          return (
                            <section
                              key={tournamentGroup.key}
                              className="tournament-placements__tournament-group"
                            >
                              <div className="tournament-placements__group-header tournament-placements__tournament-header">
                                <button
                                  type="button"
                                  className="tournament-placements__tournament-toggle"
                                  aria-expanded={tournamentExpanded}
                                  onClick={() => toggleTournament(tournamentGroup.key)}
                                >
                                  <ChevronIcon
                                    direction={tournamentExpanded ? "down" : "right"}
                                    className="tournament-placements__group-chevron"
                                  />
                                  <span className="tournament-placements__group-title">
                                    {resolveTournamentLabel(tournamentGroup)}
                                  </span>
                                  <span className="tournament-placements__group-count">
                                    {tournamentGroup.credits.length}
                                  </span>
                                </button>
                                {packHref ? (
                                  <Link
                                    className="tournament-placements__pack-link"
                                    to={packHref}
                                    title={t("profile.sections.tournaments.openPack")}
                                    aria-label={t("profile.sections.tournaments.openPack")}
                                  >
                                    <PackIcon size="16px" color="var(--color-gray-2)" />
                                  </Link>
                                ) : null}
                              </div>

                              {tournamentExpanded ? (
                                <div className="tournament-placements__grid">
                                  {tournamentGroup.credits.map((credit) => (
                                    <TournamentPlacementCard
                                      key={getCreditId(credit)}
                                      placement={credit}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </section>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

export default TournamentPlacementsSection;
