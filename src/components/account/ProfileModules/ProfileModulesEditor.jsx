import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { CustomSelect } from "@/components/common/selectors";
import { DragHandleIcon, TrashIcon } from "@/components/common/icons";
import {
  addModuleType,
  cloneModulesDocument,
  createStockLayout,
  isRequiredModuleType,
  moduleTypesForKind,
  profileModuleTypeLabelKeys,
  profileModulesCap,
  profileModulesCapsFromUser,
  removeModuleAt,
  reorderModules,
  updateFavoriteItems,
} from "@/utils/profileModules";
import FavoriteItemsEditor from "./FavoriteItemsEditor";
import "./profileModules.css";

const LIST_ID = "profile-modules-list";

export default function ProfileModulesEditor({
  kind,
  value,
  resolved,
  stellarActive,
  user,
  dirty = false,
  onChange,
  onDiscard,
}) {
  const { t } = useTranslation("pages");
  const document = useMemo(
    () => cloneModulesDocument(kind, value),
    [kind, value],
  );
  const caps = profileModulesCapsFromUser(user);
  const cap = profileModulesCap(stellarActive, user);
  const count = document.modules.length;
  const addDisabled = count >= cap;

  const enabledTypes = new Set(document.modules.map((mod) => mod.type));
  const addOptions = moduleTypesForKind(kind)
    .filter((type) => !enabledTypes.has(type) && !isRequiredModuleType(kind, type))
    .map((type) => ({
      value: type,
      label: t(profileModuleTypeLabelKeys(kind, type), { defaultValue: type }),
    }));

  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;
    onChange(reorderModules(document, kind, source.index, destination.index));
  };

  return (
    <div className="profile-modules-editor">
      <div className="profile-modules-editor__meta">
        <p className="profile-modules-editor__counter">
          {t("settings.modules.counter", { used: count, cap })}
        </p>
        <div className="profile-modules-editor__actions">
          {dirty && onDiscard ? (
            <button
              type="button"
              className="profile-modules-editor__btn btn-fill-secondary"
              onClick={onDiscard}
            >
              {t("settings.modules.discard")}
            </button>
          ) : null}
          <button
            type="button"
            className="profile-modules-editor__btn btn-fill-secondary"
            onClick={() => {
              if (!window.confirm(t("settings.modules.resetConfirm"))) return;
              onChange(createStockLayout(kind));
            }}
          >
            {t("settings.modules.reset")}
          </button>
        </div>
      </div>
      {addDisabled ? (
        <p className="profile-modules-editor__hint">
          {stellarActive
            ? t("settings.modules.capReached")
            : t("settings.modules.capReachedFree", {
                freeCap: caps.freeCap,
                stellarCap: caps.stellarCap,
              })}
        </p>
      ) : null}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={LIST_ID}>
          {(provided) => (
            <div
              className="profile-modules-editor__list"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {document.modules.map((mod, index) => (
                <Draggable key={mod.id} draggableId={mod.id} index={index}>
                  {(drag) => (
                    <div
                      className="profile-modules-editor__row"
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      style={drag.draggableProps.style}
                    >
                      <div className="profile-modules-editor__row-main">
                        <button
                          type="button"
                          className="profile-modules-editor__drag"
                          aria-label={t("settings.modules.dragAria")}
                          {...drag.dragHandleProps}
                        >
                          <DragHandleIcon size="16px" color="currentColor" />
                        </button>
                        <span className="profile-modules-editor__name">
                          {t(profileModuleTypeLabelKeys(kind, mod.type), {
                            defaultValue: mod.type,
                          })}
                        </span>
                        {isRequiredModuleType(kind, mod.type) ? (
                          <span className="profile-modules-editor__required">
                            {t("settings.modules.required")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="profile-modules-editor__btn profile-modules-editor__btn--icon btn-fill-secondary"
                            onClick={() => onChange(removeModuleAt(document, kind, index))}
                          >
                            <TrashIcon size="16px" color="currentColor" />
                          </button>
                        )}
                      </div>
                      {mod.type === "favorite" ? (
                        <FavoriteItemsEditor
                          items={mod.config?.items || []}
                          resolvedItems={resolved?.[mod.id]?.items || []}
                          maxFavoriteItems={caps.maxFavoriteItems}
                          onChange={(items) =>
                            onChange(updateFavoriteItems(document, kind, mod.id, items))
                          }
                        />
                      ) : null}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="profile-modules-editor__add">
        <CustomSelect
          options={addOptions}
          value={null}
          placeholder={t("settings.modules.addPlaceholder")}
          onChange={(option) => {
            if (!option?.value || addDisabled) return;
            onChange(addModuleType(document, kind, option.value));
          }}
          width="16rem"
          isDisabled={addDisabled || addOptions.length === 0}
          isSearchable={false}
        />
      </div>
    </div>
  );
}
