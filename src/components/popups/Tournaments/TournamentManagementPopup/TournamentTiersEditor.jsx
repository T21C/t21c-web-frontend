import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CDN_IMAGE_ACCEPT } from "@/config/constants/cdnImageAccept";
import { CustomSelect } from "@/components/common/selectors";
import VisualAssetSlot from "./VisualAssetSlot";
import { serializeTierRows } from "./popupDirtyUtils";

import { buildTierKindOptions, findOption } from "../tournamentFormUtils";

const emptyTierRow = () => ({
  key: `new-${Date.now()}-${Math.random()}`,
  id: null,
  code: "",
  label: "",
  kind: "custom",
  rankWeight: "100",
  color: "",
  sortOrder: "0",
  iconUrl: null,
  cardBackgroundUrl: null,
});

const mapTierToRow = (tier) => ({
  key: `tier-${tier.id}`,
  id: tier.id,
  code: tier.code || "",
  label: tier.label || "",
  kind: tier.kind || "custom",
  rankWeight: String(tier.rankWeight ?? 100),
  color: tier.color || "",
  sortOrder: String(tier.sortOrder ?? 0),
  iconUrl: tier.iconUrl ?? null,
  cardBackgroundUrl: tier.cardBackgroundUrl ?? null,
});

const TournamentTiersEditor = ({
  tournamentId,
  detail,
  tierTemplates = [],
  onRefresh,
  onDirtyChange,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const kindOptions = useMemo(() => buildTierKindOptions(t), [t]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [showPresetSection, setShowPresetSection] = useState(false);
  const baselineRef = useRef("");

  const presetOptions = useMemo(
    () =>
      tierTemplates.map((template) => ({
        value: template.id,
        label: template.name,
      })),
    [tierTemplates],
  );

  useEffect(() => {
    const tiers = detail?.tiers || [];
    const nextRows = tiers.length ? tiers.map(mapTierToRow) : [];
    setRows(nextRows);
    baselineRef.current = serializeTierRows(nextRows);
    setShowPresetSection(false);
    setSelectedPresetId("");
  }, [detail?.tiers, tournamentId]);

  const isDirty = useMemo(
    () => serializeTierRows(rows) !== baselineRef.current,
    [rows],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyTierRow()]);
  };

  const removeRow = (key) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const applyPreset = () => {
    const template = tierTemplates.find((entry) => entry.id === selectedPresetId);
    if (!template?.tiers?.length) return;

    const existingCodes = new Set(
      rows.map((row) => row.code.trim().toUpperCase()).filter(Boolean),
    );
    const additions = template.tiers
      .filter((tier) => !existingCodes.has(tier.code.toUpperCase()))
      .map((tier) => ({
        key: `preset-${tier.code}-${Date.now()}-${Math.random()}`,
        id: null,
        code: tier.code,
        label: tier.label,
        kind: tier.kind || "custom",
        rankWeight: String(tier.rankWeight ?? 100),
        color: "",
        sortOrder: String(tier.sortOrder ?? 0),
        iconUrl: null,
        cardBackgroundUrl: null,
      }));

    if (!additions.length) {
      toast.error(t("tournamentManagement.tiers.preset.allExist"));
      return;
    }

    setRows((prev) => {
      const substantive = prev.filter((row) => row.code.trim() || row.label.trim());
      return substantive.length ? [...substantive, ...additions] : additions;
    });
    toast.success(
      t("tournamentManagement.tiers.preset.applied", { count: additions.length }),
    );
  };

  const postAsset = useCallback(async (url, file) => {
    const body = new FormData();
    body.append("asset", file);
    await api.post(url, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }, []);

  const uploadTierAsset = async (tierId, kind, file) => {
    if (!file || !tournamentId || !tierId) return;
    try {
      const url =
        kind === "icon"
          ? routes.admin.tournaments.tierIcon(tournamentId, tierId)
          : routes.admin.tournaments.tierCardBackground(tournamentId, tierId);
      await postAsset(url, file);
      toast.success(t("tournamentManagement.visuals.messages.uploadSuccess"));
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.visuals.errors.uploadFailed"));
    }
  };

  const saveTiers = async () => {
    if (!tournamentId || !isDirty) return;
    setSaving(true);
    try {
      const tiers = rows
        .filter((r) => r.code.trim())
        .map((r, index) => ({
          id: r.id ?? undefined,
          code: r.code.trim().toUpperCase(),
          label: r.label.trim() || r.code.trim().toUpperCase(),
          kind: r.kind,
          rankWeight: Number(r.rankWeight) || 100,
          color: r.color.trim() || null,
          sortOrder: Number(r.sortOrder) || index,
          iconUrl: r.iconUrl,
          cardBackgroundUrl: r.cardBackgroundUrl,
        }));
      await api.put(routes.admin.tournaments.tiers(tournamentId), { tiers });
      toast.success(t("tournamentManagement.tiers.messages.saved"));
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.tiers.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tournament-management-popup__tiers-editor">
      <div className="tournament-management-popup__actions tournament-management-popup__actions--tiers">
        <div className="tournament-management-popup__actions-group">
          <button type="button" className="btn-fill-secondary" onClick={addRow} disabled={saving}>
            {t("tournamentManagement.tiers.addTier")}
          </button>
          <button
            type="button"
            className="btn-fill-primary"
            onClick={saveTiers}
            disabled={saving || !isDirty}
          >
            {t("tournamentManagement.tiers.save")}
          </button>
        </div>
        <button
          type="button"
          className="btn-fill-secondary tournament-management-popup__preset-toggle"
          onClick={() => setShowPresetSection((visible) => !visible)}
          disabled={!presetOptions.length || saving}
        >
          {showPresetSection
            ? t("tournamentManagement.tiers.preset.hide")
            : t("tournamentManagement.tiers.preset.show")}
        </button>
      </div>

      {showPresetSection ? (
        <section className="tournament-management-popup__tier-preset">
          <h3>{t("tournamentManagement.tiers.preset.label")}</h3>
          <p className="tournament-management-popup__tier-preset-hint">
            {t("tournamentManagement.tiers.preset.hint")}
          </p>
          <div className="tournament-management-popup__tier-preset-row">
            <CustomSelect
              options={presetOptions}
              value={findOption(presetOptions, selectedPresetId)}
              onChange={(option) => setSelectedPresetId(option?.value ?? "")}
              placeholder={t("tournamentManagement.tiers.preset.placeholder")}
              width="100%"
              isSearchable={false}
              isDisabled={!presetOptions.length || saving}
            />
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={applyPreset}
              disabled={!selectedPresetId || saving}
            >
              {t("tournamentManagement.tiers.preset.apply")}
            </button>
          </div>
        </section>
      ) : null}

      <div className="tournament-management-popup__tiers-table-wrap">
        {rows.length === 0 ? (
          <p className="tournament-management-popup__empty-state">
            {t("tournamentManagement.tiers.empty")}
          </p>
        ) : (
        <table className="tournament-management-popup__tiers-table">
          <thead>
            <tr>
              <th>{t("tournamentManagement.tiers.code")}</th>
              <th>{t("tournamentManagement.tiers.label")}</th>
              <th>{t("tournamentManagement.tiers.kind")}</th>
              <th>{t("tournamentManagement.tiers.rankWeight")}</th>
              <th>{t("tournamentManagement.tiers.color")}</th>
              <th>{t("tournamentManagement.visuals.tierIcon")}</th>
              <th>{t("tournamentManagement.visuals.tierCardBg")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <input
                    value={row.code}
                    onChange={(e) =>
                      updateRow(row.key, { code: e.target.value.toUpperCase() })
                    }
                  />
                </td>
                <td>
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(row.key, { label: e.target.value })}
                  />
                </td>
                <td>
                  <CustomSelect
                    options={kindOptions}
                    value={kindOptions.find((o) => o.value === row.kind) ?? kindOptions[5]}
                    onChange={(opt) => updateRow(row.key, { kind: opt?.value ?? "custom" })}
                    width="100%"
                    isSearchable={false}
                  />
                </td>
                <td>
                  <input
                    value={row.rankWeight}
                    onChange={(e) => updateRow(row.key, { rankWeight: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={row.color}
                    onChange={(e) => updateRow(row.key, { color: e.target.value })}
                    placeholder="#hex"
                  />
                </td>
                <td>
                  <div className="tournament-management-popup__tier-visual-cell">
                    <VisualAssetSlot
                      url={row.iconUrl}
                      variant="icon"
                      accept={CDN_IMAGE_ACCEPT}
                      disabled={!row.id}
                      onUpload={(file) => uploadTierAsset(row.id, "icon", file)}
                    />
                    {!row.id ? (
                      <span className="tournament-management-popup__hint">
                        {t("tournamentManagement.tiers.saveFirst")}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <div className="tournament-management-popup__tier-visual-cell">
                    <VisualAssetSlot
                      url={row.cardBackgroundUrl}
                      variant="card"
                      accept={CDN_IMAGE_ACCEPT}
                      disabled={!row.id}
                      onUpload={(file) => uploadTierAsset(row.id, "card", file)}
                    />
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-fill-danger"
                    onClick={() => removeRow(row.key)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default TournamentTiersEditor;
