import { useTranslation } from "react-i18next";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import MarqueeText from "@/components/common/display/MarqueeText/MarqueeText";
import { EditIcon } from "@/components/common/icons";
import { formatCreatorDisplay } from "@/utils/Utility";
import { getArtistDisplayName, getSongDisplayName } from "@/utils/levelHelpers";

const PlacementLevelPreview = ({ linkedLevel, emptyLabel, onEdit, editLabel, readOnly = false }) => {
  const { t } = useTranslation(["pages", "components"]);
  const { difficultyDict } = useDifficultyContext();

  if (!linkedLevel?.id) {
    return (
      <div className="tournament-management-popup__level-preview tournament-management-popup__level-preview--empty">
        <span className="tournament-management-popup__level-preview-placeholder">
          {emptyLabel}
        </span>
        {!readOnly ? (
        <button
          type="button"
          className="tournament-management-popup__level-edit-btn"
          onClick={onEdit}
          title={editLabel}
          aria-label={editLabel}
        >
          <EditIcon color="var(--color-white)" size="18px" />
        </button>
        ) : null}
      </div>
    );
  }

  const levelForDisplay = {
    id: linkedLevel.id,
    song: linkedLevel.song,
    artist: linkedLevel.artist,
    team: linkedLevel.team,
    levelCredits: linkedLevel.levelCredits,
  };
  const diffId = linkedLevel.diffId;
  const difficultyIcon =
    difficultyDict[diffId]?.icon || "/default-difficulty-icon.png";
  const artistName = getArtistDisplayName(levelForDisplay) || linkedLevel.artist || "";
  const songName = getSongDisplayName(levelForDisplay) || linkedLevel.song || "";

  return (
    <div className="tournament-management-popup__level-preview">
      <div className="tournament-management-popup__level-preview-icon">
        <img src={difficultyIcon} alt="" />
      </div>
      <div className="tournament-management-popup__level-preview-song">
        <MarqueeText className="tournament-management-popup__level-exp" as="p">
          #{linkedLevel.id} - {artistName}
        </MarqueeText>
        <MarqueeText className="tournament-management-popup__level-desc" as="p">
          {songName}
        </MarqueeText>
      </div>
      <div className="tournament-management-popup__level-preview-creator">
        <p className="tournament-management-popup__level-exp">
          {t("cards.level.creator", { ns: "components" })}
        </p>
        <MarqueeText className="tournament-management-popup__level-desc" as="div">
          {formatCreatorDisplay(levelForDisplay)}
        </MarqueeText>
      </div>
      {!readOnly ? (
      <button
        type="button"
        className="tournament-management-popup__level-edit-btn"
        onClick={onEdit}
        title={editLabel}
        aria-label={editLabel}
      >
        <EditIcon color="var(--color-white)" size="18px" />
      </button>
      ) : null}
    </div>
  );
};

export default PlacementLevelPreview;
