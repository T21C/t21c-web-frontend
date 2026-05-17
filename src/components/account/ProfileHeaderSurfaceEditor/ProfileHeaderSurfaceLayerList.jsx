import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES } from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceLayerSortableItem from "./ProfileHeaderSurfaceLayerSortableItem";

const STACK_DROPPABLE_ID = "profile-header-surface-stack";

export default function ProfileHeaderSurfaceLayerList({
  layout = "rail",
  stack,
  selectedStackId,
  onSelectStackId,
  onAddLayer,
  onAddImage,
  canAddStackEntry,
  canAddImageLayer,
  previewImageAssets,
  onReorderStack,
  onRemoveLayer,
  onPatchStackEntry,
}) {
  const { t } = useTranslation(["pages"]);
  const isDrawer = layout === "drawer";
  const stackCount = stack.length;

  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId !== source.droppableId) return;
    if (destination.index === source.index) return;
    onReorderStack(source.index, destination.index);
  };

  const itemProps = {
    stack,
    previewImageAssets,
    onSelectStackId,
    onPatchStackEntry,
    onRemoveLayer,
  };

  return (
    <div
      className={
        isDrawer
          ? "profile-header-surface-layer-list profile-header-surface-layer-list--drawer"
          : "profile-header-surface-layer-list profile-header-surface-layer-list--rail"
      }
    >
      <div className="profile-header-surface-layer-list__head">
        {!isDrawer ? (
          <span className="profile-header-surface-layer-list__label">
            {t("settings.headerSurface.layersLabel", {
              count: stackCount,
              max: MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES,
            })}
          </span>
        ) : null}
        <div className="profile-header-surface-layer-list__head-actions">
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-list__add"
            disabled={!canAddStackEntry}
            onClick={onAddLayer}
          >
            {t("settings.headerSurface.addLayer")}
          </button>
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-list__add"
            disabled={!canAddImageLayer}
            onClick={onAddImage}
          >
            {t("settings.headerSurface.addImage")}
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={STACK_DROPPABLE_ID}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="profile-header-surface-layer-list__items"
              role="listbox"
              aria-label={t("settings.headerSurface.layersLabel", {
                count: stackCount,
                max: MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES,
              })}
            >
              {stack.map((entry, index) => (
                <ProfileHeaderSurfaceLayerSortableItem
                  key={entry.id}
                  draggableId={entry.id}
                  index={index}
                  entry={entry}
                  stackIndex={index}
                  selected={selectedStackId === entry.id}
                  {...itemProps}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
