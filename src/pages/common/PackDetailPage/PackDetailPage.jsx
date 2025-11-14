import "./packdetailpage.css";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CompleteNav } from "@/components/layout";
import PackItem from "@/components/cards/PackItem/PackItem";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon, PlusIcon, LikeIcon, DownloadIcon } from "@/components/common/icons";
import { EditPackPopup, PackDownloadPopup } from "@/components/popups";
import { useAuth } from "@/contexts/AuthContext";
import { usePackContext } from "@/contexts/PackContext";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { UserAvatar } from "@/components/layout";
import { Tooltip } from "react-tooltip";
import { getPackExpandedFolders, setPackExpandedFolders } from "@/utils/folderState";
import toast from 'react-hot-toast';
import { summarizePackSize, summarizeFolderSize, formatEstimatedSize } from '@/utils/packDownloadUtils';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import i18next from 'i18next';
import { formatDate } from '@/utils/Utility';

const ROOT_DROPPABLE_ID = 'folder-root';

const parseDroppableId = (droppableId) => {
  if (droppableId === ROOT_DROPPABLE_ID) return null;
  if (droppableId?.startsWith('folder-')) {
    const id = Number(droppableId.replace('folder-', ''));
    return Number.isNaN(id) ? null : id;
  }
  return null;
};

const sortItemsByOrder = (items = []) => [...items].sort((a, b) => a.sortOrder - b.sortOrder);

