// tuf-search: #TournamentManagementPage #tournamentManagementPage #admin #tournaments
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { useAuth } from "@/contexts/AuthContext";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { AccessDenied, MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from "@/utils/meta";
import { ProfileSelector, CustomSelect } from "@/components/common/selectors";
import {
  TournamentFormPopup,
  TournamentManagementPopup,
  buildTournamentPayload,
  buildAllTracksOptions,
  buildTrackOptions,
  findOption,
} from "@/components/popups/Tournaments";
import "./tournamentManagement.css";

const GLOBAL_TABS = ["events", "unresolved", "import", "series"];

const TournamentManagementPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation(["pages", "common"]);
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t("tournamentManagement.meta.title"),
        description: t("tournamentManagement.meta.description"),
        pathname: location.pathname,
        type: "article",
        noindex: true,
      }),
    [t, location.pathname],
  );

  const [globalTab, setGlobalTab] = useState("events");
  const [tournaments, setTournaments] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [managePopup, setManagePopup] = useState(null);
  const [unresolved, setUnresolved] = useState([]);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("");
  const [importTrack, setImportTrack] = useState("player");
  const [importReport, setImportReport] = useState(null);
  const [seriesForm, setSeriesForm] = useState({ slug: "", name: "" });
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const seriesFormBaselineRef = useRef({ slug: "", name: "" });
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [isReorderingTournaments, setIsReorderingTournaments] = useState(false);
  const [isReorderingSeries, setIsReorderingSeries] = useState(false);

  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const loadTournaments = useCallback(async () => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (trackFilter) params.track = trackFilter;
    const { data } = await api.get(routes.admin.tournaments.root(), { params });
    setTournaments(Array.isArray(data) ? data : []);
  }, [search, trackFilter]);

  const loadSeries = useCallback(async () => {
    const { data } = await api.get(routes.admin.tournaments.series());
    setSeriesList(Array.isArray(data) ? data : []);
  }, []);

  const loadTemplates = useCallback(async () => {
    const { data } = await api.get(routes.admin.tournaments.tierTemplates());
    setTemplates(Array.isArray(data) ? data : []);
  }, []);

  const loadUnresolved = useCallback(async () => {
    const params = trackFilter ? { track: trackFilter } : {};
    const { data } = await api.get(routes.admin.tournaments.unresolved(), { params });
    setUnresolved(Array.isArray(data) ? data : []);
  }, [trackFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    loadTournaments().catch(() =>
      toast.error(t("tournamentManagement.errors.loadTournamentsFailed")),
    );
    loadSeries().catch(() => {});
    loadTemplates().catch(() => {});
  }, [isAdmin, loadTournaments, loadSeries, loadTemplates]);

  useEffect(() => {
    if (!isAdmin || globalTab !== "unresolved") return;
    loadUnresolved().catch(() =>
      toast.error(t("tournamentManagement.errors.loadUnresolvedFailed")),
    );
  }, [isAdmin, globalTab, loadUnresolved]);

  const trackFilterOptions = useMemo(() => buildAllTracksOptions(t), [t]);

  const importTrackOptions = useMemo(() => buildTrackOptions(t), [t]);

  const seriesOptions = useMemo(
    () => [
      { value: "", label: t("tournamentManagement.form.seriesNone") },
      ...[...seriesList]
        .sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0))
        .map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [seriesList, t],
  );

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) => {
        const seriesWeightA = a.series?.sortWeight ?? 100;
        const seriesWeightB = b.series?.sortWeight ?? 100;
        if (seriesWeightA !== seriesWeightB) return seriesWeightA - seriesWeightB;
        return (a.sortWeight ?? 0) - (b.sortWeight ?? 0);
      }),
    [tournaments],
  );

  const sortedSeriesList = useMemo(
    () => [...seriesList].sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0)),
    [seriesList],
  );

  const tournamentGroups = useMemo(() => {
    const bySeriesKey = new Map();

    for (const item of tournaments) {
      const key = item.seriesId != null ? `series-${item.seriesId}` : "series-none";
      if (!bySeriesKey.has(key)) {
        bySeriesKey.set(key, []);
      }
      bySeriesKey.get(key).push(item);
    }

    const sortItems = (items) =>
      [...items].sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0));

    const groups = [];

    for (const series of sortedSeriesList) {
      const key = `series-${series.id}`;
      const items = bySeriesKey.get(key);
      if (!items?.length) continue;
      groups.push({
        key,
        label: series.name,
        items: sortItems(items),
      });
      bySeriesKey.delete(key);
    }

    const unseriesed = bySeriesKey.get("series-none");
    if (unseriesed?.length) {
      groups.push({
        key: "series-none",
        label: t("tournamentManagement.form.seriesNone"),
        items: sortItems(unseriesed),
      });
      bySeriesKey.delete("series-none");
    }

    for (const [key, items] of bySeriesKey) {
      if (!items.length) continue;
      groups.push({
        key,
        label: items[0]?.series?.name ?? key,
        items: sortItems(items),
      });
    }

    return groups;
  }, [tournaments, sortedSeriesList, t]);

  const persistReorder = async (orderedIds, route, onRollback, onSuccess) => {
    try {
      await api.put(route, { orderedIds });
      toast.success(t("tournamentManagement.messages.reordered"));
      await onSuccess?.();
      return true;
    } catch (e) {
      await onRollback?.();
      toast.error(e?.response?.data?.error || t("tournamentManagement.errors.reorderFailed"));
      return false;
    }
  };

  const handleSeriesDragEnd = async (result) => {
    if (!result.destination) return;

    setIsReorderingSeries(true);
    const previousSeries = seriesList;

    try {
      const items = Array.from(sortedSeriesList);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);

      const orderedIds = items.map((item) => item.id);
      const weightById = new Map(orderedIds.map((id, index) => [id, index + 1]));

      setSeriesList((prev) =>
        [...prev]
          .map((item) => {
            const nextWeight = weightById.get(item.id);
            return nextWeight != null ? { ...item, sortWeight: nextWeight } : item;
          })
          .sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0)),
      );

      await persistReorder(
        orderedIds,
        routes.admin.tournaments.seriesReorder(),
        async () => {
          setSeriesList(previousSeries);
          await loadSeries();
        },
        async () => {
          await loadSeries();
          await loadTournaments();
        },
      );
    } finally {
      setIsReorderingSeries(false);
    }
  };

  const handleTournamentDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.droppableId !== result.destination.droppableId) return;

    const group = tournamentGroups.find((entry) => entry.key === result.source.droppableId);
    if (!group) return;

    setIsReorderingTournaments(true);
    const previousTournaments = tournaments;

    try {
      const items = Array.from(group.items);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);

      const orderedIds = items.map((item) => item.id);
      const weightById = new Map(orderedIds.map((id, index) => [id, index + 1]));

      setTournaments((prev) =>
        prev.map((item) => {
          const nextWeight = weightById.get(item.id);
          return nextWeight != null ? { ...item, sortWeight: nextWeight } : item;
        }),
      );

      await persistReorder(
        orderedIds,
        routes.admin.tournaments.tournamentsReorder(),
        async () => {
          setTournaments(previousTournaments);
          await loadTournaments();
        },
        loadTournaments,
      );
    } finally {
      setIsReorderingTournaments(false);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <MetaTags {...pageMeta} />
        <AccessDenied />
      </>
    );
  }

  const openManagePopup = (id, initialTab = "details") => {
    setManagePopup({ id, initialTab });
  };

  const closeManagePopup = () => {
    setManagePopup(null);
  };

  const createTournament = async (createForm) => {
    try {
      const { data } = await api.post(routes.admin.tournaments.root(), {
        ...buildTournamentPayload(createForm, { forCreate: true }),
      });
      toast.success(t("tournamentManagement.messages.tournamentCreated"));
      setShowCreatePopup(false);
      await loadTournaments();
      openManagePopup(data.id, "details");
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.form.errors.saveFailed"),
      );
    }
  };

  const deleteTournament = async (item) => {
    if (
      !window.confirm(
        t("tournamentManagement.deleteConfirm", { name: item.shortName }),
      )
    ) {
      return;
    }

    try {
      await api.delete(routes.admin.tournaments.byId(item.id));
      toast.success(t("tournamentManagement.messages.deleted"));
      if (managePopup?.id === item.id) {
        closeManagePopup();
      }
      await loadTournaments();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || t("tournamentManagement.errors.deleteFailed"),
      );
    }
  };

  const resolveAllNames = async () => {
    try {
      const { data } = await api.post(routes.admin.tournaments.resolveNames(), {
        track: trackFilter || undefined,
      });
      toast.success(
        t("tournamentManagement.messages.namesLinked", { count: data.linked }),
      );
      await loadUnresolved();
      await loadTournaments();
    } catch {
      toast.error(t("tournamentManagement.errors.resolveFailed"));
    }
  };

  const linkUnresolved = async (placementId, profile) => {
    if (!profile?.id) return;
    const row = unresolved.find((u) => u.id === placementId);
    const track = row?.tournament?.track || "player";
    try {
      await api.patch(routes.admin.tournaments.placement(placementId), {
        playerId: track === "player" ? profile.id : null,
        creatorId: track === "creator" ? profile.id : null,
      });
      toast.success(t("tournamentManagement.messages.placementLinked"));
      await loadUnresolved();
    } catch {
      toast.error(t("tournamentManagement.errors.linkFailed"));
    }
  };

  const runImport = async (file, dryRun) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("track", importTrack);
    body.append("dryRun", dryRun ? "true" : "false");
    try {
      const { data } = await api.post(routes.admin.tournaments.import(), body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportReport(data);
      toast.success(
        dryRun
          ? t("tournamentManagement.import.messages.dryRunComplete")
          : t("tournamentManagement.import.messages.importComplete"),
      );
      if (!dryRun) await loadTournaments();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.import.errors.failed"));
    }
  };

  const resetSeriesForm = () => {
    setSeriesForm({ slug: "", name: "" });
    seriesFormBaselineRef.current = { slug: "", name: "" };
    setEditingSeriesId(null);
  };

  const startEditSeries = (series) => {
    const nextForm = { slug: series.slug ?? "", name: series.name ?? "" };
    setEditingSeriesId(series.id);
    setSeriesForm(nextForm);
    seriesFormBaselineRef.current = nextForm;
  };

  const seriesFormDirty = useMemo(() => {
    const slug = seriesForm.slug.trim();
    const name = seriesForm.name.trim();
    if (editingSeriesId != null) {
      const baseline = seriesFormBaselineRef.current;
      return slug !== baseline.slug.trim() || name !== baseline.name.trim();
    }
    return Boolean(slug || name);
  }, [seriesForm, editingSeriesId]);

  const canSaveSeries = useMemo(() => {
    const slug = seriesForm.slug.trim();
    const name = seriesForm.name.trim();
    if (!slug || !name) return false;
    if (editingSeriesId != null) return seriesFormDirty;
    return true;
  }, [seriesForm, editingSeriesId, seriesFormDirty]);

  const saveSeries = async () => {
    if (!canSaveSeries) return;
    const slug = seriesForm.slug.trim();
    const name = seriesForm.name.trim();
    if (!slug || !name) {
      toast.error(t("tournamentManagement.series.errors.required"));
      return;
    }

    try {
      if (editingSeriesId != null) {
        await api.patch(routes.admin.tournaments.seriesById(editingSeriesId), {
          slug,
          name,
        });
        toast.success(t("tournamentManagement.series.messages.updated"));
      } else {
        await api.post(routes.admin.tournaments.series(), { slug, name });
        toast.success(t("tournamentManagement.series.messages.created"));
      }
      resetSeriesForm();
      await loadSeries();
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
          (editingSeriesId != null
            ? t("tournamentManagement.series.errors.updateFailed")
            : t("tournamentManagement.series.errors.createFailed")),
      );
    }
  };

  const deleteSeries = async (series) => {
    if (!window.confirm(t("tournamentManagement.series.deleteConfirm", { name: series.name }))) {
      return;
    }

    try {
      await api.delete(routes.admin.tournaments.seriesById(series.id));
      toast.success(t("tournamentManagement.series.messages.deleted"));
      if (editingSeriesId === series.id) resetSeriesForm();
      await loadSeries();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("tournamentManagement.series.errors.deleteFailed"));
    }
  };

  return (
    <div className="tournament-mgmt-page">
      <MetaTags {...pageMeta} />
      <div className="tournament-mgmt-page__header">
        <h1 className="tournament-mgmt-page__title">
          {t("tournamentManagement.title")}
        </h1>
        <p className="tournament-mgmt-page__subtitle">
          {t("tournamentManagement.subtitle")}
        </p>
      </div>

      <div className="tournament-mgmt-page__tabs">
        {GLOBAL_TABS.map((id) => (
          <span key={id} className="tournament-mgmt-page__tab-wrap">
            <button
              type="button"
              className={`tournament-mgmt-page__tab${globalTab === id ? " is-active" : ""}`}
              onClick={() => setGlobalTab(id)}
            >
              {t(`tournamentManagement.tabs.${id}`)}
            </button>
          </span>
        ))}
      </div>

      {globalTab === "events" && (
        <>
          <div className="tournament-mgmt-page__toolbar">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("tournamentManagement.searchPlaceholder")}
            />
            <CustomSelect
              options={trackFilterOptions}
              value={findOption(trackFilterOptions, trackFilter)}
              onChange={(option) => setTrackFilter(option?.value ?? "")}
              width="10rem"
              isSearchable={false}
            />
            <button
              type="button"
              className="btn-fill-primary"
              onClick={() => loadTournaments()}
            >
              {t("tournamentManagement.refresh")}
            </button>
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={() => setShowCreatePopup(true)}
            >
              {t("tournamentManagement.newTournament")}
            </button>
          </div>

          <DragDropContext onDragEnd={handleTournamentDragEnd}>
            <div className="tournament-mgmt-page__grouped-list">
              {tournamentGroups.map((group) => (
                <section key={group.key} className="tournament-mgmt-page__series-group">
                  <h2 className="tournament-mgmt-page__series-group-title">{group.label}</h2>
                  <Droppable droppableId={group.key}>
                    {(provided) => (
                      <div
                        className="tournament-mgmt-page__list"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {group.items.map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={String(item.id)}
                            index={index}
                            isDragDisabled={isReorderingTournaments}
                          >
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={[
                                  "tournament-mgmt-page__card",
                                  managePopup?.id === item.id ? "is-selected" : "",
                                  snapshot.isDragging ? "is-dragging" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <div
                                  className="tournament-mgmt-page__drag-handle"
                                  aria-label={t("tournamentManagement.reorder.dragHandle")}
                                  {...dragProvided.dragHandleProps}
                                >
                                  <span
                                    className="tournament-mgmt-page__drag-handle-grip"
                                    aria-hidden="true"
                                  >
                                    ⋮⋮
                                  </span>
                                </div>
                                <div
                                  className="tournament-mgmt-page__card-body"
                                  onClick={() => openManagePopup(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") openManagePopup(item.id);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <strong>{item.shortName}</strong>
                                  <div className="tournament-mgmt-page__card-meta">
                                    <span>{item.fullName}</span>
                                    <span className="tournament-mgmt-page__badge">{item.track}</span>
                                    <span className="tournament-mgmt-page__badge">{item.status}</span>
                                    {item.isHidden ? (
                                      <span className="tournament-mgmt-page__badge">
                                        {t("tournamentManagement.hiddenBadge")}
                                      </span>
                                    ) : null}
                                    <span>{item.placementCount ?? 0} placements</span>
                                  </div>
                                </div>
                                <div className="tournament-mgmt-page__card-actions">
                                  <button
                                    type="button"
                                    className="btn-fill-danger"
                                    onClick={() => deleteTournament(item)}
                                  >
                                    {t("tournamentManagement.delete")}
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              ))}
              {!sortedTournaments.length ? (
                <p className="tournament-mgmt-page__empty">
                  {t("tournamentManagement.emptyList")}
                </p>
              ) : null}
            </div>
          </DragDropContext>
        </>
      )}

      {showCreatePopup ? (
        <TournamentFormPopup
          onClose={() => setShowCreatePopup(false)}
          onSubmit={createTournament}
          seriesOptions={seriesOptions}
        />
      ) : null}

      {managePopup ? (
        <TournamentManagementPopup
          tournamentId={managePopup.id}
          initialTab={managePopup.initialTab}
          onClose={closeManagePopup}
          onUpdated={loadTournaments}
          seriesOptions={seriesOptions}
          tierTemplates={templates}
        />
      ) : null}

      {globalTab === "unresolved" && (
        <div className="tournament-mgmt-page__panel">
          <div className="tournament-mgmt-page__actions">
            <button type="button" className="btn-fill-primary" onClick={resolveAllNames}>
              {t("tournamentManagement.autoLinkExact")}
            </button>
            <button type="button" className="btn-fill-secondary" onClick={loadUnresolved}>
              {t("tournamentManagement.refresh")}
            </button>
          </div>
          <div className="tournament-mgmt-page__list">
            {unresolved.map((row) => (
              <div key={row.id} className="tournament-mgmt-page__unresolved-row">
                <div>
                  <strong>{row.displayName}</strong>
                  <div className="tournament-mgmt-page__card-meta">
                    <span>{row.tournament?.shortName}</span>
                    <span className="tournament-mgmt-page__badge">
                      {row.tier?.code}
                    </span>
                    <span className="tournament-mgmt-page__badge">
                      {row.tournament?.track}
                    </span>
                  </div>
                </div>
                <div className="tournament-mgmt-page__unresolved-link">
                  <ProfileSelector
                    type={
                      row.tournament?.track === "creator" ? "charter" : "player"
                    }
                    value={null}
                    onChange={(profile) => linkUnresolved(row.id, profile)}
                  />
                </div>
              </div>
            ))}
            {!unresolved.length ? (
              <p className="tournament-mgmt-page__empty">
                {t("tournamentManagement.noUnresolved")}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {globalTab === "import" && (
        <div className="tournament-mgmt-page__panel">
          <div className="tournament-mgmt-page__fields">
            <div className="tournament-mgmt-page__field">
              <CustomSelect
                label={t("tournamentManagement.import.track")}
                options={importTrackOptions}
                value={findOption(importTrackOptions, importTrack)}
                onChange={(option) => setImportTrack(option?.value ?? "player")}
                width="100%"
                isSearchable={false}
              />
            </div>
          </div>
          <div className="tournament-mgmt-page__actions">
            <label className="btn-fill-secondary">
              {t("tournamentManagement.import.dryRun")}
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => runImport(e.target.files?.[0], true)}
              />
            </label>
            <label className="btn-fill-primary">
              {t("tournamentManagement.import.importCsv")}
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => runImport(e.target.files?.[0], false)}
              />
            </label>
          </div>
          {importReport ? (
            <pre className="tournament-mgmt-page__report">
              {JSON.stringify(importReport, null, 2)}
            </pre>
          ) : null}
        </div>
      )}

      {globalTab === "series" && (
        <div className="tournament-mgmt-page__panel">
          <div className="tournament-mgmt-page__fields">
            <div className="tournament-mgmt-page__field">
              <label htmlFor="series-slug">{t("tournamentManagement.series.slug")}</label>
              <input
                id="series-slug"
                value={seriesForm.slug}
                onChange={(e) =>
                  setSeriesForm((p) => ({ ...p, slug: e.target.value }))
                }
              />
            </div>
            <div className="tournament-mgmt-page__field">
              <label htmlFor="series-name">{t("tournamentManagement.series.name")}</label>
              <input
                id="series-name"
                value={seriesForm.name}
                onChange={(e) =>
                  setSeriesForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="tournament-mgmt-page__actions">
            <button
              type="button"
              className="btn-fill-primary"
              onClick={saveSeries}
              disabled={!canSaveSeries}
            >
              {editingSeriesId != null
                ? t("tournamentManagement.save")
                : t("tournamentManagement.createSeries")}
            </button>
            {editingSeriesId != null ? (
              <button type="button" className="btn-fill-secondary" onClick={resetSeriesForm}>
                {t("buttons.cancel", { ns: "common" })}
              </button>
            ) : null}
          </div>
          <DragDropContext onDragEnd={handleSeriesDragEnd}>
            <Droppable droppableId="tournament-series">
              {(provided) => (
                <div
                  className="tournament-mgmt-page__list"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {sortedSeriesList.map((s, index) => (
                    <Draggable
                      key={s.id}
                      draggableId={String(s.id)}
                      index={index}
                      isDragDisabled={isReorderingSeries}
                    >
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={[
                            "tournament-mgmt-page__card",
                            "tournament-mgmt-page__card--static",
                            editingSeriesId === s.id ? "is-selected" : "",
                            snapshot.isDragging ? "is-dragging" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div
                            className="tournament-mgmt-page__drag-handle"
                            aria-label={t("tournamentManagement.reorder.dragHandle")}
                            {...dragProvided.dragHandleProps}
                          >
                            <span
                              className="tournament-mgmt-page__drag-handle-grip"
                              aria-hidden="true"
                            >
                              ⋮⋮
                            </span>
                          </div>
                          <div className="tournament-mgmt-page__card-body">
                            <strong>{s.name}</strong>
                            <div className="tournament-mgmt-page__card-meta">
                              <span>{s.slug}</span>
                            </div>
                          </div>
                          <div className="tournament-mgmt-page__card-actions">
                            <button
                              type="button"
                              className="btn-fill-secondary"
                              onClick={() => startEditSeries(s)}
                            >
                              {t("buttons.edit", { ns: "common" })}
                            </button>
                            <button
                              type="button"
                              className="btn-fill-danger"
                              onClick={() => deleteSeries(s)}
                            >
                              {t("tournamentManagement.delete")}
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {!sortedSeriesList.length ? (
                    <p className="tournament-mgmt-page__empty">
                      {t("tournamentManagement.series.empty")}
                    </p>
                  ) : null}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}
    </div>
  );
};

export default TournamentManagementPage;
