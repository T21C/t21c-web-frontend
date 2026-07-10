// tuf-search: #TournamentPlacementManageList
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeOffIcon } from "@/components/common/icons";
import {
  getCreditId,
  resolvePlacementListLabel,
  resolvePlacementRailIcon,
} from "@/utils/tournamentPlacements";

const VISIBLE_DROPPABLE_ID = "tournament-placement-visible";

function PlacementManageRow({
  placement,
  isHidden,
  isSelected = false,
  onSelect,
  onToggleHidden,
  innerRef = null,
  draggableProps = null,
  dragHandleProps = null,
  isDragging = false,
}) {
  const { t } = useTranslation("pages");
  const iconUrl = resolvePlacementRailIcon(placement);
  const label = resolvePlacementListLabel(placement, { includeTournament: true });

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      style={draggableProps?.style}
      className={[
        "tournament-cosmetics-editor-popup__placement-row",
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
        onClick={() => onSelect?.(getCreditId(placement))}
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
          className="tournament-cosmetics-editor-popup__icon-btn"
          onClick={() => onToggleHidden(getCreditId(placement))}
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
 *   selectedPlacementId?: number | null,
 *   onSelectPlacement?: (id: number) => void,
 *   onToggleHidden: (id: number) => void,
 *   onReorderPlacements: (fromIndex: number, toIndex: number) => void,
 * }} props
 */
export default function TournamentPlacementManageList({
  visiblePlacements,
  hiddenPlacements,
  selectedPlacementId = null,
  onSelectPlacement,
  onToggleHidden,
  onReorderPlacements,
}) {
  const { t } = useTranslation("pages");

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
                const creditId = getCreditId(placement);
                return (
                  <Draggable
                    key={creditId}
                    draggableId={String(creditId)}
                    index={index}
                  >
                    {(dragProvided, snapshot) => (
                      <PlacementManageRow
                        placement={placement}
                        isHidden={false}
                        isSelected={selectedPlacementId === creditId}
                        onSelect={onSelectPlacement}
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
                key={getCreditId(placement)}
                placement={placement}
                isHidden
                isSelected={selectedPlacementId === getCreditId(placement)}
                onSelect={onSelectPlacement}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
