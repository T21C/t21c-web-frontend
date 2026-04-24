import "./curationTypeSelector.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/utils/api";
import {
  sortCurationTypesForDisplay,
  resolveCurationTypeFromDict,
} from "@/utils/curationTypeUtils";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";

const MAX_SELECTED = 5;

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
  const [open, setOpen] = useState(embedded);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draftIds, setDraftIds] = useState(() =>
    [...(displayCurationTypeIds || [])].filter((x) => Number.isFinite(Number(x))).map(Number).slice(0, MAX_SELECTED),
  );

  useEffect(() => {
    if (embedded) setOpen(true);
  }, [embedded]);

  useEffect(() => {
    setDraftIds(
      [...(displayCurationTypeIds || [])].filter((x) => Number.isFinite(Number(x))).map(Number).slice(0, MAX_SELECTED),
    );
  }, [displayCurationTypeIds]);

  useEffect(() => {
    onDraftChange?.(draftIds);
  }, [draftIds, onDraftChange]);

  const availableTypes = useMemo(() => {
    const entries = Object.entries(curationTypeCounts || {}).filter(
      ([, cnt]) => Number(cnt) > 0,
    );
    const refs = entries.map(([typeId]) => {
      const id = Number(typeId);
      return resolveCurationTypeFromDict({ id }, curationTypesDict) || { id, name: `#${id}` };
    });
    return sortCurationTypesForDisplay(refs, curationTypesDict);
  }, [curationTypeCounts, curationTypesDict]);

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
      [...(displayCurationTypeIds || [])].filter((x) => Number.isFinite(Number(x))).map(Number).slice(0, MAX_SELECTED),
    );
    setOpen(true);
  }, [displayCurationTypeIds]);

  const handleCancel = useCallback(() => {
    setError(null);
    setDraftIds(
      [...(displayCurationTypeIds || [])].filter((x) => Number.isFinite(Number(x))).map(Number).slice(0, MAX_SELECTED),
    );
    if (!embedded) setOpen(false);
  }, [displayCurationTypeIds, embedded]);

  const handleSave = useCallback(async () => {
    if (!creatorId) return;
    setSaving(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/display-curation-types`;
      const res = await api.patch(url, { ids: draftIds });
      const next = Array.isArray(res.data?.displayCurationTypeIds)
        ? res.data.displayCurationTypeIds
        : draftIds;
      onSaved?.(next);
      if (!embedded) setOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Save failed";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  }, [creatorId, draftIds, onSaved, embedded]);

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
          <button type="button" className="curation-type-selector__toggle" onClick={open ? handleCancel : handleOpen}>
            {open ? "Close" : "Customize header badges"}
          </button>
          {open ? (
            <span className="curation-type-selector__hint">
              Up to {MAX_SELECTED} ({draftIds.length}/{MAX_SELECTED})
            </span>
          ) : null}
        </div>
      ) : embeddedSectionLabel ? (
        <p className="curation-type-selector__embedded-label">{embeddedSectionLabel}</p>
      ) : null}

      {embedded ? (
        <div className="curation-type-selector__preview" role="img" aria-label="Header badge preview">
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
            <p className="curation-type-selector__empty">No curation types on credited levels yet.</p>
          ) : (
            <div className="curation-type-selector__chips">
              {availableTypes.map((t) => {
                const id = t.id;
                const selected = draftIds.includes(id);
                const cnt =
                  Number(curationTypeCounts[String(id)] ?? curationTypeCounts[id] ?? 0) || 0;
                const name = t.name ?? `#${id}`;
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
                    {t.icon ? (
                      <img className="curation-type-selector__chip-icon" src={t.icon} alt="" decoding="async" />
                    ) : (
                      <span className="curation-type-selector__chip-fallback">{name.slice(0, 2)}</span>
                    )}
                    <span className="curation-type-selector__chip-count">{cnt}</span>
                    {selected ? <span className="curation-type-selector__chip-check" aria-hidden>✓</span> : null}
                  </button>
                );
              })}
            </div>
          )}
          <div className="curation-type-selector__actions">
            <button type="button" className="curation-type-selector__btn" onClick={handleCancel} disabled={saving}>
              {embedded ? "Reset" : "Cancel"}
            </button>
            <button
              type="button"
              className="curation-type-selector__btn curation-type-selector__btn--primary"
              onClick={handleSave}
              disabled={saving || !creatorId}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CurationTypeSelector;
