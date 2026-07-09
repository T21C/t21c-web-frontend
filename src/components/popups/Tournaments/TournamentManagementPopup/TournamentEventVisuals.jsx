import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CDN_IMAGE_ACCEPT } from "@/config/constants/cdnImageAccept";
import VisualAssetSlot from "./VisualAssetSlot";

const TournamentEventVisuals = ({
  tournamentId,
  iconUrl,
  cardBackgroundUrl,
  onRefresh,
}) => {
  const { t } = useTranslation(["pages", "common"]);

  const postAsset = useCallback(async (url, file) => {
    const body = new FormData();
    body.append("asset", file);
    await api.post(url, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }, []);

  const uploadAsset = async (kind, file) => {
    if (!file || !tournamentId) return;
    try {
      const url =
        kind === "icon"
          ? routes.admin.tournaments.icon(tournamentId)
          : routes.admin.tournaments.cardBackground(tournamentId);
      await postAsset(url, file);
      toast.success(t("tournamentManagement.visuals.messages.uploadSuccess"));
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.visuals.errors.uploadFailed"));
    }
  };

  const removeAsset = async (kind) => {
    if (!tournamentId) return;
    try {
      const url =
        kind === "icon"
          ? routes.admin.tournaments.icon(tournamentId)
          : routes.admin.tournaments.cardBackground(tournamentId);
      await api.delete(url);
      toast.success(t("tournamentManagement.visuals.messages.removed"));
      await onRefresh?.();
    } catch {
      toast.error(t("tournamentManagement.visuals.errors.removeFailed"));
    }
  };

  return (
    <section className="tournament-management-popup__visuals-section tournament-management-popup__visuals-section--details">
      <h3 className="tournament-management-popup__visuals-section-title">
        {t("tournamentManagement.visuals.tournamentTitle")}
      </h3>
      <div className="tournament-management-popup__visuals-row">
        <div className="tournament-management-popup__visual-slot">
          <span className="tournament-management-popup__visual-label">
            {t("tournamentManagement.visuals.eventIcon")}
          </span>
          <VisualAssetSlot
            url={iconUrl}
            variant="icon"
            accept={CDN_IMAGE_ACCEPT}
            onUpload={(file) => uploadAsset("icon", file)}
            onRemove={() => removeAsset("icon")}
          />
        </div>
        <div className="tournament-management-popup__visual-slot">
          <span className="tournament-management-popup__visual-label">
            {t("tournamentManagement.visuals.defaultCardBg")}
          </span>
          <VisualAssetSlot
            url={cardBackgroundUrl}
            variant="card"
            accept={CDN_IMAGE_ACCEPT}
            onUpload={(file) => uploadAsset("card", file)}
            onRemove={() => removeAsset("card")}
          />
        </div>
      </div>
    </section>
  );
};

export default TournamentEventVisuals;
