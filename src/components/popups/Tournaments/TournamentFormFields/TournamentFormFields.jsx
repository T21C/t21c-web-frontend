import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect, PackRefSelect, ProfileSelector } from "@/components/common/selectors";
import "../TournamentFormPopup/tournamentFormPopup.css";
import {
  buildStatusOptions,
  buildPlacementModeOptions,
  buildTrackOptions,
  findOption,
  TEXT_FIELD_KEYS,
} from "../tournamentFormUtils";

const TournamentFormFields = ({
  form,
  onChange,
  seriesOptions,
  idPrefix = "tm",
  classPrefix = "tournament-form-fields",
  readOnlyFields = [],
  hiddenFields = [],
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const statusOptions = useMemo(() => buildStatusOptions(t), [t]);
  const placementModeOptions = useMemo(() => buildPlacementModeOptions(t), [t]);
  const trackOptions = useMemo(() => buildTrackOptions(t), [t]);

  const updateField = (key, value) => onChange(key, value);
  const isReadOnly = (key) => readOnlyFields.includes(key);
  const isHidden = (key) => hiddenFields.includes(key);

  const addOwner = (user) => {
    if (!user?.id) return;
    const existing = Array.isArray(form.ownerUsers) ? form.ownerUsers : [];
    if (existing.some((u) => String(u.id) === String(user.id))) return;
    updateField("ownerUsers", [...existing, user]);
  };

  const removeOwner = (userId) => {
    const existing = Array.isArray(form.ownerUsers) ? form.ownerUsers : [];
    updateField(
      "ownerUsers",
      existing.filter((u) => String(u.id) !== String(userId)),
    );
  };

  return (
    <div className={`${classPrefix}__grid`}>
      {TEXT_FIELD_KEYS.map((key) => {
        if (isHidden(key)) return null;
        return (
        <div className={`${classPrefix}__field`} key={key}>
          <label className={`${classPrefix}__label`} htmlFor={`${idPrefix}-${key}`}>
            {t(`tournamentManagement.form.fields.${key}`)}
          </label>
          <input
            id={`${idPrefix}-${key}`}
            className={`${classPrefix}__input`}
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
            readOnly={isReadOnly(key)}
          />
        </div>
        );
      })}
      {!isHidden("owners") ? (
        <div className={`${classPrefix}__field ${classPrefix}__field--wide`}>
          <label className={`${classPrefix}__label`}>
            {t("tournamentManagement.form.fields.owners")}
          </label>
          <p className={`${classPrefix}__hint`}>
            {t("tournamentManagement.form.fields.ownersHint")}
          </p>
          <ProfileSelector
            type="user"
            userSearchIncludeSelf
            portalDropdown
            value={null}
            onChange={addOwner}
            placeholder={t("tournamentManagement.form.fields.ownersPlaceholder")}
          />
          {Array.isArray(form.ownerUsers) && form.ownerUsers.length ? (
            <ul className={`${classPrefix}__owner-list`}>
              {form.ownerUsers.map((owner) => (
                <li key={owner.id} className={`${classPrefix}__owner-item`}>
                  <span>{owner.name || owner.username || owner.id}</span>
                  <button
                    type="button"
                    className="btn-fill-secondary"
                    onClick={() => removeOwner(owner.id)}
                  >
                    {t("tournamentManagement.form.fields.ownersRemove")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {!isHidden("packRef") ? (
      <div className={`${classPrefix}__field`}>
        {isReadOnly("packRef") ? (
          <>
            <label className={`${classPrefix}__label`} htmlFor={`${idPrefix}-packRef`}>
              {t("tournamentManagement.form.fields.packRef")}
            </label>
            <input
              id={`${idPrefix}-packRef`}
              className={`${classPrefix}__input`}
              value={form.packRef}
              readOnly
            />
          </>
        ) : (
        <PackRefSelect
          id={`${idPrefix}-packRef`}
          label={t("tournamentManagement.form.fields.packRef")}
          value={form.packRef}
          onChange={(linkCode) => updateField("packRef", linkCode)}
        />
        )}
      </div>
      ) : null}
      {!isHidden("status") ? (
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
      ) : null}
      {!isHidden("track") ? (
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label={t("tournamentManagement.form.fields.track")}
          options={trackOptions}
          value={findOption(trackOptions, form.track)}
          onChange={(option) => updateField("track", option?.value ?? "player")}
          width="100%"
          isSearchable={false}
        />
      </div>
      ) : null}
      {!isHidden("placementMode") ? (
      <div className={`${classPrefix}__field`}>
        <CustomSelect
          label={t("tournamentManagement.form.fields.placementMode")}
          options={placementModeOptions}
          value={findOption(placementModeOptions, form.placementMode)}
          onChange={(option) => updateField("placementMode", option?.value ?? "profile")}
          width="100%"
          isSearchable={false}
        />
      </div>
      ) : null}
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
      <div className={`${classPrefix}__field`}>
        <label className={`${classPrefix}__checkbox-label`}>
          <input
            type="checkbox"
            className={`${classPrefix}__checkbox`}
            checked={form.showBestTiersOnly !== false}
            onChange={(e) => updateField("showBestTiersOnly", e.target.checked)}
          />
          <span>{t("tournamentManagement.form.fields.showBestTiersOnly")}</span>
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
