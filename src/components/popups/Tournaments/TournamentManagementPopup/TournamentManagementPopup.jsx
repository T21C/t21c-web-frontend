import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CloseButton } from "@/components/common/buttons";
import { ProfileSelector, CustomSelect } from "@/components/common/selectors";
import LevelSelectionPopup from "@/components/popups/Levels/LevelSelectionPopup/LevelSelectionPopup";
import TournamentFormFields from "../TournamentFormFields/TournamentFormFields";
import {
  emptyTournamentForm,
  buildTournamentPayload,
  buildRowModeOptions,
  findOption,
} from "../tournamentFormUtils";
import TournamentTiersEditor from "./TournamentTiersEditor";
import TournamentEventVisuals from "./TournamentEventVisuals";
import VisualAssetSlot from "./VisualAssetSlot";
import TournamentNomineesPopup from "../TournamentNomineesPopup/TournamentNomineesPopup";
import TournamentHelpPopup from "../TournamentHelpPopup/TournamentHelpPopup";
import TournamentPackImportPopup from "../TournamentPackImportPopup/TournamentPackImportPopup";
import PlacementLevelPreview from "./PlacementLevelPreview";
import PlacementNomineesCell from "./PlacementNomineesCell";
import {
  EMPTY_REWARD_FORM,
  countPlacementsByTier,
  isRewardFormDirty,
  mapPlacementToRow,
  reorderPlacementSegment,
  segmentPlacementRowsByContiguousTier,
  resolveEffectiveRowMode,
  serializeForm,
  serializePlacements,
  sortPlacementRowsByTier,
} from "./popupDirtyUtils";
import "./tournamentManagementPopup.css";
import "../TournamentFormPopup/tournamentFormPopup.css";

const SUB_TABS = ["details", "tiers", "placements", "cosmetics"];

const normalizeSubTab = (tab) => (tab === "rewards" ? "cosmetics" : tab);

