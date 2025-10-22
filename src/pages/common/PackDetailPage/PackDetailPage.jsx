import "./packdetailpage.css";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CompleteNav } from "@/components/layout";
import PackItem from "@/components/cards/PackItem/PackItem";
import LevelCard from "@/components/cards/LevelCard/LevelCard";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon, PlusIcon, LikeIcon } from "@/components/common/icons";
import { EditPackPopup } from "@/components/popups";
import { useAuth } from "@/contexts/AuthContext";
import { usePackContext } from "@/contexts/PackContext";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { UserAvatar } from "@/components/layout";
import { Tooltip } from "react-tooltip";
import { getPackExpandedFolders, setPackExpandedFolders } from "@/utils/folderState";
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

// Root drop zone component for top-level items
const RootDropZone = ({
  items,
  expandedFolders,
  onToggleExpanded,
  canEdit,
  isReordering,
  packId,
  user,
  onRenameFolder,
  onDeleteItem
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-container',
    data: {
      type: 'folder-container',
      parentId: null
    }
  });

  const sortedItems = items ? [...items].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <div
      ref={setNodeRef}
      className={`pack-detail-page__items-list ${isOver ? 'dragging-over' : ''}`}
    >
      {sortedItems.map((item) => (
        <PackItem
          key={item.id}
          item={item}
          expandedFolders={expandedFolders}
          onToggleExpanded={onToggleExpanded}
          canEdit={canEdit}
          isReordering={isReordering}
          packId={packId}
          user={user}
          onRenameFolder={onRenameFolder}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </div>
  );
};

const PackDetailPage = () => {
  const { t } = useTranslation('pages');
  const tPack = (key, params = {}) => t(`packDetail.${key}`, params);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleFavorite } = usePackContext();
  
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeId, setActiveId] = useState(null);
  const [dragOverInfo, setDragOverInfo] = useState(null); // Track where we're dragging over
  const scrollRef = useRef(null);

  // Set up sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Custom collision detection for nested folders
  const collisionDetectionStrategy = (args) => {
    // First, let's find intersections with pointer
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // Fall back to rectangle intersection
    return rectIntersection(args);
  };

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
      // Load expanded folders from cookies for this pack
      const savedExpandedFolders = getPackExpandedFolders(id);
      setExpandedFolders(savedExpandedFolders);
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

  // Handle favorite toggle
  const handleFavoriteClick = async () => {
    if (!user) {
      toast.error('Please log in to favorite packs');
      return;
    }

    try {
      const success = await toggleFavorite(pack.id);
      if (success) {
        // Update pack data immediately with the new favorite status
        setPack(prevPack => ({
          ...prevPack,
          isFavorited: !prevPack.isFavorited
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(error.response?.data?.error || 'Failed to update favorite status');
    }
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
      // Save to cookies
      if (id) {
        setPackExpandedFolders(id, newSet);
      }
      return newSet;
    });
  };

  // Helper to get all folder IDs from the tree
  const getAllFolderIds = (items) => {
    const folderIds = [];
    items?.forEach(item => {
      if (item.type === 'folder') {
        folderIds.push(item.id);
        if (item.children) {
          folderIds.push(...getAllFolderIds(item.children));
        }
      }
    });
    return folderIds;
  };

  // Collapse/expand all folders
  const handleCollapseExpandAll = (expand) => {
    if (!pack?.items) return;
    
    const allFolderIds = getAllFolderIds(pack.items);
    const newExpandedFolders = expand ? new Set(allFolderIds) : new Set();
    
    setExpandedFolders(newExpandedFolders);
    
    // Save to cookies
    if (id) {
      setPackExpandedFolders(id, newExpandedFolders);
    }
  };

  // Check if all folders are expanded
  const areAllFoldersExpanded = () => {
    if (!pack?.items) return false;
    const allFolderIds = getAllFolderIds(pack.items);
    return allFolderIds.length > 0 && allFolderIds.every(folderId => expandedFolders.has(folderId));
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
        levelIds: levelId,
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
    const confirmMessage = item?.type === 'folder' 
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

  // Flatten tree for DND - all items regardless of expansion
  const flattenAllItems = (items, result = []) => {
    items?.forEach(item => {
      result.push(item.id);
      if (item.children) {
        flattenAllItems(item.children, result);
      }
    });
    return result;
  };

  // Flatten tree for display - only visible items
  const flattenVisibleItems = (items, result = []) => {
    items?.forEach(item => {
      result.push(item);
      if (item.children && expandedFolders.has(item.id)) {
        flattenVisibleItems(item.children, result);
      }
    });
    return result;
  };

  // Helper to find item by ID in tree
  const findItem = (items, itemId) => {
    for (const item of items) {
      if (item.id === itemId) return item;
      if (item.children) {
        const found = findItem(item.children, itemId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to find parent of an item
  const findParent = (items, itemId, parent = null) => {
    for (const item of items) {
      if (item.id === itemId) return parent;
      if (item.children) {
        const found = findParent(item.children, itemId, item);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setDragOverInfo(null);
  };

  // Handle drag over to track current target depth
  const handleDragOver = (event) => {
    const { over, active } = event;
    if (!over || !active) {
      setDragOverInfo(null);
      return;
    }

    const activeId = parseInt(active.id);
    const activeItem = findItem(pack.items, activeId);
    if (!activeItem) return;

    const overData = over.data.current;
    let depth = 0;
    let willEnterFolder = false;

    // Calculate depth based on drop target
    if (overData?.type === 'folder-container') {
      const parentId = overData.parentId;
      willEnterFolder = true;
      if (parentId !== null) {
        // Inside a folder container - count depth of the parent folder + 1
        let current = findItem(pack.items, parentId);
        depth = 1; // Start at 1 because we're inside the folder
        while (current) {
          const parent = findParent(pack.items, current.id);
          if (parent) {
            depth++;
            current = findItem(pack.items, parent.id);
          } else {
            break;
          }
        }
      }
    } else if (overData?.type === 'folder') {
      const folderId = parseInt(over.id);
      
      // Dropping on a folder: will be at the same level as the target folder
      willEnterFolder = false;
      let current = findItem(pack.items, folderId);
      while (current) {
        const parent = findParent(pack.items, current.id);
        if (parent) {
          depth++;
          current = findItem(pack.items, parent.id);
        } else {
          break;
        }
      }
    } else {
      // Dropping on a regular item - use that item's current depth
      const itemId = parseInt(over.id);
      const item = findItem(pack.items, itemId);
      if (item) {
        let current = findParent(pack.items, itemId);
        while (current) {
          depth++;
          const parent = findParent(pack.items, current.id);
          if (parent) {
            current = findItem(pack.items, parent.id);
          } else {
            break;
          }
        }
      }
    }

    setDragOverInfo({ depth, willEnterFolder });
  };

  // Helper to clone and update tree
  const cloneTree = (items) => {
    return items.map(item => ({
      ...item,
      children: item.children ? cloneTree(item.children) : undefined
    }));
  };

  // Helper to create minimal tree structure for backend (only id, parentId, sortOrder)
  const createMinimalTreeStructure = (items) => {
    return items.map(item => ({
      id: item.id,
      children: item.children ? createMinimalTreeStructure(item.children) : undefined
    }));
  };

  // Helper to remove item from tree
  const removeItemFromTree = (items, itemId) => {
    const result = [];
    for (const item of items) {
      if (item.id === itemId) continue;
      
      const newItem = { ...item };
      if (newItem.children) {
        newItem.children = removeItemFromTree(newItem.children, itemId);
      }
      result.push(newItem);
    }
    return result;
  };

  // Helper to insert item into tree at specific location
  const insertItemIntoTree = (items, parentId, item, insertIndex) => {
    if (parentId === null) {
      // Insert at root level
      const newItems = [...items];
      if (insertIndex >= 0 && insertIndex <= newItems.length) {
        newItems.splice(insertIndex, 0, item);
      } else {
        newItems.push(item);
      }
      return newItems;
    }

    // Insert into a folder
    return items.map(currentItem => {
      if (currentItem.id === parentId) {
        const children = currentItem.children || [];
        const newChildren = [...children];
        if (insertIndex >= 0 && insertIndex <= newChildren.length) {
          newChildren.splice(insertIndex, 0, item);
        } else {
          newChildren.push(item);
        }
        return { ...currentItem, children: newChildren };
      }
      
      if (currentItem.children) {
        return {
          ...currentItem,
          children: insertItemIntoTree(currentItem.children, parentId, item, insertIndex)
        };
      }
      
      return currentItem;
    });
  };

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDragOverInfo(null);

    if (!over || active.id === over.id) return;

    try {
      const activeId = parseInt(active.id);
      const activeItem = findItem(pack.items, activeId);
      const activeParent = findParent(pack.items, activeId);
      const activeParentId = activeParent?.id || null;
      
      if (!activeItem) {
        console.error('Active item not found');
        return;
      }

      const overData = over.data.current;
      let targetParentId = null;
      let targetItems = [];
      let newIndex = -1;

      // Determine drop target
      if (overData?.type === 'folder-container') {
        targetParentId = overData.parentId;
        targetItems = targetParentId === null ? pack.items : findItem(pack.items, targetParentId)?.children || [];
        // When dropping in empty space, append to end (excluding active item if it's already there)
        newIndex = targetItems.filter(item => item.id !== activeId).length;
        if (targetParentId !== null) {
          setExpandedFolders(prev => {
            const newSet = new Set(prev).add(targetParentId);
            // Save to cookies
            if (id) {
              setPackExpandedFolders(id, newSet);
            }
            return newSet;
          });
        }
      } else if (overData?.type === 'folder') {
        const overId = parseInt(over.id);
        
        // Dropping on a folder: treat it like any other item (reorder at same level)
        const overParent = findParent(pack.items, overId);
        targetParentId = overParent?.id || null;
        targetItems = targetParentId === null ? pack.items : overParent?.children || [];
        
        // Calculate position just like any other item
        const sortedTargetItems = [...targetItems].sort((a, b) => a.sortOrder - b.sortOrder);
        const overIndex = sortedTargetItems.findIndex(item => item.id === overId);
        const activeIndex = sortedTargetItems.findIndex(item => item.id === activeId);
        
        const isSameParent = activeParentId === targetParentId;
        if (isSameParent && activeIndex !== -1 && overIndex !== -1) {
          const withoutActive = sortedTargetItems.filter(item => item.id !== activeId);
          const overIndexWithoutActive = withoutActive.findIndex(item => item.id === overId);
          newIndex = activeIndex < overIndex ? overIndexWithoutActive + 1 : overIndexWithoutActive;
        } else {
          const filteredItems = sortedTargetItems.filter(item => item.id !== activeId);
          newIndex = filteredItems.findIndex(item => item.id === overId);
          if (newIndex === -1) newIndex = filteredItems.length;
        }
      } else {
        const overId = parseInt(over.id);
        const overItem = findItem(pack.items, overId);
        if (overItem) {
          const overParent = findParent(pack.items, overId);
          targetParentId = overParent?.id || null;
          targetItems = targetParentId === null ? pack.items : overParent?.children || [];
          
          // Check if we're in the same parent
          const isSameParent = activeParentId === targetParentId;
          
          // Get sorted items (don't filter yet)
          const sortedTargetItems = [...targetItems].sort((a, b) => a.sortOrder - b.sortOrder);
          
          // Find the indices
          const overIndex = sortedTargetItems.findIndex(item => item.id === overId);
          const activeIndex = sortedTargetItems.findIndex(item => item.id === activeId);
          
          if (isSameParent && activeIndex !== -1 && overIndex !== -1) {
            // Moving within same parent
            // Remove the active item from the list to get the final positions
            const withoutActive = sortedTargetItems.filter(item => item.id !== activeId);
            // Find where the over item is in the list without the active item
            const overIndexWithoutActive = withoutActive.findIndex(item => item.id === overId);
            
            if (activeIndex < overIndex) {
              // Moving down: insert after the over item's position
              newIndex = overIndexWithoutActive + 1;
            } else {
              // Moving up: insert at the over item's position (before it)
              newIndex = overIndexWithoutActive;
            }
          } else {
            // Moving to different parent or item not found
            // Filter out active item and find position
            const filteredItems = sortedTargetItems.filter(item => item.id !== activeId);
            newIndex = filteredItems.findIndex(item => item.id === overId);
            if (newIndex === -1) newIndex = filteredItems.length;
          }
        }
      }

      // Prevent folder into itself
      if (activeItem.type === 'folder' && targetParentId !== null) {
        let current = findItem(pack.items, targetParentId);
        while (current) {
          if (current.id === activeId) {
            toast.error(tPack('move.cannotMoveIntoSelf'));
            return;
          }
          current = findParent(pack.items, current.id);
          if (current) current = findItem(pack.items, current.id);
        }
      }

      // Build new tree optimistically
      let newTree = cloneTree(pack.items);
      newTree = removeItemFromTree(newTree, activeId);
      newTree = insertItemIntoTree(newTree, targetParentId, activeItem, newIndex);

      // Update local state immediately (optimistic update)
      setIsReordering(true);
      setPack({ ...pack, items: newTree });

      // Send to backend - use minimal structure to avoid large payloads
      const minimalTree = createMinimalTreeStructure(newTree);
      const response = await api.put(`/v2/database/levels/packs/${pack.id}/tree`, {
        items: minimalTree
      });

      // Update with server response (in case of any server-side modifications)
      setPack(prevPack => ({ ...prevPack, items: response.data.items }));
      toast.success(tPack('move.success'));
      setIsReordering(false);
      
    } catch (error) {
      console.error('Failed to move item:', error);
      toast.error(error.response?.data?.error || tPack('move.error'));
      // Revert on error by refetching
      setIsReordering(false);
      await fetchPack(true);
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
    
    switch (parseInt(pack.viewMode)) {
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
    
    switch (parseInt(pack.viewMode)) {
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
        <div className="background-level"></div>
        <CompleteNav />
        <div className="loader loader-level-detail" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="pack-detail-page">
        <CompleteNav />
        <div className="background-level"></div>
        <div className="pack-detail-page__error">
          <h2>{tPack('error.title')}</h2>
          <p>{tPack('error.message')}</p>
          <button 
            className="pack-detail-page__retry-btn"
            onClick={() => fetchPack(false)}
          >
            {tPack('error.retry')}
          </button>
          <button 
            className="pack-detail-page__back-btn"
            style={{alignSelf: 'center'}}
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
  const allItemIds = flattenAllItems(pack.items || []);
  const visibleItems = flattenVisibleItems(pack.items || []);

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
      <button 
            className="pack-detail-page__back-btn"
            onClick={() => navigate('/packs')}
          >
            <ArrowIcon style={{ transform: 'rotate(180deg)' }} />
            <span>{tPack('backToPacks')}</span>
          </button>
          <div className="pack-detail-page__header-container">
        {/* Header */}
        <div className="pack-detail-page__header">

          <div className="pack-detail-page__title-section">
            <div className="pack-detail-page__title-content">
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
            <h1 className="pack-detail-page__title">
                {pack.name}
                {pack.isPinned && (
                  <PinIcon className="pack-detail-page__pinned-icon" />
                )}
              </h1>
              </div>
            
            <div className="pack-detail-page__title-content">

              
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
<div className="pack-detail-page__actions-container">
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

          {user && (
            <div className="pack-detail-page__actions">
              <button
                className="pack-detail-page__favorite-btn"
                onClick={handleFavoriteClick}
              >
                <LikeIcon color={pack.isFavorited ? "#ffffff" : "none"} />
                <span>{pack.isFavorited ? tPack('actions.removeFromFavorites') : tPack('actions.addToFavorites')}</span>
              </button>
            </div>
          )}
          </div>
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
        </div>

        {/* Content */}
        <div className="pack-detail-page__content" ref={scrollRef}>
          <div className="pack-detail-page__levels-header">
          {pack?.items && pack.items.length > 0 && getAllFolderIds(pack.items).length > 0 && (
            <div className="pack-detail-page__tree-controls">
              {areAllFoldersExpanded() ? (
                <button
                  className="pack-detail-page__collapse-expand-btn"
                  onClick={() => handleCollapseExpandAll(false)}
                  title={tPack('actions.collapseAll')}
                >
                  📁➖ {tPack('actions.collapseAll')}
                </button>
              ) : (
                <button
                  className="pack-detail-page__collapse-expand-btn"
                  onClick={() => handleCollapseExpandAll(true)}
                  title={tPack('actions.expandAll')}
                >
                  📁➕ {tPack('actions.expandAll')}
                </button>
              )}
            </div>
          )}
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
              {canEdit && visibleItems.length > 1 && (
                <span className="pack-detail-page__drag-hint">
                  {tPack('items.dragHint')}
                </span>
              )}
            </div>
          </div>

          {pack.items && pack.items.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={allItemIds}
                strategy={verticalListSortingStrategy}
              >
                <RootDropZone
                  items={pack.items}
                  expandedFolders={expandedFolders}
                  onToggleExpanded={toggleFolderExpanded}
                  canEdit={canEdit}
                  isReordering={isReordering}
                  packId={pack.id}
                  user={user}
                  onRenameFolder={handleRenameFolder}
                  onDeleteItem={handleDeleteItem}
                />
              </SortableContext>
              <DragOverlay>
                {activeId ? (() => {
                  const draggedItem = findItem(pack.items, activeId);
                  const isFolder = draggedItem?.type === 'folder';
                  const displayName = draggedItem?.name || draggedItem?.referencedLevel?.name || 'Item';
                  
                  return (
                    <div 
                      className={`pack-item pack-item--dragging ${dragOverInfo?.willEnterFolder ? 'entering-folder' : ''}`}

                    >
                      {isFolder && <span style={{ marginRight: '0.5rem' }}>📁</span>}
                      {displayName}
                      {dragOverInfo?.willEnterFolder && <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>↪</span>}
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>
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
      <Tooltip id="favorite-pack-tooltip" />
    </div>
  );
};

export default PackDetailPage;