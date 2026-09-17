// tuf-search: #TournamentPackCreatePopup #tournamentPackCreatePopup #popups #tournaments
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CloseButton } from "@/components/common/buttons";
import { PackRefSelect } from "@/components/common/selectors";
import { PopupShell } from "@/components/common/PopupShell";
import "./tournamentpackcreatepopup.css";

const TournamentPackCreatePopup = ({ onClose, onCreated }) => {
  const { t } = useTranslation(["pages", "common"]);
  const [packRef, setPackRef] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="tournament-pack-create-popup"
      panelClassName="tournament-pack-create-popup__content"
      ariaLabelledBy="tournament-pack-create-popup-title"
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
    </PopupShell>
  );
};

export default TournamentPackCreatePopup;
