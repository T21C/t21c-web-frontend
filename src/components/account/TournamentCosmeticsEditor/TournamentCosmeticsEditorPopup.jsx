// tuf-search: #TournamentCosmeticsEditorPopup
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "@/components/common/Portal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CloseButton } from "@/components/common/buttons";
import TournamentPlacementCard from "@/components/account/TournamentPlacements/TournamentPlacementCard";
import "@/components/account/TournamentPlacements/tournamentPlacements.css";
import TournamentPlacementManageList from "./TournamentPlacementManageList";
import { useTournamentCosmeticsEditor } from "./useTournamentCosmeticsEditor";
import "./tournamentCosmeticsEditorPopup.css";

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   mode: 'player' | 'creator',
 *   placements?: Array<any>,
 *   initialEquipped?: any,
 *   initialEntitlements?: Array<any>,
 *   initialCardLayout?: string,
 *   initialOrderIds?: number[],
 *   initialHiddenIds?: number[],
 *   onSaved?: () => void,
 * }} props
 */
export default function TournamentCosmeticsEditorPopup({
  isOpen,
  onClose,
  mode,
  placements = [],
  initialEquipped = null,
  initialEntitlements = [],
  initialCardLayout = "default",
  initialOrderIds = [],
  initialHiddenIds = [],
  onSaved,
}) {
  const { t } = useTranslation("pages");
  const panelRef = useRef(null);
  const [previewPlacementId, setPreviewPlacementId] = useState(null);

  const editor = useTournamentCosmeticsEditor({
    mode,
    isOpen,
    placements,
    initialEquipped,
    initialEntitlements,
    initialCardLayout,
    initialOrderIds,
    initialHiddenIds,
    onSaved,
  });

  const {
    editablePlacements,
    visiblePlacements,
    hiddenPlacements,
    frames,
    draft,
    isDirty,
    saveBusy,
    setCardLayout,
    selectFrame,
    toggleFeatured,
    toggleHidden,
    reorderPlacements,
    revertDraft,
    saveAll,
    maxFeaturedPlacements,
  } = editor;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setPreviewPlacementId(null);
      return;
    }
    const firstId = visiblePlacements[0]?.id ?? editablePlacements[0]?.id ?? null;
    setPreviewPlacementId(firstId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || previewPlacementId == null) return;
    const stillVisible = visiblePlacements.some((p) => p.id === previewPlacementId);
    if (!stillVisible && visiblePlacements[0]) {
      setPreviewPlacementId(visiblePlacements[0].id);
    }
  }, [isOpen, previewPlacementId, visiblePlacements]);

  const layoutSamplePlacement = useMemo(() => {
    if (previewPlacementId != null) {
      const selected = editablePlacements.find((p) => p.id === previewPlacementId);
      if (selected) return selected;
    }
    return editablePlacements[0] ?? null;
  }, [previewPlacementId, editablePlacements]);

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm(t("settings.tournaments.unsavedConfirm"))) {
      return;
    }
    if (isDirty) revertDraft();
    onClose();
  }, [isDirty, onClose, revertDraft, t]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        requestClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, requestClose]);

  const handleBackdropClick = (ev) => {
    if (panelRef.current && !panelRef.current.contains(ev.target)) {
      requestClose();
    }
  };

  const handleSaveAndClose = async () => {
    const ok = await saveAll();
    if (ok) onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="tournament-cosmetics-editor-popup-overlay"
        onMouseDown={handleBackdropClick}
        role="presentation"
      >
        <div
          ref={panelRef}
          className="tournament-cosmetics-editor-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tournament-cosmetics-editor-popup-title"
          onMouseDown={(ev) => ev.stopPropagation()}
        >
          <header className="tournament-cosmetics-editor-popup__header">
            <h2
              id="tournament-cosmetics-editor-popup-title"
              className="tournament-cosmetics-editor-popup__title"
            >
              {t("settings.tournaments.editorTitle")}
            </h2>
            <CloseButton onClick={requestClose} ariaLabel={t("settings.tournaments.cancel")} />
          </header>

          <div className="tournament-cosmetics-editor-popup__body">
            <section className="tournament-cosmetics-editor-popup__panel tournament-cosmetics-editor-popup__display-options">
              {editablePlacements.length ? (
                <div className="tournament-cosmetics-editor-popup__display-block">
                  <h3 className="tournament-cosmetics-editor-popup__section-title">
                    {t("settings.tournaments.layoutTitle")}
                  </h3>
                  <div className="tournament-cosmetics-editor-popup__layout-options">
                    {["default", "iconRail"].map((layoutId) => (
                      <button
                        key={layoutId}
                        type="button"
                        className={[
                          "tournament-cosmetics-editor-popup__layout-option",
                          draft.cardLayout === layoutId ? "is-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setCardLayout(layoutId)}
                      >
                        {layoutSamplePlacement ? (
                          <TournamentPlacementCard
                            placement={layoutSamplePlacement}
                            cardLayout={layoutId}
                            isFeaturedOverride={draft.featuredIds.includes(layoutSamplePlacement.id)}
                            previewMode
                          />
                        ) : null}
                        <span className="tournament-cosmetics-editor-popup__option-label">
                          {t(`settings.tournaments.cardLayout.${layoutId}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {frames.length ? (
                <div className="tournament-cosmetics-editor-popup__display-block">
                  <h3 className="tournament-cosmetics-editor-popup__section-title">
                    {t("settings.tournaments.framesTitle")}
                  </h3>
                  <div className="tournament-cosmetics-editor-popup__frames-grid">
                    <button
                      type="button"
                      className={[
                        "tournament-cosmetics-editor-popup__frame-option",
                        draft.equippedFrameId == null ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => selectFrame(null)}
                    >
                      <div className="tournament-cosmetics-editor-popup__frame-thumb" />
                      <span className="tournament-cosmetics-editor-popup__option-label">
                        {t("settings.tournaments.noFrame")}
                      </span>
                    </button>
                    {frames.map((frame) => (
                      <button
                        key={frame.id}
                        type="button"
                        className={[
                          "tournament-cosmetics-editor-popup__frame-option",
                          draft.equippedFrameId === frame.id ? "is-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => selectFrame(frame.id)}
                      >
                        {frame.assetUrl ? (
                          <img
                            className="tournament-cosmetics-editor-popup__frame-thumb"
                            src={frame.assetUrl}
                            alt=""
                          />
                        ) : (
                          <div className="tournament-cosmetics-editor-popup__frame-thumb" />
                        )}
                        <span className="tournament-cosmetics-editor-popup__option-label">
                          {frame.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {editablePlacements.length ? (
              <section className="tournament-cosmetics-editor-popup__panel tournament-cosmetics-editor-popup__placements-panel">
                <div className="tournament-cosmetics-editor-popup__placements-head">
                  <h3 className="tournament-cosmetics-editor-popup__section-title">
                    {t("settings.tournaments.placementsTitle")}
                  </h3>
                  <p className="tournament-cosmetics-editor-popup__hint">
                    {t("settings.tournaments.layoutPreviewHint")}
                  </p>
                  <p className="tournament-cosmetics-editor-popup__hint">
                    {t("settings.tournaments.placementsReorderHint")}
                  </p>
                  <p className="tournament-cosmetics-editor-popup__hint">
                    {t("settings.tournaments.featuredMaxHint", {
                      max: maxFeaturedPlacements,
                    })}
                  </p>
                </div>
                <TournamentPlacementManageList
                  visiblePlacements={visiblePlacements}
                  hiddenPlacements={hiddenPlacements}
                  featuredIds={draft.featuredIds}
                  maxFeaturedPlacements={maxFeaturedPlacements}
                  selectedPlacementId={previewPlacementId}
                  onSelectPlacement={setPreviewPlacementId}
                  onToggleFeatured={toggleFeatured}
                  onToggleHidden={toggleHidden}
                  onReorderPlacements={reorderPlacements}
                />
              </section>
            ) : null}
          </div>

          <footer className="tournament-cosmetics-editor-popup__footer">
            <button
              type="button"
              className="tournament-cosmetics-editor-popup__btn tournament-cosmetics-editor-popup__btn--secondary btn-fill-secondary"
              disabled={!isDirty || saveBusy}
              onClick={revertDraft}
            >
              {t("settings.tournaments.revertDraft")}
            </button>
            <div className="tournament-cosmetics-editor-popup__footer-actions">
              <button
                type="button"
                className="tournament-cosmetics-editor-popup__btn tournament-cosmetics-editor-popup__btn--secondary btn-fill-secondary"
                disabled={saveBusy}
                onClick={requestClose}
              >
                {t("settings.tournaments.cancel")}
              </button>
              <button
                type="button"
                className="tournament-cosmetics-editor-popup__btn tournament-cosmetics-editor-popup__btn--primary btn-fill-primary"
                disabled={!isDirty || saveBusy}
                onClick={handleSaveAndClose}
              >
                {t("settings.tournaments.save")}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Portal>
  );
}
