// tuf-search: #TournamentPlacementManageList
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTranslation } from "react-i18next";
import { PinIcon, EyeIcon, EyeOffIcon } from "@/components/common/icons";
import {
  resolvePlacementListLabel,
  resolvePlacementRailIcon,
} from "@/utils/tournamentPlacements";

const VISIBLE_DROPPABLE_ID = "tournament-placement-visible";

function PlacementManageRow({
  placement,
  isPinned,
  isHidden,
  isSelected = false,
  canPin,
  onSelect,
  onTogglePin,
  onToggleHidden,
  innerRef = null,
  draggableProps = null,
  dragHandleProps = null,
  isDragging = false,
}) {
  const { t } = useTranslation("pages");
  const iconUrl = resolvePlacementRailIcon(placement);
  const label = resolvePlacementListLabel(placement);

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      style={draggableProps?.style}
      className={[
        "tournament-cosmetics-editor-popup__placement-row",
        isPinned ? "is-pinned" : "",
        isHidden ? "is-hidden" : "",
        isSelected ? "is-selected" : "",
        isDragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dragHandleProps ? (
        <div
          className="tournament-cosmetics-editor-popup__drag-handle"
          role="button"
          tabIndex={0}
          aria-label={t("settings.tournaments.placementsReorderHint")}
          {...dragHandleProps}
        >
          <span className="tournament-cosmetics-editor-popup__drag-handle-grip" aria-hidden="true">
            ⋮⋮
          </span>
        </div>
      ) : (
        <span className="tournament-cosmetics-editor-popup__drag-handle tournament-cosmetics-editor-popup__drag-handle--spacer" />
      )}

      <button
        type="button"
        className="tournament-cosmetics-editor-popup__placement-select"
        onClick={() => onSelect?.(placement.id)}
        aria-pressed={isSelected}
        aria-label={t("settings.tournaments.selectPlacementForPreview", { name: label })}
      >
        {iconUrl ? (
          <img
            className="tournament-cosmetics-editor-popup__placement-icon"
            src={iconUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="tournament-cosmetics-editor-popup__placement-icon tournament-cosmetics-editor-popup__placement-icon--placeholder" />
        )}
        <span className="tournament-cosmetics-editor-popup__placement-label">{label}</span>
      </button>

      <div className="tournament-cosmetics-editor-popup__placement-actions">
        <button
          type="button"
          className={[
            "tournament-cosmetics-editor-popup__icon-btn",
            isPinned ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={isHidden || (!isPinned && !canPin)}
          onClick={() => onTogglePin(placement.id)}
          aria-pressed={isPinned}
          title={
            isPinned
              ? t("settings.tournaments.featuredUnpin")
              : t("settings.tournaments.featuredPinToggle")
          }
        >
          <PinIcon
            size="16px"
            color={isPinned ? "var(--color-purple-1)" : "var(--color-white-t60)"}
          />
        </button>

        <button
          type="button"
          className="tournament-cosmetics-editor-popup__icon-btn"
          onClick={() => onToggleHidden(placement.id)}
          aria-pressed={isHidden}
          title={
            isHidden
              ? t("settings.tournaments.showPlacement")
              : t("settings.tournaments.hidePlacement")
          }
        >
          {isHidden ? (
            <EyeIcon size="16px" color="var(--color-white-t70)" />
          ) : (
            <EyeOffIcon size="16px" color="var(--color-white-t60)" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   visiblePlacements: Array<any>,
 *   hiddenPlacements: Array<any>,
 *   featuredIds: number[],
 *   maxFeaturedPlacements: number,
 *   selectedPlacementId?: number | null,
 *   onSelectPlacement?: (id: number) => void,
 *   onToggleFeatured: (id: number) => void,
 *   onToggleHidden: (id: number) => void,
 *   onReorderPlacements: (fromIndex: number, toIndex: number) => void,
 * }} props
 */
export default function TournamentPlacementManageList({
  visiblePlacements,
  hiddenPlacements,
  featuredIds,
  maxFeaturedPlacements,
  selectedPlacementId = null,
  onSelectPlacement,
  onToggleFeatured,
  onToggleHidden,
  onReorderPlacements,
}) {
  const { t } = useTranslation("pages");
  const featuredAtMax = featuredIds.length >= maxFeaturedPlacements;

  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;
    onReorderPlacements(source.index, destination.index);
  };

  return (
    <div className="tournament-cosmetics-editor-popup__placement-lists">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={VISIBLE_DROPPABLE_ID}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="tournament-cosmetics-editor-popup__placement-list"
            >
              {visiblePlacements.map((placement, index) => {
                const isPinned = featuredIds.includes(placement.id);
                return (
                  <Draggable
                    key={placement.id}
                    draggableId={String(placement.id)}
                    index={index}
                  >
                    {(dragProvided, snapshot) => (
                      <PlacementManageRow
                        placement={placement}
                        isPinned={isPinned}
                        isHidden={false}
                        isSelected={selectedPlacementId === placement.id}
                        canPin={!featuredAtMax}
                        onSelect={onSelectPlacement}
                        onTogglePin={onToggleFeatured}
                        onToggleHidden={onToggleHidden}
                        innerRef={dragProvided.innerRef}
                        draggableProps={dragProvided.draggableProps}
                        dragHandleProps={dragProvided.dragHandleProps}
                        isDragging={snapshot.isDragging}
                      />
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {hiddenPlacements.length ? (
        <div className="tournament-cosmetics-editor-popup__hidden-section">
          <h4 className="tournament-cosmetics-editor-popup__hidden-title">
            {t("settings.tournaments.hiddenPlacementsTitle")}
          </h4>
          <div className="tournament-cosmetics-editor-popup__placement-list">
            {hiddenPlacements.map((placement) => (
              <PlacementManageRow
                key={placement.id}
                placement={placement}
                isPinned={false}
                isHidden
                isSelected={selectedPlacementId === placement.id}
                canPin={false}
                onSelect={onSelectPlacement}
                onTogglePin={onToggleFeatured}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
