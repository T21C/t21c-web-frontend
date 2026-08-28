import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect, ItemPickManager } from '@/components/common/selectors';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { hostFromUrl } from '@/utils/usefulLinkLocales';
import EditUsefulLinkPopup from '@/components/popups/Resources/EditUsefulLinkPopup';

const EMPTY_LINK = {
  title: '',
  url: '',
  description: '',
  isPublished: true,
  tagIds: [],
};

const EMPTY_TAG = {
  name: '',
  color: '#888888',
  groupId: null,
};

function apiError(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

function sortNamed(list) {
  return [...(list || [])].sort((a, b) => {
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

const ResourcesCatalogAdmin = ({ languageMap }) => {
  const { t } = useTranslation(['pages', 'common']);
  const [links, setLinks] = useState([]);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [manageTab, setManageTab] = useState('links');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deletingLink, setDeletingLink] = useState(null);
  const [newLink, setNewLink] = useState(EMPTY_LINK);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [deletingTag, setDeletingTag] = useState(null);
  const [newTag, setNewTag] = useState(EMPTY_TAG);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLinksReordering, setIsLinksReordering] = useState(false);
  const [isTagsReordering, setIsTagsReordering] = useState(false);
  const [isGroupsReordering, setIsGroupsReordering] = useState(false);

  const anyModalOpen = Boolean(
    isCreatingLink ||
      editingLink ||
      deletingLink ||
      isCreatingTag ||
      editingTag ||
      deletingTag ||
      isCreatingGroup ||
      editingGroup ||
      deletingGroup,
  );
  useBodyScrollLock(anyModalOpen);

  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      const [linksRes, tagsRes, groupsRes] = await Promise.all([
        api.get(routes.admin.usefulLinks.root()),
        api.get(routes.admin.usefulLinks.tags()),
        api.get(routes.admin.usefulLinks.tagGroups()),
      ]);
      setLinks(Array.isArray(linksRes.data) ? linksRes.data : []);
      setTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch {
      setLoadError(true);
      setLinks([]);
      setTags([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pickerLabels = useMemo(
    () => ({
      sectionCurrent: t('resources.picker.current'),
      sectionAdd: t('resources.picker.add'),
      searchPlaceholder: t('resources.picker.search'),
      emptySelected: t('resources.picker.emptySelected'),
      emptyPool: t('resources.picker.emptyPool'),
      noResults: t('resources.picker.noResults'),
      removeItem: t('resources.picker.remove'),
      addItem: t('resources.picker.addItem'),
    }),
    [t],
  );

  const groupOptions = useMemo(
    () => [
      { value: '', label: t('resources.tags.fields.ungrouped') },
      ...sortNamed(groups).map((group) => ({ value: String(group.id), label: group.name })),
    ],
    [groups, t],
  );

  const tagsByGroupKey = useMemo(() => {
    const acc = { ungrouped: [] };
    for (const tag of tags) {
      const key = tag.groupId == null ? 'ungrouped' : String(tag.groupId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(tag);
    }
    for (const key of Object.keys(acc)) {
      acc[key] = [...acc[key]].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
    }
    return acc;
  }, [tags]);

  const handleLinkDragEnd = async (result) => {
    if (!result.destination) return;
    const next = [...links];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setLinks(next);
    setIsLinksReordering(true);
    try {
      await api.put(routes.admin.usefulLinks.sortOrders(), {
        sortOrders: next.map((link, index) => ({ id: link.id, sortOrder: index })),
      });
      toast.success(t('resources.links.notifications.reordered'));
    } catch (error) {
      toast.error(apiError(error, t('resources.links.notifications.reorderFailed')));
      loadData();
    } finally {
      setIsLinksReordering(false);
    }
  };

  const handleTagDragEnd = async (result, groupKey) => {
    if (!result.destination) return;
    const current = [...(tagsByGroupKey[groupKey] || [])];
    const [moved] = current.splice(result.source.index, 1);
    current.splice(result.destination.index, 0, moved);
    setIsTagsReordering(true);
    try {
      await api.put(routes.admin.usefulLinks.tagSortOrders(), {
        sortOrders: current.map((tag, index) => ({ id: tag.id, sortOrder: index })),
      });
      toast.success(t('resources.tags.notifications.reordered'));
      loadData();
    } catch (error) {
      toast.error(apiError(error, t('resources.tags.notifications.reorderFailed')));
    } finally {
      setIsTagsReordering(false);
    }
  };

  const handleGroupDragEnd = async (result) => {
    if (!result.destination) return;
    const next = sortNamed(groups);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setIsGroupsReordering(true);
    try {
      await api.put(routes.admin.usefulLinks.tagGroupSortOrders(), {
        groups: next.map((group, index) => ({ id: group.id, sortOrder: index })),
      });
      toast.success(t('resources.groups.notifications.reordered'));
      loadData();
    } catch (error) {
      toast.error(apiError(error, t('resources.groups.notifications.reorderFailed')));
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
      loadData();
    } catch (error) {
      toast.error(apiError(error, t('resources.links.notifications.createFailed')));
    }
  };

  const renderLinkForm = (value, onChange) => (
    <>
      <div className="form-group">
        <label>{t('resources.links.fields.title')}</label>
        <input
          type="text"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          maxLength={255}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('resources.links.fields.url')}</label>
        <input
          type="text"
          value={value.url}
          onChange={(event) => onChange({ ...value, url: event.target.value })}
          placeholder={t('resources.links.fields.urlPlaceholder')}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('resources.links.fields.description')}</label>
        <textarea
          rows={3}
          value={value.description || ''}
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
          <span>{t('resources.links.fields.published')}</span>
        </label>
      </div>
      <div className="form-group">
        <label>{t('resources.links.fields.tags')}</label>
        <ItemPickManager
          items={tags}
          selectedIds={value.tagIds || []}
          onSelectedIdsChange={(tagIds) => onChange({ ...value, tagIds })}
          enableGrouping
          fallbackGroupLabel={t('resources.ungrouped')}
          labels={pickerLabels}
        />
      </div>
    </>
  );

  const renderTagForm = (value, onChange) => (
    <>
      <div className="form-group">
        <label>{t('resources.tags.fields.name')}</label>
        <input
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          maxLength={64}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('resources.tags.fields.color')}</label>
        <input
          type="color"
          value={value.color || '#888888'}
          onChange={(event) => onChange({ ...value, color: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label>{t('resources.tags.fields.group')}</label>
        <CustomSelect
          options={groupOptions}
          value={groupOptions.find((option) => option.value === String(value.groupId || ''))}
          onChange={(option) =>
            onChange({ ...value, groupId: option?.value ? Number(option.value) : null })
          }
          width="100%"
        />
      </div>
    </>
  );

  return (
    <div className="resources-page__catalog-admin">
      <div className="sub-tab-navigation">
        <button
          type="button"
          className={`sub-tab-button ${manageTab === 'links' ? 'active' : ''}`}
          onClick={() => setManageTab('links')}
        >
          {t('resources.tabs.links')}
        </button>
        <button
          type="button"
          className={`sub-tab-button ${manageTab === 'tags' ? 'active' : ''}`}
          onClick={() => setManageTab('tags')}
        >
          {t('resources.tabs.tags')}
        </button>
        <button
          type="button"
          className={`sub-tab-button ${manageTab === 'tagGroups' ? 'active' : ''}`}
          onClick={() => setManageTab('tagGroups')}
        >
          {t('resources.tabs.tagGroups')}
        </button>
      </div>

      {manageTab === 'links' ? (
        <>
          <button
            type="button"
            className="create-button"
            onClick={() => {
              setNewLink(EMPTY_LINK);
              setIsCreatingLink(true);
            }}
            disabled={loading || isLinksReordering}
          >
            {t('resources.links.createButton')}
          </button>
          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : loadError ? (
            <div className="no-items-message">{t('resources.errors.loadFailed')}</div>
          ) : links.length === 0 ? (
            <div className="no-items-message">{t('resources.links.noLinks')}</div>
          ) : (
            <DragDropContext onDragEnd={handleLinkDragEnd}>
              <Droppable droppableId="catalog-links">
                {(provided) => (
                  <div className="tags-list" ref={provided.innerRef} {...provided.droppableProps}>
                    {links.map((link, index) => (
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
                            className={`tag-item ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="tag-item-content">
                              <div className="tag-item-info">
                                <div className="tag-item-name">
                                  {link.title}
                                  {link.isPublished === false ? (
                                    <span className="resources-page__badge">
                                      {t('resources.admin.hidden')}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="tag-item-color">{hostFromUrl(link.url)}</div>
                              </div>
                            </div>
                            <div className="tag-item-actions">
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLink(link);
                                }}
                              >
                                <EditIcon color="#fff" size="20px" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingLink(link);
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
          )}
        </>
      ) : null}

      {manageTab === 'tags' ? (
        <>
          <button
            type="button"
            className="create-button"
            onClick={() => {
              setNewTag(EMPTY_TAG);
              setIsCreatingTag(true);
            }}
          >
            {t('resources.tags.createButton')}
          </button>
          {tags.length === 0 ? (
            <div className="no-items-message">{t('resources.tags.noTags')}</div>
          ) : (
            <div className="grouped-tags-container">
              {[...sortNamed(groups), { id: null, name: t('resources.ungrouped') }].map((group) => {
                const key = group.id == null ? 'ungrouped' : String(group.id);
                const groupTags = tagsByGroupKey[key] || [];
                if (!groupTags.length && group.id == null) return null;
                return (
                  <div key={key} className="tag-group-section">
                    <h3 className="tag-group-header">
                      {group.name}
                      <span className="tag-count">({groupTags.length})</span>
                    </h3>
                    <DragDropContext onDragEnd={(result) => handleTagDragEnd(result, key)}>
                      <Droppable droppableId={`tags-${key}`}>
                        {(provided) => (
                          <div className="tags-list" ref={provided.innerRef} {...provided.droppableProps}>
                            {groupTags.map((tag, index) => (
                              <Draggable
                                key={tag.id}
                                draggableId={`tag-${tag.id}`}
                                index={index}
                                isDragDisabled={isTagsReordering}
                              >
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`tag-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                  >
                                    <div className="tag-item-content">
                                      <span
                                        className="resources-page__tag-swatch"
                                        style={{ background: tag.color }}
                                      />
                                      <div className="tag-item-name">{tag.name}</div>
                                    </div>
                                    <div className="tag-item-actions">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingTag(tag);
                                        }}
                                      >
                                        <EditIcon color="#fff" size="20px" />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingTag(tag);
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
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {manageTab === 'tagGroups' ? (
        <>
          <button
            type="button"
            className="create-button"
            onClick={() => {
              setNewGroupName('');
              setIsCreatingGroup(true);
            }}
          >
            {t('resources.groups.createButton')}
          </button>
          {groups.length === 0 ? (
            <div className="no-items-message">{t('resources.groups.noGroups')}</div>
          ) : (
            <DragDropContext onDragEnd={handleGroupDragEnd}>
              <Droppable droppableId="tag-groups">
                {(provided) => (
                  <div className="groups-list" ref={provided.innerRef} {...provided.droppableProps}>
                    {sortNamed(groups).map((group, index) => (
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
                                {(tagsByGroupKey[String(group.id)] || []).length}
                              </div>
                            </div>
                            <div className="group-item-actions">
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroup(group);
                                }}
                              >
                                <EditIcon color="#fff" size="20px" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
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
          )}
        </>
      ) : null}

      {isCreatingLink ? (
        <div className="difficulty-modal" onClick={() => setIsCreatingLink(false)}>
          <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
            <CloseButton
              variant="floating"
              onClick={() => setIsCreatingLink(false)}
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
                  isPublished: newLink.isPublished,
                  tagIds: newLink.tagIds || [],
                });
              }}
            >
              {renderLinkForm(newLink, setNewLink)}
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setIsCreatingLink(false)}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button type="submit" className="confirm-button">
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
          tags={tags}
          pickerLabels={pickerLabels}
          showPublished
          onClose={() => setEditingLink(null)}
          onSave={async ({ languageCode, title, url, description, tagIds, isPublished }) => {
            try {
              await api.put(routes.admin.usefulLinks.locales(editingLink.id), {
                languageCode,
                title,
                url,
                description,
              });
              const { data } = await api.patch(routes.admin.usefulLinks.byId(editingLink.id), {
                tagIds,
                isPublished,
              });
              setEditingLink(data);
              toast.success(t('resources.links.notifications.updated'));
              loadData();
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.updateFailed')));
              throw error;
            }
          }}
          onAddLocale={async (payload) => {
            try {
              const { data } = await api.put(routes.admin.usefulLinks.locales(editingLink.id), payload);
              setEditingLink(data);
              toast.success(t('resources.links.notifications.localeSaved'));
              loadData();
            } catch (error) {
              toast.error(apiError(error, t('resources.links.notifications.localeSaveFailed')));
              throw error;
            }
          }}
          onRemoveLocale={async (code) => {
            try {
              const { data } = await api.delete(routes.admin.usefulLinks.locale(editingLink.id, code));
              setEditingLink(data);
              toast.success(t('resources.links.notifications.localeRemoved'));
              loadData();
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
                    loadData();
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

      {isCreatingTag || editingTag ? (
        <div className="difficulty-modal" onClick={() => { setIsCreatingTag(false); setEditingTag(null); }}>
          <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{editingTag ? t('resources.tags.edit.title') : t('resources.tags.create.title')}</h2>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const value = editingTag || newTag;
                try {
                  if (editingTag) {
                    await api.patch(routes.admin.usefulLinks.tagById(editingTag.id), {
                      name: value.name,
                      color: value.color,
                      groupId: value.groupId,
                    });
                    toast.success(t('resources.tags.notifications.updated'));
                    setEditingTag(null);
                  } else {
                    await api.post(routes.admin.usefulLinks.tags(), {
                      name: value.name,
                      color: value.color,
                      groupId: value.groupId,
                    });
                    toast.success(t('resources.tags.notifications.created'));
                    setIsCreatingTag(false);
                    setNewTag(EMPTY_TAG);
                  }
                  loadData();
                } catch (error) {
                  toast.error(
                    apiError(
                      error,
                      editingTag
                        ? t('resources.tags.notifications.updateFailed')
                        : t('resources.tags.notifications.createFailed'),
                    ),
                  );
                }
              }}
            >
              {renderTagForm(editingTag || newTag, editingTag ? setEditingTag : setNewTag)}
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => { setIsCreatingTag(false); setEditingTag(null); }}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button type="submit" className="confirm-button">
                  {editingTag ? t('resources.tags.edit.updateButton') : t('resources.tags.create.createButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingTag ? (
        <div className="difficulty-modal" onClick={() => setDeletingTag(null)}>
          <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{t('resources.tags.delete.title')}</h2>
            <p>{t('resources.tags.delete.message', { name: deletingTag.name })}</p>
            <p>{t('resources.tags.delete.description')}</p>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setDeletingTag(null)}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                onClick={async () => {
                  try {
                    await api.delete(routes.admin.usefulLinks.tagById(deletingTag.id));
                    toast.success(t('resources.tags.notifications.deleted'));
                    setDeletingTag(null);
                    loadData();
                  } catch (error) {
                    toast.error(apiError(error, t('resources.tags.notifications.deleteFailed')));
                  }
                }}
              >
                {t('resources.tags.delete.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreatingGroup || editingGroup ? (
        <div className="difficulty-modal" onClick={() => { setIsCreatingGroup(false); setEditingGroup(null); }}>
          <div className="difficulty-modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{editingGroup ? t('resources.groups.edit.title') : t('resources.groups.create.title')}</h2>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const name = editingGroup ? editingGroup.name : newGroupName;
                try {
                  if (editingGroup) {
                    await api.put(routes.admin.usefulLinks.tagGroupById(editingGroup.id), { name });
                    toast.success(t('resources.groups.notifications.updated'));
                    setEditingGroup(null);
                  } else {
                    await api.post(routes.admin.usefulLinks.tagGroups(), { name });
                    toast.success(t('resources.groups.notifications.created'));
                    setIsCreatingGroup(false);
                    setNewGroupName('');
                  }
                  loadData();
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
                <button type="button" className="cancel-button" onClick={() => { setIsCreatingGroup(false); setEditingGroup(null); }}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button type="submit" className="confirm-button">
                  {editingGroup ? t('resources.groups.edit.updateButton') : t('resources.groups.create.createButton')}
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
              <button type="button" className="cancel-button" onClick={() => setDeletingGroup(null)}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                onClick={async () => {
                  try {
                    await api.delete(routes.admin.usefulLinks.tagGroupById(deletingGroup.id));
                    toast.success(t('resources.groups.notifications.deleted'));
                    setDeletingGroup(null);
                    loadData();
                  } catch (error) {
                    toast.error(apiError(error, t('resources.groups.notifications.deleteFailed')));
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
  );
};

export default ResourcesCatalogAdmin;
