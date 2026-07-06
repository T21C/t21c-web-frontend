// tuf-search: #TournamentPlacementCard #tournamentPlacements
import { useTranslation } from "react-i18next";
import { PinIcon } from "@/components/common/icons";
import {
  normalizePlacementCardLayout,
  resolvePlacementCardBackground,
  resolvePlacementRailIcon,
  resolveTierIcon,
  resolveTournamentIcon,
} from "@/utils/tournamentPlacements";

/**
 * @param {{
 *   placement: any,
 *   cardLayout?: string,
 *   isFeaturedOverride?: boolean,
 *   previewMode?: boolean,
 * }} props
 */
const TournamentPlacementCard = ({
  placement,
  cardLayout = "default",
  isFeaturedOverride,
  previewMode = false,
}) => {
  const { t } = useTranslation("pages");
  const layout = normalizePlacementCardLayout(cardLayout);
  const isIconRail = layout === "iconRail";
  const isFeatured =
    typeof isFeaturedOverride === "boolean" ? isFeaturedOverride : Boolean(placement.isFeatured);

  const cardBg = resolvePlacementCardBackground(placement);
  const tierIcon = resolveTierIcon(placement);
  const tournamentIcon = resolveTournamentIcon(placement);
  const railIcon = resolvePlacementRailIcon(placement);
  const cardStyle = cardBg ? { backgroundImage: `url(${cardBg})` } : undefined;

  const metaBadges = (
    <>
      {placement.tournament?.sortYear ? (
        <span className="tournament-placements__badge">{placement.tournament.sortYear}</span>
      ) : null}
      {placement.tournament?.series?.name ? (
        <span className="tournament-placements__badge">{placement.tournament.series.name}</span>
      ) : null}
      {placement.withdrew ? (
        <span className="tournament-placements__badge is-wd">
          {t("profile.sections.tournaments.withdrew")}
        </span>
      ) : null}
      {placement.teamName ? (
        <span className="tournament-placements__badge">{placement.teamName}</span>
      ) : null}
    </>
  );

  return (
    <article
      className={[
        "tournament-placements__card",
        previewMode ? "is-preview" : "",
        placement.tier?.isPodium ? "is-podium" : "",
        isFeatured ? "is-featured" : "",
        cardBg ? "has-background" : "",
        isIconRail ? "is-icon-rail" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={cardStyle}
    >
      {cardBg ? <div className="tournament-placements__card-overlay" /> : null}
      {isFeatured ? (
        <span
          className="tournament-placements__pin"
          title={t("profile.sections.tournaments.featured")}
          aria-label={t("profile.sections.tournaments.featured")}
        >
          <PinIcon size="14px" color="var(--color-purple-1)" />
        </span>
      ) : null}

      {isIconRail ? (
        <>
          <div className="tournament-placements__card-rail">
            {railIcon ? (
              <img className="tournament-placements__rail-icon" src={railIcon} alt="" />
            ) : (
              <div className="tournament-placements__rail-placeholder" />
            )}
          </div>
          <div className="tournament-placements__card-body">
            <div className="tournament-placements__tier">
              <span>{placement.tier?.label || placement.tier?.code}</span>
            </div>
            <div className="tournament-placements__event">
              <span>
                {placement.tournament?.fullName || placement.tournament?.shortName}
              </span>
            </div>
            <div className="tournament-placements__meta">{metaBadges}</div>
          </div>
        </>
      ) : (
        <div className="tournament-placements__card-body">
          <div className="tournament-placements__tier">
            {tierIcon ? (
              <img className="tournament-placements__tier-icon" src={tierIcon} alt="" />
            ) : null}
            <span>{placement.tier?.label || placement.tier?.code}</span>
          </div>
          <div className="tournament-placements__event">
            {tournamentIcon ? (
              <img className="tournament-placements__event-icon" src={tournamentIcon} alt="" />
            ) : null}
            <span>
              {placement.tournament?.fullName || placement.tournament?.shortName}
            </span>
          </div>
          <div className="tournament-placements__meta">{metaBadges}</div>
        </div>
      )}
    </article>
  );
};

export default TournamentPlacementCard;
