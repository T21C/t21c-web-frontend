// tuf-search: #SettingsCreatorPage #settingsCreatorPage #account #settings
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import CurationTypeSelector from "@/components/account/CurationTypeSelector/CurationTypeSelector";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import ProfileBannerEditor from "@/components/account/ProfileBannerEditor/ProfileBannerEditor";
import { getEffectiveProfileBannerUrl } from "@/utils/profileBanners";
import { CreatorStatusBadge } from "@/components/common/display";
import { ExternalLinkIcon, ChevronIcon, InfoIcon } from "@/components/common/icons";
import { CustomSelect } from "@/components/common/selectors";
import { useSettings } from "@/contexts/SettingsContext";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorStatGroups, buildCreatorCollapsedStatRows } from "@/utils/profileStatGroups";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import { getCreatorCurationTypesForHeaderPanel } from "@/utils/curationTypeUtils";
import "./settingsSubPage.css";

const MAX_CREATOR_ALIASES = 20;
const CREATOR_SELF_VERIFICATION = ["declined", "conditional", "allowed"];

function readAliasNamesFromProfile(profile) {
  const raw = profile?.aliases;
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const a of raw) {
    const s = typeof a === "string" ? a : a?.name;
    if (typeof s === "string" && s.trim()) out.push(s.trim());
  }
  return out;
}

