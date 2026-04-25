import "./curationTypeSelector.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import api from "@/utils/api";
import {
  getCreatorCurationTypesForHeaderPanel,
  groupCurationTypesForPanel,
} from "@/utils/curationTypeUtils";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";

const MAX_SELECTED = 5;

function normalizeDraftIds(rawIds, selectableSet) {
  if (!Array.isArray(rawIds)) return [];
  const out = [];
  for (const x of rawIds) {
    const id = Number(x);
    if (!Number.isFinite(id)) continue;
    if (selectableSet && !selectableSet.has(id)) continue;
    out.push(id);
    if (out.length >= MAX_SELECTED) break;
  }
  return out;
}

/**
 * Pick up to 5 curation types for the creator profile header.
 * @param {boolean} [embedded=false] — no toggle; always expanded (e.g. admin popup).
 * @param {string} [embeddedSectionLabel] — optional heading when embedded.
 */
const CurationTypeSelector = ({
  creatorId,
  curationTypeCounts = {},
  displayCurationTypeIds = [],
  curationTypesDict = {},
  canEdit = false,
  onSaved,
  onDraftChange,
  embedded = false,
  embeddedSectionLabel = "",
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const [open, setOpen] = useState(embedded);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draftIds, setDraftIds] = useState(() =>
    normalizeDraftIds(displayCurationTypeIds, null),
  );

  useEffect(() => {
    if (embedded) setOpen(true);
  }, [embedded]);

  useEffect(() => {
    setDraftIds(
      normalizeDraftIds(displayCurationTypeIds, null),
    );
  }, [displayCurationTypeIds]);

  useEffect(() => {
    onDraftChange?.(draftIds);
  }, [draftIds, onDraftChange]);

  const availableTypes = useMemo(
    () => getCreatorCurationTypesForHeaderPanel(curationTypeCounts, curationTypesDict),
    [curationTypeCounts, curationTypesDict],
  );

  const selectableIdSet = useMemo(() => {
    const s = new Set();
    for (const ct of availableTypes || []) {
      if (ct?.id != null) s.add(Number(ct.id));
    }
    return s;
  }, [availableTypes]);

  useEffect(() => {
    setDraftIds((prev) => {
      const next = normalizeDraftIds(prev, selectableIdSet);
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [selectableIdSet]);

  const orderedGroups = useMemo(
    () => groupCurationTypesForPanel(availableTypes, t("settings.creator.curationBadges.fallbackGroup")),
    [availableTypes, t],
  );

  const previewSlots = useMemo(
    () =>
      buildCreatorIconSlots(curationTypeCounts, curationTypesDict, draftIds),
    [curationTypeCounts, curationTypesDict, draftIds],
  );

  const toggleId = useCallback((typeId) => {
    setError(null);
    setDraftIds((prev) => {
      const idx = prev.indexOf(typeId);
      if (idx >= 0) {
        return prev.filter((id) => id !== typeId);
      }
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, typeId];
    });
  }, []);

  const handleOpen = useCallback(() => {
    setError(null);
    setDraftIds(
      normalizeDraftIds(displayCurationTypeIds, selectableIdSet),
    );
    setOpen(true);
  }, [displayCurationTypeIds, selectableIdSet]);

  const handleCancel = useCallback(() => {
    setError(null);
    setDraftIds(
      normalizeDraftIds(displayCurationTypeIds, selectableIdSet),
    );
    if (!embedded) setOpen(false);
  }, [displayCurationTypeIds, embedded, selectableIdSet]);

  const handleSave = useCallback(async () => {
    if (!creatorId) return;
    setSaving(true);
    setError(null);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const url = `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/display-curation-types`;
      const res = await api.patch(url, { ids: draftIds });
      const next = Array.isArray(res.data?.displayCurationTypeIds)
        ? res.data.displayCurationTypeIds
        : draftIds;
      onSaved?.(next);
      if (!embedded) setOpen(false);
      toast.success(t("settings.creator.curationBadges.saveSuccess"), { id: toastId });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || t("settings.creator.curationBadges.saveError");
      setError(String(msg));
      toast.error(String(msg), { id: toastId });
    } finally {
      setSaving(false);
    }
  }, [creatorId, draftIds, onSaved, embedded, t]);

  if (!canEdit) return null;

  const showPanel = embedded || open;

  return (
    <div
      className={[
        "curation-type-selector",
        embedded ? "curation-type-selector--embedded" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!embedded ? (
        <div className="curation-type-selector__toolbar">
          {!open && (
            <button
              type="button"
              className="curation-type-selector__toggle"
              onClick={open ? handleCancel : handleOpen}
            >
              {t("settings.creator.curationBadges.toggle")}
            </button>
          )}
          {open ? (
            <span className="curation-type-selector__hint">
              {t("settings.creator.curationBadges.hint", {
                max: MAX_SELECTED,
                selected: draftIds.length,
              })}
            </span>
          ) : null}
        </div>
      ) : embeddedSectionLabel ? (
        <p className="curation-type-selector__embedded-label">{embeddedSectionLabel}</p>
      ) : null}

      {embedded ? (
        <div
          className="curation-type-selector__preview"
          role="img"
          aria-label={t("settings.creator.curationBadges.previewAria")}
        >
          {previewSlots.length === 0 ? (
            <span className="curation-type-selector__preview-empty">—</span>
          ) : (
            previewSlots.map((slot) => (
              <div
                key={slot.key}
                className="curation-type-selector__preview-slot"
                title={slot.tooltip ?? slot.title}
              >
                {slot.iconUrl ? (
                  <img className="curation-type-selector__preview-img" src={slot.iconUrl} alt="" decoding="async" />
                ) : (
                  <span className="curation-type-selector__preview-letter">{slot.letter}</span>
                )}
                <span className="curation-type-selector__preview-badge">{slot.badge ?? slot.count ?? 0}</span>
              </div>
            ))
          )}
        </div>
      ) : null}

      {showPanel ? (
        <div className="curation-type-selector__panel">
          {error ? <p className="curation-type-selector__error">{error}</p> : null}
          {availableTypes.length === 0 ? (
            <p className="curation-type-selector__empty">{t("settings.creator.curationBadges.empty")}</p>
          ) : (
            <div className="curation-type-selector__groups">
              {orderedGroups.map(([group, data]) => (
                <div key={group} className="curation-type-selector__group">
                  <h4 className="curation-type-selector__group-title">{group}</h4>
                  <div className="curation-type-selector__chips">
                    {data.items.map((ct) => {
                      const id = ct.id;
                      const selected = draftIds.includes(id);
                      const cnt = Number(ct.count) || 0;
                      const name = ct.name ?? `#${id}`;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={[
                            "curation-type-selector__chip",
                            selected ? "curation-type-selector__chip--selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => toggleId(id)}
                          title={name}
                          aria-pressed={selected}
                        >
                          {ct.icon ? (
                            <img
                              className="curation-type-selector__chip-icon"
                              src={ct.icon}
                              alt=""
                              decoding="async"
                            />
                          ) : (
                            <span className="curation-type-selector__chip-fallback">{name.slice(0, 2)}</span>
                          )}
                          <span className="curation-type-selector__chip-count">{cnt}</span>
                          {selected ? (
                            <span className="curation-type-selector__chip-check" aria-hidden>
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="curation-type-selector__actions">
            <button type="button" className="curation-type-selector__btn" onClick={handleCancel} disabled={saving}>
              {embedded ? t("buttons.reset", { ns: "common" }) : t("buttons.cancel", { ns: "common" })}
            </button>
            <button
              type="button"
              className="curation-type-selector__btn curation-type-selector__btn--primary"
              onClick={handleSave}
              disabled={saving || !creatorId}
            >
              {saving ? t("buttons.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CurationTypeSelector;
