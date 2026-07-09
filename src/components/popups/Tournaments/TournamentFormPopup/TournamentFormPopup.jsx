import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CloseButton } from "@/components/common/buttons";
import TournamentFormFields from "../TournamentFormFields/TournamentFormFields";
import { emptyTournamentForm } from "../tournamentFormUtils";
import "./tournamentFormPopup.css";

const TournamentFormPopup = ({
  onClose,
  onSubmit,
  seriesOptions,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const [form, setForm] = useState(emptyTournamentForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(emptyTournamentForm());
    setSaving(false);
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("tournament-form-popup")) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shortName.trim()) {
      toast.error(t("tournamentManagement.form.errors.shortNameRequired"));
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      toast.error(err?.response?.data?.error || t("tournamentManagement.form.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tournament-form-popup" onClick={handleBackdropClick}>
      <div
        className="tournament-form-popup__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-form-popup-title"
      >
        <div className="tournament-form-popup__header">
          <h2 id="tournament-form-popup-title" className="tournament-form-popup__title">
            {t("tournamentManagement.newTournament")}
          </h2>
          <CloseButton
            onClick={onClose}
            aria-label={t("buttons.close", { ns: "common" })}
            disabled={saving}
          />
        </div>

        <form className="tournament-form-popup__form" onSubmit={handleSubmit}>
          <div className="tournament-form-popup__body">
            <TournamentFormFields
              form={form}
              onChange={updateField}
              seriesOptions={seriesOptions}
              idPrefix="tm-create"
              classPrefix="tournament-form-fields"
            />
          </div>

          <div className="tournament-form-popup__footer">
            <button
              type="button"
              className="tournament-form-popup__cancel-btn btn-fill-neutral-dark"
              onClick={onClose}
              disabled={saving}
            >
              {t("buttons.cancel", { ns: "common" })}
            </button>
            <button
              type="submit"
              className="tournament-form-popup__submit-btn btn-fill-primary"
              disabled={saving || !form.shortName.trim()}
            >
              {saving
                ? t("loading.saving", { ns: "common", defaultValue: "Saving…" })
                : t("tournamentManagement.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentFormPopup;
