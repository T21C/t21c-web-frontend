import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_PROFILE_HEADER_SURFACE_LAYER_LABEL_LENGTH } from "@/utils/profileHeaderSurfaceStyle";

export default function ProfileHeaderSurfaceLayerName({
  displayLabel,
  onCommit,
}) {
  const { t } = useTranslation(["pages"]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayLabel);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(displayLabel);
  }, [displayLabel, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    onCommit(trimmed || undefined);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="profile-header-surface-layer-list__name-input"
        value={draft}
        maxLength={MAX_PROFILE_HEADER_SURFACE_LAYER_LABEL_LENGTH}
        placeholder={t("settings.headerSurface.layerRenamePlaceholder")}
        aria-label={t("settings.headerSurface.layerRenameAria")}
        onClick={(ev) => ev.stopPropagation()}
        onMouseDown={(ev) => ev.stopPropagation()}
        onChange={(ev) => setDraft(ev.target.value)}
        onBlur={commit}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            commit();
          }
          if (ev.key === "Escape") {
            ev.preventDefault();
            setDraft(displayLabel);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className="profile-header-surface-layer-list__chip-label"
      role="button"
      tabIndex={0}
      onClick={(ev) => {
        ev.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          ev.stopPropagation();
          setEditing(true);
        }
      }}
    >
      {displayLabel}
    </span>
  );
}