const TournamentManagementPopup = ({
  tournamentId,
  initialTab = "details",
  onClose,
  onUpdated,
  seriesOptions,
  tierTemplates,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const [subTab, setSubTab] = useState(normalizeSubTab(initialTab));
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyTournamentForm());
  const [placementRows, setPlacementRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rewardForm, setRewardForm] = useState(EMPTY_REWARD_FORM);
  const [tiersDirty, setTiersDirty] = useState(false);
  const [levelPickerRowKey, setLevelPickerRowKey] = useState(null);
  const [nomineesRowKey, setNomineesRowKey] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPackImport, setShowPackImport] = useState(false);
  const [draggingPlacementTierCode, setDraggingPlacementTierCode] = useState(null);

  const savedFormRef = useRef(serializeForm(emptyTournamentForm()));
  const savedFormObjectRef = useRef(emptyTournamentForm());
  const savedPlacementsRef = useRef("[]");
  const savedPlacementRowsRef = useRef([]);
  const [tiersEditorKey, setTiersEditorKey] = useState(0);

  useBodyScrollLock(true);

  useEffect(() => {
    setSubTab(normalizeSubTab(initialTab));
  }, [initialTab, tournamentId]);

  const applyDetailToState = useCallback((data) => {
    const nextForm = {
      shortName: data.shortName || "",
      fullName: data.fullName || "",
      aka: data.aka || "",
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
      placementMode: data.placementMode || "profile",
    };
    const rows = sortPlacementRowsByTier(
      (data.placements || []).map((p) => mapPlacementToRow(p)),
      data.tiers || [],
    );

    setDetail(data);
    setForm(nextForm);
    setPlacementRows(rows);
    savedFormRef.current = serializeForm(nextForm);
    savedFormObjectRef.current = nextForm;
    savedPlacementsRef.current = serializePlacements(
      rows,
      nextForm.placementMode,
    );
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
  const rowModeOptions = useMemo(() => buildRowModeOptions(t), [t]);
  const tierPlacementCounts = useMemo(
    () => countPlacementsByTier(placementRows),
    [placementRows],
  );
  const placementRowSegments = useMemo(
    () => segmentPlacementRowsByContiguousTier(placementRows),
    [placementRows],
  );

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
    () =>
      serializePlacements(placementRows, form.placementMode) !==
      savedPlacementsRef.current,
    [placementRows, form.placementMode],
  );

  const rewardFormDirty = useMemo(() => isRewardFormDirty(rewardForm), [rewardForm]);

  const isLevelPlacementMode = form.placementMode === "level";

  const hasLevelPlacements = useMemo(
    () =>
      placementRows.some(
        (row) => resolveEffectiveRowMode(row, form.placementMode) === "level",
      ),
    [placementRows, form.placementMode],
  );

  const isDirty = detailsDirty || placementsDirty || tiersDirty || rewardFormDirty;

  const discardLocalChanges = useCallback(() => {
    setForm({ ...savedFormObjectRef.current });
    setPlacementRows(
      savedPlacementRowsRef.current.map((row) => ({
        ...row,
        linkedProfile: row.linkedProfile ? { ...row.linkedProfile } : null,
        linkedLevel: row.linkedLevel ? { ...row.linkedLevel } : null,
        creditedCreatorIds: Array.isArray(row.creditedCreatorIds)
          ? [...row.creditedCreatorIds]
          : null,
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
    if (!detailsDirty) return;
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
    if (
      !window.confirm(
        t("tournamentManagement.deleteConfirm", { name: form.shortName || detail?.shortName }),
      )
    ) {
      return;
    }
    try {
      await api.delete(routes.admin.tournaments.byId(tournamentId));
      toast.success(t("tournamentManagement.messages.deleted"));
      onUpdated?.();
      onClose();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.errors.deleteFailed"),
      );
    }
  };

  const addPlacementRow = () => {
    setPlacementRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        id: null,
        tierCode: "1",
        displayName: "",
        withdrew: false,
        isPending: false,
        teamName: "",
        playerId: null,
        creatorId: null,
        rowMode: null,
        levelId: null,
        creditedCreatorIds: null,
        positionInTier: null,
        linkedProfile: null,
        linkedLevel: null,
      },
    ]);
  };

  const handlePlacementDragStart = (start) => {
    const segment = placementRowSegments.find(
      (entry) => entry.segmentId === start.source.droppableId,
    );
    if (!segment) return;
    setDraggingPlacementTierCode(segment.tierCode);
  };

  const handlePlacementDragEnd = (result) => {
    setDraggingPlacementTierCode(null);
    if (!result.destination) return;
    if (result.source.droppableId !== result.destination.droppableId) return;

    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    setPlacementRows((prev) =>
      reorderPlacementSegment(prev, result.source.droppableId, from, to),
    );
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
    if (!placementsDirty) return;
    const currentIds = new Set(
      placementRows.filter((r) => r.id != null).map((r) => r.id),
    );
    const deletePlacementIds = savedPlacementRowsRef.current
      .filter((r) => r.id != null && !currentIds.has(r.id))
      .map((r) => r.id);

    const positionCounters = new Map();
    const placementPayload = placementRows
      .filter((r) => {
        const mode = resolveEffectiveRowMode(r, form.placementMode);
        return r.displayName.trim() || mode === "level";
      })
      .map((r) => {
        const effectiveMode = resolveEffectiveRowMode(r, form.placementMode);
        const code = String(r.tierCode || "").trim().toUpperCase();
        const positionInTier = (positionCounters.get(code) ?? 0) + 1;
        positionCounters.set(code, positionInTier);
        return {
          id: r.id ?? undefined,
          tierCode: r.tierCode,
          displayName: r.displayName.trim(),
          withdrew: r.withdrew,
          isPending: r.isPending,
          teamName: r.teamName || null,
          rowMode: r.rowMode ?? null,
          levelId: r.levelId ?? null,
          positionInTier,
          creditedCreatorIds: Array.isArray(r.creditedCreatorIds)
            ? r.creditedCreatorIds
            : null,
          playerId:
            effectiveMode === "profile"
              ? r.linkedProfile?.id ?? r.playerId ?? null
              : null,
          creatorId: null,
        };
      });

    try {
      const { data: savedPlacements } = await api.put(
        routes.admin.tournaments.placements(tournamentId),
        {
          placements: placementPayload,
          deletePlacementIds,
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

  const confirmCreditSyncPreview = (preview) => {
    const message = t("tournamentManagement.popup.credits.syncConfirm", {
      add: preview?.totalAdd ?? 0,
      remove: preview?.totalRemove ?? 0,
    });
    return window.confirm(message);
  };

  const syncCredits = async (placementId = null) => {
    if (!placementId && !hasLevelPlacements) return;
    try {
      const previewRoute = placementId
        ? routes.admin.tournaments.placementSyncCredits(placementId)
        : routes.admin.tournaments.syncCredits(tournamentId);
      const { data: preview } = await api.post(previewRoute, { dryRun: true });
      if (!confirmCreditSyncPreview(preview)) return;

      const { data } = await api.post(previewRoute, { dryRun: false });
      toast.success(
        t("tournamentManagement.popup.messages.creditsSynced", {
          add: data?.totalAdd ?? preview?.totalAdd ?? 0,
          remove: data?.totalRemove ?? preview?.totalRemove ?? 0,
        }),
      );
      await refreshDetail();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.popup.errors.creditsSyncFailed"),
      );
    }
  };

  const handleLevelSelect = ({ levelId, level }) => {
    if (!levelPickerRowKey) return;
    const label = level?.song || level?.name || `Level #${levelId}`;
    updatePlacementRow(levelPickerRowKey, {
      levelId,
      linkedLevel: {
        id: levelId,
        song: level?.song || label,
        artist: level?.artist || "",
        diffId: level?.diffId ?? null,
        team: level?.team ?? null,
        levelCredits: level?.levelCredits ?? null,
      },
      displayName: label,
      creditedCreatorIds: null,
    });
    setLevelPickerRowKey(null);
  };

  const renderPlacementRowTr = (row, options = {}) => {
    const {
      dragProvided = null,
      snapshot = null,
      canDragTier = false,
      rowClassName = "",
    } = options;

    const tierMeta = tierOptions.find(
      (tier) => tier.code?.toUpperCase() === row.tierCode?.toUpperCase(),
    );
    const effectiveMode = resolveEffectiveRowMode(row, form.placementMode);
    const isLevelMode = effectiveMode === "level";
    const trProps = dragProvided
      ? {
          ref: dragProvided.innerRef,
          ...dragProvided.draggableProps,
        }
      : {};

    return (
      <tr
        {...trProps}
        className={[snapshot?.isDragging ? "is-dragging" : "", rowClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <td className="tournament-management-popup__col-drag">
          <div
            className={[
              "tournament-management-popup__drag-handle",
              !canDragTier ? "is-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={t("tournamentManagement.reorder.dragHandle")}
            aria-disabled={!canDragTier}
            {...(canDragTier && dragProvided?.dragHandleProps
              ? dragProvided.dragHandleProps
              : {})}
          >
            <span
              className="tournament-management-popup__drag-handle-grip"
              aria-hidden="true"
            >
              ⋮⋮
            </span>
          </div>
        </td>
        <td className="tournament-management-popup__col-tier">
          <div className="tournament-management-popup__tier-code-cell">
            {tierMeta?.iconUrl ? (
              <img
                className="tournament-management-popup__tier-thumb"
                src={tierMeta.iconUrl}
                alt=""
              />
            ) : null}
            <input
              className="tournament-management-popup__tier-code-input"
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
        <td className="tournament-management-popup__col-mode">
          <CustomSelect
            options={rowModeOptions}
            value={findOption(rowModeOptions, row.rowMode ?? "inherit")}
            onChange={(option) =>
              updatePlacementRow(row.key, {
                rowMode:
                  option?.value === "inherit" ? null : option?.value ?? null,
              })
            }
            width="7rem"
            isSearchable={false}
          />
        </td>
        <td className="tournament-management-popup__col-name-level">
          {isLevelMode ? (
            <PlacementLevelPreview
              linkedLevel={row.linkedLevel}
              emptyLabel={t("tournamentManagement.popup.placements.noLevel")}
              editLabel={
                row.levelId
                  ? t("tournamentManagement.popup.placements.changeLevel")
                  : t("tournamentManagement.popup.placements.pickLevel")
              }
              onEdit={() => setLevelPickerRowKey(row.key)}
            />
          ) : (
            <input
              value={row.displayName}
              onChange={(e) =>
                updatePlacementRow(row.key, {
                  displayName: e.target.value,
                })
              }
            />
          )}
        </td>
        <td className="tournament-management-popup__col-linked">
          {isLevelMode ? (
            <PlacementNomineesCell
              levelId={row.levelId}
              creditedCreatorIds={row.creditedCreatorIds}
              disabled={!row.levelId}
              onEdit={() => setNomineesRowKey(row.key)}
            />
          ) : (
            <ProfileSelector
              key={`${row.key}-${row.linkedProfile?.id ?? "none"}`}
              portalDropdown
              type="player"
              value={row.linkedProfile}
              onChange={(profile) =>
                updatePlacementRow(row.key, {
                  linkedProfile: profile,
                  playerId: profile?.id ?? null,
                  creatorId: null,
                })
              }
            />
          )}
        </td>
        <td className="tournament-management-popup__col-withdrew">
          <input
            type="checkbox"
            checked={row.withdrew}
            onChange={(e) =>
              updatePlacementRow(row.key, {
                withdrew: e.target.checked,
              })
            }
            aria-label={t("tournamentManagement.withdrew")}
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
          <div className="tournament-management-popup__row-actions">
            {isLevelMode && row.id ? (
              <button
                type="button"
                className="btn-fill-secondary"
                title={t("tournamentManagement.syncCredits")}
                onClick={() => syncCredits(row.id)}
              >
                ↻
              </button>
            ) : null}
            <button
              type="button"
              className="btn-fill-danger"
              onClick={() => removePlacementRow(row.key)}
            >
              ×
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const nomineesRow = nomineesRowKey
    ? placementRows.find((row) => row.key === nomineesRowKey)
    : null;

  const createReward = async () => {
    if (!rewardFormDirty) return;
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
    <>
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
                    <span className="tournament-management-popup__badge">{detail.status}</span>
                    <span className="tournament-management-popup__badge">
                      {t(`tournamentManagement.form.placementModes.${form.placementMode}`)}
                    </span>
                    {detail.isHidden ? (
                      <span className="tournament-management-popup__badge">
                        {t("tournamentManagement.hiddenBadge")}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="tournament-management-popup__header-actions">
              <button
                type="button"
                className="btn-fill-secondary"
                onClick={() => setShowHelp(true)}
              >
                {t("tournamentManagement.help.open")}
              </button>
              <CloseButton
                onClick={requestClose}
                aria-label={t("buttons.close", { ns: "common" })}
              />
            </div>
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
                  idPrefix="tm-popup-edit"
                  classPrefix="tournament-form-fields"
                />
                <TournamentEventVisuals
                  tournamentId={tournamentId}
                  iconUrl={detail?.iconUrl}
                  cardBackgroundUrl={detail?.cardBackgroundUrl}
                  onRefresh={refreshDetail}
                />
                <div className="tournament-management-popup__actions">
                  <button
                    type="button"
                    className="btn-fill-primary"
                    onClick={saveTournament}
                    disabled={!detailsDirty}
                  >
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
                tierTemplates={tierTemplates}
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
                  <button
                    type="button"
                    className="btn-fill-primary"
                    onClick={savePlacements}
                    disabled={!placementsDirty}
                  >
                    {t("tournamentManagement.savePlacements")}
                  </button>
                  <button
                    type="button"
                    className="btn-fill-secondary"
                    onClick={() => syncCredits()}
                    disabled={!hasLevelPlacements}
                  >
                    {t("tournamentManagement.syncCredits")}
                  </button>
                  <button
                    type="button"
                    className="btn-fill-secondary"
                    onClick={() => setShowPackImport(true)}
                    disabled={!isLevelPlacementMode}
                  >
                    {t("tournamentManagement.packImport.open")}
                  </button>
                </div>
                <div className="tournament-management-popup__placements-wrap">
                  {placementRows.length === 0 ? (
                    <p className="tournament-management-popup__empty-state">
                      {t("tournamentManagement.popup.placements.empty")}
                    </p>
                  ) : (
                  <DragDropContext
                    onDragStart={handlePlacementDragStart}
                    onDragEnd={handlePlacementDragEnd}
                  >
                  <table className="tournament-management-popup__placements-table">
                    <thead>
                      <tr>
                        <th className="tournament-management-popup__col-drag" aria-hidden="true" />
                        <th className="tournament-management-popup__col-tier">
                          {t("tournamentManagement.popup.placements.tier")}
                        </th>
                        <th className="tournament-management-popup__col-mode">
                          {t("tournamentManagement.popup.placements.rowMode")}
                        </th>
                        <th className="tournament-management-popup__col-name-level">
                          {t("tournamentManagement.popup.placements.nameLevel")}
                        </th>
                        <th>{t("tournamentManagement.popup.placements.linkedUsers")}</th>
                        <th className="tournament-management-popup__col-withdrew">
                          {t("tournamentManagement.withdrew")}
                        </th>
                        <th>{t("tournamentManagement.popup.placements.team")}</th>
                        <th />
                      </tr>
                    </thead>
                    {placementRowSegments.map((segment) => {
                      const rowTierCode = segment.tierCode;
                      const canDragTier = (tierPlacementCounts.get(rowTierCode) ?? 0) > 1;
                      const isInactiveDragTier =
                        draggingPlacementTierCode != null &&
                        rowTierCode !== draggingPlacementTierCode;
                      const useStaticSegment = isInactiveDragTier || !canDragTier;

                      if (useStaticSegment) {
                        return (
                          <tbody
                            key={segment.segmentId}
                            className={
                              isInactiveDragTier ? "is-drag-tier-inactive" : ""
                            }
                          >
                            {segment.items.map(({ row }) =>
                              renderPlacementRowTr(row, {
                                canDragTier,
                              }),
                            )}
                          </tbody>
                        );
                      }

                      return (
                        <Droppable
                          key={segment.segmentId}
                          droppableId={segment.segmentId}
                        >
                          {(provided) => (
                            <tbody
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {segment.items.map(({ row }, index) => (
                                <Draggable
                                  key={row.key}
                                  draggableId={row.key}
                                  index={index}
                                >
                                  {(dragProvided, snapshot) =>
                                    renderPlacementRowTr(row, {
                                      dragProvided,
                                      snapshot,
                                      canDragTier,
                                    })
                                  }
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </tbody>
                          )}
                        </Droppable>
                      );
                    })}
                  </table>
                  </DragDropContext>
                  )}
                </div>
                <datalist id="tm-popup-tier-codes">
                  {tierOptions.map((tier) => (
                    <option key={tier.id} value={tier.code} />
                  ))}
                </datalist>
              </>
            ) : null}

            {!loading && subTab === "cosmetics" ? (
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
                  <button
                    type="button"
                    className="btn-fill-primary"
                    onClick={createReward}
                    disabled={!rewardFormDirty}
                  >
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

      <LevelSelectionPopup
        isOpen={Boolean(levelPickerRowKey)}
        onClose={() => setLevelPickerRowKey(null)}
        onLevelSelect={handleLevelSelect}
        variant="pick"
      />

      {nomineesRow ? (
        <TournamentNomineesPopup
          levelId={nomineesRow.levelId}
          creditedCreatorIds={nomineesRow.creditedCreatorIds}
          onClose={() => setNomineesRowKey(null)}
          onSave={(ids) => {
            updatePlacementRow(nomineesRow.key, { creditedCreatorIds: ids });
            setNomineesRowKey(null);
          }}
        />
      ) : null}

      {showHelp ? <TournamentHelpPopup onClose={() => setShowHelp(false)} /> : null}

      {showPackImport ? (
        <TournamentPackImportPopup
          tournamentId={tournamentId}
          onClose={() => setShowPackImport(false)}
          onImported={refreshDetail}
        />
      ) : null}
    </>
  );
};

export default TournamentManagementPopup;
