// tuf-search: #TournamentPlacementIconRail #tournamentPlacements

/**
 * Full-height left icon rail for placement cards (outside text content).
 * @param {{ src?: string | null }} props
 */
const TournamentPlacementIconRail = ({ src = null }) => {
  if (!src) return null;

  return (
    <div className="tournament-placements__icon-rail" aria-hidden="true">
      <img className="tournament-placements__icon-rail-img" src={src} alt="" />
    </div>
  );
};

export default TournamentPlacementIconRail;
