import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import CurationTypeSelector from "@/components/account/CurationTypeSelector/CurationTypeSelector";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { CreatorStatusBadge } from "@/components/common/display";
import { ExternalLinkIcon } from "@/components/common/icons";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorStatGroups, buildCreatorCollapsedStatRows } from "@/utils/profileStatGroups";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import "./settingsSubPage.css";

const MAX_CREATOR_ALIASES = 20;

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

  const creatorDoc = profile?.creator || profile?.doc || profile;

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

  const handleDraftChange = useCallback((ids) => {
    setLiveDisplayIds(Array.isArray(ids) ? [...ids] : null);
  }, []);

  const handleDisplayCurationsSaved = useCallback((ids) => {
    setProfile((p) => (p && typeof p === "object" ? { ...p, displayCurationTypeIds: ids } : p));
    setLiveDisplayIds(null);
  }, []);

  const openPublicCreatorInNewTab = useCallback(() => {
    if (creatorId == null || !Number.isFinite(creatorId)) return;
    const url = `${window.location.origin}/creator/${creatorId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [creatorId]);

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
      toast.success(t("settings.creator.displayNameSuccess"));
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.displayNameError");
      setDisplayNameFieldError(msg);
      toast.error(msg);
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
    try {
      const { data } = await api.patch(`${import.meta.env.VITE_CREATORS_V3}/me/aliases`, {
        aliases: aliasList,
      });
      const next = Array.isArray(data?.aliases) ? data.aliases : [];
      setProfile((p) => {
        if (!p || typeof p !== "object") return p;
        return { ...p, aliases: next };
      });
      toast.success(t("settings.creator.aliasesSuccess"));
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.creator.aliasesError");
      setAliasFieldError(msg);
      toast.error(msg);
    } finally {
      setAliasSaving(false);
    }
  }, [aliasList, t]);

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
        <button
          type="button"
          className="settings-sub-page__btn btn-fill-secondary"
          onClick={() => navigate(`/creator/${creatorId}`)}
        >
          {t("settings.creator.openPublicProfile")}
        </button>
      </div>
    );
  }

  return (
    <div className="settings-sub-page">
      <div className="settings-sub-page__header-preview">
        <ProfileHeader
          mode="creator"
          className="settings-sub-page__profile-header"
          iconSlots={iconSlots}
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
              <CreatorStatusBadge status={creatorDoc.verificationStatus} size="medium" />
            ) : null
          }
          statRows={collapsedCreatorStatRows}
          actions={
            <button
              type="button"
              className="profile-header__action-btn"
              onClick={openPublicCreatorInNewTab}
              title={t("settings.creator.openPublicProfile")}
              aria-label={t("settings.creator.openPublicProfileNewTab")}
            >
              <ExternalLinkIcon color="var(--color-white)" size={24} />
            </button>
          }
        />
      </div>

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
              disabled={displayNameSaving}
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
              disabled={aliasSaving}
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

      <div className="settings-sub-page__block">
        <CurationTypeSelector
          creatorId={creatorId}
          curationTypeCounts={profile?.curationTypeCounts}
          displayCurationTypeIds={profile?.displayCurationTypeIds}
          curationTypesDict={curationTypesDict || {}}
          canEdit={canEditHeaderCurationSlots}
          onSaved={handleDisplayCurationsSaved}
          onDraftChange={handleDraftChange}
        />
      </div>
    </div>
  );
};

export default SettingsCreatorPage;
