import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { DEFAULT_PROFILE_BANNER_PRESET_PATH } from "@/constants/bannerPresets";
import { customProfileBannersEnabled, publicAssetUrl } from "@/utils/profileBanners";
import { isCdnSupportedImageMimeType } from "@/constants/cdnImageAccept";
import ImageSelectorPopup from "@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup";
import "./profileBannerEditor.css";

const BANNER_OUTPUT_MAX_WIDTH = 1920;
const BANNER_OUTPUT_MAX_HEIGHT = 1920;

function manifestUrl() {
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const path = "banners/manifest.json";
  if (!base || base === "/") {
    return `/${path}`.replace(/([^:]\/)\/+/g, "$1");
  }
  return `${base}/${path}`.replace(/([^:]\/)\/+/g, "$1");
}

function normalizeServerPreset(p) {
  if (typeof p === "string" && p.trim()) return p.trim();
  return null;
}

/**
 * Preset + optional custom banner controls for player or creator settings.
 * Free presets: local draft via `presetDraft` / `onPresetDraftChange` (preview in parent); API on Save only.
 *
 * @param {{
 *   presetDraft: string | null | undefined,
 *   onPresetDraftChange: (next: string | null | undefined) => void,
 * }} _
 */
const ProfileBannerEditor = ({
  variant,
  creatorId = null,
  authUser,
  bannerPreset,
  presetDraft,
  onPresetDraftChange,
  customBannerUrl,
  onApplied,
  showHeading = true,
}) => {
  const { t } = useTranslation(["pages", "common"]);
  const [presetSaveBusy, setPresetSaveBusy] = useState(false);
  const [customBusy, setCustomBusy] = useState(false);
  const [manifestPresets, setManifestPresets] = useState([]);
  const [manifestStatus, setManifestStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setManifestStatus("loading");
      try {
        const res = await fetch(manifestUrl(), { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = Array.isArray(data?.presets) ? data.presets.filter((x) => typeof x === "string") : [];
        if (!cancelled) {
          setManifestPresets(list.length ? list : [DEFAULT_PROFILE_BANNER_PRESET_PATH]);
          setManifestStatus("ok");
        }
      } catch {
        if (!cancelled) {
          setManifestPresets([DEFAULT_PROFILE_BANNER_PRESET_PATH]);
          setManifestStatus("error");
          toast.error(t("settings.banner.manifestLoadError"));
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const serverNorm = useMemo(() => normalizeServerPreset(bannerPreset), [bannerPreset]);

  const selectedPath = useMemo(() => {
    const serverVisual = serverNorm ?? DEFAULT_PROFILE_BANNER_PRESET_PATH;
    if (presetDraft === undefined) return serverVisual;
    if (presetDraft === null) return DEFAULT_PROFILE_BANNER_PRESET_PATH;
    return presetDraft;
  }, [serverNorm, presetDraft]);

  const displayPresets = useMemo(() => {
    const ordered = [...manifestPresets];
    if (selectedPath && !ordered.includes(selectedPath)) {
      ordered.unshift(selectedPath);
    }
    return ordered;
  }, [manifestPresets, selectedPath]);

  const hasPresetChanges = useMemo(() => {
    if (presetDraft === undefined) return false;
    if (presetDraft === null) return serverNorm !== null;
    return presetDraft !== serverNorm;
  }, [presetDraft, serverNorm]);

  const clearPresetDraft = useCallback(() => {
    onPresetDraftChange(null);
  }, [onPresetDraftChange]);

  const canEditCustom = (() => {
    if (!customProfileBannersEnabled()) return false;
    if (!authUser) return false;
    if (variant === "player") {
      return (
        hasFlag(authUser, permissionFlags.CUSTOM_PROFILE_BANNER) ||
        hasFlag(authUser, permissionFlags.SUPER_ADMIN)
      );
    }
    return (
      hasFlag(authUser, permissionFlags.CUSTOM_PROFILE_BANNER) ||
      hasFlag(authUser, permissionFlags.SUPER_ADMIN) ||
      hasFlag(authUser, permissionFlags.HEAD_CURATOR)
    );
  })();

  const customUrl = typeof customBannerUrl === "string" && customBannerUrl.trim() ? customBannerUrl.trim() : "";
  const hasStoredCustom = Boolean(customUrl);
  const customUploadId = useId();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);

  const applyPatch = useCallback(
    (patch) => {
      onApplied?.(patch);
    },
    [onApplied],
  );

  const savePresetToServer = useCallback(async () => {
    if (!hasPresetChanges || presetDraft === undefined) return;
    setPresetSaveBusy(true);
    try {
      if (variant === "player") {
        if (presetDraft === null) {
          await api.delete(`${import.meta.env.VITE_PROFILE}/player/banner-preset`);
          applyPatch({ bannerPreset: null });
        } else {
          const { data } = await api.patch(`${import.meta.env.VITE_PROFILE}/player/banner-preset`, {
            preset: presetDraft,
          });
          applyPatch({ bannerPreset: data?.bannerPreset ?? presetDraft });
        }
      } else if (creatorId != null && Number.isFinite(creatorId)) {
        if (presetDraft === null) {
          await api.delete(`${import.meta.env.VITE_CREATORS_V3}/${creatorId}/banner-preset`);
          applyPatch({ bannerPreset: null });
        } else {
          const { data } = await api.patch(
            `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/banner-preset`,
            { preset: presetDraft },
          );
          applyPatch({ bannerPreset: data?.bannerPreset ?? presetDraft });
        }
      }
      onPresetDraftChange(undefined);
      toast.success(t("settings.banner.presetSaved"));
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.banner.presetError");
      toast.error(msg);
    } finally {
      setPresetSaveBusy(false);
    }
  }, [variant, creatorId, hasPresetChanges, presetDraft, applyPatch, onPresetDraftChange, t]);

  const uploadCustom = useCallback(
    async (file) => {
      if (!file || !canEditCustom) return;
      setCustomBusy(true);
      const body = new FormData();
      body.append("banner", file);
      try {
        if (variant === "player") {
          const { data } = await api.post(`${import.meta.env.VITE_PROFILE}/player/banner-custom`, body);
          applyPatch({
            customBannerUrl: data?.customBannerUrl ?? null,
            customBannerId: data?.customBannerId ?? null,
          });
        } else if (creatorId != null && Number.isFinite(creatorId)) {
          const { data } = await api.post(
            `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/banner-custom`,
            body,
          );
          applyPatch({
            customBannerUrl: data?.customBannerUrl ?? null,
            customBannerId: data?.customBannerId ?? null,
          });
        }
        toast.success(t("settings.banner.uploadOk"));
      } catch (err) {
        const msg = err?.response?.data?.error || t("settings.banner.uploadError");
        toast.error(msg);
      } finally {
        setCustomBusy(false);
      }
    },
    [variant, creatorId, canEditCustom, applyPatch, t],
  );

  const openCropperWithFile = useCallback(
    (file) => {
      if (!file || !canEditCustom || customBusy) return;
      if (!isCdnSupportedImageMimeType(file.type)) {
        toast.error(t("settings.banner.invalidFileType"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImage(reader.result);
        setCropperOpen(true);
      };
      reader.onerror = () => {
        toast.error(t("settings.banner.uploadError"));
      };
      reader.readAsDataURL(file);
    },
    [canEditCustom, customBusy, t],
  );

  const handleFileChange = useCallback(
    (ev) => {
      const f = ev.target.files?.[0];
      ev.target.value = "";
      if (f) openCropperWithFile(f);
    },
    [openCropperWithFile],
  );

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
    setPendingImage(null);
  }, []);

  const handleCropperSave = useCallback(
    async (croppedFile) => {
      await uploadCustom(croppedFile);
    },
    [uploadCustom],
  );

  const handleDropzoneDragOver = useCallback(
    (ev) => {
      if (!canEditCustom || customBusy) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
      setIsDraggingFile(true);
    },
    [canEditCustom, customBusy],
  );

  const handleDropzoneDragLeave = useCallback((ev) => {
    if (ev.currentTarget.contains(ev.relatedTarget)) return;
    setIsDraggingFile(false);
  }, []);

  const handleDropzoneDrop = useCallback(
    (ev) => {
      ev.preventDefault();
      setIsDraggingFile(false);
      if (!canEditCustom || customBusy) return;
      const file = ev.dataTransfer?.files?.[0];
      if (file && file.type?.startsWith("image/")) openCropperWithFile(file);
    },
    [canEditCustom, customBusy, openCropperWithFile],
  );

  const removeCustom = useCallback(async () => {
    if (!canEditCustom) return;
    setCustomBusy(true);
    try {
      if (variant === "player") {
        await api.delete(`${import.meta.env.VITE_PROFILE}/player/banner-custom`);
        applyPatch({ customBannerUrl: null, customBannerId: null });
      } else if (creatorId != null && Number.isFinite(creatorId)) {
        await api.delete(`${import.meta.env.VITE_CREATORS_V3}/${creatorId}/banner-custom`);
        applyPatch({ customBannerUrl: null, customBannerId: null });
      }
      toast.success(t("settings.banner.removedCustom"));
    } catch (err) {
      const msg = err?.response?.data?.error || t("settings.banner.removeError");
      toast.error(msg);
    } finally {
      setCustomBusy(false);
    }
  }, [variant, creatorId, canEditCustom, applyPatch, t]);

  const tileBusy = manifestStatus === "loading" || presetSaveBusy;
  const clearDisabled =
    serverNorm === null && (presetDraft === undefined || presetDraft === null);

  return (
    <div className="profile-banner-editor">
      {showHeading ? (
        <h3 className="profile-banner-editor__title">{t("settings.banner.sectionTitle")}</h3>
      ) : null}
      <p className="profile-banner-editor__hint">{t("settings.banner.presetHint")}</p>

      {manifestStatus === "loading" ? (
        <p className="profile-banner-editor__manifest-status">{t("settings.banner.manifestLoading")}</p>
      ) : null}

      <div
        className="profile-banner-editor__preset-grid"
        role="radiogroup"
        aria-label={t("settings.banner.presetGroupAria")}
      >
        {displayPresets.map((p) => {
          const selected = selectedPath === p;
          return (
            <label
              key={p}
              className={`profile-banner-editor__preset-tile${selected ? " profile-banner-editor__preset-tile--selected" : ""}`}
              aria-label={p}
            >
              <input
                type="radio"
                name="profile-banner-preset"
                checked={selected}
                onChange={() => onPresetDraftChange(p)}
                disabled={tileBusy}
              />
              <span className="profile-banner-editor__preset-tile-body">
                <span className="profile-banner-editor__thumb-wrap">
                  <img className="profile-banner-editor__thumb" src={publicAssetUrl(p)} alt="" loading="lazy" />
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="profile-banner-editor__actions profile-banner-editor__actions--preset">
        <button
          type="button"
          className="profile-banner-editor__btn profile-banner-editor__btn--secondary btn-fill-secondary"
          onClick={() => clearPresetDraft()}
          disabled={tileBusy || clearDisabled}
        >
          {t("settings.banner.clearPreset")}
        </button>
        <button
          type="button"
          className="profile-banner-editor__btn profile-banner-editor__btn--primary btn-fill-primary"
          onClick={() => savePresetToServer()}
          disabled={tileBusy || !hasPresetChanges}
        >
          {presetSaveBusy ? t("buttons.saving", { ns: "common" }) : t("settings.banner.savePreset")}
        </button>
      </div>

      {canEditCustom || hasStoredCustom ? (
        <div className="profile-banner-editor__custom">
          <p className="profile-banner-editor__custom-label">{t("settings.banner.customLabel")}</p>

          {canEditCustom ? (
            <input
              id={customUploadId}
              className="profile-banner-editor__file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              disabled={customBusy}
              onChange={handleFileChange}
            />
          ) : null}

          <div
            className={`profile-banner-editor__custom-panel${hasStoredCustom ? " profile-banner-editor__custom-panel--has-image" : " profile-banner-editor__custom-panel--empty"}`}
          >
            {hasStoredCustom ? (
              <>
                <div className="profile-banner-editor__custom-preview-wrap">
                  <img
                    className="profile-banner-editor__custom-preview-img"
                    src={customUrl}
                    alt=""
                    loading="lazy"
                  />
                  {!canEditCustom ? (
                    <div className="profile-banner-editor__custom-preview-dim" aria-hidden="true" />
                  ) : null}
                </div>
                {!canEditCustom ? (
                  <p className="profile-banner-editor__locked profile-banner-editor__locked--under-preview">
                    {t("settings.banner.lockedHint")}
                  </p>
                ) : null}
                {canEditCustom ? (
                  <div
                    className={`profile-banner-editor__custom-actions${customBusy ? " is-busy" : ""}`}
                  >
                    <label
                      htmlFor={customUploadId}
                      className="profile-banner-editor__file-trigger btn-fill-primary"
                    >
                      {t("settings.banner.customReplace")}
                    </label>
                    <button
                      type="button"
                      className="profile-banner-editor__btn profile-banner-editor__btn--danger btn-fill-danger"
                      onClick={() => removeCustom()}
                      disabled={customBusy}
                    >
                      {t("settings.banner.removeCustom")}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <label
                htmlFor={customUploadId}
                className={`profile-banner-editor__dropzone${isDraggingFile ? " profile-banner-editor__dropzone--dragging" : ""}${customBusy ? " profile-banner-editor__dropzone--busy" : ""}`}
                onDragOver={handleDropzoneDragOver}
                onDragEnter={handleDropzoneDragOver}
                onDragLeave={handleDropzoneDragLeave}
                onDrop={handleDropzoneDrop}
              >
                <span className="profile-banner-editor__dropzone-icon" aria-hidden="true" />
                <span className="profile-banner-editor__dropzone-title">
                  {customBusy
                    ? t("settings.banner.customUploading")
                    : t("settings.banner.dropzonePrimary")}
                </span>
                <span className="profile-banner-editor__dropzone-sub">
                  {t("settings.banner.customEmpty")}
                </span>
              </label>
            )}
          </div>
        </div>
      ) : null}

      {canEditCustom ? (
        <ImageSelectorPopup
          isOpen={cropperOpen}
          onClose={handleCropperClose}
          onSave={handleCropperSave}
          initialImage={pendingImage}
          mode="banner"
          outputMimeType="image/jpeg"
          outputQuality={0.92}
          outputMaxWidth={BANNER_OUTPUT_MAX_WIDTH}
          outputMaxHeight={BANNER_OUTPUT_MAX_HEIGHT}
          outputFileName="banner.jpg"
          title={t("settings.banner.cropperTitle")}
          cropperVariant="basic"
        />
      ) : null}
    </div>
  );
};

export default ProfileBannerEditor;
