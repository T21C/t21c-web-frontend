import { routes } from '@/api/routes';
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
import ProfileHeaderSurfaceEditor from "@/components/account/ProfileHeaderSurfaceEditor/ProfileHeaderSurfaceEditor";
import { BioCanvasEditorLauncher } from "@/components/account/BioCanvasEditor";
import {
  SettingsPreviewSection,
  SettingsSectionPreviewControls,
} from "@/components/account/SettingsPreviewSection/SettingsPreviewSection";
import {
  getEffectiveProfileBannerUrl,
  getEffectiveProfileHeaderSurface,
  isTufStellarAccessActive,
  normalizeTufStellarIconVariant,
  resolveStellarEntitlementSubject,
} from "@/utils/profileBanners";
import { isTufStellarEnabledForUser } from "@/utils/tufStellarFeature";
import { CreatorStatusBadge } from "@/components/common/display";
import { ExternalLinkIcon, ChevronIcon, InfoIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { SettingsSaveField } from "@/components/account/SettingsSaveField/SettingsSaveField";
import { SettingsStellarIconField } from "@/components/account/SettingsSaveField/SettingsStellarIconField";
import { CustomSelect } from "@/components/common/selectors";
import { useSettings } from "@/contexts/SettingsContext";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorStatGroups, buildCreatorCollapsedStatRows } from "@/utils/profileStatGroups";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import { getCreatorCurationTypesForHeaderPanel } from "@/utils/curationTypeUtils";
import {
  mergeOptimisticAliasNameList,
  mergeOptimisticAliasRows,
  normalizeProfileAliasNames,
  readProfileAliasNamesChronological,
} from "@/utils/profileAliasNames";
import "./settingsSubPage.css";

const MAX_CREATOR_ALIASES = 20;
const CREATOR_SELF_VERIFICATION = ["declined", "conditional", "allowed"];

function readAliasNamesFromProfile(profile) {
  return readProfileAliasNamesChronological(profile, profile?.name ?? profile?.creator?.name);
}

