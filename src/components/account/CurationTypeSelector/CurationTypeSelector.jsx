import "./curationTypeSelector.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/utils/api";
import {
  sortCurationTypesForDisplay,
  resolveCurationTypeFromDict,
} from "@/utils/curationTypeUtils";

const MAX_SELECTED = 5;

/**
 * Basic scaffold: pick up to 5 curation types (from levels credited to this creator) for the profile header.
 */
const CurationTypeSelector = ({
  creatorId,
  curationTypeCounts = {},
  displayCurationTypeIds = [],
  curationTypesDict = {},
  canEdit = false,
  onSaved,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draftIds, setDraftIds] = useState(() =>
    [...(displayCurationTypeIds || [])].filter((x) => Number.isFinite(Number(x))).map(Number).slice(0, MAX_SELECTED),
  );

  useEffect(() => {
    setDraftIds(
      [...(displayCurationTypeIds || [])].filter((x) => Number.isFinite(Number(x))).map(Number).slice(0, MAX_SELECTED),
    );
  }, [displayCurationTypeIds]);

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
    setOpen(false);
  }, [displayCurationTypeIds]);

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
      setOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Save failed";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  }, [creatorId, draftIds, onSaved]);

  if (!canEdit) return null;

  return (
    <div className="curation-type-selector">
      <div className="curation-type-selector__toolbar">
        <button type="button" className="curation-type-selector__toggle" onClick={open ? handleCancel : handleOpen}>
          {open ? "Close" : "Customize header badges"}
        </button>
        {open ? (
          <span className="curation-type-selector__hint">
            Select up to {MAX_SELECTED} ({draftIds.length}/{MAX_SELECTED})
          </span>
        ) : null}
      </div>

      {open ? (
        <div className="curation-type-selector__panel">
          {error ? <p className="curation-type-selector__error">{error}</p> : null}
          {availableTypes.length === 0 ? (
            <p className="curation-type-selector__empty">No curation types on your credited levels yet.</p>
          ) : (
            <div className="curation-type-selector__grid">
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
                      "curation-type-selector__tile",
                      selected ? "curation-type-selector__tile--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => toggleId(id)}
                    title={name}
                  >
                    {t.icon ? (
                      <img className="curation-type-selector__tile-icon" src={t.icon} alt="" decoding="async" />
                    ) : (
                      <span className="curation-type-selector__tile-fallback">{name.slice(0, 2)}</span>
                    )}
                    <span className="curation-type-selector__tile-name">{name}</span>
                    <span className="curation-type-selector__tile-count">{cnt}</span>
                    {selected ? <span className="curation-type-selector__tile-check" aria-hidden>✓</span> : null}
                  </button>
                );
              })}
            </div>
          )}
          <div className="curation-type-selector__actions">
            <button type="button" className="curation-type-selector__btn" onClick={handleCancel} disabled={saving}>
              Cancel
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
