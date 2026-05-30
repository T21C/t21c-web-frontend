import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTufStellarAccessActive } from "@/utils/profileBanners";
import { isTufStellarEnabledForUser } from "@/utils/tufStellarFeature";
import { parseBioCanvas, createDefaultBioCanvas } from "@/utils/bioCanvas";
import BioCanvasEditorPopup, { ensureBioCanvasDocument } from "./BioCanvasEditorPopup.jsx";
import BioCanvasRenderer from "../BioCanvasRenderer/BioCanvasRenderer.jsx";
import "./bioCanvasEditorLauncher.css";

export default function BioCanvasEditorLauncher({
  authUser,
  canvas,
  canvasDraft,
  onCanvasDraftChange,
  imageAssets,
  onApplied,
}) {
  const { t } = useTranslation(["pages"]);
  const [isOpen, setIsOpen] = useState(false);

  const canEdit = useMemo(() => {
    if (!isTufStellarEnabledForUser(authUser)) return false;
    return isTufStellarAccessActive(authUser);
  }, [authUser]);

  const previewCanvas = useMemo(() => {
    if (canvasDraft !== undefined) return canvasDraft;
    try {
      return parseBioCanvas(canvas);
    } catch {
      return canvas;
    }
  }, [canvas, canvasDraft]);

  if (!canEdit) return null;

  const hasCanvas = previewCanvas?.blocks?.length > 0;

  return (
    <div className="bio-canvas-editor-launcher">
      <div className="bio-canvas-editor-launcher__preview">
        {hasCanvas ? (
          <BioCanvasRenderer canvas={previewCanvas} imageAssets={imageAssets} />
        ) : (
          <p className="bio-canvas-editor-launcher__empty">
            {t("settings.bioCanvas.empty", { defaultValue: "No bio canvas yet. Open the editor to build your profile bio." })}
          </p>
        )}
      </div>
      <button type="button" className="btn-fill-accent bio-canvas-editor-launcher__open" onClick={() => setIsOpen(true)}>
        {t("settings.bioCanvas.openEditor", { defaultValue: "Edit bio canvas" })}
      </button>

      <BioCanvasEditorPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        canvas={canvas ?? createDefaultBioCanvas()}
        canvasDraft={canvasDraft}
        onCanvasDraftChange={onCanvasDraftChange}
        imageAssets={imageAssets}
        onApplied={onApplied}
      />
    </div>
  );
}

export { ensureBioCanvasDocument };
