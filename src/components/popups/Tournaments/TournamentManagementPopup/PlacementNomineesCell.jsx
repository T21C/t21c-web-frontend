import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EditIcon } from "@/components/common/icons";
import {
  getNomineeDisplayName,
  resolveSelectedNominees,
  sortNomineesForAvatarStack,
  useNomineeCandidates,
} from "../useNomineeCandidates";
import NomineeAvatar from "./NomineeAvatar";

const AVATAR_STACK_LIMIT = 7;

const PlacementNomineesCell = ({
  levelId,
  creditedCreatorIds,
  onEdit,
  disabled = false,
  readOnly = false,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const { candidates, loading } = useNomineeCandidates(levelId);

  const selectedNominees = useMemo(
    () => resolveSelectedNominees(candidates, creditedCreatorIds),
    [candidates, creditedCreatorIds],
  );

  const previewNominees = useMemo(
    () => sortNomineesForAvatarStack(selectedNominees).slice(0, AVATAR_STACK_LIMIT),
    [selectedNominees],
  );
  const overflowCount = Math.max(0, selectedNominees.length - AVATAR_STACK_LIMIT);

  const stackLabel = useMemo(() => {
    if (!selectedNominees.length) {
      return t("tournamentManagement.nominees.noneSelected");
    }
    if (creditedCreatorIds === null && candidates.length) {
      return t("tournamentManagement.nominees.allSelected");
    }
    return t("tournamentManagement.nominees.selectedCount", {
      count: selectedNominees.length,
    });
  }, [selectedNominees.length, creditedCreatorIds, candidates.length, t]);

  const editLabel =
    selectedNominees.length > 0 || creditedCreatorIds === null
      ? t("tournamentManagement.popup.placements.editNominees")
      : t("tournamentManagement.popup.placements.pickNominees");

  return (
    <div className="tournament-management-popup__nominees-cell">
      <div
        className="tournament-management-popup__nominees-avatar-stack"
        aria-label={stackLabel}
        title={stackLabel}
      >
        {loading ? (
          <span className="tournament-management-popup__nominees-loading">
            {t("loading.generic", { ns: "common" })}
          </span>
        ) : null}
        {!loading && previewNominees.length ? (
          <>
            {previewNominees.map((candidate, index) => {
              const creatorId = candidate.creatorId ?? candidate.id;
              const displayName = getNomineeDisplayName(candidate);
              return (
                <div
                  key={creatorId}
                  className="tournament-management-popup__nominee-avatar-item"
                  style={{ "--stack-index": index }}
                  title={displayName}
                >
                  <NomineeAvatar
                    candidate={candidate}
                    className="tournament-management-popup__nominee-avatar"
                  />
                </div>
              );
            })}
            {overflowCount > 0 ? (
              <span
                className="tournament-management-popup__nominee-avatar-more"
                style={{ "--stack-index": previewNominees.length }}
                title={t("tournamentManagement.popup.placements.nomineeOverflow", {
                  count: overflowCount,
                })}
              >
                {t("tournamentManagement.popup.placements.nomineeOverflow", {
                  count: overflowCount,
                })}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
      {!readOnly ? (
      <button
        type="button"
        className="tournament-management-popup__nominees-edit-btn"
        onClick={onEdit}
        disabled={disabled}
        title={editLabel}
        aria-label={editLabel}
      >
        <EditIcon color="var(--color-white)" size="18px" />
      </button>
      ) : null}
    </div>
  );
};

export default PlacementNomineesCell;
