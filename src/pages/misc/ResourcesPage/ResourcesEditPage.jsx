import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { CloseButton } from '@/components/common/buttons';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { linkDisplayHost } from '@/utils/usefulLinkLocales';
import EditUsefulLinkPopup from '@/components/popups/Resources/EditUsefulLinkPopup';
import './resourcesPage.css';

const UNGROUPED_ID = 'ungrouped';

const EMPTY_LINK = {
  title: '',
  url: '',
  description: '',
  shorthand: '',
};

function confirmDiscardUnsaved(t, isDirty) {
  if (!isDirty) return true;
  return window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }));
}

function isNewLinkDirty(link) {
  return Boolean(
    (link?.title || '').trim() ||
      (link?.url || '').trim() ||
      (link?.description || '').trim() ||
      (link?.shorthand || '').trim(),
  );
}

function apiError(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

function applyCatalog(data) {
  return {
    groups: Array.isArray(data?.groups) ? data.groups : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

function sortGroups(groups) {
  return [...(groups || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id,
  );
}

function parseDroppableGroupId(droppableId) {
  if (droppableId === UNGROUPED_ID) return UNGROUPED_ID;
  const match = /^group-(\d+)$/.exec(droppableId);
  return match ? Number(match[1]) : null;
}

function parseDragLinkId(draggableId) {
  const match = /-(\d+)$/.exec(draggableId);
  return match ? Number(match[1]) : null;
}

function cloneGroupLinkIds(groups) {
  return groups.map((group) => ({
    ...group,
    linkIds: [...(group.linkIds || [])],
  }));
}

const ResourcesEditPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('resources.meta.editTitle'),
        description: t('resources.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const [groups, setGroups] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [languageMap, setLanguageMap] = useState({});
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deletingLink, setDeletingLink] = useState(null);
  const [newLink, setNewLink] = useState(EMPTY_LINK);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLinksReordering, setIsLinksReordering] = useState(false);
  const [isGroupsReordering, setIsGroupsReordering] = useState(false);

  const anyModalOpen = Boolean(
    isCreatingLink || editingLink || deletingLink || isCreatingGroup || editingGroup || deletingGroup,
  );
  useBodyScrollLock(anyModalOpen);

  const loadData = useCallback(async (nextCatalog) => {
    if (nextCatalog) {
      const catalog = applyCatalog(nextCatalog);
      setGroups(catalog.groups);
      setLinks(catalog.links);
      return;
    }
    setLoadError(false);
    try {
      const { data } = await api.get(routes.admin.usefulLinks.root());
      const catalog = applyCatalog(data);
      setGroups(catalog.groups);
      setLinks(catalog.links);
    } catch {
      setLoadError(true);
      setGroups([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) loadData();
  }, [authLoading, isAdmin, loadData]);

  useEffect(() => {
    api.get(routes.utils.languages()).then(({ data }) => {
      setLanguageMap(data && typeof data === 'object' ? data : {});
    }).catch(() => {});
  }, []);

  const linkById = useMemo(() => {
    const map = new Map();
    for (const link of links) map.set(link.id, link);
    return map;
  }, [links]);

  const orderedGroups = useMemo(() => sortGroups(groups), [groups]);
  const ungroupedLinks = useMemo(
    () =>
      [...links].sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0) || a.id - b.id),
    [links],
  );

  const persistAssignments = async (nextGroups) => {
    setIsLinksReordering(true);
    try {
      const { data } = await api.put(routes.admin.usefulLinks.groupAssignments(), {
        groups: nextGroups.map((group) => ({ id: group.id, linkIds: group.linkIds || [] })),
      });
      await loadData(data);
      toast.success(t('resources.links.notifications.reordered'));
    } catch (error) {
      toast.error(apiError(error, t('resources.links.notifications.reorderFailed')));
      await loadData();
    } finally {
      setIsLinksReordering(false);
    }
  };

  const handleLinkDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceKey = parseDroppableGroupId(result.source.droppableId);
    const destKey = parseDroppableGroupId(result.destination.droppableId);
    const linkId = parseDragLinkId(result.draggableId);
    if (sourceKey == null || destKey == null || !linkId) return;
    if (
      sourceKey === destKey &&
      result.source.index === result.destination.index
    ) {
      return;
    }

    if (!orderedGroups.length) {
      if (sourceKey !== UNGROUPED_ID || destKey !== UNGROUPED_ID) return;
      const next = [...ungroupedLinks];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      setLinks(next);
      setIsLinksReordering(true);
      try {
        const { data } = await api.put(routes.admin.usefulLinks.sortOrders(), {
          sortOrders: next.map((link, index) => ({ id: link.id, sortOrder: index })),
        });
        await loadData(data);
        toast.success(t('resources.links.notifications.reordered'));
      } catch (error) {
        toast.error(apiError(error, t('resources.links.notifications.reorderFailed')));
        await loadData();
      } finally {
        setIsLinksReordering(false);
      }
      return;
    }

    const next = cloneGroupLinkIds(orderedGroups);
    const sourceGroup = next.find((group) => group.id === sourceKey);
    const destGroup = next.find((group) => group.id === destKey);
    if (!sourceGroup || !destGroup) return;

    if (sourceKey !== destKey && destGroup.linkIds.includes(linkId)) {
      return;
    }

    const [movedId] = sourceGroup.linkIds.splice(result.source.index, 1);
    if (movedId !== linkId) return;
    destGroup.linkIds.splice(result.destination.index, 0, movedId);
    setGroups(next);
    await persistAssignments(next);
  };

  const handleGroupDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const next = [...orderedGroups];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setGroups(next);
    setIsGroupsReordering(true);
    try {
      const { data } = await api.put(routes.admin.usefulLinks.groupSortOrders(), {
        sortOrders: next.map((group, index) => ({ id: group.id, sortOrder: index })),
      });
      await loadData(data);
      toast.success(t('resources.groups.notifications.reordered'));
    } catch (error) {
      toast.error(apiError(error, t('resources.groups.notifications.reorderFailed')));
      await loadData();
    } finally {
      setIsGroupsReordering(false);
    }
  };

  const submitLink = async (payload) => {
    try {
      await api.post(routes.admin.usefulLinks.root(), payload);
      toast.success(t('resources.links.notifications.created'));
      setIsCreatingLink(false);
      setNewLink(EMPTY_LINK);
      await loadData();
    } catch (error) {
      toast.error(apiError(error, t('resources.links.notifications.createFailed')));
    }
  };

  const closeCreateLink = () => {
    if (!confirmDiscardUnsaved(t, isNewLinkDirty(newLink))) return;
    setIsCreatingLink(false);
    setNewLink(EMPTY_LINK);
  };

  const closeGroupModal = () => {
    const dirty = editingGroup
      ? editingGroup.name.trim() !==
        (groups.find((group) => group.id === editingGroup.id)?.name || '').trim()
      : Boolean(newGroupName.trim());
    if (!confirmDiscardUnsaved(t, dirty)) return;
    setIsCreatingGroup(false);
    setEditingGroup(null);
  };

  const renderLinkRow = (link, index, droppableKey) => (
    <Draggable
      key={`${droppableKey}-${link.id}`}
      draggableId={`link-${droppableKey}-${link.id}`}
      index={index}
      isDragDisabled={isLinksReordering}
    >
      {(dragProvided, snapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          className={`tag-item ${snapshot.isDragging ? 'dragging' : ''}`}
        >
          <div className="tag-item-content">
            <div className="tag-item-info">
              <div className="tag-item-name">{link.title}</div>
              <div className="tag-item-color">{linkDisplayHost(link.url, link.shorthand)}</div>
            </div>
          </div>
          <div className="tag-item-actions">
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setEditingLink(link);
              }}
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
            >
              <TrashIcon color="#fff" size="20px" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );

  if (authLoading) {
    return (
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/resources" replace />;
  }

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="resources-page">
        <div className="resources-page__container page-content-70rem">
          <header className="resources-page__header">
            <div className="resources-page__heading">
              <Link to="/resources" className="resources-page__back">
                {t('resources.backToResources')}
              </Link>
              <h1>{t('resources.editTitle')}</h1>
              <p>{t('resources.editSubtitle')}</p>
            </div>
            <div className="resources-page__header-actions">
              <button
                type="button"
                className="btn-fill-secondary"
                onClick={() => {
                  setNewGroupName('');
                  setIsCreatingGroup(true);
                }}
              >
                {t('resources.groups.createButton')}
              </button>
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => {
                  setNewLink(EMPTY_LINK);
                  setIsCreatingLink(true);
                }}
              >
                {t('resources.links.createButton')}
              </button>
            </div>
          </header>

          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : loadError ? (
            <div className="no-items-message">{t('resources.errors.loadFailed')}</div>
          ) : (
            <>
              {orderedGroups.length > 0 ? (
                <DragDropContext onDragEnd={handleGroupDragEnd}>
                  <Droppable droppableId="resource-groups">
                    {(provided) => (
                      <div
                        className="groups-list"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {orderedGroups.map((group, index) => (
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
                                className={`group-item ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                <div className="group-item-content">
                                  <div className="group-item-name">{group.name}</div>
                                  <div className="group-item-count">
                                    {t('resources.links.linkCount', {
                                      count: (group.linkIds || []).length,
                                    })}
                                  </div>
                                </div>
                                <div className="group-item-actions">
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setEditingGroup(group);
                                    }}
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
              ) : null}

              <DragDropContext onDragEnd={handleLinkDragEnd}>
                <div className="grouped-tags-container">
                  {orderedGroups.length ? (
                    orderedGroups.map((group) => {
                      const groupLinks = (group.linkIds || [])
                        .map((id) => linkById.get(id))
                        .filter(Boolean);
                      return (
                        <section key={group.id} className="tag-group-section">
                          <h3 className="tag-group-header">
                            {group.name}
                            <span className="tag-count">({groupLinks.length})</span>
                          </h3>
                          <Droppable droppableId={`group-${group.id}`}>
                            {(provided) => (
                              <div
                                className="tags-list"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                {groupLinks.map((link, index) =>
                                  renderLinkRow(link, index, group.id),
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </section>
                      );
                    })
                  ) : (
                    <section className="tag-group-section">
                      <h3 className="tag-group-header">
                        {t('resources.ungrouped')}
                        <span className="tag-count">({ungroupedLinks.length})</span>
                      </h3>
                      <Droppable droppableId={UNGROUPED_ID}>
                        {(provided) => (
                          <div
                            className="tags-list"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {ungroupedLinks.map((link, index) =>
                              renderLinkRow(link, index, UNGROUPED_ID),
                            )}
                            {ungroupedLinks.length === 0 ? (
                              <div className="no-items-message">{t('resources.links.noLinks')}</div>
                            ) : null}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </section>
                  )}
                </div>
              </DragDropContext>
            </>
          )}
        </div>
        <Footer />

      {isCreatingLink ? (
          <div className="difficulty-modal" onClick={closeCreateLink}>
            <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
              <CloseButton
                variant="floating"
                onClick={closeCreateLink}
                aria-label={t('buttons.close', { ns: 'common' })}
              />
              <h2>{t('resources.links.create.title')}</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitLink({
                    title: newLink.title,
                    url: newLink.url,
                    description: newLink.description,
                    shorthand: newLink.shorthand,
                  });
                }}
              >
                <div className="form-group">
                  <label>{t('resources.links.fields.title')}</label>
                  <input
                    type="text"
                    value={newLink.title}
                    onChange={(event) => setNewLink({ ...newLink, title: event.target.value })}
                    maxLength={255}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('resources.links.fields.url')}</label>
                  <input
                    type="text"
                    value={newLink.url}
                    onChange={(event) => setNewLink({ ...newLink, url: event.target.value })}
                    placeholder={t('resources.links.fields.urlPlaceholder')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('resources.links.fields.shorthand')}</label>
                  <input
                    type="text"
                    value={newLink.shorthand || ''}
                    onChange={(event) =>
                      setNewLink({ ...newLink, shorthand: event.target.value })
                    }
                    placeholder={t('resources.links.fields.shorthandPlaceholder')}
                    maxLength={64}
                  />
                </div>
                <div className="form-group">
                  <label>{t('resources.links.fields.description')}</label>
                  <textarea
                    rows={3}
                    value={newLink.description || ''}
                    onChange={(event) =>
                      setNewLink({ ...newLink, description: event.target.value })
                    }
                    maxLength={2000}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeCreateLink}
                  >
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button
                    type="submit"
                    className="confirm-button"
                    disabled={!newLink.title.trim() || !newLink.url.trim()}
                  >
                    {t('resources.links.create.createButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
      ) : null}

      {editingLink ? (
        <EditUsefulLinkPopup
          title={t('resources.links.edit.title')}
          link={editingLink}
          languageMap={languageMap}
          onClose={() => setEditingLink(null)}
          onSave={async ({ languageCode, title, url, description, shorthand }) => {
            try {
              const { data } = await api.put(routes.admin.usefulLinks.locales(editingLink.id), {
                languageCode,
                title,
                url,
                description,
                shorthand,
              });
              setEditingLink(data);
              toast.success(t('resources.links.notifications.updated'));
              await loadData();
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.updateFailed')));
              throw error;
            }
          }}
          onAddLocale={async (payload) => {
            try {
              const { data } = await api.put(
                routes.admin.usefulLinks.locales(editingLink.id),
                payload,
              );
              setEditingLink(data);
              toast.success(t('resources.links.notifications.localeSaved'));
              await loadData();
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.localeSaveFailed')));
              throw error;
            }
          }}
          onRemoveLocale={async (code) => {
            try {
              const { data } = await api.delete(
                routes.admin.usefulLinks.locale(editingLink.id, code),
              );
              setEditingLink(data);
              toast.success(t('resources.links.notifications.localeRemoved'));
              await loadData();
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.localeRemoveFailed')));
              throw error;
            }
          }}
        />
      ) : null}

      {deletingLink ? (
          <div className="difficulty-modal" onClick={() => setDeletingLink(null)}>
            <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>{t('resources.links.delete.title')}</h2>
              <p>{t('resources.links.delete.message', { name: deletingLink.title })}</p>
              <p>{t('resources.links.delete.description')}</p>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setDeletingLink(null)}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  className="delete-confirm-button"
                  onClick={async () => {
                    try {
                      await api.delete(routes.admin.usefulLinks.byId(deletingLink.id));
                      toast.success(t('resources.links.notifications.deleted'));
                      setDeletingLink(null);
                      await loadData();
                    } catch (error) {
                      toast.error(apiError(error, t('resources.links.notifications.deleteFailed')));
                    }
                  }}
                >
                  {t('resources.links.delete.deleteButton')}
                </button>
              </div>
            </div>
          </div>
      ) : null}

      {isCreatingGroup || editingGroup ? (
          <div
            className="difficulty-modal"
            onClick={closeGroupModal}
          >
            <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>
                {editingGroup ? t('resources.groups.edit.title') : t('resources.groups.create.title')}
              </h2>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const name = editingGroup ? editingGroup.name : newGroupName;
                  try {
                    if (editingGroup) {
                      await api.put(routes.admin.usefulLinks.groupById(editingGroup.id), { name });
                      toast.success(t('resources.groups.notifications.updated'));
                      setEditingGroup(null);
                    } else {
                      await api.post(routes.admin.usefulLinks.groups(), { name });
                      toast.success(t('resources.groups.notifications.created'));
                      setIsCreatingGroup(false);
                      setNewGroupName('');
                    }
                    await loadData();
                  } catch (error) {
                    toast.error(
                      apiError(
                        error,
                        editingGroup
                          ? t('resources.groups.notifications.updateFailed')
                          : t('resources.groups.notifications.createFailed'),
                      ),
                    );
                  }
                }}
              >
                <div className="form-group">
                  <label>{t('resources.groups.create.name')}</label>
                  <input
                    type="text"
                    value={editingGroup ? editingGroup.name : newGroupName}
                    onChange={(event) =>
                      editingGroup
                        ? setEditingGroup({ ...editingGroup, name: event.target.value })
                        : setNewGroupName(event.target.value)
                    }
                    maxLength={64}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeGroupModal}
                  >
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button
                    type="submit"
                    className="confirm-button"
                    disabled={
                      editingGroup
                        ? !editingGroup.name.trim() ||
                          editingGroup.name.trim() ===
                            (groups.find((group) => group.id === editingGroup.id)?.name || '').trim()
                        : !newGroupName.trim()
                    }
                  >
                    {editingGroup
                      ? t('resources.groups.edit.updateButton')
                      : t('resources.groups.create.createButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
      ) : null}

      {deletingGroup ? (
          <div className="difficulty-modal" onClick={() => setDeletingGroup(null)}>
            <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>{t('resources.groups.delete.title')}</h2>
              <p>{t('resources.groups.delete.message', { name: deletingGroup.name })}</p>
              <p>{t('resources.groups.delete.description')}</p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setDeletingGroup(null)}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  className="delete-confirm-button"
                  onClick={async () => {
                    try {
                      await api.delete(routes.admin.usefulLinks.groupById(deletingGroup.id));
                      toast.success(t('resources.groups.notifications.deleted'));
                      setDeletingGroup(null);
                      await loadData();
                    } catch (error) {
                      toast.error(
                        apiError(error, t('resources.groups.notifications.deleteFailed')),
                      );
                    }
                  }}
                >
                  {t('resources.groups.delete.deleteButton')}
                </button>
              </div>
            </div>
          </div>
      ) : null}
      </div>
    </>
  );
};

export default ResourcesEditPage;
