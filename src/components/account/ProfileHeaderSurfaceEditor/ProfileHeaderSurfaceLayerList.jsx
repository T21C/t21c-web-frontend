import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  MAX_PROFILE_HEADER_SURFACE_LAYERS,
  countGradientStackEntries,
} from "@/utils/profileHeaderSurfaceStyle";
import ProfileHeaderSurfaceLayerSortableItem from "./ProfileHeaderSurfaceLayerSortableItem";

export default function ProfileHeaderSurfaceLayerList({
  layout = "rail",
  stack,
  selectedStackId,
  onSelectStackId,
  onAddLayer,
  onAddImage,
  stackHasImageLayer,
  previewImageUrl,
  imageSettings,
  onReorderStack,
  onRemoveLayer,
  onPatchStackEntry,
}) {
  const { t } = useTranslation(["pages"]);
  const isDrawer = layout === "drawer";
  const gradientCount = countGradientStackEntries(stack);

  const stackIds = useMemo(() => stack.map((e) => e.id), [stack]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderStack(active.id, over.id);
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
              count: gradientCount,
              max: MAX_PROFILE_HEADER_SURFACE_LAYERS,
            })}
          </span>
        ) : null}
        <div className="profile-header-surface-layer-list__head-actions">
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-list__add"
            disabled={gradientCount >= MAX_PROFILE_HEADER_SURFACE_LAYERS}
            onClick={onAddLayer}
          >
            {t("settings.headerSurface.addLayer")}
          </button>
          <button
            type="button"
            className="btn-fill-secondary profile-header-surface-layer-list__add"
            disabled={stackHasImageLayer}
            onClick={onAddImage}
          >
            {t("settings.headerSurface.addImage")}
          </button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={stackIds}
          strategy={isDrawer ? horizontalListSortingStrategy : verticalListSortingStrategy}
        >
          <ul
            className="profile-header-surface-layer-list__items"
            role="listbox"
            aria-label={t("settings.headerSurface.drawerLayersAria")}
          >
            {stack.map((entry, stackIndex) => (
              <ProfileHeaderSurfaceLayerSortableItem
                key={entry.id}
                entry={entry}
                stack={stack}
                stackIndex={stackIndex}
                selected={selectedStackId === entry.id}
                isDrawer={isDrawer}
                previewImageUrl={previewImageUrl}
                imageSettings={imageSettings}
                onSelectStackId={onSelectStackId}
                onPatchStackEntry={onPatchStackEntry}
                onRemoveLayer={onRemoveLayer}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
