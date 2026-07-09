// tuf-search: #TournamentCosmeticsEditorLauncher
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCreditId,
  listEditablePlacements,
  listVisiblePlacements,
  normalizePlacementDisplayMode,
} from "@/utils/tournamentPlacements";
import TournamentPlacementCard from "@/components/account/TournamentPlacements/TournamentPlacementCard";
import "@/components/account/TournamentPlacements/tournamentPlacements.css";
import TournamentCosmeticsEditorPopup from "./TournamentCosmeticsEditorPopup";
import "./tournamentCosmeticsEditorLauncher.css";

/**
 * @param {{
 *   mode: 'player' | 'creator',
 *   placements?: Array<any>,
 *   initialEquipped?: any,
 *   initialEntitlements?: Array<any>,
 *   initialOrderIds?: number[],
 *   initialHiddenIds?: number[],
 *   initialDisplayMode?: string,
 *   initialDisplayNodes?: Array<any>,
 *   onSaved?: () => void,
 * }} props
 */
export default function TournamentCosmeticsEditorLauncher({
  mode,
  placements = [],
  initialEquipped = null,
  initialEntitlements = [],
  initialOrderIds = [],
  initialHiddenIds = [],
  initialDisplayMode = "defaultHierarchy",
  initialDisplayNodes = [],
  onSaved,
}) {
  const { t } = useTranslation("pages");
  const [isOpen, setIsOpen] = useState(false);

  const editablePlacements = useMemo(
    () => listEditablePlacements(placements),
    [placements],
  );

  const visiblePlacements = useMemo(
    () => listVisiblePlacements(placements),
    [placements],
  );

  const displayMode = normalizePlacementDisplayMode(initialDisplayMode);
  const equippedFrameId = initialEquipped?.entitlementId ?? null;

  const frames = useMemo(
    () => (initialEntitlements || []).filter((e) => e.rewardType === "avatar_frame"),
    [initialEntitlements],
  );

  const equippedFrameLabel = useMemo(() => {
    if (equippedFrameId == null) return t("settings.tournaments.noFrame");
    const frame = frames.find((f) => f.id === equippedFrameId);
    return frame?.label || t("settings.tournaments.summaryFrameEquipped");
  }, [equippedFrameId, frames, t]);

  const summaryText = useMemo(() => {
    const parts = [
      t(`settings.tournaments.displayMode.${displayMode}`),
      equippedFrameLabel,
      t("settings.tournaments.summaryVisible", { count: visiblePlacements.length }),
    ];
    return parts.join(" · ");
  }, [displayMode, equippedFrameLabel, t, visiblePlacements.length]);

  const previewPlacements = useMemo(
    () => visiblePlacements.slice(0, 4),
    [visiblePlacements],
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!frames.length && !editablePlacements.length) return null;

  return (
    <div className="tournament-cosmetics-editor-launcher">
      <p className="tournament-cosmetics-editor-launcher__summary">{summaryText}</p>

      {previewPlacements.length ? (
        <div className="tournament-cosmetics-editor-launcher__preview-strip">
          {previewPlacements.map((placement) => (
            <TournamentPlacementCard
              key={getCreditId(placement)}
              placement={placement}
              previewMode
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="tournament-cosmetics-editor-launcher__btn btn-fill-primary"
        onClick={handleOpen}
      >
        {t("settings.tournaments.openEditor")}
      </button>

      <TournamentCosmeticsEditorPopup
        isOpen={isOpen}
        onClose={handleClose}
        mode={mode}
        placements={placements}
        initialEquipped={initialEquipped}
        initialEntitlements={initialEntitlements}
        initialOrderIds={initialOrderIds}
        initialHiddenIds={initialHiddenIds}
        initialDisplayMode={initialDisplayMode}
        initialDisplayNodes={initialDisplayNodes}
        onSaved={onSaved}
      />
    </div>
  );
}
