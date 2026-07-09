import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CloseButton } from "@/components/common/buttons";
import { ProfileSelector, CustomSelect } from "@/components/common/selectors";
import TournamentFormFields from "../TournamentFormFields/TournamentFormFields";
import {
  emptyTournamentForm,
  buildTournamentPayload,
  findOption,
} from "../tournamentFormUtils";
import TournamentTiersEditor from "./TournamentTiersEditor";
import VisualAssetSlot from "./VisualAssetSlot";
import {
  EMPTY_REWARD_FORM,
  isRewardFormDirty,
  mapPlacementToRow,
  serializeForm,
  serializePlacements,
} from "./popupDirtyUtils";
import "./tournamentManagementPopup.css";
import "../TournamentFormPopup/tournamentFormPopup.css";

const SUB_TABS = ["details", "tiers", "placements", "rewards"];

const TournamentManagementPopup = ({
  tournamentId,
  initialTab = "placements",
  onClose,
  onUpdated,
  seriesOptions,
  tierTemplateOptions,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const [subTab, setSubTab] = useState(initialTab);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyTournamentForm());
  const [placementRows, setPlacementRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rewardForm, setRewardForm] = useState(EMPTY_REWARD_FORM);
  const [tiersDirty, setTiersDirty] = useState(false);

  const savedFormRef = useRef(serializeForm(emptyTournamentForm()));
  const savedFormObjectRef = useRef(emptyTournamentForm());
  const savedPlacementsRef = useRef("[]");
  const savedPlacementRowsRef = useRef([]);
  const savedTrackRef = useRef("player");
  const [tiersEditorKey, setTiersEditorKey] = useState(0);

  useBodyScrollLock(true);

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab, tournamentId]);

  const applyDetailToState = useCallback((data) => {
    const nextForm = {
      shortName: data.shortName || "",
      fullName: data.fullName || "",
      aka: data.aka || "",
      track: data.track || "player",
      seriesId: data.seriesId ?? "",
      status: data.status || "draft",
      isHidden: Boolean(data.isHidden),
      isResultsFinal: Boolean(data.isResultsFinal),
      youtubeUrl: data.youtubeUrl || "",
      packRef: data.packRef || "",
      notes: data.notes || "",
      externalUrl: data.externalUrl || "",
      organizers: Array.isArray(data.organizers) ? data.organizers.join(", ") : "",
      sortYear: data.sortYear ?? "",
      tierTemplateId: "",
    };
    const rows = (data.placements || []).map((p) =>
      mapPlacementToRow(p, data.track || "player"),
    );

    setDetail(data);
    setForm(nextForm);
    setPlacementRows(rows);
    savedFormRef.current = serializeForm(nextForm);
    savedFormObjectRef.current = nextForm;
    savedTrackRef.current = nextForm.track;
    savedPlacementsRef.current = serializePlacements(rows, nextForm.track);
    savedPlacementRowsRef.current = rows;
    setTiersDirty(false);
  }, []);

  const loadDetail = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const { data } = await api.get(routes.admin.tournaments.byId(tournamentId));
      applyDetailToState(data);
    } catch {
      toast.error(t("tournamentManagement.popup.errors.loadFailed"));
      onClose();
    } finally {
      setLoading(false);
    }
  }, [tournamentId, t, onClose, applyDetailToState]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const tierOptions = detail?.tiers || [];

  const rewardTierOptions = useMemo(
    () => [
      { value: "", label: t("tournamentManagement.popup.rewards.tierAny") },
      ...tierOptions.map((tier) => ({
        value: String(tier.id),
        label: `${tier.code} — ${tier.label}`,
      })),
    ],
    [tierOptions, t],
  );

  const detailsDirty = useMemo(
    () => serializeForm(form) !== savedFormRef.current,
    [form],
  );

  const placementsDirty = useMemo(
    () => serializePlacements(placementRows, form.track) !== savedPlacementsRef.current,
    [placementRows, form.track],
  );

  const rewardFormDirty = useMemo(() => isRewardFormDirty(rewardForm), [rewardForm]);

  const isDirty = detailsDirty || placementsDirty || tiersDirty || rewardFormDirty;

  const discardLocalChanges = useCallback(() => {
    setForm({ ...savedFormObjectRef.current });
    setPlacementRows(
      savedPlacementRowsRef.current.map((row) => ({
        ...row,
        linkedProfile: row.linkedProfile ? { ...row.linkedProfile } : null,
      })),
    );
    setRewardForm(EMPTY_REWARD_FORM);
    setTiersDirty(false);
    setTiersEditorKey((k) => k + 1);
  }, []);

  const confirmDiscard = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm(t("tournamentManagement.popup.unsavedConfirm"));
  }, [isDirty, t]);

  const requestClose = useCallback(() => {
    if (!confirmDiscard()) return;
    onClose();
  }, [confirmDiscard, onClose]);

  const requestSubTab = useCallback(
    (nextTab) => {
      if (nextTab === subTab) return;
      if (!confirmDiscard()) return;
      if (isDirty) discardLocalChanges();
      setSubTab(nextTab);
    },
    [subTab, confirmDiscard, isDirty, discardLocalChanges],
  );

  const refreshDetail = async () => {
    await loadDetail();
    onUpdated?.();
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("tournament-management-popup")) {
      requestClose();
    }
  };

  const updateFormField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveTournament = async () => {
    const payload = buildTournamentPayload(form);
    try {
      await api.patch(routes.admin.tournaments.byId(tournamentId), payload);
      toast.success(t("tournamentManagement.popup.messages.saved"));
      await refreshDetail();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.form.errors.saveFailed"));
    }
  };

  const deleteTournament = async () => {
    if (!window.confirm(t("tournamentManagement.popup.deleteConfirm"))) return;
    try {
      await api.delete(routes.admin.tournaments.byId(tournamentId));
      toast.success(t("tournamentManagement.popup.messages.deleted"));
      onUpdated?.();
      onClose();
    } catch {
      toast.error(t("tournamentManagement.popup.errors.deleteFailed"));
    }
  };

  const addPlacementRow = () => {
    setPlacementRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        tierCode: "1",
        displayName: "",
        withdrew: false,
        isPending: false,
        teamName: "",
        playerId: null,
        creatorId: null,
        linkedProfile: null,
      },
    ]);
  };

  const updatePlacementRow = (key, patch) => {
    setPlacementRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const removePlacementRow = (key) => {
    setPlacementRows((prev) => prev.filter((row) => row.key !== key));
  };

  const savePlacements = async () => {
    const placementPayload = placementRows
      .filter((r) => r.displayName.trim())
      .map((r) => ({
        tierCode: r.tierCode,
        displayName: r.displayName.trim(),
        withdrew: r.withdrew,
        isPending: r.isPending,
        teamName: r.teamName || null,
        playerId:
          form.track === "player" ? r.linkedProfile?.id ?? r.playerId ?? null : null,
        creatorId:
          form.track === "creator" ? r.linkedProfile?.id ?? r.creatorId ?? null : null,
      }));
    try {
      const { data: savedPlacements } = await api.put(
        routes.admin.tournaments.placements(tournamentId),
        {
          placements: placementPayload,
          autoLink: true,
        },
      );
      toast.success(t("tournamentManagement.popup.messages.placementsSaved"));
      setDetail((prev) => {
        if (!prev) return prev;
        const next = { ...prev, placements: savedPlacements };
        applyDetailToState(next);
        return next;
      });
      onUpdated?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.popup.errors.placementsFailed"));
    }
  };

  const createReward = async () => {
    try {
      await api.post(routes.admin.tournaments.rewards(tournamentId), {
        label: rewardForm.label.trim(),
        tierId: rewardForm.tierId === "" ? null : Number(rewardForm.tierId),
        maxRankWeight:
          rewardForm.maxRankWeight === "" ? null : Number(rewardForm.maxRankWeight),
        priority: Number(rewardForm.priority) || 0,
        rewardType: "avatar_frame",
      });
      toast.success(t("tournamentManagement.popup.messages.rewardCreated"));
      setRewardForm(EMPTY_REWARD_FORM);
      await loadDetail();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.popup.errors.rewardFailed"));
    }
  };

  const uploadRewardAsset = async (rewardId, file) => {
    if (!file) return;
    const body = new FormData();
    body.append("asset", file);
    try {
      await api.post(routes.admin.tournaments.rewardAsset(rewardId), body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(t("tournamentManagement.visuals.messages.uploadSuccess"));
      await loadDetail();
    } catch {
      toast.error(t("tournamentManagement.visuals.errors.uploadFailed"));
    }
  };

  const deleteReward = async (rewardId) => {
    try {
      await api.delete(routes.admin.tournaments.reward(rewardId));
      toast.success(t("tournamentManagement.popup.messages.rewardDeleted"));
      await loadDetail();
    } catch {
      toast.error(t("tournamentManagement.popup.errors.rewardDeleteFailed"));
    }
  };

  const syncEntitlements = async () => {
    try {
      const { data } = await api.post(
        routes.admin.tournaments.syncEntitlements(tournamentId),
      );
      toast.success(
        t("tournamentManagement.popup.messages.syncSuccess", {
          granted: data.granted,
          revoked: data.revoked,
        }),
      );
    } catch {
      toast.error(t("tournamentManagement.popup.errors.syncFailed"));
    }
  };

  return (
    <div className="tournament-management-popup" onClick={handleBackdropClick}>
      <div
        className="tournament-management-popup__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-management-popup-title"
      >
        <div className="tournament-management-popup__header">
          <div className="tournament-management-popup__title-row">
            {detail?.iconUrl ? (
              <img
                className="tournament-management-popup__icon"
                src={detail.iconUrl}
                alt=""
              />
            ) : null}
            <div>
              <h2 id="tournament-management-popup-title" className="tournament-management-popup__title">
                {detail?.shortName || t("tournamentManagement.popup.title")}
              </h2>
              {detail ? (
                <div className="tournament-management-popup__meta">
                  <span className="tournament-management-popup__badge">{detail.track}</span>
                  <span className="tournament-management-popup__badge">{detail.status}</span>
                  {detail.isHidden ? (
                    <span className="tournament-management-popup__badge">
                      {t("tournamentManagement.hiddenBadge")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <CloseButton
            onClick={requestClose}
            aria-label={t("buttons.close", { ns: "common" })}
          />
        </div>

        <div className="tournament-management-popup__tabs">
          {SUB_TABS.map((id) => (
            <button
              key={id}
              type="button"
              className={`tournament-management-popup__tab${subTab === id ? " is-active" : ""}`}
              onClick={() => requestSubTab(id)}
            >
              {t(`tournamentManagement.subTabs.${id}`)}
            </button>
          ))}
        </div>

        <div className="tournament-management-popup__body">
          {loading ? (
            <p className="tournament-management-popup__loading">
              {t("loading.generic", { ns: "common" })}
            </p>
          ) : null}

          {!loading && subTab === "details" ? (
            <>
              <TournamentFormFields
                form={form}
                onChange={updateFormField}
                seriesOptions={seriesOptions}
                tierTemplateOptions={tierTemplateOptions}
                trackDisabled
                idPrefix="tm-popup-edit"
                classPrefix="tournament-form-fields"
              />
              <div className="tournament-management-popup__actions">
                <button type="button" className="btn-fill-primary" onClick={saveTournament}>
                  {t("tournamentManagement.save")}
                </button>
                <button type="button" className="btn-fill-danger" onClick={deleteTournament}>
                  {t("tournamentManagement.delete")}
                </button>
              </div>
            </>
          ) : null}

          {!loading && subTab === "tiers" ? (
            <TournamentTiersEditor
              key={tiersEditorKey}
              tournamentId={tournamentId}
              detail={detail}
              onRefresh={refreshDetail}
              onDirtyChange={setTiersDirty}
            />
          ) : null}

          {!loading && subTab === "placements" ? (
            <>
              <div className="tournament-management-popup__actions">
                <button type="button" className="btn-fill-secondary" onClick={addPlacementRow}>
                  {t("tournamentManagement.addRow")}
                </button>
                <button type="button" className="btn-fill-primary" onClick={savePlacements}>
                  {t("tournamentManagement.savePlacements")}
                </button>
              </div>
              <table className="tournament-management-popup__placements-table">
                <thead>
                  <tr>
                    <th>{t("tournamentManagement.popup.placements.tier")}</th>
                    <th>{t("tournamentManagement.popup.placements.name")}</th>
                    <th>{t("tournamentManagement.popup.placements.link")}</th>
                    <th>{t("tournamentManagement.withdrew")}</th>
                    <th>{t("tournamentManagement.popup.placements.team")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {placementRows.map((row) => {
                    const tierMeta = tierOptions.find(
                      (tier) => tier.code?.toUpperCase() === row.tierCode?.toUpperCase(),
                    );
                    return (
                      <tr key={row.key}>
                        <td>
                          <div className="tournament-management-popup__tier-code-cell">
                            {tierMeta?.iconUrl ? (
                              <img
                                className="tournament-management-popup__tier-thumb"
                                src={tierMeta.iconUrl}
                                alt=""
                              />
                            ) : null}
                            <input
                              value={row.tierCode}
                              onChange={(e) =>
                                updatePlacementRow(row.key, {
                                  tierCode: e.target.value.toUpperCase(),
                                })
                              }
                              list="tm-popup-tier-codes"
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            value={row.displayName}
                            onChange={(e) =>
                              updatePlacementRow(row.key, {
                                displayName: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <ProfileSelector
                            key={`${row.key}-${row.linkedProfile?.id ?? "none"}`}
                            portalDropdown
                            type={form.track === "creator" ? "charter" : "player"}
                            value={row.linkedProfile}
                            onChange={(profile) =>
                              updatePlacementRow(row.key, {
                                linkedProfile: profile,
                                playerId:
                                  form.track === "player" ? profile?.id ?? null : null,
                                creatorId:
                                  form.track === "creator" ? profile?.id ?? null : null,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.withdrew}
                            onChange={(e) =>
                              updatePlacementRow(row.key, {
                                withdrew: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={row.teamName}
                            onChange={(e) =>
                              updatePlacementRow(row.key, {
                                teamName: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-fill-danger"
                            onClick={() => removePlacementRow(row.key)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <datalist id="tm-popup-tier-codes">
                {tierOptions.map((tier) => (
                  <option key={tier.id} value={tier.code} />
                ))}
              </datalist>
            </>
          ) : null}

          {!loading && subTab === "rewards" ? (
            <>
              <div className="tournament-management-popup__fields">
                <div className="tournament-management-popup__field">
                  <label htmlFor="tm-popup-rw-label">
                    {t("tournamentManagement.popup.rewards.label")}
                  </label>
                  <input
                    id="tm-popup-rw-label"
                    value={rewardForm.label}
                    onChange={(e) =>
                      setRewardForm((p) => ({ ...p, label: e.target.value }))
                    }
                  />
                </div>
                <div className="tournament-management-popup__field">
                  <CustomSelect
                    label={t("tournamentManagement.popup.rewards.tier")}
                    options={rewardTierOptions}
                    value={findOption(rewardTierOptions, rewardForm.tierId)}
                    onChange={(option) =>
                      setRewardForm((p) => ({ ...p, tierId: option?.value ?? "" }))
                    }
                    width="100%"
                  />
                </div>
                <div className="tournament-management-popup__field">
                  <label htmlFor="tm-popup-rw-max">
                    {t("tournamentManagement.popup.rewards.maxRankWeight")}
                  </label>
                  <input
                    id="tm-popup-rw-max"
                    value={rewardForm.maxRankWeight}
                    onChange={(e) =>
                      setRewardForm((p) => ({
                        ...p,
                        maxRankWeight: e.target.value,
                      }))
                    }
                    placeholder={t("tournamentManagement.popup.rewards.maxRankWeightPlaceholder")}
                  />
                </div>
                <div className="tournament-management-popup__field">
                  <label htmlFor="tm-popup-rw-pri">
                    {t("tournamentManagement.popup.rewards.priority")}
                  </label>
                  <input
                    id="tm-popup-rw-pri"
                    value={rewardForm.priority}
                    onChange={(e) =>
                      setRewardForm((p) => ({ ...p, priority: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="tournament-management-popup__actions">
                <button type="button" className="btn-fill-primary" onClick={createReward}>
                  {t("tournamentManagement.addReward")}
                </button>
                <button type="button" className="btn-fill-secondary" onClick={syncEntitlements}>
                  {t("tournamentManagement.syncEntitlements")}
                </button>
              </div>
              <div className="tournament-management-popup__list">
                {(detail?.rewards || []).map((reward) => (
                  <div key={reward.id} className="tournament-management-popup__reward-card">
                    <VisualAssetSlot
                      url={reward.assetUrl}
                      variant="reward"
                      accept="image/*"
                      onUpload={(file) => uploadRewardAsset(reward.id, file)}
                    />
                    <div>
                      <strong>{reward.label}</strong>
                      <div className="tournament-management-popup__reward-meta">
                        <span>{reward.rewardType}</span>
                        {reward.tierId ? (
                          <span>
                            {t("tournamentManagement.popup.rewards.tierRef", {
                              id: reward.tierId,
                            })}
                          </span>
                        ) : null}
                        {reward.maxRankWeight != null ? (
                          <span>≤ {reward.maxRankWeight}</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-fill-danger"
                      onClick={() => deleteReward(reward.id)}
                    >
                      {t("tournamentManagement.delete")}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TournamentManagementPopup;
