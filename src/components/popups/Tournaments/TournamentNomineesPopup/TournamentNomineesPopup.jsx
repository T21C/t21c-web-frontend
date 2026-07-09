// tuf-search: #TournamentNomineesPopup #tournamentNomineesPopup #popups #tournaments
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CloseButton } from "@/components/common/buttons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import "./tournamentnomineespopup.css";

const TournamentNomineesPopup = ({
  levelId,
  placementId,
  creditedCreatorIds = null,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useBodyScrollLock(true);

  const loadCandidates = useCallback(async () => {
    if (!levelId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = placementId
        ? routes.admin.tournaments.placementNominees(placementId)
        : routes.admin.tournaments.nomineeCandidates(levelId);
      const { data } = await api.get(url);
      const list = Array.isArray(data?.candidates)
        ? data.candidates
        : Array.isArray(data)
          ? data
          : [];
      setCandidates(list);
      const initialIds =
        creditedCreatorIds === null
          ? list.map((c) => c.creatorId ?? c.id)
          : creditedCreatorIds;
      setSelectedIds(new Set(initialIds.filter((id) => id != null)));
    } catch {
      toast.error(t("tournamentManagement.nominees.errors.loadFailed"));
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [levelId, placementId, creditedCreatorIds, t]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

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

  const selectAll = () => {
    setSelectedIds(new Set(candidates.map((c) => c.creatorId ?? c.id)));
  };

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
    onSave?.(filterValue);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("tournament-nominees-popup")) {
      onClose();
    }
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
            <div className="tournament-nominees-popup__list">
              {candidates.map((candidate) => {
                const creatorId = candidate.creatorId ?? candidate.id;
                const checked = selectedIds.has(creatorId);
                return (
                  <label key={creatorId} className="tournament-nominees-popup__row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(creatorId)}
                    />
                    <span className="tournament-nominees-popup__row-label">
                      <span className="tournament-nominees-popup__row-name">
                        {candidate.name || candidate.creator?.name || `#${creatorId}`}
                      </span>
                      {candidate.role ? (
                        <span className="tournament-nominees-popup__row-role">
                          {candidate.role}
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
          <button type="button" className="btn-fill-primary" onClick={handleSave}>
            {t("tournamentManagement.nominees.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentNomineesPopup;
