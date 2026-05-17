import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_PROFILE_HEADER_SURFACE_LAYER_LABEL_LENGTH } from "@/utils/profileHeaderSurfaceStyle";

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 28;
const TAP_MOVE_TOLERANCE_PX = 12;

export default function ProfileHeaderSurfaceLayerName({
  displayLabel,
  onCommit,
}) {
  const { t } = useTranslation(["pages"]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayLabel);
  const inputRef = useRef(null);
  const lastTouchTapRef = useRef(null);
  const touchStartRef = useRef(null);
  const clearLastTapTimerRef = useRef(null);
  const suppressNextClickRef = useRef(false);

  const clearLastTouchTap = useCallback(() => {
    lastTouchTapRef.current = null;
    if (clearLastTapTimerRef.current) {
      clearTimeout(clearLastTapTimerRef.current);
      clearLastTapTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editing) setDraft(displayLabel);
  }, [displayLabel, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => () => clearLastTouchTap(), [clearLastTouchTap]);

  const commit = () => {
    const trimmed = draft.trim();
    onCommit(trimmed || undefined);
    setEditing(false);
  };

  const startEditing = useCallback((ev) => {
    if (ev?.cancelable) ev.preventDefault();
    if (ev) ev.stopPropagation();
    clearLastTouchTap();
    touchStartRef.current = null;
    setEditing(true);
  }, [clearLastTouchTap]);

  const stopEvent = (ev) => {
    ev.stopPropagation();
  };

  const registerTouchTap = (x, y, ev) => {
    const now = Date.now();
    const last = lastTouchTapRef.current;

    if (
      last &&
      now - last.time <= DOUBLE_TAP_MS &&
      Math.hypot(x - last.x, y - last.y) <= DOUBLE_TAP_MAX_DISTANCE_PX
    ) {
      clearLastTouchTap();
      suppressNextClickRef.current = true;
      startEditing(ev);
      return;
    }

    lastTouchTapRef.current = { x, y, time: now };
    clearLastTapTimerRef.current = window.setTimeout(clearLastTouchTap, DOUBLE_TAP_MS);
  };

  const onLabelPointerDown = (ev) => {
    if (editing || ev.button !== 0 || ev.pointerType !== "touch") return;

    touchStartRef.current = {
      pointerId: ev.pointerId,
      x: ev.clientX,
      y: ev.clientY,
    };
  };

  const onLabelPointerMove = (ev) => {
    const start = touchStartRef.current;
    if (!start || start.pointerId !== ev.pointerId) return;

    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_TOLERANCE_PX) {
      touchStartRef.current = null;
    }
  };

  const onLabelPointerUp = (ev) => {
    if (suppressNextClickRef.current) {
      ev.preventDefault();
      ev.stopPropagation();
      suppressNextClickRef.current = false;
    }

    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || start.pointerId !== ev.pointerId || ev.pointerType !== "touch") return;

    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_TOLERANCE_PX) return;

    registerTouchTap(ev.clientX, ev.clientY, ev);
  };

  const onLabelPointerCancel = () => {
    touchStartRef.current = null;
  };

  const onLabelClick = (ev) => {
    if (suppressNextClickRef.current) {
      ev.preventDefault();
      ev.stopPropagation();
      suppressNextClickRef.current = false;
    }
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
        onClick={stopEvent}
        onMouseDown={stopEvent}
        onPointerDown={stopEvent}
        onTouchStart={stopEvent}
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
      title={t("settings.headerSurface.layerRenameHint")}
      aria-label={t("settings.headerSurface.layerRenameAria")}
      onDoubleClick={startEditing}
      onClick={onLabelClick}
      onPointerDown={onLabelPointerDown}
      onPointerMove={onLabelPointerMove}
      onPointerUp={onLabelPointerUp}
      onPointerCancel={onLabelPointerCancel}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          startEditing(ev);
        }
      }}
    >
      {displayLabel}
    </span>
  );
}
