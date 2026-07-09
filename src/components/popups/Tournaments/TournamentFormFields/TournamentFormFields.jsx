import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/common/selectors";
import "../TournamentFormPopup/tournamentFormPopup.css";
import {
  buildStatusOptions,
  buildTrackOptions,
  findOption,
  TEXT_FIELD_KEYS,
} from "../tournamentFormUtils";

const TournamentFormFields = ({
  form,
  onChange,
  seriesOptions,
  tierTemplateOptions,
  trackDisabled = false,
  idPrefix = "tm",
  classPrefix = "tournament-form-fields",
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const trackOptions = useMemo(() => buildTrackOptions(t), [t]);
  const statusOptions = useMemo(() => buildStatusOptions(t), [t]);

  const updateField = (key, value) => onChange(key, value);

  return (
    <div className={`${classPrefix}__grid`}>
      {TEXT_FIELD_KEYS.map((key) => (
        <div className={`${classPrefix}__field`} key={key}>
          <label className={`${classPrefix}__label`} htmlFor={`${idPrefix}-${key}`}>
            {t(`tournamentManagement.form.fields.${key}`)}
          </label>
          <input
            id={`${idPrefix}-${key}`}
            className={`${classPrefix}__input`}
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
          />
        </div>
      ))}
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label={t("tournamentManagement.form.fields.track")}
          options={trackOptions}
          value={findOption(trackOptions, form.track)}
          onChange={(option) => updateField("track", option?.value ?? "player")}
          width="100%"
          isSearchable={false}
          isDisabled={trackDisabled}
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label={t("tournamentManagement.form.fields.status")}
          options={statusOptions}
          value={findOption(statusOptions, form.status)}
          onChange={(option) => updateField("status", option?.value ?? "draft")}
          width="100%"
          isSearchable={false}
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label={t("tournamentManagement.form.fields.series")}
          options={seriesOptions}
          value={findOption(seriesOptions, form.seriesId)}
          onChange={(option) => updateField("seriesId", option?.value ?? "")}
          width="100%"
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label={t("tournamentManagement.form.fields.tierTemplate")}
          options={tierTemplateOptions}
          value={findOption(tierTemplateOptions, form.tierTemplateId)}
          onChange={(option) => updateField("tierTemplateId", option?.value ?? "")}
          width="100%"
          isSearchable={false}
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <label className={`${classPrefix}__checkbox-label`}>
          <input
            type="checkbox"
            className={`${classPrefix}__checkbox`}
            checked={form.isHidden}
            onChange={(e) => updateField("isHidden", e.target.checked)}
          />
          <span>{t("tournamentManagement.form.fields.hidden")}</span>
        </label>
      </div>
      <div className={`${classPrefix}__field`}>
        <label className={`${classPrefix}__checkbox-label`}>
          <input
            type="checkbox"
            className={`${classPrefix}__checkbox`}
            checked={form.isResultsFinal}
            onChange={(e) => updateField("isResultsFinal", e.target.checked)}
          />
          <span>{t("tournamentManagement.form.fields.resultsFinal")}</span>
        </label>
      </div>
      <div className={`${classPrefix}__field ${classPrefix}__field--wide`}>
        <label className={`${classPrefix}__label`} htmlFor={`${idPrefix}-notes`}>
          {t("tournamentManagement.form.fields.notes")}
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          className={`${classPrefix}__input ${classPrefix}__textarea`}
          rows={3}
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>
    </div>
  );
};

export default TournamentFormFields;
