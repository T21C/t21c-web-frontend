// tuf-search: #TournamentNomineesPopup #tournamentNomineesPopup #popups #tournaments
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CloseButton } from "@/components/common/buttons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  getNomineeDisplayName,
  invalidateNomineeCandidates,
  useNomineeCandidates,
} from "../useNomineeCandidates";
import NomineeAvatar from "../TournamentManagementPopup/NomineeAvatar";
import "./tournamentnomineespopup.css";

const formatRoleLabel = (role) => {
  if (!role) return "";
  const normalized = String(role).toLowerCase();
  if (normalized === "charter") return "Charter";
  if (normalized === "vfxer") return "VFX";
  return role;
};

const TournamentNomineesPopup = ({
  levelId,
  creditedCreatorIds = null,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const { candidates, loading, reload } = useNomineeCandidates(levelId);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useBodyScrollLock(true);

  useEffect(() => {
    if (!levelId || loading) return;

    const initialIds =
      creditedCreatorIds === null
        ? candidates.map((c) => c.creatorId ?? c.id)
        : creditedCreatorIds.filter((id) =>
            candidates.some((c) => (c.creatorId ?? c.id) === id),
          );
    setSelectedIds(new Set(initialIds.filter((id) => id != null)));
  }, [levelId, loading, candidates, creditedCreatorIds]);

  const selectedCount = selectedIds.size;

  const summaryLabel = useMemo(() => {
    if (creditedCreatorIds === null && selectedCount === candidates.length) {
      return t("tournamentManagement.nominees.allSelected");
    }
    if (selectedCount === 0) {
      return t("tournamentManagement.nominees.noneSelected");
    }
    return t("tournamentManagement.nominees.selectedCount", { count: selectedCount });
  }, [creditedCreatorIds, selectedCount, candidates.length, t]);

  const toggleId = (creatorId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
  };

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(candidates.map((c) => c.creatorId ?? c.id)));
  }, [candidates]);

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    const ids = [...selectedIds];
    const filterValue =
      creditedCreatorIds === null && ids.length === candidates.length
        ? null
        : ids.length
          ? ids
          : [];
    invalidateNomineeCandidates(levelId);
    onSave?.(filterValue);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("tournament-nominees-popup")) {
      onClose();
    }
  };

  const handleReload = () => {
    invalidateNomineeCandidates(levelId);
    reload().catch(() => {
      toast.error(t("tournamentManagement.nominees.errors.loadFailed"));
    });
  };

  return (
    <div className="tournament-nominees-popup" onClick={handleBackdropClick}>
      <div
        className="tournament-nominees-popup__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-nominees-popup-title"
      >
        <div className="tournament-nominees-popup__header">
          <div>
            <h2 id="tournament-nominees-popup-title" className="tournament-nominees-popup__title">
              {t("tournamentManagement.nominees.title")}
            </h2>
            <p className="tournament-nominees-popup__subtitle">{summaryLabel}</p>
          </div>
          <CloseButton
            onClick={onClose}
            aria-label={t("buttons.close", { ns: "common" })}
          />
        </div>

        <div className="tournament-nominees-popup__body">
          {loading ? (
            <p className="tournament-nominees-popup__loading">
              {t("loading.generic", { ns: "common" })}
            </p>
          ) : null}

          {!loading && !candidates.length ? (
            <p className="tournament-nominees-popup__empty">
              {t("tournamentManagement.nominees.empty")}
            </p>
          ) : null}

          {!loading && candidates.length ? (
            <div className="tournament-nominees-popup__grid">
              {candidates.map((candidate) => {
                const creatorId = candidate.creatorId ?? candidate.id;
                const checked = selectedIds.has(creatorId);
                const displayName = getNomineeDisplayName(candidate);
                return (
                  <label
                    key={creatorId}
                    className={`tournament-nominees-popup__card${checked ? " is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="tournament-nominees-popup__card-checkbox"
                      checked={checked}
                      onChange={() => toggleId(creatorId)}
                    />
                    <NomineeAvatar
                      candidate={candidate}
                      className="tournament-nominees-popup__avatar"
                    />
                    <span className="tournament-nominees-popup__card-body">
                      <span className="tournament-nominees-popup__card-name">{displayName}</span>
                      {candidate.role ? (
                        <span className="tournament-nominees-popup__card-role">
                          {formatRoleLabel(candidate.role)}
                        </span>
                      ) : null}
                    </span>
                    {candidate.isGuest ? (
                      <span className="tournament-nominees-popup__badge">
                        {t("tournamentManagement.nominees.guestBadge")}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="tournament-nominees-popup__actions">
          <button type="button" className="btn-fill-secondary" onClick={selectAll}>
            {t("tournamentManagement.nominees.selectAll")}
          </button>
          <button type="button" className="btn-fill-secondary" onClick={clearAll}>
            {t("tournamentManagement.nominees.clearAll")}
          </button>
          {!loading ? (
            <button type="button" className="btn-fill-secondary" onClick={handleReload}>
              {t("tournamentManagement.refresh")}
            </button>
          ) : null}
          <button type="button" className="btn-fill-primary" onClick={handleSave}>
            {t("tournamentManagement.nominees.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentNomineesPopup;
