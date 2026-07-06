import { CustomSelect } from "@/components/common/selectors";
import "../TournamentFormPopup/tournamentFormPopup.css";
import {
  findOption,
  STATUS_OPTIONS,
  TEXT_FIELDS,
  TRACK_OPTIONS,
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
  const updateField = (key, value) => onChange(key, value);

  return (
    <div className={`${classPrefix}__grid`}>
      {TEXT_FIELDS.map(([key, label]) => (
        <div className={`${classPrefix}__field`} key={key}>
          <label className={`${classPrefix}__label`} htmlFor={`${idPrefix}-${key}`}>
            {label}
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
          label="Track"
          options={TRACK_OPTIONS}
          value={findOption(TRACK_OPTIONS, form.track)}
          onChange={(option) => updateField("track", option?.value ?? "player")}
          width="100%"
          isSearchable={false}
          isDisabled={trackDisabled}
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label="Status"
          options={STATUS_OPTIONS}
          value={findOption(STATUS_OPTIONS, form.status)}
          onChange={(option) => updateField("status", option?.value ?? "draft")}
          width="100%"
          isSearchable={false}
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label="Series"
          options={seriesOptions}
          value={findOption(seriesOptions, form.seriesId)}
          onChange={(option) => updateField("seriesId", option?.value ?? "")}
          width="100%"
        />
      </div>
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label="Tier template"
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
          <span>Hidden</span>
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
          <span>Results final</span>
        </label>
      </div>
      <div className={`${classPrefix}__field ${classPrefix}__field--wide`}>
        <label className={`${classPrefix}__label`} htmlFor={`${idPrefix}-notes`}>
          Notes
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
