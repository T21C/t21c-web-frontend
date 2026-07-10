import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { UnlinkIcon } from "@/components/common/icons/UnlinkIcon";
import { toast } from "react-hot-toast";
import "./profileCustomizationSyncControl.css";

const UNIT_I18N_KEY = {
  banner: "banner",
  header_surface: "headerSurface",
  bio: "bio",
  stellar_icon: "stellarIcon",
};

const ICON_SIZE = 18;

export function ProfileCustomizationSyncControl({
  unit,
  presentationSync,
  profileSide,
  canSync = false,
  onSyncChange,
}) {
  const { t } = useTranslation("pages");
  const [popupOpen, setPopupOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const syncState = presentationSync?.[unit] ?? "missing";
  const isLinked = syncState === "linked";
  const otherSide = profileSide === "player" ? "creator" : "player";

  const refresh = useCallback(async () => {
    if (typeof onSyncChange === "function") {
      await onSyncChange();
    }
  }, [onSyncChange]);

  const handleLink = useCallback(
    async (source) => {
      setBusy(true);
      try {
        await api.post(routes.profileCustomizationV3.link(unit), { source });
        setPopupOpen(false);
        await refresh();
        toast.success(t("settings.profileSync.linkSuccess"));
      } catch (e) {
        toast.error(e?.response?.data?.error || t("settings.profileSync.linkError"));
      } finally {
        setBusy(false);
      }
    },
    [unit, refresh, t],
  );

  const handleUnlink = useCallback(async () => {
    const confirmed = window.confirm(
      t("settings.profileSync.unlinkConfirm", {
        defaultValue:
          "Unlink this section from your other profile? Each profile will keep its own copy.",
      }),
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await api.post(routes.profileCustomizationV3.unlink(unit));
      await refresh();
      toast.success(t("settings.profileSync.unlinkSuccess"));
    } catch (e) {
      toast.error(e?.response?.data?.error || t("settings.profileSync.unlinkError"));
    } finally {
      setBusy(false);
    }
  }, [unit, refresh, t]);

  const handleToggleClick = useCallback(() => {
    if (isLinked) {
      handleUnlink();
      return;
    }
    setPopupOpen(true);
  }, [handleUnlink, isLinked]);

  if (!canSync) return null;

  const unitKey = UNIT_I18N_KEY[unit] ?? unit;
  const actionLabel = isLinked
    ? t("settings.profileSync.unlink")
    : t("settings.profileSync.link");
  const buttonTitle = isLinked
    ? `${t("settings.profileSync.linkedIndicator")} — ${actionLabel}`
    : actionLabel;

  return (
    <div className="profile-customization-sync">
      {isLinked ? (
        <span className="profile-customization-sync__label" title={t("settings.profileSync.linkedHint")}>
          {t("settings.profileSync.linkedIndicator")}
        </span>
      ) : null}

      <button
        type="button"
        className={[
          "profile-customization-sync__btn",
          isLinked ? "profile-customization-sync__btn--linked" : "profile-customization-sync__btn--independent",
        ].join(" ")}
        disabled={busy}
        onClick={handleToggleClick}
        aria-label={actionLabel}
        title={buttonTitle}
      >
        <span className="profile-customization-sync__icon profile-customization-sync__icon--state" aria-hidden="true">
          {isLinked ? (
            <LinkIcon color="currentColor" size={ICON_SIZE} />
          ) : (
            <UnlinkIcon color="currentColor" size={ICON_SIZE} />
          )}
        </span>
        <span className="profile-customization-sync__icon profile-customization-sync__icon--action" aria-hidden="true">
          {isLinked ? (
            <UnlinkIcon color="currentColor" size={ICON_SIZE} />
          ) : (
            <LinkIcon color="currentColor" size={ICON_SIZE} />
          )}
        </span>
      </button>

      {popupOpen ? (
        <div
          className="profile-customization-sync__popup-backdrop"
          role="presentation"
          onClick={() => !busy && setPopupOpen(false)}
        >
          <div
            className="profile-customization-sync__popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`profile-sync-title-${unit}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`profile-sync-title-${unit}`} className="profile-customization-sync__popup-title">
              {t(`settings.profileSync.linkTitle.${unitKey}`)}
            </h3>
            <p className="profile-customization-sync__popup-desc">
              {t("settings.profileSync.linkDescription")}
            </p>
            <div className="profile-customization-sync__popup-actions">
              <button
                type="button"
                className="profile-customization-sync__popup-btn"
                disabled={busy}
                onClick={() => handleLink(profileSide)}
              >
                {t("settings.profileSync.useThisVersion", { defaultValue: "Use this version" })}
              </button>
              <button
                type="button"
                className="profile-customization-sync__popup-btn"
                disabled={busy}
                onClick={() => handleLink(otherSide)}
              >
                {t(`settings.profileSync.useVersion.${otherSide}`, {
                  defaultValue:
                    otherSide === "player"
                      ? "Use player profile version"
                      : "Use creator profile version",
                })}
              </button>
              <button
                type="button"
                className="profile-customization-sync__popup-btn profile-customization-sync__popup-btn--muted"
                disabled={busy}
                onClick={() => setPopupOpen(false)}
              >
                {t("buttons.cancel", { ns: "common", defaultValue: "Cancel" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