const SettingsCreatorPage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profileBannerExpanded, setProfileBannerExpanded } = useSettings();
  const { difficultyDict, curationTypesDict } = useDifficultyContext();
  const creatorId = user?.creatorId != null ? Number(user.creatorId) : null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** Live header badge ids while customizing; null = use saved profile ids only. */
  const [liveDisplayIds, setLiveDisplayIds] = useState(null);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameFieldError, setDisplayNameFieldError] = useState("");
  const [aliasList, setAliasList] = useState([]);
  const [newAliasInput, setNewAliasInput] = useState("");
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasFieldError, setAliasFieldError] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [bioFieldError, setBioFieldError] = useState("");
  const [uploadConditionsDraft, setUploadConditionsDraft] = useState("");
  const [uploadConditionsSaving, setUploadConditionsSaving] = useState(false);
  const [uploadConditionsFieldError, setUploadConditionsFieldError] = useState("");
  const [verificationDraft, setVerificationDraft] = useState("allowed");
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationFieldError, setVerificationFieldError] = useState("");
  const [bannerPresetDraft, setBannerPresetDraft] = useState(undefined);

  useEffect(() => {
    if (creatorId == null || !Number.isFinite(creatorId)) {
      setLoading(false);
      setProfile(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    const url = `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/profile`;
    api
      .get(url)
      .then((res) => {
        if (!mounted) return;
        setProfile(res.data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.status === 404 ? "not_found" : "error");
        setProfile(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [creatorId]);

  useEffect(() => {
    setLiveDisplayIds(null);
  }, [creatorId, profile?.displayCurationTypeIds]);

  useEffect(() => {
    setBannerPresetDraft(undefined);
  }, [creatorId]);

  const creatorDoc = profile?.creator || profile?.doc || profile;
  const uploadConditionsPreview =
    typeof uploadConditionsDraft === "string" && uploadConditionsDraft.trim().length > 0
      ? uploadConditionsDraft.trim()
      : "";

  useEffect(() => {
    if (!creatorDoc) return;
    setDisplayNameDraft(String(creatorDoc.name ?? ""));
    setDisplayNameFieldError("");
  }, [creatorDoc?.id, creatorDoc?.name]);

  useEffect(() => {
    if (!profile || loading) return;
    setAliasList(readAliasNamesFromProfile(profile));
    setAliasFieldError("");
  }, [creatorId, loading, profile]);

  useEffect(() => {
    if (!profile) return;
    setBioDraft(typeof profile.bio === "string" ? profile.bio : "");
    setBioFieldError("");
  }, [profile?.bio, creatorId]);

  useEffect(() => {
    if (!profile) return;
    setUploadConditionsDraft(
      typeof profile.uploadConditions === "string" ? profile.uploadConditions : "",
    );
    setUploadConditionsFieldError("");
  }, [profile?.uploadConditions, creatorId]);

  useEffect(() => {
    if (!profile) return;
    const vs = profile.verificationStatus;
    setVerificationDraft(
      typeof vs === "string" && CREATOR_SELF_VERIFICATION.includes(vs) ? vs : "allowed",
    );
    setVerificationFieldError("");
  }, [profile?.verificationStatus, creatorId]);

  const verificationSelfOptions = useMemo(
    () =>
      CREATOR_SELF_VERIFICATION.map((s) => ({
        value: s,
        label: t(`verification.${s}`, { ns: "common" }),
      })),
    [t],
  );

  const canEditHeaderCurationSlots = useMemo(() => {
    if (!user || !creatorDoc || creatorId == null) return false;
    const linkedCreator = user.creatorId != null && Number(user.creatorId) === creatorId;
    const linkedUser = creatorDoc.user?.id && user.id === creatorDoc.user.id;
    return (
      linkedCreator ||
      Boolean(linkedUser) ||
      hasFlag(user, permissionFlags.SUPER_ADMIN) ||
      hasFlag(user, permissionFlags.HEAD_CURATOR)
    );
  }, [user, creatorDoc, creatorId]);

  const statGroups = useMemo(
    () => buildCreatorStatGroups(profile?.funFacts, t, difficultyDict || {}),
    [profile?.funFacts, t, difficultyDict],
  );

  const effectiveDisplayIds = liveDisplayIds ?? profile?.displayCurationTypeIds;

  const iconSlots = useMemo(
    () =>
      buildCreatorIconSlots(
        profile?.curationTypeCounts,
        curationTypesDict || {},
        effectiveDisplayIds,
      ),
    [profile?.curationTypeCounts, curationTypesDict, effectiveDisplayIds],
  );

  const creatorCurationPanelItems = useMemo(
    () => getCreatorCurationTypesForHeaderPanel(profile?.curationTypeCounts, curationTypesDict || {}),
    [profile?.curationTypeCounts, curationTypesDict],
  );

  const settingsCreatorBannerUrl = useMemo(() => {
    if (!profile) return null;
    const u = profile.user || creatorDoc?.user;
    const flags = u?.permissionFlags ?? user?.permissionFlags ?? 0;
    const effectiveBannerPreset =
      bannerPresetDraft === undefined
        ? profile.bannerPreset ?? null
        : bannerPresetDraft === null
          ? null
          : bannerPresetDraft;
    return getEffectiveProfileBannerUrl({
      bannerPreset: effectiveBannerPreset,
      customBannerUrl: profile.customBannerUrl,
      subjectUser: { permissionFlags: flags },
    });
  }, [profile, creatorDoc?.user, user?.permissionFlags, bannerPresetDraft]);

  const handleDraftChange = useCallback((ids) => {
    setLiveDisplayIds(Array.isArray(ids) ? [...ids] : null);
  }, []);

  const handleDisplayCurationsSaved = useCallback((ids) => {
    setProfile((p) => (p && typeof p === "object" ? { ...p, displayCurationTypeIds: ids } : p));
    setLiveDisplayIds(null);
  }, []);

  const handleSaveCreatorDisplayName = useCallback(async () => {
    const trimmed = displayNameDraft.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      setDisplayNameFieldError(
        trimmed.length < 2
          ? t("settings.creator.displayNameTooShort")
          : t("settings.creator.displayNameTooLong"),
      );
      return;
    }
    if (creatorId == null || !Number.isFinite(creatorId)) return;
    setDisplayNameFieldError("");
    setDisplayNameSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${import.meta.env.VITE_CREATORS_V3}/me/name`, {
        name: trimmed,
      });
      const nextName = typeof data?.name === "string" ? data.name : trimmed;
      setProfile((p) => {
        if (!p || typeof p !== "object") return p;
        return { ...p, name: nextName };
      });
      setDisplayNameDraft(nextName);
      toast.success(t("settings.creator.displayNameSuccess"), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.displayNameError");
      setDisplayNameFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setDisplayNameSaving(false);
    }
  }, [displayNameDraft, creatorId, t]);

  const handleAddAlias = useCallback(() => {
    const trimmed = newAliasInput.trim();
    if (trimmed.length < 2) {
      toast.error(t("settings.creator.aliasesTooShort"));
      return;
    }
    if (trimmed.length > 100) {
      toast.error(t("settings.creator.displayNameTooLong"));
      return;
    }
    if (aliasList.length >= MAX_CREATOR_ALIASES) {
      toast.error(t("settings.creator.aliasesMax", { max: MAX_CREATOR_ALIASES }));
      return;
    }
    const key = trimmed.toLowerCase();
    if (aliasList.some((a) => a.toLowerCase() === key)) {
      toast.error(t("settings.creator.aliasesDuplicate"));
      return;
    }
    if (displayNameDraft.trim().toLowerCase() === key) {
      toast.error(t("settings.creator.aliasesMatchesDisplay"));
      return;
    }
    setAliasList((prev) => [...prev, trimmed]);
    setNewAliasInput("");
    setAliasFieldError("");
  }, [newAliasInput, aliasList, displayNameDraft, t]);

  const handleRemoveAlias = useCallback((name) => {
    setAliasList((prev) => prev.filter((a) => a !== name));
    setAliasFieldError("");
  }, []);

  const handleSaveAliases = useCallback(async () => {
    setAliasFieldError("");
    setAliasSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${import.meta.env.VITE_CREATORS_V3}/me/aliases`, {
        aliases: aliasList,
      });
      const next = Array.isArray(data?.aliases) ? data.aliases : [];
      setProfile((p) => {
        if (!p || typeof p !== "object") return p;
        return { ...p, aliases: next };
      });
      toast.success(t("settings.creator.aliasesSuccess"), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.aliasesError");
      setAliasFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setAliasSaving(false);
    }
  }, [aliasList, t]);

  const handleSaveBio = useCallback(async () => {
    if (creatorId == null || !Number.isFinite(creatorId)) return;
    const trimmed = bioDraft.trim();
    if (trimmed.length > 2000) {
      setBioFieldError(t("settings.creator.bioTooLong"));
      return;
    }
    setBioFieldError("");
    setBioSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${import.meta.env.VITE_CREATORS_V3}/me/bio`, {
        bio: trimmed.length ? trimmed : null,
      });
      const nextBio = typeof data?.bio === "string" ? data.bio : "";
      setBioDraft(nextBio);
      setProfile((p) => (p && typeof p === "object" ? { ...p, bio: trimmed.length ? trimmed : null } : p));
      toast.success(t("settings.creator.bioSuccess"), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.bioError");
      setBioFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setBioSaving(false);
    }
  }, [creatorId, bioDraft, t]);

  const handleSaveUploadConditions = useCallback(async () => {
    if (creatorId == null || !Number.isFinite(creatorId)) return;
    const trimmed = uploadConditionsDraft.trim();
    if (trimmed.length > 2000) {
      setUploadConditionsFieldError(t("settings.creator.uploadConditionsTooLong"));
      return;
    }
    setUploadConditionsFieldError("");
    setUploadConditionsSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${import.meta.env.VITE_CREATORS_V3}/me/upload-conditions`, {
        uploadConditions: trimmed.length ? trimmed : null,
      });
      const next =
        typeof data?.uploadConditions === "string"
          ? data.uploadConditions
          : trimmed.length
            ? trimmed
            : "";
      setUploadConditionsDraft(next);
      setProfile((p) =>
        p && typeof p === "object"
          ? { ...p, uploadConditions: trimmed.length ? trimmed : null }
          : p,
      );
      toast.success(t("settings.creator.uploadConditionsSuccess"), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.uploadConditionsError");
      setUploadConditionsFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setUploadConditionsSaving(false);
    }
  }, [creatorId, uploadConditionsDraft, t]);

  const handleSaveVerification = useCallback(async () => {
    if (creatorId == null || !Number.isFinite(creatorId)) return;
    if (!CREATOR_SELF_VERIFICATION.includes(verificationDraft)) {
      setVerificationFieldError(t("settings.creator.verificationError"));
      return;
    }
    setVerificationFieldError("");
    setVerificationSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${import.meta.env.VITE_CREATORS_V3}/me/verification-status`, {
        verificationStatus: verificationDraft,
      });
      const next = typeof data?.verificationStatus === "string" ? data.verificationStatus : verificationDraft;
      setVerificationDraft(
        CREATOR_SELF_VERIFICATION.includes(next) ? next : "allowed",
      );
      setProfile((p) => (p && typeof p === "object" ? { ...p, verificationStatus: next } : p));
      toast.success(t("settings.creator.verificationSuccess"), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.verificationError");
      setVerificationFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setVerificationSaving(false);
    }
  }, [creatorId, verificationDraft, t]);

  const displayNameMatchesSaved = useMemo(() => {
    const saved = String(creatorDoc?.name ?? "").trim();
    return displayNameDraft.trim() === saved;
  }, [creatorDoc?.name, displayNameDraft]);

  const bioMatchesSaved = useMemo(() => {
    const saved = profile?.bio == null ? "" : String(profile.bio);
    return bioDraft.trim() === saved.trim();
  }, [profile?.bio, bioDraft]);

  const uploadConditionsMatchSaved = useMemo(() => {
    const saved = profile?.uploadConditions == null ? "" : String(profile.uploadConditions);
    return uploadConditionsDraft.trim() === saved.trim();
  }, [profile?.uploadConditions, uploadConditionsDraft]);

  const verificationMatchesSaved = useMemo(() => {
    const vs = profile?.verificationStatus;
    const saved =
      typeof vs === "string" && CREATOR_SELF_VERIFICATION.includes(vs) ? vs : "allowed";
    return verificationDraft === saved;
  }, [profile?.verificationStatus, verificationDraft]);

  const aliasesMatchSaved = useMemo(() => {
    const saved = readAliasNamesFromProfile(profile);
    if (saved.length !== aliasList.length) return false;
    const norm = (arr) =>
      [...arr]
        .map((s) => s.trim().toLowerCase())
        .sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" }));
    const a = norm(saved);
    const b = norm(aliasList);
    return a.every((v, i) => v === b[i]);
  }, [profile, aliasList]);

  const stats = profile?.stats || creatorDoc;
  const collapsedCreatorStatRows = useMemo(
    () => buildCreatorCollapsedStatRows(stats, profile?.funFacts, t),
    [stats, profile?.funFacts, t],
  );

  if (!user?.creatorId) {
    return (
      <div className="settings-sub-page">
        <h2 className="settings-sub-page__title">{t("settings.creator.noCreatorTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.creator.noCreatorBody")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="settings-sub-page settings-sub-page--centered">
        <div className="loader loader-level-detail" />
      </div>
    );
  }

  if (error || !creatorDoc) {
    return (
      <div className="settings-sub-page">
        <h2 className="settings-sub-page__title">{t("settings.creator.loadErrorTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.creator.loadErrorBody")}</p>
        <Link className="settings-sub-page__btn btn-fill-secondary" to={`/creator/${creatorId}`}>
          {t("settings.creator.openPublicProfile")}
        </Link>
      </div>
    );
  }

  return (
    <div className="settings-sub-page">
      <div className="settings-sub-page__header-preview">
        <ProfileHeader
          mode="creator"
          className="settings-sub-page__profile-header"
          bannerUrl={settingsCreatorBannerUrl}
          iconSlots={iconSlots}
          creatorCurationPanelItems={creatorCurationPanelItems}
          avatarUrl={creatorDoc.user?.avatarUrl}
          fallbackAvatarUrl=""
          name={creatorDoc.name}
          handle={creatorDoc.user?.username}
          country={creatorDoc.user?.country || creatorDoc.country}
          badgeId={creatorDoc.id}
          badgeLabel="ID:"
          expandStatsAriaLabel={t("creators.profile.funFacts.expandAria")}
          collapseStatsAriaLabel={t("creators.profile.funFacts.collapseAria")}
          statGroups={statGroups}
          verificationBadge={
            creatorDoc.verificationStatus ? (
              <span className="settings-sub-page__verification-wrap">
                <CreatorStatusBadge status={creatorDoc.verificationStatus} size="medium" />
                {uploadConditionsPreview ? (
                  <>
                    <button
                      type="button"
                      className="settings-sub-page__upload-conditions-trigger"
                      data-tooltip-id={`settings-creator-upload-conditions-${creatorId}`}
                      aria-label={t("creators.profile.uploadConditions.tooltipAria")}
                    >
                      <InfoIcon color="var(--color-white-t80)" size={20} />
                    </button>
                    <Tooltip
                      id={`settings-creator-upload-conditions-${creatorId}`}
                      place="bottom"
                      className="settings-sub-page__upload-conditions-tooltip"
                      style={{ maxWidth: "min(28rem, 92vw)", zIndex: 20 }}
                    >
                      {uploadConditionsPreview}
                    </Tooltip>
                  </>
                ) : null}
              </span>
            ) : null
          }
          statRows={collapsedCreatorStatRows}
          actions={
            <Link
              className="profile-header__action-btn"
              to={`/creator/${creatorId}`}
              title={t("settings.creator.openPublicProfile")}
              aria-label={t("settings.creator.openPublicProfile")}
            >
              <ExternalLinkIcon color="var(--color-white)" size={24} />
            </Link>
          }
        />
      </div>

      <section className="settings-sub-page__banner-section" aria-labelledby="settings-creator-banner-heading">
        <div className="settings-sub-page__banner-section-head">
          <h2 id="settings-creator-banner-heading" className="settings-sub-page__banner-section-title">
            {t("settings.banner.sectionTitle")}
          </h2>
          <button
            type="button"
            className="settings-sub-page__banner-chevron"
            aria-expanded={profileBannerExpanded}
            aria-controls="settings-creator-banner-panel"
            aria-label={
              profileBannerExpanded
                ? t("settings.banner.sectionCollapseAria")
                : t("settings.banner.sectionExpandAria")
            }
            onClick={() => setProfileBannerExpanded((v) => !v)}
          >
            <ChevronIcon direction={profileBannerExpanded ? "down" : "right"} />
          </button>
        </div>
        <div
          id="settings-creator-banner-panel"
          className={
            profileBannerExpanded
              ? "settings-sub-page__banner-collapsible"
              : "settings-sub-page__banner-collapsible settings-sub-page__banner-collapsible--collapsed"
          }
        >
          <ProfileBannerEditor
            variant="creator"
            showHeading={false}
            creatorId={creatorId}
            authUser={user}
            bannerPreset={profile?.bannerPreset}
            presetDraft={bannerPresetDraft}
            onPresetDraftChange={setBannerPresetDraft}
            customBannerUrl={profile?.customBannerUrl}
            onApplied={(patch) => setProfile((p) => (p && typeof p === "object" ? { ...p, ...patch } : p))}
          />
        </div>
      </section>

      {canEditHeaderCurationSlots ? (
        <div className="settings-sub-page__block settings-sub-page__field">
          <label htmlFor="settings-creator-display-name">{t("settings.creator.displayNameLabel")}</label>
          <div className="settings-sub-page__control-row">
            <input
              id="settings-creator-display-name"
              type="text"
              autoComplete="off"
              className="settings-sub-page__input"
              maxLength={100}
              placeholder={t("settings.creator.displayNamePlaceholder")}
              value={displayNameDraft}
              onChange={(ev) => {
                setDisplayNameDraft(ev.target.value);
                if (displayNameFieldError) setDisplayNameFieldError("");
              }}
              disabled={displayNameSaving}
            />
            <button
              type="button"
              className="settings-sub-page__save-btn"
              onClick={handleSaveCreatorDisplayName}
              disabled={displayNameSaving || displayNameMatchesSaved}
            >
              {displayNameSaving ? t("buttons.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
            </button>
          </div>
          {displayNameFieldError ? (
            <p className="settings-sub-page__field-error" role="alert">
              {displayNameFieldError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="settings-sub-page__block">
        <CurationTypeSelector
          creatorId={creatorId}
          curationTypeCounts={profile?.curationTypeCounts}
          displayCurationTypeIds={profile?.displayCurationTypeIds}
          curationTypesDict={curationTypesDict || {}}
          canEdit={canEditHeaderCurationSlots}
          onSaved={handleDisplayCurationsSaved}
          onDraftChange={handleDraftChange}
          embeddedSectionLabel={t("settings.creator.curationBadges.sectionLabel")}
        />
      </div>

      {canEditHeaderCurationSlots ? (
        <div className="settings-sub-page__block settings-sub-page__field">
          <label htmlFor="settings-creator-bio">{t("settings.creator.bioLabel")}</label>
          <div className="settings-sub-page__control-row settings-sub-page__control-row--stack">
            <textarea
              id="settings-creator-bio"
              className="settings-sub-page__textarea"
              maxLength={2000}
              placeholder={t("settings.creator.bioPlaceholder")}
              value={bioDraft}
              onChange={(ev) => {
                setBioDraft(ev.target.value);
                if (bioFieldError) setBioFieldError("");
              }}
              disabled={bioSaving}
              rows={5}
            />
            <button
              type="button"
              className="settings-sub-page__save-btn"
              onClick={handleSaveBio}
              disabled={bioSaving || bioMatchesSaved}
            >
              {bioSaving ? t("buttons.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
            </button>
          </div>
          {bioFieldError ? (
            <p className="settings-sub-page__field-error" role="alert">
              {bioFieldError}
            </p>
          ) : null}
        </div>
      ) : null}

      {canEditHeaderCurationSlots ? (
        <div className="settings-sub-page__block settings-sub-page__field settings-sub-page__creator-upload-conditions">
          <label htmlFor="settings-creator-upload-conditions">
            {t("settings.creator.uploadConditionsLabel")}
          </label>
          <div className="settings-sub-page__control-row settings-sub-page__control-row--stack">
            <textarea
              id="settings-creator-upload-conditions"
              className="settings-sub-page__textarea"
              maxLength={2000}
              placeholder={t("settings.creator.uploadConditionsPlaceholder")}
              value={uploadConditionsDraft}
              onChange={(ev) => {
                setUploadConditionsDraft(ev.target.value);
                if (uploadConditionsFieldError) setUploadConditionsFieldError("");
              }}
              disabled={uploadConditionsSaving}
              rows={5}
            />
            <button
              type="button"
              className="settings-sub-page__save-btn"
              onClick={handleSaveUploadConditions}
              disabled={uploadConditionsSaving || uploadConditionsMatchSaved}
            >
              {uploadConditionsSaving
                ? t("buttons.saving", { ns: "common" })
                : t("buttons.save", { ns: "common" })}
            </button>
          </div>
          {uploadConditionsFieldError ? (
            <p className="settings-sub-page__field-error" role="alert">
              {uploadConditionsFieldError}
            </p>
          ) : null}
        </div>
      ) : null}

      {canEditHeaderCurationSlots ? (
        <div className="settings-sub-page__block settings-sub-page__field settings-sub-page__creator-verification">
          <label htmlFor="settings-creator-verification">{t("settings.creator.verificationLabel")}</label>
          <div className="settings-sub-page__control-row settings-sub-page__control-row--verification">
            <CustomSelect
              inputId="settings-creator-verification"
              options={verificationSelfOptions}
              value={verificationSelfOptions.find((o) => o.value === verificationDraft) ?? null}
              onChange={(opt) => {
                setVerificationDraft(opt?.value || "allowed");
                if (verificationFieldError) setVerificationFieldError("");
              }}
              placeholder={t("settings.creator.verificationPlaceholder")}
              width="min(100%, 22rem)"
              isDisabled={verificationSaving}
            />
            <button
              type="button"
              className="settings-sub-page__save-btn"
              onClick={handleSaveVerification}
              disabled={verificationSaving || verificationMatchesSaved}
            >
              {verificationSaving
                ? t("buttons.saving", { ns: "common" })
                : t("buttons.save", { ns: "common" })}
            </button>
          </div>
          {verificationFieldError ? (
            <p className="settings-sub-page__field-error" role="alert">
              {verificationFieldError}
            </p>
          ) : null}
        </div>
      ) : null}

      {canEditHeaderCurationSlots ? (
        <div className="settings-sub-page__block settings-sub-page__aliases">
          <p className="settings-sub-page__aliases-section-label">{t("settings.creator.aliasesLabel")}</p>
          <p className="settings-sub-page__aliases-hint">
            {t("settings.creator.aliasesHint", { max: MAX_CREATOR_ALIASES })}
          </p>
          <div className="settings-sub-page__alias-toolbar">
            <div className="settings-sub-page__alias-input-wrap">
              <input
                type="text"
                autoComplete="off"
                className="settings-sub-page__input"
                maxLength={100}
                placeholder={t("settings.creator.aliasesPlaceholder")}
                value={newAliasInput}
                onChange={(ev) => {
                  setNewAliasInput(ev.target.value);
                  if (aliasFieldError) setAliasFieldError("");
                }}
                disabled={aliasSaving}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    handleAddAlias();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="settings-sub-page__alias-add-btn"
              onClick={handleAddAlias}
              disabled={aliasSaving || aliasList.length >= MAX_CREATOR_ALIASES}
            >
              {t("settings.creator.aliasesAdd")}
            </button>
            <button
              type="button"
              className="settings-sub-page__save-btn"
              onClick={handleSaveAliases}
              disabled={aliasSaving || aliasesMatchSaved}
            >
              {aliasSaving ? t("buttons.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
            </button>
          </div>
          {aliasList.length > 0 ? (
            <div className="settings-sub-page__aliases-chips">
              {aliasList.map((name) => (
                <span key={name} className="settings-sub-page__alias-chip">
                  {name}
                  <button
                    type="button"
                    className="settings-sub-page__alias-chip-remove"
                    onClick={() => handleRemoveAlias(name)}
                    disabled={aliasSaving}
                    aria-label={t("settings.creator.aliasesRemoveAria", { name })}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {aliasFieldError ? (
            <p className="settings-sub-page__field-error" role="alert">
              {aliasFieldError}
            </p>
          ) : null}
        </div>
      ) : null}

    </div>
  );
};

export default SettingsCreatorPage;
