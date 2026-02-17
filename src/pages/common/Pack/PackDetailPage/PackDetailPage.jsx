import "./packdetailpage.css";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PackItem, { PackLevelItem } from "@/components/cards/PackItem/PackItem";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon, PlusIcon, LikeIcon, DownloadIcon } from "@/components/common/icons";
import { EditPackPopup, PackDownloadPopup } from "@/components/popups/Packs";
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

// Render clone for dragging items - this renders in a portal to prevent layout shifts
// from affecting hit detection on Droppables above the source
const RenderClone = ({ item, provided, snapshot, user, canEdit }) => {
  if (item.type === 'level') {
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`pack-item pack-item--level dragging-clone ${snapshot.isDragging ? 'is-dragging' : ''}`}
        style={{
          ...provided.draggableProps.style,
          // Ensure clone is visible and on top
          zIndex: 9999,
          opacity: 1,
        }}
      >
        <div className="pack-item__level-wrapper">
          <PackLevelItem
            item={item}
            canEdit={canEdit}
            isReordering={false}
            user={user}
            onDeleteItem={() => {}}
            dragHandleProps={provided.dragHandleProps}
          />
        </div>
      </div>
    );
  }
  
  // For folders (though folders have isDragDisabled=true currently)
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`pack-item pack-item--folder dragging-clone ${snapshot.isDragging ? 'is-dragging' : ''}`}
      style={{
        ...provided.draggableProps.style,
        zIndex: 9999,
        opacity: 1,
      }}
    >
      <div className="pack-item__header">
        <div className="pack-item__icon">📁</div>
        <div className="pack-item__info">
          <div className="pack-item__name">{item.name}</div>
          <div className="pack-item__count">{item.children?.length || 0} items</div>
        </div>
      </div>
    </div>
  );
};

