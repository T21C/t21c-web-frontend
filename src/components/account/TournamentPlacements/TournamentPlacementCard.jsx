// tuf-search: #TournamentPlacementCard #tournamentPlacements
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  resolveCoCreditCount,
  resolveCreditPackRef,
  resolveEffectiveCardLayout,
  resolveLevelDisplayName,
  resolveLevelHref,
  resolvePackHref,
  resolvePlacementCardBackground,
  resolveTierIcon,
  resolveTournamentIcon,
} from "@/utils/tournamentPlacements";

/**
 * @param {{
 *   placement: any,
 *   cardLayout?: string,
 *   previewMode?: boolean,
 *   hideTournamentLabel?: boolean,
 * }} props
 */
const TournamentPlacementCard = ({
  placement,
  cardLayout,
  previewMode = false,
  hideTournamentLabel = false,
}) => {
  const { t } = useTranslation("pages");
  const layout = resolveEffectiveCardLayout(placement, cardLayout);
  const cardBg = resolvePlacementCardBackground(placement);
  const tierIcon = resolveTierIcon(placement);
  const tournamentIcon = resolveTournamentIcon(placement);
  const cardStyle = cardBg ? { backgroundImage: `url(${cardBg})` } : undefined;

  const tierLabel = placement.tier?.label || placement.tier?.code || "";
  const tournamentLabel =
    placement.tournament?.fullName || placement.tournament?.shortName || "";
  const levelName = resolveLevelDisplayName(placement);
  const levelId = placement.levelId ?? placement.level?.id ?? null;
  const levelHref = resolveLevelHref(levelId);
  const packRef = resolveCreditPackRef(placement);
  const packHref = resolvePackHref(packRef);
  const coCreditCount = resolveCoCreditCount(placement);
  const showTournament = !hideTournamentLabel && Boolean(tournamentLabel);

  const wrapWithLevelLink = (node) => {
    if (!levelHref || previewMode) return node;
    return (
      <Link className="tournament-placements__link" to={levelHref}>
        {node}
      </Link>
    );
  };

  const tierLine = (
    <div className="tournament-placements__tier">
      {layout === "classic" && tierIcon ? (
        <img className="tournament-placements__tier-icon" src={tierIcon} alt="" />
      ) : null}
      <span>{tierLabel}</span>
    </div>
  );

  const metaBadges = (
    <>
      {placement.tournament?.sortYear ? (
        <span className="tournament-placements__badge">{placement.tournament.sortYear}</span>
      ) : null}
      {placement.teamName ? (
        <span className="tournament-placements__badge">{placement.teamName}</span>
      ) : null}
    </>
  );

  const othersLink =
    coCreditCount > 0 && levelHref ? (
      <Link className="tournament-placements__link" to={levelHref}>
        {t("profile.sections.tournaments.othersCount", { count: coCreditCount })}
      </Link>
    ) : null;

  let bodyContent = null;

  if (layout === "evidence") {
    bodyContent = (
      <>
        <div className="tournament-placements__primary">
          {levelHref && levelName ? (
            <Link className="tournament-placements__link" to={levelHref}>
              {levelName}
            </Link>
          ) : (
            <span>{levelName || placement.displayName}</span>
          )}
        </div>
        {showTournament || tierLabel ? (
          <div className="tournament-placements__context">
            {showTournament && tournamentIcon ? (
              <img className="tournament-placements__event-icon" src={tournamentIcon} alt="" />
            ) : null}
            {showTournament ? <span>{tournamentLabel}</span> : null}
            {showTournament && tierLabel ? (
              <span className="tournament-placements__context-sep">·</span>
            ) : null}
            {tierLabel ? <span>{tierLabel}</span> : null}
          </div>
        ) : null}
        <div className="tournament-placements__meta">{metaBadges}</div>
        {othersLink}
      </>
    );
  } else if (layout === "levelStyle") {
    const primaryHref = levelHref || packHref;
    const primaryLabel = hideTournamentLabel
      ? tierLabel || tournamentLabel
      : tournamentLabel || tierLabel;
    bodyContent = (
      <>
        <div className="tournament-placements__primary">
          {!hideTournamentLabel && tournamentIcon ? (
            <img className="tournament-placements__event-icon" src={tournamentIcon} alt="" />
          ) : null}
          {primaryHref && primaryLabel ? (
            <Link className="tournament-placements__link" to={primaryHref}>
              {primaryLabel}
              {!hideTournamentLabel && tierLabel && tournamentLabel ? (
                <span className="tournament-placements__primary-tier"> · {tierLabel}</span>
              ) : null}
            </Link>
          ) : (
            <span>
              {primaryLabel}
              {!hideTournamentLabel && tierLabel && tournamentLabel ? (
                <span className="tournament-placements__primary-tier"> · {tierLabel}</span>
              ) : null}
            </span>
          )}
        </div>
        {levelName && !hideTournamentLabel ? (
          <div className="tournament-placements__subtitle">
            {levelHref ? (
              <Link className="tournament-placements__link" to={levelHref}>
                {levelName}
              </Link>
            ) : (
              <span>{levelName}</span>
            )}
          </div>
        ) : levelName && hideTournamentLabel ? (
          <div className="tournament-placements__subtitle">
            {levelHref ? (
              <Link className="tournament-placements__link" to={levelHref}>
                {levelName}
              </Link>
            ) : (
              <span>{levelName}</span>
            )}
          </div>
        ) : null}
        <div className="tournament-placements__meta">{metaBadges}</div>
        {othersLink}
      </>
    );
  } else {
    bodyContent = (
      <>
        {wrapWithLevelLink(tierLine)}
        {showTournament ? (
          <div className="tournament-placements__event">
            {tournamentIcon ? (
              <img className="tournament-placements__event-icon" src={tournamentIcon} alt="" />
            ) : null}
            <span>{tournamentLabel}</span>
          </div>
        ) : null}
        {levelName ? (
          <div className="tournament-placements__subtitle">
            {levelHref && !previewMode ? (
              <Link className="tournament-placements__link" to={levelHref}>
                {levelName}
              </Link>
            ) : (
              <span>{levelName}</span>
            )}
          </div>
        ) : placement.displayName && !hideTournamentLabel ? (
          <div className="tournament-placements__display-name">{placement.displayName}</div>
        ) : null}
        <div className="tournament-placements__meta">{metaBadges}</div>
      </>
    );
  }

  return (
    <article
      className={[
        "tournament-placements__card",
        previewMode ? "is-preview" : "",
        `is-layout-${layout}`,
        cardBg ? "has-background" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={cardStyle}
    >
      {cardBg ? <div className="tournament-placements__card-overlay" /> : null}
      <div className="tournament-placements__card-body">{bodyContent}</div>
    </article>
  );
};

export default TournamentPlacementCard;
