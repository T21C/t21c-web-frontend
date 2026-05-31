import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Tooltip } from "react-tooltip";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CloseButton } from "@/components/common/buttons";
import { getPortalRoot } from "@/utils/portalRoot";
import BioCanvasEditor from "./BioCanvasEditor.jsx";
import { useBioCanvasEditor } from "./useBioCanvasEditor.js";
import { createDefaultBioCanvas, parseBioCanvas } from "@/utils/bioCanvas";
import "./bioCanvasEditor.css";

export default function BioCanvasEditorPopup({
  profileKind = "player",
  isOpen,
  onClose,
  canvas,
  canvasDraft,
  onCanvasDraftChange,
  imageAssets,
  onApplied,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const snapshotAtOpenRef = useRef(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    snapshotAtOpenRef.current = canvas ? JSON.parse(JSON.stringify(canvas)) : null;
  }, [isOpen]);

  const editor = useBioCanvasEditor({
    profileKind,
    canvas,
    canvasDraft,
    onCanvasDraftChange,
    imageAssets,
    onApplied: (payload) => {
      onApplied?.(payload);
      onClose?.();
    },
    isOpen,
    snapshotAtOpen: snapshotAtOpenRef.current,
  });

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const blocks = editor.workingCanvas?.blocks ?? [];
    setSelectedBlockId(blocks[0]?.id ?? null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!isUndo && !isRedo) return;

      const target = event.target;
      const isTextEntry =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTextEntry) return;
      event.preventDefault();
      if (isRedo) editor.redo();
      else editor.undo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, editor.undo, editor.redo]);

  const handleClose = useCallback(() => {
    if (editor.isDirtySinceOpen) {
      const ok = window.confirm(t("settings.bioCanvas.discardConfirm", { defaultValue: "Discard unsaved changes?" }));
      if (!ok) return;
      editor.handleReset();
    }
    onClose?.();
  }, [editor, onClose, t]);

  const handleResetConfirm = useCallback(() => {
    const ok = window.confirm(
      t("settings.bioCanvas.resetConfirm", {
        defaultValue: "Reset all changes made since you opened the editor?",
      }),
    );
    if (!ok) return;
    editor.handleReset();
  }, [editor, t]);

  const handleClearConfirm = useCallback(() => {
    const ok = window.confirm(
      t("settings.bioCanvas.clearConfirm", {
        defaultValue: "Clear all content from the canvas?",
      }),
    );
    if (!ok) return;
    editor.handleClear();
  }, [editor, t]);

  if (!isOpen) return null;

  return createPortal(
    <div className="bio-canvas-editor-popup" role="presentation">
      <button type="button" className="bio-canvas-editor-popup__backdrop" aria-label="Close" onClick={handleClose} />
      <div className="bio-canvas-editor-popup__panel" role="dialog" aria-modal="true">
        <div className="bio-canvas-editor-popup__head">
          <h2 className="bio-canvas-editor-popup__title">
            {t("settings.bioCanvas.title", { defaultValue: "Bio canvas editor" })}
          </h2>
          <CloseButton onClick={handleClose} />
        </div>

        <BioCanvasEditor
          editor={editor}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={setSelectedBlockId}
        />

        <div className="bio-canvas-editor-popup__actions">
          <div className="bio-canvas-editor-popup__actions-left">
            <button type="button" className="btn-fill-neutral" onClick={handleResetConfirm} disabled={editor.saveBusy}>
              {t("settings.bioCanvas.reset", { defaultValue: "Reset" })}
            </button>
            <button type="button" className="btn-fill-danger" onClick={handleClearConfirm} disabled={editor.saveBusy}>
              {t("settings.bioCanvas.clear", { defaultValue: "Clear all" })}
            </button>
          </div>
          <div className="bio-canvas-editor-popup__actions-center">
            <button
              type="button"
              className="btn-fill-neutral"
              onClick={editor.undo}
              disabled={editor.saveBusy || !editor.canUndo}
              data-tooltip-id="bio-canvas-undo"
            >
              {t("settings.bioCanvas.undo", { defaultValue: "Undo" })}
            </button>
            <button
              type="button"
              className="btn-fill-neutral"
              onClick={editor.redo}
              disabled={editor.saveBusy || !editor.canRedo}
              data-tooltip-id="bio-canvas-redo"
            >
              {t("settings.bioCanvas.redo", { defaultValue: "Redo" })}
            </button>
            <Tooltip id="bio-canvas-undo" place="top" noArrow>
              {t("settings.bioCanvas.undoHint", { defaultValue: "Undo (Ctrl+Z)" })}
            </Tooltip>
            <Tooltip id="bio-canvas-redo" place="top" noArrow>
              {t("settings.bioCanvas.redoHint", { defaultValue: "Redo (Ctrl+Y)" })}
            </Tooltip>
          </div>
          <button
            type="button"
            className="btn-fill-primary"
            onClick={editor.handleSave}
            disabled={editor.saveBusy || !editor.isDirtySinceOpen}
          >
            {t("settings.bioCanvas.save", { defaultValue: "Save canvas" })}
          </button>
        </div>
      </div>
    </div>,
    getPortalRoot(),
  );
}

export function ensureBioCanvasDocument(raw) {
  try {
    return parseBioCanvas(raw);
  } catch {
    return createDefaultBioCanvas();
  }
}
