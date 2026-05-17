import { Draggable } from "@hello-pangea/dnd";
import { useTranslation } from "react-i18next";
import { DragHandleIcon, TrashIcon } from "@/components/common/icons";
import { SURFACE_STACK_KIND_GRADIENT } from "@/utils/profileHeaderSurfaceStyle";
import { canDeleteStackEntry, getLayerDisplayLabel } from "./profileHeaderSurfaceEditorUtils";
import ProfileHeaderSurfaceLayerThumb from "./ProfileHeaderSurfaceLayerThumb";
import ProfileHeaderSurfaceLayerName from "./ProfileHeaderSurfaceLayerName";
import ProfileHeaderSurfaceLayerOpacityControl from "./ProfileHeaderSurfaceLayerOpacityControl";

export default function ProfileHeaderSurfaceLayerSortableItem({
  draggableId,
  index,
  entry,
  stack,
  stackIndex,
  selected,
  previewImageAssets,
  onSelectStackId,
  onPatchStackEntry,
  onRemoveLayer,
}) {
  const { t } = useTranslation(["pages"]);
  const displayLabel = getLayerDisplayLabel(entry, stack, stackIndex, t);
  const isGradient = entry.kind === SURFACE_STACK_KIND_GRADIENT;
  const showDelete = canDeleteStackEntry(stack, stackIndex);

  return (
    <Draggable draggableId={String(draggableId)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
          role="option"
          aria-selected={selected}
          className={
            snapshot.isDragging
              ? "profile-header-surface-layer-list__item profile-header-surface-layer-list__item--dragging"
              : "profile-header-surface-layer-list__item"
          }
        >
          <div className="profile-header-surface-layer-list__item-main">
            <div
              className="profile-header-surface-layer-list__drag-zone"
              role="button"
              tabIndex={0}
              aria-label={t("settings.headerSurface.dragLayerAria")}
              {...provided.dragHandleProps}
            >
              <span className="profile-header-surface-layer-list__drag-handle" aria-hidden>
                <DragHandleIcon size="16px" color="currentColor" />
              </span>
            </div>
            <button
              type="button"
              className={
                selected
                  ? "profile-header-surface-layer-list__chip profile-header-surface-layer-list__chip--selected"
                  : "profile-header-surface-layer-list__chip"
              }
              onClick={() => onSelectStackId(entry.id)}
            >
              <ProfileHeaderSurfaceLayerThumb
                entry={entry}
                previewImageUrl={previewImageAssets?.[entry.id]?.url ?? null}
              />
              <span className="profile-header-surface-layer-list__chip-text">
                <ProfileHeaderSurfaceLayerName
                  displayLabel={displayLabel}
                  onCommit={(label) =>
                    onPatchStackEntry(stackIndex, (e) => {
                      if (label) e.label = label;
                      else delete e.label;
                    })
                  }
                />
                {isGradient ? (
                  <span className="profile-header-surface-layer-list__chip-type">{entry.type}</span>
                ) : null}
              </span>
              <ProfileHeaderSurfaceLayerOpacityControl
                visible={entry.visible !== false}
                opacity={entry.opacity ?? 1}
                onToggleVisible={() =>
                  onPatchStackEntry(stackIndex, (e) => {
                    e.visible = e.visible === false;
                  })
                }
                onOpacityChange={(next) =>
                  onPatchStackEntry(stackIndex, (e) => {
                    e.opacity = next;
                  })
                }
              />
            </button>
          </div>
          {showDelete ? (
            <button
              type="button"
              className="profile-header-surface-layer-list__icon-btn profile-header-surface-layer-list__icon-btn--danger profile-header-surface-layer-list__item-delete"
              aria-label={
                entry.kind === SURFACE_STACK_KIND_GRADIENT
                  ? t("settings.headerSurface.removeLayer")
                  : t("settings.headerSurface.removeImageLayer")
              }
              onClick={() => onRemoveLayer(stackIndex)}
            >
              <TrashIcon color="currentColor" size="16px" />
            </button>
          ) : null}
        </div>
      )}
    </Draggable>
  );
}