const parseDroppableId = (droppableId) => {
  if (droppableId === ROOT_DROPPABLE_ID) return 0;
  if (droppableId?.startsWith('folder-')) {
    const id = Number(droppableId.replace('folder-', ''));
    return Number.isNaN(id) ? 0 : id;
  }
  return 0;
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleFavorite } = usePackContext();
  
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [downloadContext, setDownloadContext] = useState(null);
  const scrollRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

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
        toast.error(t('packDetail.error.notFound'));
      } else if (error.response?.status === 403) {
        toast.error(t('packDetail.error.accessDenied'));
      } else {
        toast.error(t('packDetail.error.loadFailed'));
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
    toast.success(t('packDetail.edit.success'));
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
    const folderName = prompt(t('packDetail.createFolder.prompt'));
    if (!folderName?.trim()) return;

    try {
      await api.post(`/v2/database/levels/packs/${pack.id}/items`, {
        type: 'folder',
        name: folderName.trim(),
        parentId: 0
      });
      
      toast.success(t('packDetail.createFolder.success'));
      await fetchPack(true); // Silent refetch
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(t('packDetail.createFolder.error'));
    }
  };

  // Handle adding new level (supports single ID or comma-separated IDs for bulk insert)
  const handleAddLevel = async () => {
    const levelId = prompt(t('packDetail.addLevel.prompt'));
    if (!levelId?.trim()) return;

    try {
      await api.post(`/v2/database/levels/packs/${pack.id}/items`, {
        type: 'level',
        levelIds: levelId,
        parentId: 0
      });
      
      toast.success(t('packDetail.addLevel.success'));
      await fetchPack(true); // Silent refetch
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error adding level:', error);
      toast.error(error.response?.data?.error || t('packDetail.addLevel.error'));
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

  const handleRequestDownload = useCallback(async (downloadId) => {
    if (!downloadContext || !pack?.id) {
      throw new Error('Missing download context.');
    }

    const payload = {};
    if (downloadContext.folderId) {
      payload.folderId = downloadContext.folderId;
    }
    // Pass the client-generated downloadId for progress tracking
    if (downloadId) {
      payload.downloadId = downloadId;
    }

    const response = await api.post(
      `/v2/database/levels/packs/${pack.id}/download-link`,
      payload
    );

    return response.data;
  }, [downloadContext, pack?.id]);

  // Handle rename folder
  const handleRenameFolder = async (item) => {
    const newName = prompt(t('packDetail.renameFolder.prompt'), item.name);
    if (!newName?.trim() || newName === item.name) return;

    try {
      await api.put(`/v2/database/levels/packs/${pack.id}/items/${item.id}`, {
        name: newName.trim()
      });
      
      toast.success(t('packDetail.renameFolder.success'));
      await fetchPack(true); // Silent refetch
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error(error.response?.data?.error || t('packDetail.renameFolder.error'));
    }
  };

  // Handle delete item
  const handleDeleteItem = async (item) => {
    const confirmMessage = item?.type === 'folder' 
      ? t('packDetail.deleteFolder.confirm', { name: item.name })
      : t('packDetail.deleteLevel.confirm');
    
    if (!confirm(confirmMessage)) return;

    try {
      await api.delete(`/v2/database/levels/packs/${pack.id}/items/${item.id}`);
      
      toast.success(t('packDetail.deleteItem.success'));
      await fetchPack(true); // Silent refetch
      
      // Notify any other listeners that the pack was updated
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.error || t('packDetail.deleteItem.error'));
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
    return parentItem?.id ?? 0;
  };

  const getChildList = (items, parentId) => {
    if (parentId === 0) {
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

  // Track mouse position for manual collision detection
  useEffect(() => {
    const handleMouseMove = (e) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Manual collision detection - find which folder the mouse is over
  const detectFolderAtPoint = (x, y) => {
    if (!window.__folderDroppables) return null;
    
    for (const [folderId, info] of window.__folderDroppables) {
      const el = info.element;
      if (!el) continue;
      
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Mouse is inside this folder's droppable area
        // Calculate the drop index based on Y position
        const children = el.children;
        let dropIndex = info.childCount; // Default to end
        
        for (let i = 0; i < children.length; i++) {
          const childRect = children[i].getBoundingClientRect();
          const childMidY = childRect.top + childRect.height / 2;
          if (y < childMidY) {
            dropIndex = i;
            break;
          }
        }
        
        return { folderId, dropIndex };
      }
    }
    return null;
  };

  // Handle drag start
  const handleDragStart = () => {
    // Mouse tracking is already active via useEffect
  };

  // Handle drag update - not needed for manual collision detection
  const handleDragUpdate = () => {
    // We use mouse position tracking instead
  };

  // Handle drag end with DnD context
  const handleDragEnd = async (result) => {
    if (!result.destination || !pack?.items) {
      return;
    }

    const { source, destination, draggableId } = result;
    let sourceParentId = parseDroppableId(source.droppableId);
    let destinationParentId = parseDroppableId(destination.droppableId);
    let destinationIndex = destination.index;

    // Manual collision detection: if library says destination is root,
    // check if mouse is actually over a folder droppable
    if (destinationParentId === 0 && sourceParentId !== 0) {
      const mousePos = lastMousePosRef.current;
      const manualDetection = detectFolderAtPoint(mousePos.x, mousePos.y);
      
      if (manualDetection) {
        // Override with manual detection
        destinationParentId = manualDetection.folderId;
        destinationIndex = manualDetection.dropIndex;
      }
    }

    if (sourceParentId === destinationParentId && source.index === destinationIndex) {
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
      while (currentParentId !== 0 && currentParentId !== undefined) {
        if (currentParentId === activeId) {
          toast.error(t('packDetail.move.cannotMoveIntoSelf'));
          return;
        }
        const nextParentId = findParentId(pack.items, currentParentId);
        if (nextParentId === undefined || nextParentId === 0) {
          break;
        }
        currentParentId = nextParentId;
      }
    }

    try {
      const newTree = cloneTree(pack.items);
      const moveSucceeded = moveItemInTree(newTree, {
        sourceParentId,
        sourceIndex: source.index,
        destinationParentId,
        destinationIndex
      });

      if (!moveSucceeded) {
        return;
      }

      setPack({ ...pack, items: newTree });

      if (destinationParentId !== 0 && destinationParentId !== undefined) {
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
      toast.success(t('packDetail.move.success'));
      
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id }
      }));
    } catch (error) {
      console.error('Failed to move item:', error);
      toast.error(error.response?.data?.error || t('packDetail.move.error'));
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
        return <EyeIcon className="view-icon public" />;
      case 2: // LINKONLY
        return <UsersIcon className="view-icon linkonly" />;
      case 3: // PRIVATE
        return <LockIcon className="view-icon private" />;
      case 4: // FORCED_PRIVATE
        return <LockIcon className="view-icon forced-private" />;
      default:
        return <EyeIcon className="view-icon public" />;
    }
  };

  const getViewModeText = () => {
    if (!pack) return '';
    
    switch (parseInt(pack.viewMode)) {
      case 1: return t('packDetail.viewMode.public');
      case 2: return t('packDetail.viewMode.linkonly');
      case 3: return t('packDetail.viewMode.private');
      case 4: return t('packDetail.viewMode.forcedPrivate');
      default: return t('packDetail.viewMode.public');
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
        
        <div className="loader loader-pass-detail" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="pack-detail-page">
        
        <div className="error">
          <h2>{t('packDetail.error.title')}</h2>
          <p>{t('packDetail.error.message')}</p>
          <button 
            className="retry-btn"
            onClick={() => fetchPack(false)}
          >
            {t('packDetail.error.retry')}
          </button>
          <button 
            className="back-btn"
            style={{alignSelf: 'center'}}
            onClick={() => navigate('/packs')}
          >
            {t('packDetail.backToPacks')}
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
      
      
      <div className="pack-body">
      <button 
            className="back-btn"
            onClick={() => navigate('/packs')}
          >
            <ArrowIcon style={{ transform: 'rotate(180deg)' }} />
            <span>{t('packDetail.backToPacks')}</span>
          </button>
          <div className="header-container">
        {/* Header */}
        <div className="header">

          <div className="title-section">
            <div className="title-content">
            <div className="icon">
              {pack.iconUrl ? (
                <img 
                  src={pack.iconUrl} 
                  alt={pack.name}
                  className="icon-img"
                />
              ) : (
                <div className="icon-placeholder">
                  📦
                </div>
              )}
            </div>
            <h1 className="title">
                {pack.name}
                {pack.isPinned && (
                  <PinIcon className="pinned-icon" />
                )}
              </h1>
              </div>
            
            <div className="title-content">

              
              <div className="meta">
                <div className="owner">
                  <UserAvatar 
                    primaryUrl={pack.packOwner?.avatarUrl || 'Unknown'} 
                    className="owner-avatar"
                  />
                  <span className="owner-name">
                    {t('packDetail.by')} {pack.packOwner?.username || 'Unknown'}
                  </span>
                </div>
                
                <div className="view-mode">
                  {getViewModeIcon()}
                  <span className="view-mode-text">
                    {getViewModeText()}
                  </span>
                </div>
              </div>
            </div>
          </div>
<div className="actions-container">
          <div className="actions">
            <button
              className="download-btn"
              onClick={handlePackDownloadClick}
              disabled={packDownloadDisabled || !user}
              data-tooltip-id="download-pack-tooltip"
              data-tooltip-content={
                packDownloadDisabled
                  ? 'No downloadable levels available yet'
                  : !user
                    ? 'You must be logged in to download a pack'
                  : `${t('packDetail.actions.downloadPack')} (${packSizeLabel.sizeLabel}) ${packSizeLabel.isEstimated}`
              }
              data-tooltip-place="bottom"
            >
              <DownloadIcon color="#ffffff" size={"20px"} />
              <span>{t('packDetail.actions.downloadPack')}</span>
            </button>
            <Tooltip id="download-pack-tooltip" place="bottom" noArrow />
          </div>
          {canEdit && (
            <div className="actions">
              <button
                className="edit-btn"
                onClick={() => setShowEditPopup(true)}
                title={t('packDetail.actions.edit')}
              >
                <EditIcon />
                <span>{t('packDetail.actions.edit')}</span>
              </button>
            </div>
          )}

          {user && (
            <div className="actions">
              <button
                className="favorite-btn"
                onClick={handleFavoriteClick}
              >
                <LikeIcon color={pack.isFavorited ? "#ffffff" : "none"} />
                <span>{pack.isFavorited ? t('packDetail.actions.removeFromFavorites') : t('packDetail.actions.addToFavorites')}</span>
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <span className="stat-value">
              {totalLevels}
            </span>
            <span className="stat-label">
              {t('packDetail.stats.levels')}
            </span>
          </div>
          
          <div className="stat">
            <span className="stat-value">
              {pack.items?.length || 0}
            </span>
            <span className="stat-label">
              {t('packDetail.stats.items')}
            </span>
          </div>
          
          <div className="stat">
            <span className="stat-value">
              {formatDate(pack?.createdAt, i18next?.language)}
            </span>
            <span className="stat-label">
              {t('packDetail.stats.created')}
            </span>
          </div>
        </div>
        </div>

        {/* Content */}
        <div className="content" ref={scrollRef}>
          <div className="levels-header">
          {pack?.items && pack.items.length > 0 && getAllFolderIds(pack.items).length > 0 && (
            <div className="tree-controls">
              {areAllFoldersExpanded() ? (
                <button
                  className="collapse-expand-btn"
                  onClick={() => handleCollapseExpandAll(false)}
                  title={t('packDetail.actions.collapseAll')}
                >
                  📁➖ {t('packDetail.actions.collapseAll')}
                </button>
              ) : (
                <button
                  className="collapse-expand-btn"
                  onClick={() => handleCollapseExpandAll(true)}
                  title={t('packDetail.actions.expandAll')}
                >
                  📁➕ {t('packDetail.actions.expandAll')}
                </button>
              )}
            </div>
          )}
            <h2 className="levels-title">
              {t('packDetail.items.title')}
            </h2>
            <div className="levels-header-right">
              {canEdit && (
                <div className="add-buttons">
                  <button
                    className="add-btn"
                    onClick={handleAddFolder}
                    title={t('packDetail.actions.addFolder')}
                  >
                    <PlusIcon /> 📁 {t('packDetail.actions.addFolder')}
                  </button>
                  <button
                    className="add-btn"
                    onClick={handleAddLevel}
                    title={t('packDetail.actions.addLevel')}
                  >
                    <PlusIcon /> 🎵 {t('packDetail.actions.addLevel')}
                  </button>
                </div>
              )}
              {canEdit && totalRenderableItems > 1 && (
                <span className="drag-hint">
                  {t('packDetail.items.dragHint')}
                </span>
              )}
            </div>
          </div>

          {pack.items && pack.items.length > 0 ? (
            <DragDropContext onDragStart={handleDragStart} onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
              <Droppable 
                droppableId={ROOT_DROPPABLE_ID} 
                type="ITEM"
                renderClone={(provided, snapshot, rubric) => {
                  // Find the item being dragged from the flat list of all items
                  const draggedItemId = parseInt(rubric.draggableId.replace('item-', ''), 10);
                  const draggedItem = findItem(pack.items, draggedItemId);
                  
                  return (
                    <RenderClone
                      item={draggedItem}
                      provided={provided}
                      snapshot={snapshot}
                      user={user}
                      canEdit={canEdit}
                    />
                  );
                }}
              >
                {(provided, snapshot) => (
                  <div
                    className={`items-list ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
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
                        user={user}
                        onRenameFolder={handleRenameFolder}
                        onDeleteItem={handleDeleteItem}
                        onDownloadFolder={handleFolderDownload}
                        allItems={pack.items}
                        findItemFn={findItem}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="empty">
              <p>{t('packDetail.items.empty')}</p>
              {canEdit && (
                <div className="empty-actions">
                  <button
                    className="add-btn"
                    onClick={handleAddFolder}
                  >
                    <PlusIcon /> {t('packDetail.actions.addFolder')}
                  </button>
                  <button
                    className="add-btn"
                    onClick={handleAddLevel}
                  >
                    <PlusIcon /> {t('packDetail.actions.addLevel')}
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