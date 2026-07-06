import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { CDN_IMAGE_ACCEPT } from "@/config/constants/cdnImageAccept";
import { CustomSelect } from "@/components/common/selectors";
import VisualAssetSlot from "./VisualAssetSlot";
import { serializeTierRows } from "./popupDirtyUtils";

const KIND_OPTIONS = [
  { value: "ordinal", label: "Ordinal" },
  { value: "bracket", label: "Bracket" },
  { value: "round", label: "Round" },
  { value: "stage", label: "Stage" },
  { value: "qualifier", label: "Qualifier" },
  { value: "custom", label: "Custom" },
];

const emptyTierRow = () => ({
  key: `new-${Date.now()}-${Math.random()}`,
  id: null,
  code: "",
  label: "",
  kind: "custom",
  rankWeight: "100",
  isPodium: false,
  isShowcaseEligible: true,
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
  isPodium: Boolean(tier.isPodium),
  isShowcaseEligible: tier.isShowcaseEligible !== false,
  color: tier.color || "",
  sortOrder: String(tier.sortOrder ?? 0),
  iconUrl: tier.iconUrl ?? null,
  cardBackgroundUrl: tier.cardBackgroundUrl ?? null,
});

const TournamentTiersEditor = ({ tournamentId, detail, onRefresh, onDirtyChange }) => {
  const { t } = useTranslation("pages");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const baselineRef = useRef("");

  useEffect(() => {
    const tiers = detail?.tiers || [];
    const nextRows = tiers.length ? tiers.map(mapTierToRow) : [emptyTierRow()];
    setRows(nextRows);
    baselineRef.current = serializeTierRows(nextRows);
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
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const postAsset = useCallback(async (url, file) => {
    const body = new FormData();
    body.append("asset", file);
    await api.post(url, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }, []);

  const uploadTournamentAsset = async (kind, file) => {
    if (!file || !tournamentId) return;
    try {
      const url =
        kind === "icon"
          ? routes.admin.tournaments.icon(tournamentId)
          : routes.admin.tournaments.cardBackground(tournamentId);
      await postAsset(url, file);
      toast.success(t("tournamentManagement.visuals.uploadSuccess"));
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.visuals.uploadFailed"));
    }
  };

  const removeTournamentAsset = async (kind) => {
    if (!tournamentId) return;
    try {
      const url =
        kind === "icon"
          ? routes.admin.tournaments.icon(tournamentId)
          : routes.admin.tournaments.cardBackground(tournamentId);
      await api.delete(url);
      toast.success(t("tournamentManagement.visuals.removed"));
      await onRefresh?.();
    } catch {
      toast.error(t("tournamentManagement.visuals.removeFailed"));
    }
  };

  const uploadTierAsset = async (tierId, kind, file) => {
    if (!file || !tournamentId || !tierId) return;
    try {
      const url =
        kind === "icon"
          ? routes.admin.tournaments.tierIcon(tournamentId, tierId)
          : routes.admin.tournaments.tierCardBackground(tournamentId, tierId);
      await postAsset(url, file);
      toast.success(t("tournamentManagement.visuals.uploadSuccess"));
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.visuals.uploadFailed"));
    }
  };

  const saveTiers = async () => {
    if (!tournamentId) return;
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
          isPodium: r.isPodium,
          isShowcaseEligible: r.isShowcaseEligible,
          color: r.color.trim() || null,
          sortOrder: Number(r.sortOrder) || index,
          iconUrl: r.iconUrl,
          cardBackgroundUrl: r.cardBackgroundUrl,
        }));
      await api.put(routes.admin.tournaments.tiers(tournamentId), { tiers });
      toast.success(t("tournamentManagement.tiers.saved"));
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.tiers.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tournament-management-popup__tiers-editor">
      <section className="tournament-management-popup__visuals-section">
        <h3>{t("tournamentManagement.visuals.tournamentTitle")}</h3>
        <div className="tournament-management-popup__visuals-row">
          <div className="tournament-management-popup__visual-slot">
            <span className="tournament-management-popup__visual-label">
              {t("tournamentManagement.visuals.eventIcon")}
            </span>
            <VisualAssetSlot
              url={detail?.iconUrl}
              variant="icon"
              accept={CDN_IMAGE_ACCEPT}
              onUpload={(file) => uploadTournamentAsset("icon", file)}
              onRemove={() => removeTournamentAsset("icon")}
            />
          </div>
          <div className="tournament-management-popup__visual-slot">
            <span className="tournament-management-popup__visual-label">
              {t("tournamentManagement.visuals.defaultCardBg")}
            </span>
            <VisualAssetSlot
              url={detail?.cardBackgroundUrl}
              variant="card"
              accept={CDN_IMAGE_ACCEPT}
              onUpload={(file) => uploadTournamentAsset("card", file)}
              onRemove={() => removeTournamentAsset("card")}
            />
          </div>
        </div>
      </section>

      <div className="tournament-management-popup__actions">
        <button type="button" className="btn-fill-secondary" onClick={addRow} disabled={saving}>
          {t("tournamentManagement.tiers.addTier")}
        </button>
        <button type="button" className="btn-fill-primary" onClick={saveTiers} disabled={saving}>
          {t("tournamentManagement.tiers.save")}
        </button>
      </div>

      <div className="tournament-management-popup__tiers-table-wrap">
        <table className="tournament-management-popup__tiers-table">
          <thead>
            <tr>
              <th>{t("tournamentManagement.tiers.code")}</th>
              <th>{t("tournamentManagement.tiers.label")}</th>
              <th>{t("tournamentManagement.tiers.kind")}</th>
              <th>{t("tournamentManagement.tiers.rankWeight")}</th>
              <th>{t("tournamentManagement.tiers.color")}</th>
              <th>{t("tournamentManagement.tiers.podium")}</th>
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
                    options={KIND_OPTIONS}
                    value={KIND_OPTIONS.find((o) => o.value === row.kind) ?? KIND_OPTIONS[5]}
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
                  <input
                    type="checkbox"
                    checked={row.isPodium}
                    onChange={(e) => updateRow(row.key, { isPodium: e.target.checked })}
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
      </div>
    </div>
  );
};

export default TournamentTiersEditor;
