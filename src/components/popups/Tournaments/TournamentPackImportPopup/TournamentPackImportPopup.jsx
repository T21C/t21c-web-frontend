// tuf-search: #TournamentPackImportPopup #tournamentPackImportPopup #popups #tournaments
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CloseButton } from "@/components/common/buttons";
import { PackRefSelect } from "@/components/common/selectors";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import "./tournamentpackimportpopup.css";

const EMPTY_DIFF = { adds: [], removes: [], diverged: [] };

const TournamentPackImportPopup = ({ tournamentId, onClose, onImported }) => {
  const { t } = useTranslation(["pages", "common"]);
  const [packRef, setPackRef] = useState("");
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);

  useBodyScrollLock(true);

  const runDiff = async () => {
    const ref = packRef.trim();
    if (!ref) {
      toast.error(t("tournamentManagement.packImport.errors.packRefRequired"));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(routes.admin.tournaments.packImportDiff(tournamentId), {
        packRef: ref,
      });
      setDiff({
        adds: Array.isArray(data?.adds) ? data.adds : [],
        removes: Array.isArray(data?.removes) ? data.removes : [],
        diverged: Array.isArray(data?.diverged) ? data.diverged : [],
      });
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.packImport.errors.diffFailed"),
      );
      setDiff(EMPTY_DIFF);
    } finally {
      setLoading(false);
    }
  };

  const applyImport = async () => {
    const ref = packRef.trim();
    if (!ref) return;

    setLoading(true);
    try {
      await api.post(routes.admin.tournaments.packImport(tournamentId), {
        packRef: ref,
        confirm: true,
      });
      toast.success(t("tournamentManagement.packImport.messages.imported"));
      onImported?.();
      onClose();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.packImport.errors.importFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("tournament-pack-import-popup")) {
      onClose();
    }
  };

  const renderDiffList = (items, emptyKey) => {
    if (!items.length) {
      return <p className="tournament-pack-import-popup__diff-empty">{t(emptyKey)}</p>;
    }
    return (
      <ul className="tournament-pack-import-popup__diff-list">
        {items.map((item, index) => (
          <li key={item.id ?? item.label ?? index}>
            {item.label || item.displayName || item.packRef || JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="tournament-pack-import-popup" onClick={handleBackdropClick}>
      <div
        className="tournament-pack-import-popup__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-pack-import-popup-title"
      >
        <div className="tournament-pack-import-popup__header">
          <div>
            <h2 id="tournament-pack-import-popup-title" className="tournament-pack-import-popup__title">
              {t("tournamentManagement.packImport.title")}
            </h2>
            <p className="tournament-pack-import-popup__subtitle">
              {t("tournamentManagement.packImport.subtitle")}
            </p>
          </div>
          <CloseButton
            onClick={onClose}
            aria-label={t("buttons.close", { ns: "common" })}
          />
        </div>

        <div className="tournament-pack-import-popup__body">
          <div className="tournament-pack-import-popup__field">
            <PackRefSelect
              id="tournament-pack-import-ref"
              label={t("tournamentManagement.packImport.packRef")}
              value={packRef}
              onChange={setPackRef}
            />
          </div>

          <div className="tournament-pack-import-popup__actions">
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={runDiff}
              disabled={loading}
            >
              {t("tournamentManagement.packImport.previewDiff")}
            </button>
          </div>

          {diff ? (
            <div className="tournament-pack-import-popup__diff">
              <section className="tournament-pack-import-popup__diff-section">
                <h3 className="tournament-pack-import-popup__diff-title">
                  {t("tournamentManagement.packImport.adds")}
                </h3>
                {renderDiffList(diff.adds, "tournamentManagement.packImport.noAdds")}
              </section>
              <section className="tournament-pack-import-popup__diff-section">
                <h3 className="tournament-pack-import-popup__diff-title">
                  {t("tournamentManagement.packImport.removes")}
                </h3>
                {renderDiffList(diff.removes, "tournamentManagement.packImport.noRemoves")}
              </section>
              <section className="tournament-pack-import-popup__diff-section">
                <h3 className="tournament-pack-import-popup__diff-title">
                  {t("tournamentManagement.packImport.diverged")}
                </h3>
                {renderDiffList(diff.diverged, "tournamentManagement.packImport.noDiverged")}
              </section>
            </div>
          ) : null}
        </div>

        <div className="tournament-pack-import-popup__footer">
          <button
            type="button"
            className="btn-fill-primary"
            onClick={applyImport}
            disabled={loading || !packRef.trim()}
          >
            {t("tournamentManagement.packImport.apply")}
          </button>
          <button type="button" className="btn-fill-secondary" onClick={onClose}>
            {t("buttons.cancel", { ns: "common" })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentPackImportPopup;