const countPackItems = (items = []) => {
  return items.reduce((total, current) => {
    const childCount = current.children ? countPackItems(current.children) : 0;
    return total + 1 + childCount;
  }, 0);
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
  const [downloadContext, setDownloadContext] = useState(null);
  const scrollRef = useRef(null);

  const packItems = pack?.items || [];
  const packSizeSummary = useMemo(() => summarizePackSize(packItems), [packItems]);
  const packSizeLabel = useMemo(() => formatEstimatedSize(packSizeSummary), [packSizeSummary]);
  const packDownloadDisabled = packSizeSummary.levelCount === 0;
  const sortedRootItems = useMemo(() => sortItemsByOrder(packItems), [packItems]);
  const totalRenderableItems = useMemo(() => countPackItems(packItems), [packItems]);

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

  // Listen for pack updates from external sources (e.g., AddToPackPopup)
  useEffect(() => {
    const handlePackUpdate = (event) => {
      if (event.detail?.packId === id || event.detail?.packId === pack?.id) {
        fetchPack(true); // Silent refetch
      }
    };

    window.addEventListener('packUpdated', handlePackUpdate);
    return () => window.removeEventListener('packUpdated', handlePackUpdate);
  }, [id, pack?.id]);

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
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(tPack('createFolder.error'));
    }
  };

  // Handle adding new level (supports single ID or comma-separated IDs for bulk insert)
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
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error adding level:', error);
      toast.error(error.response?.data?.error || tPack('addLevel.error'));
    }
  };

  const handlePackDownloadClick = () => {
    if (!pack) return;
    setDownloadContext({
      type: 'pack',
      name: pack.name,
      sizeSummary: packSizeSummary,
      folderId: null
    });
  };

  const handleFolderDownload = useCallback((folderItem) => {
    if (!folderItem) return;
    const summary = summarizeFolderSize(folderItem);
    setDownloadContext({
      type: 'folder',
      name: folderItem.name,
      sizeSummary: summary,
      folderId: folderItem.id
    });
  }, []);

  const handleCloseDownloadPopup = () => setDownloadContext(null);

  const handleRequestDownload = useCallback(async () => {
    if (!downloadContext || !pack?.id) {
      throw new Error('Missing download context.');
    }

    const payload = {};
    if (downloadContext.folderId) {
      payload.folderId = downloadContext.folderId;
    }

    const response = await api.post(
      `/v2/database/levels/packs/${pack.id}/download-link`,
      payload
    );

    return response.data;
  }, [downloadContext, pack?.id]);

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
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
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
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.error || tPack('deleteItem.error'));
    }
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

  const findParentId = (items, itemId) => {
    const parentItem = findParent(items, itemId);
    if (parentItem === undefined) {
      return undefined;
    }
    return parentItem?.id ?? null;
  };

  const getChildList = (items, parentId) => {
    if (parentId === null) {
      return items;
    }

    const parentItem = findItem(items, parentId);
    if (!parentItem) {
      return null;
    }

    if (!parentItem.children) {
      parentItem.children = [];
    }

    return parentItem.children;
  };

  const moveItemInTree = (items, { sourceParentId, sourceIndex, destinationParentId, destinationIndex }) => {

    const sourceList = getChildList(items, sourceParentId);
    const destinationList = getChildList(items, destinationParentId);

    if (!sourceList || !destinationList) {
      return false;
    }

    if (sourceIndex < 0 || sourceIndex >= sourceList.length) {
      return false;
    }

    const [movedItem] = sourceList.splice(sourceIndex, 1);

    if (!movedItem) {
      return false;
    }

    let targetIndex = destinationIndex;
    if (sourceParentId === destinationParentId && destinationIndex > sourceIndex) {
      targetIndex = destinationIndex;
    }

    if (targetIndex < 0) {
      targetIndex = 0;
    }

    if (targetIndex > destinationList.length) {
      targetIndex = destinationList.length;
    }

    destinationList.splice(targetIndex, 0, movedItem);
    return true;
  };

  // Handle drag end with DnD context
  const handleDragEnd = async (result) => {
    if (!result.destination || !pack?.items) return;

    const { source, destination, draggableId } = result;
    const sourceParentId = parseDroppableId(source.droppableId);
    const destinationParentId = parseDroppableId(destination.droppableId);

    if (sourceParentId === destinationParentId && source.index === destination.index) {
      return;
    }

    const activeId = parseInt(draggableId.replace('item-', ''), 10);
    const activeItem = findItem(pack.items, activeId);

    if (!activeItem) {
      console.error('Active item not found');
      return;
    }

    if (activeItem.type === 'folder') {
      let currentParentId = destinationParentId;
      while (currentParentId !== null && currentParentId !== undefined) {
        if (currentParentId === activeId) {
          toast.error(tPack('move.cannotMoveIntoSelf'));
          return;
        }
        const nextParentId = findParentId(pack.items, currentParentId);
        if (nextParentId === undefined) {
          break;
        }
        currentParentId = nextParentId;
      }
    }

    try {
      setIsReordering(true);

      const newTree = cloneTree(pack.items);
      const moveSucceeded = moveItemInTree(newTree, {
        sourceParentId,
        sourceIndex: source.index,
        destinationParentId,
        destinationIndex: destination.index
      });

      if (!moveSucceeded) {
        setIsReordering(false);
        return;
      }

      setPack({ ...pack, items: newTree });

      if (destinationParentId !== null && destinationParentId !== undefined) {
        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          newSet.add(destinationParentId);
          if (id) {
            setPackExpandedFolders(id, newSet);
          }
          return newSet;
        });
      }

      const minimalTree = createMinimalTreeStructure(newTree);
      const response = await api.put(`/v2/database/levels/packs/${pack.id}/tree`, {
        items: minimalTree
      });

      setPack(prevPack => ({ ...prevPack, items: response.data.items }));
      toast.success(tPack('move.success'));
      
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Failed to move item:', error);
      toast.error(error.response?.data?.error || tPack('move.error'));
      await fetchPack(true);
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
  const isDownloadPopupOpen = Boolean(downloadContext);
  const popupContextName = downloadContext?.name || pack?.name;
  const popupSizeSummary = downloadContext?.sizeSummary || packSizeSummary;

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
          <div className="pack-detail-page__actions">
            <button
              className="pack-detail-page__download-btn"
              onClick={handlePackDownloadClick}
              disabled={packDownloadDisabled}
              title={
                packDownloadDisabled
                  ? 'No downloadable levels available yet'
                  : `${tPack('actions.downloadPack')} (${packSizeLabel.sizeLabel}) ${packSizeLabel.isEstimated}`
              }
            >
              <DownloadIcon color="#ffffff" size={"20px"} />
              <span>{tPack('actions.downloadPack')}</span>
            </button>
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
              {formatDate(pack?.createdAt, i18next?.language)}
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
              {canEdit && totalRenderableItems > 1 && (
                <span className="pack-detail-page__drag-hint">
                  {tPack('items.dragHint')}
                </span>
              )}
            </div>
          </div>

          {pack.items && pack.items.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable 
                droppableId={ROOT_DROPPABLE_ID} 
                type="ITEM"
              >
                {(provided, snapshot) => (
                  <div
                    className={`pack-detail-page__items-list ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {sortedRootItems.map((item, index) => (
                      <PackItem
                        key={item.id}
                        item={item}
                        index={index}
                        depth={0}
                        expandedFolders={expandedFolders}
                        onToggleExpanded={toggleFolderExpanded}
                        canEdit={canEdit}
                        isReordering={isReordering}
                        user={user}
                        onRenameFolder={handleRenameFolder}
                        onDeleteItem={handleDeleteItem}
                        onDownloadFolder={handleFolderDownload}
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

      <PackDownloadPopup
        isOpen={isDownloadPopupOpen}
        onClose={handleCloseDownloadPopup}
        contextName={popupContextName}
        sizeSummary={popupSizeSummary}
        onRequestDownload={handleRequestDownload}
      />

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