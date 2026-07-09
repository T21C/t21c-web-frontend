// tuf-search: #TournamentPackCreatePopup #tournamentPackCreatePopup #popups #tournaments
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CloseButton } from "@/components/common/buttons";
import { PackRefSelect } from "@/components/common/selectors";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import "./tournamentpackcreatepopup.css";

const TournamentPackCreatePopup = ({ onClose, onCreated }) => {
  const { t } = useTranslation(["pages", "common"]);
  const [packRef, setPackRef] = useState("");
  const [saving, setSaving] = useState(false);

  useBodyScrollLock(true);

  const handleCreate = async () => {
    const ref = packRef.trim();
    if (!ref) {
      toast.error(t("tournamentManagement.packCreate.errors.packRefRequired"));
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post(routes.admin.tournaments.packCreate(), {
        packRef: ref,
        syncCredits: true,
      });
      toast.success(t("tournamentManagement.packCreate.messages.created"));
      onCreated?.(data);
      onClose();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.packCreate.errors.createFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("tournament-pack-create-popup")) {
      onClose();
    }
  };

  return (
    <div className="tournament-pack-create-popup" onClick={handleBackdropClick}>
      <div
        className="tournament-pack-create-popup__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-pack-create-popup-title"
      >
        <div className="tournament-pack-create-popup__header">
          <div>
            <h2
              id="tournament-pack-create-popup-title"
              className="tournament-pack-create-popup__title"
            >
              {t("tournamentManagement.packCreate.title")}
            </h2>
            <p className="tournament-pack-create-popup__subtitle">
              {t("tournamentManagement.packCreate.subtitle")}
            </p>
          </div>
          <CloseButton
            onClick={onClose}
            aria-label={t("buttons.close", { ns: "common" })}
          />
        </div>

        <div className="tournament-pack-create-popup__body">
          <PackRefSelect
            id="tournament-pack-create-ref"
            label={t("tournamentManagement.packCreate.packRef")}
            value={packRef}
            onChange={setPackRef}
          />
        </div>

        <div className="tournament-pack-create-popup__footer">
          <button
            type="button"
            className="btn-fill-primary"
            onClick={handleCreate}
            disabled={saving || !packRef.trim()}
          >
            {t("tournamentManagement.packCreate.create")}
          </button>
          <button
            type="button"
            className="btn-fill-secondary"
            onClick={onClose}
            disabled={saving}
          >
            {t("buttons.cancel", { ns: "common" })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentPackCreatePopup;