const SettingsCreatorPage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profileBannerExpanded, setProfileBannerExpanded, previewFocusSectionId } = useSettings();
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
  /** `undefined` = server; object/null = draft bio canvas */
  const [bioCanvasDraft, setBioCanvasDraft] = useState(undefined);
  const [uploadConditionsDraft, setUploadConditionsDraft] = useState("");
  const [uploadConditionsSaving, setUploadConditionsSaving] = useState(false);
  const [uploadConditionsFieldError, setUploadConditionsFieldError] = useState("");
  const [verificationDraft, setVerificationDraft] = useState("allowed");
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationFieldError, setVerificationFieldError] = useState("");
  const [bannerPresetDraft, setBannerPresetDraft] = useState(undefined);
  const [headerSurfaceStyleDraft, setHeaderSurfaceStyleDraft] = useState(undefined);
  const [stellarVariantDraft, setStellarVariantDraft] = useState(null);
  const [stellarVariantSaving, setStellarVariantSaving] = useState(false);

  useEffect(() => {
    if (creatorId == null || !Number.isFinite(creatorId)) {
      setLoading(false);
      setProfile(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    const url = `${routes.creatorsV3.root()}/${creatorId}/profile`;
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
    setBioCanvasDraft(undefined);
    setHeaderSurfaceStyleDraft(undefined);
    setStellarVariantDraft(null);
  }, [creatorId]);

  const creatorDoc = profile?.creator || profile?.doc || profile;
  const savedStellarVariant = useMemo(
    () =>
      normalizeTufStellarIconVariant(profile?.tufStellarIconVariant ?? creatorDoc?.tufStellarIconVariant),
    [profile?.tufStellarIconVariant, creatorDoc?.tufStellarIconVariant],
  );

  const previewStellarVariant = stellarVariantDraft ?? savedStellarVariant;
  const stellarVariantMatchesSaved = previewStellarVariant === savedStellarVariant;

  const previewDisplayName = useMemo(() => {
    const draft = displayNameDraft.trim();
    if (draft.length) return draft;
    return String(creatorDoc?.name ?? "");
  }, [displayNameDraft, creatorDoc?.name]);

  const previewVerificationStatus = CREATOR_SELF_VERIFICATION.includes(verificationDraft)
    ? verificationDraft
    : "allowed";

  const uploadConditionsPreview = uploadConditionsDraft.trim();

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

  const previewAliasNames = useMemo(
    () =>
      normalizeProfileAliasNames(
        { aliases: aliasList.map((name) => ({ name })) },
        previewDisplayName,
      ),
    [aliasList, previewDisplayName],
  );

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

  const creatorProfileUser = profile?.user || creatorDoc?.user;

  const stellarEntitlementSubject = useMemo(
    () => resolveStellarEntitlementSubject(user, creatorProfileUser),
    [user, creatorProfileUser],
  );

  const canUseBioCanvas = useMemo(
    () => isTufStellarEnabledForUser(user) && isTufStellarAccessActive(stellarEntitlementSubject),
    [user, stellarEntitlementSubject],
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
      subjectUser: creatorDoc.user,
    });
  }, [profile, creatorDoc?.user, user?.permissionFlags, bannerPresetDraft]);

  const settingsCreatorHeaderSurface = useMemo(() => {
    if (!profile) return { style: null, imageAssets: {} };
    const u = profile.user || creatorDoc?.user;
    const styleForSurface =
      headerSurfaceStyleDraft === undefined
        ? profile.profileHeaderSurfaceStyle
        : headerSurfaceStyleDraft;
    return getEffectiveProfileHeaderSurface({
      profileHeaderSurfaceStyle: styleForSurface,
      profileHeaderSurfaceImageAssets: profile.profileHeaderSurfaceImageAssets,
      subjectUser: u,
    });
  }, [profile, creatorDoc?.user, headerSurfaceStyleDraft]);

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
    const previousDisplayName = String(creatorDoc?.name ?? "").trim();
    setDisplayNameFieldError("");
    setDisplayNameSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${routes.creatorsV3.root()}/me/name`, {
        name: trimmed,
      });
      const nextName = typeof data?.name === "string" ? data.name : trimmed;
      const nextAliases = mergeOptimisticAliasRows(
        profile?.aliases,
        previousDisplayName,
        nextName,
      );
      const nextAliasNames = mergeOptimisticAliasNameList(
        aliasList,
        previousDisplayName,
        nextName,
      );
      setProfile((p) => {
        if (!p || typeof p !== "object") return p;
        return { ...p, name: nextName, aliases: nextAliases };
      });
      setAliasList(nextAliasNames);
      setDisplayNameDraft(nextName);
      toast.success(t("settings.creator.displayNameSuccess"), { id: toastId });
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.displayNameError");
      setDisplayNameFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setDisplayNameSaving(false);
    }
  }, [displayNameDraft, creatorId, creatorDoc?.name, profile?.aliases, aliasList, t]);

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
      const { data } = await api.patch(`${routes.creatorsV3.root()}/me/aliases`, {
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

  const handleSaveCreatorStellarVariant = useCallback(async () => {
    if (creatorId == null || !Number.isFinite(creatorId)) return;
    const v = previewStellarVariant;
    if (!["1", "2", "3"].includes(v) || stellarVariantMatchesSaved) return;
    setStellarVariantSaving(true);
    try {
      const { data } = await api.patch(
        `${routes.creatorsV3.root()}/${creatorId}/tuf-stellar-icon-variant`,
        { variant: v },
      );
      const next = normalizeTufStellarIconVariant(data?.tufStellarIconVariant ?? v);
      setProfile((p) => (p && typeof p === "object" ? { ...p, tufStellarIconVariant: next } : p));
      setStellarVariantDraft(null);
      toast.success(t("settings.creator.stellarIconSaved"));
    } catch (e) {
      const msg = e?.response?.data?.error || t("settings.creator.stellarIconError");
      toast.error(msg);
    } finally {
      setStellarVariantSaving(false);
    }
  }, [creatorId, previewStellarVariant, stellarVariantMatchesSaved, t]);

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
      const { data } = await api.patch(`${routes.creatorsV3.root()}/me/bio`, {
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
      const { data } = await api.patch(`${routes.creatorsV3.root()}/me/upload-conditions`, {
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
      const { data } = await api.patch(`${routes.creatorsV3.root()}/me/verification-status`, {
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
        <div className="loader-shell loader-shell--tall">
          <div className="loader loader-relative" />
        </div>
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
    <div
      className={
        previewFocusSectionId
          ? "settings-sub-page settings-sub-page--focus-preview"
          : "settings-sub-page"
      }
    >
      <div className="settings-sub-page__header-preview">
        <ProfileHeader
          mode="creator"
          className="settings-sub-page__profile-header"
          bannerUrl={settingsCreatorBannerUrl}
          headerSurfaceStyle={settingsCreatorHeaderSurface.style}
          headerSurfaceImageAssets={settingsCreatorHeaderSurface.imageAssets}
          iconSlots={iconSlots}
          creatorCurationPanelItems={creatorCurationPanelItems}
          avatarSubject={creatorDoc}
          stellarIconVariant={previewStellarVariant}
          aliasNames={previewAliasNames}
          name={previewDisplayName}
          handle={creatorDoc.user?.username}
          country={creatorDoc.user?.country || creatorDoc.country}
          badgeId={creatorDoc?.rank ?? creatorDoc?.chartsTotalRank}
          profileId={creatorDoc?.id}
          expandStatsAriaLabel={t("creators.profile.funFacts.expandAria")}
          collapseStatsAriaLabel={t("creators.profile.funFacts.collapseAria")}
          statGroups={statGroups}
          verificationBadge={
            previewVerificationStatus ? (
              <span className="settings-sub-page__verification-wrap">
                <CreatorStatusBadge status={previewVerificationStatus} size="medium" />
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

      <SettingsPreviewSection
        sectionId="headerSurface"
        className="settings-sub-page__banner-section"
        aria-labelledby="settings-creator-header-surface-heading"
      >
        <div className="settings-sub-page__header-surface-section-head">
          <h2
            id="settings-creator-header-surface-heading"
            className="settings-sub-page__banner-section-title"
          >
            {t("settings.headerSurface.sectionTitle")}
          </h2>
          <SettingsSectionPreviewControls
            sectionId="headerSurface"
            headingId="settings-creator-header-surface-heading"
            title={t("settings.headerSurface.sectionTitle")}
          />
        </div>
        <ProfileHeaderSurfaceEditor
            variant="creator"
            creatorId={creatorId}
            authUser={stellarEntitlementSubject}
            surfaceStyle={profile?.profileHeaderSurfaceStyle}
            styleDraft={headerSurfaceStyleDraft}
            onStyleDraftChange={setHeaderSurfaceStyleDraft}
            surfaceImageAssets={profile?.profileHeaderSurfaceImageAssets}
            onApplied={(patch) => {
              setProfile((p) => (p && typeof p === "object" ? { ...p, ...patch } : p));
              if (Object.prototype.hasOwnProperty.call(patch, "profileHeaderSurfaceStyle")) {
                setHeaderSurfaceStyleDraft(undefined);
              }
            }}
          profilePreviewProps={{
            mode: "creator",
            bannerUrl: settingsCreatorBannerUrl,
            headerSurfaceStyle: settingsCreatorHeaderSurface.style,
            headerSurfaceImageAssets: settingsCreatorHeaderSurface.imageAssets,
            iconSlots,
            creatorCurationPanelItems,
            avatarSubject: creatorDoc,
            stellarIconVariant: previewStellarVariant,
            aliasNames: previewAliasNames,
            name: previewDisplayName,
            handle: creatorDoc.user?.username,
            country: creatorDoc.user?.country || creatorDoc.country,
            badgeId: creatorDoc?.rank ?? creatorDoc?.chartsTotalRank,
            profileId: creatorDoc?.id,
            expandStatsAriaLabel: t("creators.profile.funFacts.expandAria"),
            collapseStatsAriaLabel: t("creators.profile.funFacts.collapseAria"),
            statGroups,
            statRows: collapsedCreatorStatRows,
          }}
        />
      </SettingsPreviewSection>

      <SettingsPreviewSection
        sectionId="banner"
        className="settings-sub-page__banner-section"
        aria-labelledby="settings-creator-banner-heading"
      >
        <div className="settings-sub-page__banner-section-head">
          <h2 id="settings-creator-banner-heading" className="settings-sub-page__banner-section-title">
            {t("settings.banner.sectionTitle")}
          </h2>
          <div className="settings-sub-page__section-head-actions">
            <SettingsSectionPreviewControls
              sectionId="banner"
              headingId="settings-creator-banner-heading"
              title={t("settings.banner.sectionTitle")}
            />
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
        </div>
        <Collapsible
          open={profileBannerExpanded}
          onOpenChange={setProfileBannerExpanded}
          revealOverflow
          duration="0.4s"
        >
          <CollapsibleContent
            id="settings-creator-banner-panel"
            className="settings-sub-page__banner-collapsible-region"
          >
        <div className="settings-sub-page__banner-collapsible">
          <ProfileBannerEditor
            variant="creator"
            showHeading={false}
            creatorId={creatorId}
            authUser={stellarEntitlementSubject}
            bannerPreset={profile?.bannerPreset}
            presetDraft={bannerPresetDraft}
            onPresetDraftChange={setBannerPresetDraft}
            customBannerUrl={profile?.customBannerUrl}
            onApplied={(patch) => setProfile((p) => (p && typeof p === "object" ? { ...p, ...patch } : p))}
          />
        </div>
          </CollapsibleContent>
        </Collapsible>
      </SettingsPreviewSection>

      {isTufStellarAccessActive(stellarEntitlementSubject) ? (
        <SettingsStellarIconField
          sectionId="stellar"
          headingId="settings-creator-stellar-heading"
          title={t("settings.creator.stellarIconTitle")}
          hint={t("settings.creator.stellarIconHint")}
          groupAriaLabel={t("settings.creator.stellarIconGroupAria")}
          value={previewStellarVariant}
          onChange={setStellarVariantDraft}
          onSave={handleSaveCreatorStellarVariant}
          saving={stellarVariantSaving}
          matchesSaved={stellarVariantMatchesSaved}
          getOptionAriaLabel={(id) => t(`settings.creator.stellarIconOption${id}`)}
        />
      ) : null}

      {canEditHeaderCurationSlots ? (
        <SettingsSaveField
          sectionId="displayName"
          label={t("settings.creator.displayNameLabel")}
          inputId="settings-creator-display-name"
          onSave={handleSaveCreatorDisplayName}
          saving={displayNameSaving}
          matchesSaved={displayNameMatchesSaved}
          fieldError={displayNameFieldError}
        >
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
        </SettingsSaveField>
      ) : null}

      <SettingsPreviewSection sectionId="curation" className="settings-sub-page__block">
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
      </SettingsPreviewSection>

      {canEditHeaderCurationSlots ? (
        <SettingsSaveField
          sectionId="bio"
          label={t("settings.creator.bioLabel")}
          inputId="settings-creator-bio"
          onSave={canUseBioCanvas ? undefined : handleSaveBio}
          saving={canUseBioCanvas ? false : bioSaving}
          matchesSaved={canUseBioCanvas ? true : bioMatchesSaved}
          fieldError={canUseBioCanvas ? "" : bioFieldError}
          stack
          hideActions={canUseBioCanvas}
          hidePreviewControls={canUseBioCanvas}
          collapsible={canUseBioCanvas}
        >
          {canUseBioCanvas ? (
            <BioCanvasEditorLauncher
              profileKind="creator"
              authUser={stellarEntitlementSubject}
              canvas={bioCanvasDraft !== undefined ? bioCanvasDraft : profile?.bioCanvas}
              canvasDraft={bioCanvasDraft}
              onCanvasDraftChange={setBioCanvasDraft}
              imageAssets={profile?.bioCanvasImageAssets}
              onApplied={(payload) => {
                setBioCanvasDraft(undefined);
                setProfile((p) =>
                  p && typeof p === "object"
                    ? {
                        ...p,
                        bioCanvas: payload.bioCanvas ?? null,
                        bioCanvasImageAssets: payload.bioCanvasImageAssets ?? null,
                        bio: payload.bio ?? null,
                      }
                    : p,
                );
              }}
            />
          ) : (
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
          )}
        </SettingsSaveField>
      ) : null}

      {canEditHeaderCurationSlots ? (
        <SettingsSaveField
          sectionId="uploadConditions"
          label={t("settings.creator.uploadConditionsLabel")}
          inputId="settings-creator-upload-conditions"
          onSave={handleSaveUploadConditions}
          saving={uploadConditionsSaving}
          matchesSaved={uploadConditionsMatchSaved}
          fieldError={uploadConditionsFieldError}
          stack
          sectionClassName="settings-sub-page__block settings-sub-page__field settings-sub-page__creator-upload-conditions"
        >
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
        </SettingsSaveField>
      ) : null}

      {canEditHeaderCurationSlots ? (
        <SettingsSaveField
          sectionId="verification"
          label={t("settings.creator.verificationLabel")}
          inputId="settings-creator-verification"
          onSave={handleSaveVerification}
          saving={verificationSaving}
          matchesSaved={verificationMatchesSaved}
          fieldError={verificationFieldError}
          controlRowClassName="settings-sub-page__control-row--verification"
          sectionClassName="settings-sub-page__block settings-sub-page__field settings-sub-page__creator-verification"
        >
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
        </SettingsSaveField>
      ) : null}

      {canEditHeaderCurationSlots ? (
        <SettingsPreviewSection sectionId="aliases" className="settings-sub-page__block settings-sub-page__aliases">
          <div className="settings-sub-page__field-head">
            <p className="settings-sub-page__aliases-section-label">{t("settings.creator.aliasesLabel")}</p>
            <SettingsSectionPreviewControls
              sectionId="aliases"
              headingId="settings-creator-aliases"
              title={t("settings.creator.aliasesLabel")}
            />
          </div>
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
        </SettingsPreviewSection>
      ) : null}

    </div>
  );
};

export default SettingsCreatorPage;
