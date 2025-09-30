import "./packdetailpage.css";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CompleteNav } from "@/components/layout";
import PackItem from "@/components/cards/PackItem/PackItem";
import LevelCard from "@/components/cards/LevelCard/LevelCard";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon, PlusIcon } from "@/components/common/icons";
import { EditPackPopup } from "@/components/popups";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { UserAvatar } from "@/components/layout";
import { Tooltip } from "react-tooltip";
import toast from 'react-hot-toast';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';

const PackDetailPage = () => {
  const { t } = useTranslation('pages');
  const tPack = (key, params = {}) => t(`packDetail.${key}`, params);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const scrollRef = useRef(null);

  // Fetch pack details
  const fetchPack = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      
      const response = await api.get(`/v2/database/levels/packs/${id}?tree=true`);
      setPack(response.data);
    } catch (error) {
      console.error('Error fetching pack:', error);
      if (!silent) {
        setError(true);
      }
      if (error.response?.status === 404) {
        toast.error(tPack('error.notFound'));
      } else if (error.response?.status === 403) {
        toast.error(tPack('error.accessDenied'));
      } else {
        toast.error(tPack('error.loadFailed'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (id) {
      fetchPack();
    }
  }, [id]);

  // Handle edit pack
  const handleEditPack = async (updatedPack) => {
    setPack({ ...pack, ...updatedPack });
    setShowEditPopup(false);
    toast.success(tPack('edit.success'));
  };

  // Handle delete pack
  const handleDeletePack = () => {
    navigate('/packs');
  };

  // Folder expansion state
  const toggleFolderExpanded = (itemId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle adding new folder
  const handleAddFolder = async () => {
    const folderName = prompt(tPack('createFolder.prompt'));
    if (!folderName?.trim()) return;

    try {
      await api.post(`/v2/database/levels/packs/${pack.id}/items`, {
        type: 'folder',
        name: folderName.trim(),
        parentId: null
      });
      
      toast.success(tPack('createFolder.success'));
      await fetchPack(true); // Silent refetch
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(tPack('createFolder.error'));
    }
  };

  // Handle adding new level
  const handleAddLevel = async () => {
    const levelId = prompt(tPack('addLevel.prompt'));
    if (!levelId?.trim()) return;

    try {
      await api.post(`/v2/database/levels/packs/${pack.id}/items`, {
        type: 'level',
        levelId: parseInt(levelId),
        parentId: null
      });
      
      toast.success(tPack('addLevel.success'));
      await fetchPack(true); // Silent refetch
    } catch (error) {
      console.error('Error adding level:', error);
      toast.error(error.response?.data?.error || tPack('addLevel.error'));
    }
  };

  // Handle rename folder
  const handleRenameFolder = async (item) => {
    const newName = prompt(tPack('renameFolder.prompt'), item.name);
    if (!newName?.trim() || newName === item.name) return;

    try {
      await api.put(`/v2/database/levels/packs/${pack.id}/items/${item.id}`, {
        name: newName.trim()
      });
      
      toast.success(tPack('renameFolder.success'));
      await fetchPack(true); // Silent refetch
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error(error.response?.data?.error || tPack('renameFolder.error'));
    }
  };

  // Handle delete item
  const handleDeleteItem = async (item) => {
    const confirmMessage = item.type === 'folder' 
      ? tPack('deleteFolder.confirm', { name: item.name })
      : tPack('deleteLevel.confirm');
    
    if (!confirm(confirmMessage)) return;

    try {
      await api.delete(`/v2/database/levels/packs/${pack.id}/items/${item.id}`);
      
      toast.success(tPack('deleteItem.success'));
      await fetchPack(true); // Silent refetch
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.error || tPack('deleteItem.error'));
    }
  };

  // Flatten tree for DnD
  const flattenItems = (items, result = [], depth = 0) => {
    items?.forEach(item => {
      result.push({ ...item, depth });
      if (item.children && expandedFolders.has(item.id)) {
        flattenItems(item.children, result, depth + 1);
      }
    });
    return result;
  };

  // Handle drag and drop
  const handleDragEnd = async (result) => {
    if (!result.destination && !result.combine) return;

    setIsReordering(true);

    try {
      // Handle combining items (drop one on another)
      if (result.combine) {
        await handleCombineItems(result);
        return;
      }

      // Handle normal reorder/move
      const sourceId = parseInt(result.draggableId.split('-')[2]);
      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;
      const sourceDroppableId = result.source.droppableId;
      const destinationDroppableId = result.destination.droppableId;

      // Determine the new parent based on where it was dropped
      let newParentId = null;
      if (destinationDroppableId.startsWith('folder-')) {
        newParentId = parseInt(destinationDroppableId.split('-')[2]);
      }

      // Get the source parent ID
      let sourceParentId = null;
      if (sourceDroppableId.startsWith('folder-')) {
        sourceParentId = parseInt(sourceDroppableId.split('-')[2]);
      }

      // If moving within the same parent, calculate new order
      if (sourceParentId === newParentId && sourceIndex !== destinationIndex) {
        // Get all items in the current parent
        const getItemsInParent = (parentId) => {
          if (parentId === null) {
            return pack.items || [];
          }
          // Recursively find the parent folder and its children
          const findFolder = (items) => {
            for (const item of items) {
              if (item.id === parentId) return item.children || [];
              if (item.children) {
                const found = findFolder(item.children);
                if (found) return found;
              }
            }
            return [];
          };
          return findFolder(pack.items || []);
        };

        const itemsInParent = getItemsInParent(newParentId).sort((a, b) => a.sortOrder - b.sortOrder);
        
        // Remove the source item and reinsert at new position
        const movedItem = itemsInParent.find(item => item.id === sourceId);
        const reordered = itemsInParent.filter(item => item.id !== sourceId);
        reordered.splice(destinationIndex, 0, movedItem);
        
        // Create items to reorder with new sortOrders
        const itemsToReorder = reordered.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }));

        await api.put(`/v2/database/levels/packs/${pack.id}/items/${sourceId}/move`, {
          parentId: newParentId,
          itemsToReorder
        });
      } else {
        // Moving to a different parent
        // Get all items in the destination parent
        const getItemsInParent = (parentId) => {
          if (parentId === null) {
            return pack.items || [];
          }
          const findFolder = (items) => {
            for (const item of items) {
              if (item.id === parentId) return item.children || [];
              if (item.children) {
                const found = findFolder(item.children);
                if (found) return found;
              }
            }
            return [];
          };
          return findFolder(pack.items || []);
        };

        const destinationItems = getItemsInParent(newParentId)
          .filter(item => item.id !== sourceId)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        // Find the moved item
        const allItems = flattenItems(pack.items || []);
        const movedItem = allItems.find(item => item.id === sourceId);

        // Insert at destination index
        destinationItems.splice(destinationIndex, 0, movedItem);

        // Create items to reorder with new sortOrders
        const itemsToReorder = destinationItems.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }));

        await api.put(`/v2/database/levels/packs/${pack.id}/items/${sourceId}/move`, {
          parentId: newParentId,
          itemsToReorder
        });
      }

      toast.success(tPack('move.success'));
      await fetchPack(true); // Silent refetch
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(error.response?.data?.error || tPack('move.error'));
    } finally {
      setIsReordering(false);
    }
  };

  // Handle combining items (creating folders or nesting)
  const handleCombineItems = async (result) => {
    const sourceId = parseInt(result.draggableId.split('-')[2]);
    const targetId = parseInt(result.combine.draggableId.split('-')[2]);

    try {
      // Find source and target items
      const allItems = flattenItems(pack.items);
      const sourceItem = allItems.find(item => item.id === sourceId);
      const targetItem = allItems.find(item => item.id === targetId);

      if (!sourceItem || !targetItem) return;

      // If target is a folder, move source into it
      if (targetItem.type === 'folder') {
        await api.put(`/v2/database/levels/packs/${pack.id}/items/${sourceId}/move`, {
          parentId: targetId
        });
        
        // Auto-expand the target folder
        setExpandedFolders(prev => new Set(prev).add(targetId));
      } 
      // If both are levels, create a new folder containing both
      else if (sourceItem.type === 'level' && targetItem.type === 'level') {
        const folderName = prompt(tPack('createFolder.prompt'));
        if (!folderName?.trim()) return;

        // Create folder at target's parent
        const folderResponse = await api.post(`/v2/database/levels/packs/${pack.id}/items`, {
          type: 'folder',
          name: folderName.trim(),
          parentId: targetItem.parentId || null
        });

        // Move both items into the new folder
        await api.put(`/v2/database/levels/packs/${pack.id}/items/${sourceId}/move`, {
          parentId: folderResponse.data.id
        });
        await api.put(`/v2/database/levels/packs/${pack.id}/items/${targetId}/move`, {
          parentId: folderResponse.data.id
        });

        // Auto-expand the new folder
        setExpandedFolders(prev => new Set(prev).add(folderResponse.data.id));
      }

      toast.success(tPack('combine.success'));
      await fetchPack(true); // Silent refetch
    } catch (error) {
      console.error('Error combining items:', error);
      toast.error(error.response?.data?.error || tPack('combine.error'));
    } finally {
      setIsReordering(false);
    }
  };

  // Count total levels (recursive)
  const countLevels = (items) => {
    let count = 0;
    items?.forEach(item => {
      if (item.type === 'level') count++;
      if (item.children) count += countLevels(item.children);
    });
    return count;
  };

  // Get view mode icon and text
  const getViewModeIcon = () => {
    if (!pack) return null;
    
    switch (pack.viewMode) {
      case 1: // PUBLIC
        return <EyeIcon className="pack-detail-page__view-icon public" />;
      case 2: // LINKONLY
        return <UsersIcon className="pack-detail-page__view-icon linkonly" />;
      case 3: // PRIVATE
        return <LockIcon className="pack-detail-page__view-icon private" />;
      case 4: // FORCED_PRIVATE
        return <LockIcon className="pack-detail-page__view-icon forced-private" />;
      default:
        return <EyeIcon className="pack-detail-page__view-icon public" />;
    }
  };

  const getViewModeText = () => {
    if (!pack) return '';
    
    switch (pack.viewMode) {
      case 1: return tPack('viewMode.public');
      case 2: return tPack('viewMode.linkonly');
      case 3: return tPack('viewMode.private');
      case 4: return tPack('viewMode.forcedPrivate');
      default: return tPack('viewMode.public');
    }
  };

  // Check if user can edit pack
  const canEdit = user && pack && (
    pack.ownerId === user.id || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  if (loading) {
    return (
      <div className="pack-detail-page">
        <CompleteNav />
        <div className="pack-detail-page__loading">
          <div className="pack-detail-page__loading-spinner"></div>
          <p>{tPack('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="pack-detail-page">
        <CompleteNav />
        <div className="pack-detail-page__error">
          <h2>{tPack('error.title')}</h2>
          <p>{tPack('error.message')}</p>
          <button 
            className="pack-detail-page__retry-btn"
            onClick={fetchPack}
          >
            {tPack('error.retry')}
          </button>
          <button 
            className="pack-detail-page__back-btn"
            onClick={() => navigate('/packs')}
          >
            {tPack('backToPacks')}
          </button>
        </div>
      </div>
    );
  }

  const currentUrl = window.location.origin + location.pathname;
  const totalLevels = countLevels(pack.items);
  const flatItems = flattenItems(pack.items || []);

  return (
    <div className="pack-detail-page">
      <MetaTags 
        title={`${pack.name} - Pack - TUF`}
        description={`Level pack: ${pack.name} by ${pack.packOwner?.username || 'Unknown'}. Contains ${totalLevels} levels.`}
        url={currentUrl}
      />
      
      <CompleteNav />
      <div className="background-level"></div>
      <div className="pack-body">
        {/* Header */}
        <div className="pack-detail-page__header">
          <button 
            className="pack-detail-page__back-btn"
            onClick={() => navigate('/packs')}
          >
            <ArrowIcon />
            <span>{tPack('backToPacks')}</span>
          </button>

          <div className="pack-detail-page__title-section">
            <div className="pack-detail-page__icon">
              {pack.iconUrl ? (
                <img 
                  src={pack.iconUrl} 
                  alt={pack.name}
                  className="pack-detail-page__icon-img"
                />
              ) : (
                <div className="pack-detail-page__icon-placeholder">
                  📦
                </div>
              )}
            </div>
            
            <div className="pack-detail-page__title-content">
              <h1 className="pack-detail-page__title">
                {pack.name}
                {pack.isPinned && (
                  <PinIcon className="pack-detail-page__pinned-icon" />
                )}
              </h1>
              
              <div className="pack-detail-page__meta">
                <div className="pack-detail-page__owner">
                  <UserAvatar 
                    primaryUrl={pack.packOwner?.avatarUrl || 'Unknown'} 
                    className="pack-detail-page__owner-avatar"
                  />
                  <span className="pack-detail-page__owner-name">
                    {tPack('by')} {pack.packOwner?.username || 'Unknown'}
                  </span>
                </div>
                
                <div className="pack-detail-page__view-mode">
                  {getViewModeIcon()}
                  <span className="pack-detail-page__view-mode-text">
                    {getViewModeText()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="pack-detail-page__actions">
              <button
                className="pack-detail-page__edit-btn"
                onClick={() => setShowEditPopup(true)}
                data-tooltip-id="edit-pack-tooltip"
                data-tooltip-content={tPack('actions.edit')}
              >
                <EditIcon />
                <span>{tPack('actions.edit')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="pack-detail-page__stats">
          <div className="pack-detail-page__stat">
            <span className="pack-detail-page__stat-value">
              {totalLevels}
            </span>
            <span className="pack-detail-page__stat-label">
              {tPack('stats.levels')}
            </span>
          </div>
          
          <div className="pack-detail-page__stat">
            <span className="pack-detail-page__stat-value">
              {pack.items?.length || 0}
            </span>
            <span className="pack-detail-page__stat-label">
              {tPack('stats.items')}
            </span>
          </div>
          
          <div className="pack-detail-page__stat">
            <span className="pack-detail-page__stat-value">
              {new Date(pack.createdAt).toLocaleDateString()}
            </span>
            <span className="pack-detail-page__stat-label">
              {tPack('stats.created')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="pack-detail-page__content" ref={scrollRef}>
          <div className="pack-detail-page__levels-header">
            <h2 className="pack-detail-page__levels-title">
              {tPack('items.title')}
            </h2>
            <div className="pack-detail-page__levels-header-right">
              {canEdit && (
                <div className="pack-detail-page__add-buttons">
                  <button
                    className="pack-detail-page__add-btn"
                    onClick={handleAddFolder}
                    title={tPack('actions.addFolder')}
                  >
                    <PlusIcon /> 📁 {tPack('actions.addFolder')}
                  </button>
                  <button
                    className="pack-detail-page__add-btn"
                    onClick={handleAddLevel}
                    title={tPack('actions.addLevel')}
                  >
                    <PlusIcon /> 🎵 {tPack('actions.addLevel')}
                  </button>
                </div>
              )}
              {canEdit && flatItems.length > 1 && (
                <span className="pack-detail-page__drag-hint">
                  {tPack('items.dragHint')}
                </span>
              )}
            </div>
          </div>

          {pack.items && pack.items.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable
                droppableId={`pack-root-${pack.id}`}
                type="PACK_ITEM"
                isCombineEnabled={true}
                renderClone={(provided, snapshot, rubric) => {
                  const item = flatItems.find(i => `item-${pack.id}-${i.id}` === rubric.draggableId);
                  if (!item) return null;
                  
                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`pack-item pack-item--${item.type} dragging-clone`}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      {item.type === 'folder' ? (
                        <div className="pack-item__content">
                          <div className="pack-item__icon">📁</div>
                          <div className="pack-item__info">
                            <div className="pack-item__name">{item.name}</div>
                            <div className="pack-item__count">
                              {item.children?.length || 0} {item.children?.length === 1 ? 'item' : 'items'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <LevelCard
                          level={item.referencedLevel}
                          user={user}
                          sortBy="RECENT"
                          displayMode="normal"
                          size="medium"
                        />
                      )}
                    </div>
                  );
                }}
              >
                {(provided, snapshot) => (
                  <div 
                    className={`pack-detail-page__items-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {pack.items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item, index) => (
                        <PackItem
                          key={item.id}
                          item={item}
                          index={index}
                          expandedFolders={expandedFolders}
                          onToggleExpanded={toggleFolderExpanded}
                          canEdit={canEdit}
                          isReordering={isReordering}
                          packId={pack.id}
                          user={user}
                          onRenameFolder={handleRenameFolder}
                          onDeleteItem={handleDeleteItem}
                        />
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="pack-detail-page__empty">
              <p>{tPack('items.empty')}</p>
              {canEdit && (
                <div className="pack-detail-page__empty-actions">
                  <button
                    className="pack-detail-page__add-btn"
                    onClick={handleAddFolder}
                  >
                    <PlusIcon /> {tPack('actions.addFolder')}
                  </button>
                  <button
                    className="pack-detail-page__add-btn"
                    onClick={handleAddLevel}
                  >
                    <PlusIcon /> {tPack('actions.addLevel')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <ScrollButton targetRef={scrollRef} />
      </div>

      {showEditPopup && (
        <EditPackPopup
          pack={pack}
          onClose={() => setShowEditPopup(false)}
          onUpdate={handleEditPack}
          onDelete={handleDeletePack}
        />
      )}

      {/* Tooltips */}
      <Tooltip id="edit-pack-tooltip" />
    </div>
  );
};

export default PackDetailPage;