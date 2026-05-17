import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { DragHandleIcon, TrashIcon } from "@/components/common/icons";
import { SURFACE_STACK_KIND_GRADIENT } from "@/utils/profileHeaderSurfaceStyle";
import { canDeleteStackEntry, getLayerDisplayLabel } from "./profileHeaderSurfaceEditorUtils";
import ProfileHeaderSurfaceLayerThumb from "./ProfileHeaderSurfaceLayerThumb";
import ProfileHeaderSurfaceLayerName from "./ProfileHeaderSurfaceLayerName";
import ProfileHeaderSurfaceLayerOpacityControl from "./ProfileHeaderSurfaceLayerOpacityControl";

export default function ProfileHeaderSurfaceLayerSortableItem({
  entry,
  stack,
  stackIndex,
  selected,
  isDrawer,
  previewImageUrl,
  imageSettings,
  onSelectStackId,
  onPatchStackEntry,
  onRemoveLayer,
}) {
  const { t } = useTranslation(["pages"]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : undefined,
  };

  const displayLabel = getLayerDisplayLabel(entry, stack, stackIndex, t);
  const isGradient = entry.kind === SURFACE_STACK_KIND_GRADIENT;
  const showDelete = canDeleteStackEntry(stack, stackIndex);

  return (
    <li
      ref={setNodeRef}
      style={style}
      role="presentation"
      className={
        isDragging
          ? "profile-header-surface-layer-list__item profile-header-surface-layer-list__item--dragging"
          : "profile-header-surface-layer-list__item"
      }
    >
      <div className="profile-header-surface-layer-list__item-main">
        <button
          type="button"
          className="profile-header-surface-layer-list__drag-handle"
          aria-label={t("settings.headerSurface.dragLayerAria")}
          {...attributes}
          {...listeners}
          onClick={(ev) => ev.stopPropagation()}
        >
          <DragHandleIcon size="16px" color="currentColor" />
        </button>
        <button
          type="button"
          role="option"
          aria-selected={selected}
          className={
            selected
              ? "profile-header-surface-layer-list__chip profile-header-surface-layer-list__chip--selected"
              : "profile-header-surface-layer-list__chip"
          }
          onClick={() => onSelectStackId(entry.id)}
        >
          <ProfileHeaderSurfaceLayerThumb
            entry={entry}
            previewImageUrl={previewImageUrl}
            imageSettings={imageSettings}
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
    </li>
  );
}
