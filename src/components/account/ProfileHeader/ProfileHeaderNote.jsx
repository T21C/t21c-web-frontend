// tuf-search: #ProfileHeaderNote
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { EditIcon } from "@/components/common/icons";
import { useUnsavedClose } from "@/hooks/useUnsavedClose";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { toastDurationForMessage } from "@/utils/toastMessage";

const NOTE_MAX_LENGTH = 2000;
/** Wide header layout (matches `@container profile-header (width <= 768px)`). */
const NOTE_OUTSIDE_MIN_HEADER_PX = 768;
/** Smallest useful outside panel; skip docking if the left gutter is tighter. */
const NOTE_OUTSIDE_MIN_GUTTER_REM = 12;
const NOTE_OUTSIDE_VIEWPORT_PAD_PX = 8;

function useNoteSitsOutside(wrapRef) {
  const [outside, setOutside] = useState(false);
  const [outsideMaxPx, setOutsideMaxPx] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const header = wrap?.closest(".profile-header");
    if (!header) return undefined;

    const update = () => {
      const rem = Number.parseFloat(getComputedStyle(header).fontSize) || 16;
      const minGutter = NOTE_OUTSIDE_MIN_GUTTER_REM * rem;
      const rect = header.getBoundingClientRect();
      const available = Math.max(0, rect.left - NOTE_OUTSIDE_VIEWPORT_PAD_PX);
      const fits = rect.width > NOTE_OUTSIDE_MIN_HEADER_PX && available >= minGutter;
      setOutside(fits);
      setOutsideMaxPx(fits ? available : 0);
    };

    update();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update);
    });
    ro.observe(header);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [wrapRef]);

  return { outside, outsideMaxPx };
}

function noteRouteFor(targetType, targetId) {
  return targetType === "creator"
    ? routes.creatorsV3.note(targetId)
    : routes.playersV3.note(targetId);
}

export default function ProfileHeaderNote({
  targetType,
  targetId,
  text = null,
  onSaved,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const boxId = useId().replace(/:/g, "");
  const wrapRef = useRef(null);
  const prevSavedRef = useRef(typeof text === "string" ? text : "");
  const draftRef = useRef("");
  const targetKey = `${targetType}:${targetId}`;
  const [activeKey, setActiveKey] = useState(targetKey);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const savedText = typeof text === "string" ? text : "";
  const isDirty = editing && draft !== savedText;
  draftRef.current = draft;
  const { outside, outsideMaxPx } = useNoteSitsOutside(wrapRef);

  if (activeKey !== targetKey) {
    setActiveKey(targetKey);
    setOpen(false);
    setEditing(false);
    setDraft("");
    prevSavedRef.current = typeof text === "string" ? text : "";
  }

  const closeBox = useCallback(() => {
    setOpen(false);
    setEditing(false);
    setDraft("");
  }, []);

  const leaveEditing = useCallback(() => {
    setEditing(false);
    setDraft("");
  }, []);

  const { requestClose } = useUnsavedClose({ isDirty, onClose: closeBox });
  const { requestClose: requestCancelEdit } = useUnsavedClose({
    isDirty,
    onClose: leaveEditing,
  });

  useEffect(() => {
    const next = typeof text === "string" ? text : "";
    if (editing && draftRef.current === prevSavedRef.current) {
      setDraft(next);
    }
    prevSavedRef.current = next;
  }, [text, editing]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        requestClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, requestClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!Number.isFinite(Number(targetId)) || Number(targetId) <= 0) return null;

  const startEdit = () => {
    const next = savedText;
    prevSavedRef.current = next;
    setDraft(next);
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving || !isDirty) return;
    setSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.put(noteRouteFor(targetType, targetId), {
        text: draft,
      });
      const saved = typeof data?.text === "string" ? data.text : null;
      onSaved?.(saved);
      setEditing(false);
      setDraft("");
      const savedLabel = t("profile.header.note.saved");
      toast.success(savedLabel, {
        id: toastId,
        duration: toastDurationForMessage(savedLabel),
      });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        t("profile.header.note.error");
      toast.error(message, {
        id: toastId,
        duration: toastDurationForMessage(message),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`profile-header__note${outside ? " profile-header__note--outside" : ""}`}
      ref={wrapRef}
      style={
        outside && outsideMaxPx > 0
          ? { "--profile-header-note-outside-max": `${Math.floor(outsideMaxPx)}px` }
          : undefined
      }
    >
      <button
        type="button"
        className="profile-header__note-button"
        aria-expanded={open}
        aria-controls={boxId}
        aria-label={t("profile.header.note.open")}
        title={t("profile.header.note.open")}
        onClick={() => {
          if (open) {
            requestClose();
            return;
          }
          setEditing(false);
          setDraft("");
          setOpen(true);
        }}
      >
        <EditIcon color="currentColor" size={18} />
      </button>
      {open && (
        <div
          className="profile-header__note-box"
          id={boxId}
          role="dialog"
          aria-label={t("profile.header.note.open")}
        >
          <div className="profile-header__note-toolbar">
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn-fill-neutral btn-sm"
                  onClick={requestCancelEdit}
                  disabled={saving}
                >
                  {t("buttons.cancel", { ns: "common" })}
                </button>
                <button
                  type="button"
                  className="btn-fill-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  {saving
                    ? t("loading.saving", { ns: "common" })
                    : t("buttons.save", { ns: "common" })}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-fill-neutral btn-sm"
                onClick={startEdit}
              >
                {t("buttons.edit", { ns: "common" })}
              </button>
            )}
          </div>
          {editing ? (
            <textarea
              className="profile-header__note-input"
              value={draft}
              maxLength={NOTE_MAX_LENGTH}
              rows={5}
              autoFocus
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : (
            <div className="profile-header__note-body">
              {savedText.length > 0 ? (
                savedText
              ) : (
                <span className="profile-header__note-empty">
                  {t("profile.header.note.empty")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
