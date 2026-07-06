// tuf-search: #TournamentManagementPage #tournamentManagementPage #admin #tournaments
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
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
  findOption,
  TRACK_OPTIONS,
} from "@/components/popups/Tournaments";
import "./tournamentManagement.css";

const GLOBAL_TABS = ["events", "unresolved", "import", "series"];

const TournamentManagementPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation("pages");
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
  const [showCreatePopup, setShowCreatePopup] = useState(false);

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
    loadTournaments().catch(() => toast.error("Failed to load tournaments"));
    loadSeries().catch(() => {});
    loadTemplates().catch(() => {});
  }, [isAdmin, loadTournaments, loadSeries, loadTemplates]);

  useEffect(() => {
    if (!isAdmin || globalTab !== "unresolved") return;
    loadUnresolved().catch(() => toast.error("Failed to load unresolved names"));
  }, [isAdmin, globalTab, loadUnresolved]);

  const trackFilterOptions = useMemo(
    () => [
      { value: "", label: t("tournamentManagement.allTracks") },
      ...TRACK_OPTIONS,
    ],
    [t],
  );

  const seriesOptions = useMemo(
    () => [
      { value: "", label: "None" },
      ...seriesList.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [seriesList],
  );

  const tierTemplateOptions = useMemo(
    () => [
      { value: "", label: "—" },
      ...templates.map((tpl) => ({ value: tpl.id, label: tpl.name })),
    ],
    [templates],
  );

  if (!isAdmin) {
    return (
      <>
        <MetaTags {...pageMeta} />
        <AccessDenied />
      </>
    );
  }

  const openManagePopup = (id, initialTab = "placements") => {
    setManagePopup({ id, initialTab });
  };

  const closeManagePopup = () => {
    setManagePopup(null);
  };

  const createTournament = async (createForm) => {
    const { data } = await api.post(routes.admin.tournaments.root(), {
      ...buildTournamentPayload(createForm, { forCreate: true }),
    });
    toast.success("Tournament created");
    setShowCreatePopup(false);
    await loadTournaments();
    openManagePopup(data.id, "placements");
  };

  const resolveAllNames = async () => {
    try {
      const { data } = await api.post(routes.admin.tournaments.resolveNames(), {
        track: trackFilter || undefined,
      });
      toast.success(`Linked ${data.linked} names`);
      await loadUnresolved();
      await loadTournaments();
    } catch {
      toast.error("Resolve failed");
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
      toast.success("Linked");
      await loadUnresolved();
    } catch {
      toast.error("Link failed");
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
      toast.success(dryRun ? "Dry run complete" : "Import complete");
      if (!dryRun) await loadTournaments();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Import failed");
    }
  };

  const createSeries = async () => {
    try {
      await api.post(routes.admin.tournaments.series(), seriesForm);
      toast.success("Series created");
      setSeriesForm({ slug: "", name: "" });
      await loadSeries();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to create series");
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

          <div className="tournament-mgmt-page__list">
            {tournaments.map((item) => (
              <div
                key={item.id}
                className={`tournament-mgmt-page__card${managePopup?.id === item.id ? " is-selected" : ""}`}
                onClick={() => openManagePopup(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openManagePopup(item.id);
                }}
                role="button"
                tabIndex={0}
              >
                <div>
                  <strong>{item.shortName}</strong>
                  <div className="tournament-mgmt-page__card-meta">
                    <span>{item.fullName}</span>
                    <span className="tournament-mgmt-page__badge">{item.track}</span>
                    <span className="tournament-mgmt-page__badge">{item.status}</span>
                    {item.isHidden ? (
                      <span className="tournament-mgmt-page__badge">hidden</span>
                    ) : null}
                    <span>{item.placementCount ?? 0} placements</span>
                  </div>
                </div>
              </div>
            ))}
            {!tournaments.length ? (
              <p className="tournament-mgmt-page__empty">
                {t("tournamentManagement.emptyList")}
              </p>
            ) : null}
          </div>
        </>
      )}

      {showCreatePopup ? (
        <TournamentFormPopup
          onClose={() => setShowCreatePopup(false)}
          onSubmit={createTournament}
          seriesOptions={seriesOptions}
          tierTemplateOptions={tierTemplateOptions}
        />
      ) : null}

      {managePopup ? (
        <TournamentManagementPopup
          tournamentId={managePopup.id}
          initialTab={managePopup.initialTab}
          onClose={closeManagePopup}
          onUpdated={loadTournaments}
          seriesOptions={seriesOptions}
          tierTemplateOptions={tierTemplateOptions}
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
                label="Track"
                options={TRACK_OPTIONS}
                value={findOption(TRACK_OPTIONS, importTrack)}
                onChange={(option) => setImportTrack(option?.value ?? "player")}
                width="100%"
                isSearchable={false}
              />
            </div>
          </div>
          <div className="tournament-mgmt-page__actions">
            <label className="btn-fill-secondary">
              Dry run CSV
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => runImport(e.target.files?.[0], true)}
              />
            </label>
            <label className="btn-fill-primary">
              Import CSV
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
              <label htmlFor="series-slug">Slug</label>
              <input
                id="series-slug"
                value={seriesForm.slug}
                onChange={(e) =>
                  setSeriesForm((p) => ({ ...p, slug: e.target.value }))
                }
              />
            </div>
            <div className="tournament-mgmt-page__field">
              <label htmlFor="series-name">Name</label>
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
            <button type="button" className="btn-fill-primary" onClick={createSeries}>
              {t("tournamentManagement.createSeries")}
            </button>
          </div>
          <div className="tournament-mgmt-page__list">
            {seriesList.map((s) => (
              <div key={s.id} className="tournament-mgmt-page__card tournament-mgmt-page__card--static">
                <div>
                  <strong>{s.name}</strong>
                  <div className="tournament-mgmt-page__card-meta">
                    <span>{s.slug}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManagementPage;
