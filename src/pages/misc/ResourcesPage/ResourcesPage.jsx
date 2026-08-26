// tuf-search: #ResourcesPage #resourcesPage #misc #resources
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { useAuth } from "@/contexts/AuthContext";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from "@/utils/meta";
import { Footer } from "@/components/layout";
import { ExternalLink } from "@/components/common/LinkConfirm";
import { CloseButton } from "@/components/common/buttons";
import { EditIcon, ExternalLinkIcon, TrashIcon } from "@/components/common/icons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getRateLimitMessage } from "@/utils/rateLimitError";
import "./resourcesPage.css";

const EMPTY_NEW_LINK = {
  title: "",
  url: "",
  description: "",
  group: "",
  isPublished: true,
};

function hostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function sortNamedGroups(list) {
  return [...(list || [])].sort((a, b) => {
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function apiErrorMessage(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

const ResourcesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(["pages", "common"]);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t("resources.meta.title"),
        description: t("resources.meta.description"),
        pathname: location.pathname,
        image: "/og-image.jpg",
        type: "website",
      }),
    [t, location.pathname],
  );

  const [links, setLinks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [managing, setManaging] = useState(false);
  const [manageTab, setManageTab] = useState("links");
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deletingLink, setDeletingLink] = useState(null);
  const [newLink, setNewLink] = useState(EMPTY_NEW_LINK);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [isLinksReordering, setIsLinksReordering] = useState(false);
  const [isGroupsReordering, setIsGroupsReordering] = useState(false);

  const anyModalOpen = Boolean(
    isCreatingLink ||
      editingLink ||
      deletingLink ||
      isCreatingGroup ||
      editingGroup ||
      deletingGroup,
  );
  useBodyScrollLock(anyModalOpen);

  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      if (isAdmin) {
        const [linksRes, groupsRes] = await Promise.all([
          api.get(routes.admin.usefulLinks.root()),
          api.get(routes.admin.usefulLinks.groups()),
        ]);
        setLinks(Array.isArray(linksRes.data) ? linksRes.data : []);
        setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      } else {
        const { data } = await api.get(routes.usefulLinks.list());
        setLinks(Array.isArray(data) ? data : []);
        setGroups([]);
      }
    } catch {
      setLoadError(true);
      setLinks([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    loadData();
  }, [loadData, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    setManaging(isAdmin);
  }, [authLoading, isAdmin]);

  const sortedNamedGroups = useMemo(() => {
    if (groups.length) return sortNamedGroups(groups);
    const byId = new Map();
    for (const link of links) {
      if (link.groupId == null || !String(link.group || "").trim()) continue;
      if (!byId.has(link.groupId)) {
        byId.set(link.groupId, {
          id: link.groupId,
          name: link.group,
          sortOrder: link.groupSortOrder ?? 0,
        });
      }
    }
    return sortNamedGroups([...byId.values()]);
  }, [groups, links]);

  const linksByGroupId = useMemo(() => {
    const acc = {};
    for (const link of links) {
      const key = link.groupId == null ? "ungrouped" : String(link.groupId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(link);
    }
    return acc;
  }, [links]);

  const sortLinksInGroup = (list) =>
    [...(list || [])].sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0));

  const namedGroupSections = sortedNamedGroups.map((group) => ({
    id: group.id,
    name: group.name,
    groupSortOrder: group.sortOrder ?? 0,
    links: sortLinksInGroup(linksByGroupId[String(group.id)]),
  }));

  const ungroupedLinks = sortLinksInGroup(linksByGroupId.ungrouped);
  const orderedGroups = [
    ...namedGroupSections,
    ...(ungroupedLinks.length
      ? [{ id: null, name: "", groupSortOrder: Number.MAX_SAFE_INTEGER, links: ungroupedLinks }]
      : []),
  ];

  const publicGroups = orderedGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => link.isPublished !== false),
    }))
    .filter((group) => group.links.length > 0);

  const closeManageModals = () => {
    setIsCreatingLink(false);
    setEditingLink(null);
    setDeletingLink(null);
    setNewLink(EMPTY_NEW_LINK);
    setIsCreatingGroup(false);
    setEditingGroup(null);
    setDeletingGroup(null);
    setNewGroupName("");
  };

  const handleCreateLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    try {
      await toast.promise(
        (async () => {
          await api.post(routes.admin.usefulLinks.root(), {
            title: newLink.title.trim(),
            url: newLink.url.trim(),
            description: newLink.description.trim() || null,
            group: newLink.group.trim() || null,
            isPublished: Boolean(newLink.isPublished),
          });
          setIsCreatingLink(false);
          setNewLink(EMPTY_NEW_LINK);
          await loadData();
        })(),
        {
          loading: t("loading.creating", { ns: "common" }),
          success: t("resources.links.notifications.created"),
          error: (err) => apiErrorMessage(err, t("resources.links.notifications.createFailed")),
        },
      );
    } catch (error) {
      console.error("Error creating useful link:", error);
    }
  };

  const handleUpdateLink = async () => {
    if (!editingLink?.id || !String(editingLink.title || "").trim() || !String(editingLink.url || "").trim()) {
      return;
    }
    try {
      await toast.promise(
        (async () => {
          await api.patch(routes.admin.usefulLinks.byId(editingLink.id), {
            title: String(editingLink.title).trim(),
            url: String(editingLink.url).trim(),
            description: String(editingLink.description || "").trim() || null,
            group: String(editingLink.group || "").trim() || null,
            isPublished: Boolean(editingLink.isPublished),
          });
          setEditingLink(null);
          await loadData();
        })(),
        {
          loading: t("loading.updating", { ns: "common" }),
          success: t("resources.links.notifications.updated"),
          error: (err) => apiErrorMessage(err, t("resources.links.notifications.updateFailed")),
        },
      );
    } catch (error) {
      console.error("Error updating useful link:", error);
    }
  };

  const handleDeleteLink = async () => {
    if (!deletingLink) return;
    try {
      await toast.promise(
        (async () => {
          await api.delete(routes.admin.usefulLinks.byId(deletingLink.id));
          setDeletingLink(null);
          await loadData();
        })(),
        {
          loading: t("loading.deleting", { ns: "common" }),
          success: t("resources.links.notifications.deleted"),
          error: (err) => apiErrorMessage(err, t("resources.links.notifications.deleteFailed")),
        },
      );
    } catch (error) {
      console.error("Error deleting useful link:", error);
    }
  };

  const handleLinkDragEnd = async (result, group) => {
    if (!result.destination) return;
    if (result.source.droppableId !== result.destination.droppableId) return;
    if (result.source.index === result.destination.index) return;

    setIsLinksReordering(true);
    try {
      const groupLinks =
        group.id == null
          ? links.filter((link) => link.groupId == null)
          : links.filter((link) => link.groupId === group.id);
      const items = sortLinksInGroup(groupLinks);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      const updatedItems = items.map((item, index) => ({
        ...item,
        sortWeight: index,
      }));
      setLinks((prev) =>
        prev.map((link) => {
          const updated = updatedItems.find((row) => row.id === link.id);
          return updated || link;
        }),
      );
      await toast.promise(
        api.put(routes.admin.usefulLinks.sortOrders(), {
          sortOrders: updatedItems.map((item) => ({
            id: item.id,
            sortOrder: item.sortWeight,
          })),
        }),
        {
          loading: t("resources.loading.reorderingLinks"),
          success: t("resources.links.notifications.reordered"),
          error: (err) => apiErrorMessage(err, t("resources.links.notifications.reorderFailed")),
        },
      );
    } catch (error) {
      console.error("Error updating useful link sort orders:", error);
      await loadData();
    } finally {
      setIsLinksReordering(false);
    }
  };

  const handleGroupDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    setIsGroupsReordering(true);
    try {
      const items = Array.from(sortedNamedGroups);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      const groupUpdates = items.map((group, index) => ({
        id: group.id,
        name: group.name,
        sortOrder: index,
      }));
      setGroups(items.map((group, index) => ({ ...group, sortOrder: index })));
      await toast.promise(
        api.put(routes.admin.usefulLinks.groupSortOrders(), { groups: groupUpdates }),
        {
          loading: t("resources.loading.reorderingGroups"),
          success: t("resources.groups.notifications.reordered"),
          error: (err) => apiErrorMessage(err, t("resources.groups.notifications.reorderFailed")),
        },
      );
    } catch (error) {
      console.error("Error updating useful link group sort orders:", error);
      await loadData();
    } finally {
      setIsGroupsReordering(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await toast.promise(
        (async () => {
          await api.post(routes.admin.usefulLinks.groups(), { name });
          setIsCreatingGroup(false);
          setNewGroupName("");
          await loadData();
        })(),
        {
          loading: t("loading.creating", { ns: "common" }),
          success: t("resources.groups.notifications.created"),
          error: (err) => apiErrorMessage(err, t("resources.groups.notifications.createFailed")),
        },
      );
    } catch (error) {
      console.error("Error creating useful link group:", error);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    const name = String(editingGroup.name || "").trim();
    if (!name) return;
    try {
      await toast.promise(
        (async () => {
          await api.put(routes.admin.usefulLinks.groupById(editingGroup.id), { name });
          setEditingGroup(null);
          await loadData();
        })(),
        {
          loading: t("loading.updating", { ns: "common" }),
          success: t("resources.groups.notifications.updated"),
          error: (err) => apiErrorMessage(err, t("resources.groups.notifications.updateFailed")),
        },
      );
    } catch (error) {
      console.error("Error updating useful link group:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    try {
      await toast.promise(
        (async () => {
          await api.delete(routes.admin.usefulLinks.groupById(deletingGroup.id));
          setDeletingGroup(null);
          await loadData();
        })(),
        {
          loading: t("loading.deleting", { ns: "common" }),
          success: t("resources.groups.notifications.deleted"),
          error: (err) => apiErrorMessage(err, t("resources.groups.notifications.deleteFailed")),
        },
      );
    } catch (error) {
      console.error("Error deleting useful link group:", error);
    }
  };

  const groupNameOptions = sortedNamedGroups.map((group) => group.name).filter(Boolean);

  const renderCardBody = (link) => (
    <>
      <div className="resources-page__card-copy">
        <div className="resources-page__card-title-row">
          <strong className="resources-page__card-title">{link.title}</strong>
        </div>
        {link.description ? (
          <p className="resources-page__card-description">{link.description}</p>
        ) : null}
        <div className="resources-page__card-meta">
          <span>{hostFromUrl(link.url)}</span>
        </div>
      </div>
      <ExternalLinkIcon size={18} color="var(--color-white-t70)" />
    </>
  );

  const renderLinkFormFields = (value, onChange) => (
    <>
      <div className="form-group">
        <label>{t("resources.links.fields.title")}</label>
        <input
          type="text"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          maxLength={255}
          required
        />
      </div>
      <div className="form-group">
        <label>{t("resources.links.fields.url")}</label>
        <input
          type="text"
          value={value.url}
          onChange={(event) => onChange({ ...value, url: event.target.value })}
          placeholder={t("resources.links.fields.urlPlaceholder")}
          required
        />
      </div>
      <div className="form-group">
        <label>{t("resources.links.fields.group.label")}</label>
        <input
          type="text"
          list="resource-group-options"
          value={value.group}
          onChange={(event) => onChange({ ...value, group: event.target.value })}
          placeholder={t("resources.links.fields.group.placeholder")}
          maxLength={64}
        />
        <datalist id="resource-group-options">
          {groupNameOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <div className="form-group">
        <label>{t("resources.links.fields.description")}</label>
        <textarea
          rows={3}
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          maxLength={2000}
        />
      </div>
      <div className="form-group form-group--checkbox">
        <label>
          <input
            type="checkbox"
            checked={Boolean(value.isPublished)}
            onChange={(event) => onChange({ ...value, isPublished: event.target.checked })}
          />
          <span>{t("resources.links.fields.published")}</span>
        </label>
      </div>
    </>
  );

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <header className="resources-page__header">
            <div className="resources-page__heading">
              <h1>{t("resources.title")}</h1>
              <p>{t("resources.subtitle")}</p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                className={managing ? "btn-fill-secondary" : "btn-fill-primary"}
                onClick={() => {
                  if (managing) {
                    closeManageModals();
                    setManaging(false);
                    return;
                  }
                  setManaging(true);
                }}
              >
                {managing
                  ? t("buttons.done", { ns: "common" })
                  : t("resources.admin.manage")}
              </button>
            ) : null}
          </header>

          {managing ? (
            <>
              <div className="sub-tab-navigation">
                <button
                  type="button"
                  className={`sub-tab-button ${manageTab === "links" ? "active" : ""}`}
                  onClick={() => setManageTab("links")}
                >
                  {t("resources.tabs.links")}
                </button>
                <button
                  type="button"
                  className={`sub-tab-button ${manageTab === "groups" ? "active" : ""}`}
                  onClick={() => setManageTab("groups")}
                >
                  {t("resources.tabs.groups")}
                </button>
              </div>

              {manageTab === "links" ? (
                <>
                  <button
                    type="button"
                    className="create-button"
                    onClick={() => {
                      setNewLink(EMPTY_NEW_LINK);
                      setIsCreatingLink(true);
                    }}
                    disabled={loading || isLinksReordering}
                  >
                    {t("resources.links.createButton")}
                  </button>

                  {loading ? (
                    <div className="loading-message">{t("loading.generic", { ns: "common" })}</div>
                  ) : loadError ? (
                    <div className="no-items-message">{t("resources.errors.loadFailed")}</div>
                  ) : links.length === 0 ? (
                    <div className="no-items-message">{t("resources.links.noLinks")}</div>
                  ) : (
                    <div className="grouped-tags-container">
                      {orderedGroups.map((group) => (
                        <div key={group.name || "ungrouped"} className="tag-group-section">
                          <h3 className="tag-group-header">
                            {group.name || t("resources.links.ungrouped")}
                            <span className="tag-count">({group.links.length})</span>
                          </h3>
                          <DragDropContext
                            onDragEnd={(result) => handleLinkDragEnd(result, group)}
                          >
                            <Droppable droppableId={`group-${group.id ?? "ungrouped"}`}>
                              {(provided) => (
                                <div
                                  className="tags-list"
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                >
                                  {group.links.map((link, index) => (
                                    <Draggable
                                      key={link.id}
                                      draggableId={`link-${link.id}`}
                                      index={index}
                                      isDragDisabled={isLinksReordering}
                                    >
                                      {(dragProvided, snapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          {...dragProvided.dragHandleProps}
                                          className={`tag-item ${snapshot.isDragging ? "dragging" : ""}`}
                                        >
                                          <div className="tag-item-content">
                                            <div className="tag-item-info">
                                              <div className="tag-item-name">
                                                {link.title}
                                                {link.isPublished === false ? (
                                                  <span className="resources-page__badge">
                                                    {t("resources.admin.hidden")}
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div className="tag-item-color">
                                                {hostFromUrl(link.url)}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="tag-item-actions">
                                            <button
                                              type="button"
                                              onMouseDown={(event) => event.stopPropagation()}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setEditingLink({
                                                  ...link,
                                                  group: link.group || "",
                                                  description: link.description || "",
                                                });
                                              }}
                                              disabled={isLinksReordering}
                                            >
                                              <EditIcon color="#fff" size="20px" />
                                            </button>
                                            <button
                                              type="button"
                                              onMouseDown={(event) => event.stopPropagation()}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setDeletingLink(link);
                                              }}
                                              disabled={isLinksReordering}
                                            >
                                              <TrashIcon color="#fff" size="20px" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="create-button"
                    onClick={() => {
                      setNewGroupName("");
                      setIsCreatingGroup(true);
                    }}
                    disabled={loading || isGroupsReordering}
                  >
                    {t("resources.groups.createButton")}
                  </button>
                  {loading ? (
                    <div className="loading-message">{t("loading.generic", { ns: "common" })}</div>
                  ) : loadError ? (
                    <div className="no-items-message">{t("resources.errors.loadFailed")}</div>
                  ) : sortedNamedGroups.length === 0 ? (
                    <div className="no-items-message">{t("resources.groups.noGroups")}</div>
                  ) : (
                    <DragDropContext onDragEnd={handleGroupDragEnd}>
                      <Droppable droppableId="groups">
                        {(provided) => (
                          <div
                            className="groups-list"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {sortedNamedGroups.map((group, index) => (
                              <Draggable
                                key={group.id}
                                draggableId={`group-${group.id}`}
                                index={index}
                                isDragDisabled={isGroupsReordering}
                              >
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`group-item ${snapshot.isDragging ? "dragging" : ""}`}
                                  >
                                    <div className="group-item-content">
                                      <div className="group-item-name">{group.name}</div>
                                      <div className="group-item-count">
                                        {t("resources.links.linkCount", {
                                          count: (linksByGroupId[String(group.id)] || []).length,
                                          plural:
                                            (linksByGroupId[String(group.id)] || []).length !== 1
                                              ? "s"
                                              : "",
                                        })}
                                      </div>
                                    </div>
                                    <div className="group-item-preview">
                                      {sortLinksInGroup(linksByGroupId[String(group.id)])
                                        .slice(0, 5)
                                        .map((link) => (
                                          <div
                                            key={link.id}
                                            className="group-tag-preview"
                                            title={link.title}
                                          >
                                            <span>{String(link.title || "?").charAt(0)}</span>
                                          </div>
                                        ))}
                                      {(linksByGroupId[String(group.id)] || []).length > 5 ? (
                                        <span className="more-tags">
                                          +{(linksByGroupId[String(group.id)] || []).length - 5}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="group-item-actions">
                                      <button
                                        type="button"
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setEditingGroup({ ...group });
                                        }}
                                        disabled={isGroupsReordering}
                                      >
                                        <EditIcon color="#fff" size="20px" />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setDeletingGroup(group);
                                        }}
                                        disabled={isGroupsReordering}
                                      >
                                        <TrashIcon color="#fff" size="20px" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </>
              )}

              {isCreatingLink ? (
                <div
                  className="difficulty-modal"
                  onClick={(event) => {
                    if (event.target.className === "difficulty-modal") {
                      setIsCreatingLink(false);
                      setNewLink(EMPTY_NEW_LINK);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => {
                        setIsCreatingLink(false);
                        setNewLink(EMPTY_NEW_LINK);
                      }}
                      aria-label={t("buttons.close", { ns: "common" })}
                    />
                    <h2>{t("resources.links.create.title")}</h2>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleCreateLink();
                      }}
                    >
                      {renderLinkFormFields(newLink, setNewLink)}
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">
                          {t("resources.links.create.createButton")}
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            setIsCreatingLink(false);
                            setNewLink(EMPTY_NEW_LINK);
                          }}
                        >
                          {t("buttons.cancel", { ns: "common" })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {editingLink ? (
                <div
                  className="difficulty-modal"
                  onClick={(event) => {
                    if (event.target.className === "difficulty-modal") {
                      setEditingLink(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setEditingLink(null)}
                      aria-label={t("buttons.close", { ns: "common" })}
                    />
                    <h2>{t("resources.links.edit.title")}</h2>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdateLink();
                      }}
                    >
                      {renderLinkFormFields(editingLink, setEditingLink)}
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">
                          {t("resources.links.edit.updateButton")}
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setEditingLink(null)}
                        >
                          {t("buttons.cancel", { ns: "common" })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {deletingLink ? (
                <div
                  className="difficulty-modal"
                  onClick={(event) => {
                    if (event.target.className === "difficulty-modal") {
                      setDeletingLink(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setDeletingLink(null)}
                      aria-label={t("buttons.close", { ns: "common" })}
                    />
                    <h2>{t("resources.links.delete.title")}</h2>
                    <p>{t("resources.links.delete.message", { name: deletingLink.title })}</p>
                    <p>{t("resources.links.delete.description")}</p>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="delete-confirm-button"
                        onClick={handleDeleteLink}
                      >
                        {t("resources.links.delete.deleteButton")}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setDeletingLink(null)}
                      >
                        {t("buttons.cancel", { ns: "common" })}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isCreatingGroup ? (
                <div
                  className="difficulty-modal"
                  onClick={(event) => {
                    if (event.target.className === "difficulty-modal") {
                      setIsCreatingGroup(false);
                      setNewGroupName("");
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => {
                        setIsCreatingGroup(false);
                        setNewGroupName("");
                      }}
                      aria-label={t("buttons.close", { ns: "common" })}
                    />
                    <h2>{t("resources.groups.create.title")}</h2>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleCreateGroup();
                      }}
                    >
                      <div className="form-group">
                        <label>{t("resources.groups.create.name")}</label>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(event) => setNewGroupName(event.target.value)}
                          maxLength={64}
                          required
                        />
                      </div>
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">
                          {t("resources.groups.create.createButton")}
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            setIsCreatingGroup(false);
                            setNewGroupName("");
                          }}
                        >
                          {t("buttons.cancel", { ns: "common" })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {editingGroup ? (
                <div
                  className="difficulty-modal"
                  onClick={(event) => {
                    if (event.target.className === "difficulty-modal") {
                      setEditingGroup(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setEditingGroup(null)}
                      aria-label={t("buttons.close", { ns: "common" })}
                    />
                    <h2>{t("resources.groups.edit.title")}</h2>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdateGroup();
                      }}
                    >
                      <div className="form-group">
                        <label>{t("resources.groups.edit.name")}</label>
                        <input
                          type="text"
                          value={editingGroup.name}
                          onChange={(event) =>
                            setEditingGroup({ ...editingGroup, name: event.target.value })
                          }
                          maxLength={64}
                          required
                        />
                      </div>
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">
                          {t("resources.groups.edit.updateButton")}
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setEditingGroup(null)}
                        >
                          {t("buttons.cancel", { ns: "common" })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {deletingGroup ? (
                <div
                  className="difficulty-modal"
                  onClick={(event) => {
                    if (event.target.className === "difficulty-modal") {
                      setDeletingGroup(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setDeletingGroup(null)}
                      aria-label={t("buttons.close", { ns: "common" })}
                    />
                    <h2>{t("resources.groups.delete.title")}</h2>
                    <p>{t("resources.groups.delete.message", { name: deletingGroup.name })}</p>
                    <p>{t("resources.groups.delete.description")}</p>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="delete-confirm-button"
                        onClick={handleDeleteGroup}
                      >
                        {t("resources.groups.delete.deleteButton")}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setDeletingGroup(null)}
                      >
                        {t("buttons.cancel", { ns: "common" })}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : loading ? (
            <div className="loader-shell">
              <div className="loader loader-relative" />
            </div>
          ) : loadError ? (
            <p className="resources-page__empty">{t("resources.errors.loadFailed")}</p>
          ) : !publicGroups.length ? (
            <p className="resources-page__empty">{t("resources.empty")}</p>
          ) : (
            <div className="resources-page__groups">
              {publicGroups.map((group) => (
                <section key={group.id ?? "ungrouped"} className="resources-page__group">
                  {publicGroups.length > 1 || group.name ? (
                    <h2>{group.name || t("resources.ungrouped")}</h2>
                  ) : null}
                  <div className="resources-page__list">
                    {group.links.map((link) => (
                      <ExternalLink
                        key={link.id}
                        href={link.url}
                        className="resources-page__card resources-page__card--link"
                      >
                        {renderCardBody(link)}
                      </ExternalLink>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default ResourcesPage;
