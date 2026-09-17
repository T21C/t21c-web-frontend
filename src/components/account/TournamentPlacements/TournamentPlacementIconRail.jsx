// tuf-search: #TournamentPlacementIconRail #tournamentPlacements

import { ICON_SIZE, selectIconSize } from "@/utils/Utility";

/**
 * Full-height left icon rail for placement cards (outside text content).
 * @param {{ src?: string | null }} props
 */
const TournamentPlacementIconRail = ({ src = null }) => {
  if (!src) return null;

  return (
    <div className="tournament-placements__icon-rail" aria-hidden="true">
      <img className="tournament-placements__icon-rail-img" src={selectIconSize(src, ICON_SIZE.MEDIUM)} alt="" />
    </div>
  );
};

export default TournamentPlacementIconRail;
