import "./packdetailpage.css";
import { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CompleteNav } from "@/components/layout";
import { LevelCard } from "@/components/cards";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon, DragHandleIcon } from "@/components/common/icons";
import { EditPackPopup } from "@/components/popups";
import { useAuth } from "@/contexts/AuthContext";
import { PackContext } from "@/contexts/PackContext";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { UserAvatar } from "@/components/layout";
import { Tooltip } from "react-tooltip";
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import PackFolder from "@/components/cards/PackFolder/PackFolder";
import { getFolderState, setFolderState } from "@/utils/folderState";

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
  const [folderStates, setFolderStates] = useState({});
  const scrollRef = useRef(null);

  // Fetch pack details
  const fetchPack = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const response = await api.get(`/v2/database/levels/packs/${id}`);
      setPack(response.data);
    } catch (error) {
      console.error('Error fetching pack:', error);
      setError(true);
      if (error.response?.status === 404) {
        toast.error(tPack('error.notFound'));
      } else if (error.response?.status === 403) {
        toast.error(tPack('error.accessDenied'));
      } else {
        toast.error(tPack('error.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPack();
    }
  }, [id]);

  // Handle edit pack
  const handleEditPack = async (updatedPack) => {
    // Update local pack state with the updated pack data
    setPack(updatedPack);
    setShowEditPopup(false);
    toast.success(tPack('edit.success'));
  };

  // Handle delete pack - navigate back to packs list
  const handleDeletePack = () => {
    navigate('/packs');
  };

  // Folder state management
  const toggleFolderExpanded = (folderId) => {
    const newState = !folderStates[folderId];
    setFolderStates(prev => ({ ...prev, [folderId]: newState }));
    setFolderState(folderId, newState);
  };

  const isFolderExpanded = (folderId) => {
    return folderStates[folderId] ?? getFolderState(folderId, false);
  };

  // Handle drag and drop reordering and combining
  const handleDragEnd = async (result) => {
    if (result.combine != null) {
      console.log("handleCombine", result);
      await handleCombine(result);
      return;
    }

    if (!result.destination || !pack?.packItems) return;

    
    // Handle normal reordering
    setIsReordering(true);
    
    try {
      const items = Array.from(pack.packItems);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Update local state immediately for better UX
      const updatedPack = {
        ...pack,
        packItems: items.map((item, index) => ({
          ...item,
          sortOrder: index + 1
        }))
      };
      setPack(updatedPack);
      
      // Send reorder request to server
      const levelOrders = items.map((item, index) => ({
        levelId: item.levelId,
        sortOrder: index + 1
      }));
      
      await api.put(`/v2/database/levels/packs/${pack.id}/levels/reorder`, {
        levelOrders
      });
      
      toast.success(tPack('reorder.success'));
    } catch (error) {
      console.error('Error reordering pack levels:', error);
      toast.error(tPack('reorder.error'));
      // Revert local state on error
      fetchPack();
    } finally {
      setIsReordering(false);
    }
  };

  // Handle combining items
  const handleCombine = async (result) => {
    console.log("handleCombine", result);
    
    if (!canEdit) return;
    
    const sourceId = result.draggableId;
    const targetId = result.combine.draggableId;
    
    // Determine if source and target are levels or folders
    const isSourceLevel = sourceId.startsWith(`${pack.id}-`);
    const isTargetLevel = targetId.startsWith(`${pack.id}-`);
    const isSourceFolder = sourceId.startsWith(`folder-${pack.id}-`);
    const isTargetFolder = targetId.startsWith(`folder-${pack.id}-`);
    
    try {
      if (isSourceLevel && isTargetLevel) {
        // Level + Level: Create new folder with both levels
        const sourceItem = pack.packItems.find(item => `${pack.id}-${item.levelId}` === sourceId);
        const targetItem = pack.packItems.find(item => `${pack.id}-${item.levelId}` === targetId);
        if (sourceItem && targetItem) {
          await createFolderWithLevels([sourceItem, targetItem]);
        }
      } else if (isSourceLevel && isTargetFolder) {
        // Level + Folder: Add level to folder
        const sourceItem = pack.packItems.find(item => `${pack.id}-${item.levelId}` === sourceId);
        const targetFolderId = parseInt(targetId.replace(`folder-${pack.id}-`, ''));
        if (sourceItem) {
          await addLevelToFolder(sourceItem, targetFolderId);
        }
      } else if (isSourceFolder && isTargetLevel) {
        // Folder + Level: Create new folder with level, then add original folder
        const sourceFolderId = parseInt(sourceId.replace(`folder-${pack.id}-`, ''));
        const targetItem = pack.packItems.find(item => `${pack.id}-${item.levelId}` === targetId);
        if (targetItem) {
          await createFolderWithLevelAndFolder(targetItem, sourceFolderId);
        }
      } else if (isSourceFolder && isTargetFolder) {
        // Folder + Folder: Add source folder to target folder
        const sourceFolderId = parseInt(sourceId.replace(`folder-${pack.id}-`, ''));
        const targetFolderId = parseInt(targetId.replace(`folder-${pack.id}-`, ''));
        await addFolderToFolder(sourceFolderId, targetFolderId);
      }
      
      toast.success(tPack('combine.success'));
    } catch (error) {
      console.error('Error combining items:', error);
      toast.error(tPack('combine.error'));
    }
  };

  // Create new folder with multiple levels
  const createFolderWithLevels = async (levels) => {
    const folderName = prompt(tPack('createFolder.prompt'));
    if (!folderName) return;
    
    // Create new folder
    const folderResponse = await api.post('/v2/database/levels/packs/folders', {
      name: folderName.trim(),
      parentFolderId: null
    });
    
    // Move levels to new folder
    for (const level of levels) {
      await api.put(`/v2/database/levels/packs/folders/${folderResponse.data.id}/packs/${level.levelId}`);
    }
    
    await fetchPack();
  };

  // Add level to existing folder
  const addLevelToFolder = async (level, folderId) => {
    await api.put(`/v2/database/levels/packs/folders/${folderId}/packs/${level.levelId}`);
    await fetchPack();
  };

  // Create folder with level, then add original folder
  const createFolderWithLevelAndFolder = async (level, sourceFolderId) => {
    const folderName = prompt(tPack('createFolder.prompt'));
    if (!folderName) return;
    
    // Create new folder
    const newFolderResponse = await api.post('/v2/database/levels/packs/folders', {
      name: folderName.trim(),
      parentFolderId: null
    });
    
    // Add level to new folder
    await api.put(`/v2/database/levels/packs/folders/${newFolderResponse.data.id}/packs/${level.levelId}`);
    
    // Move original folder to new folder
    await api.put(`/v2/database/levels/packs/folders/${newFolderResponse.data.id}/folders/${sourceFolderId}`);
    
    await fetchPack();
  };

  // Add folder to another folder
  const addFolderToFolder = async (sourceFolderId, targetFolderId) => {
    await api.put(`/v2/database/levels/packs/folders/${sourceFolderId}`, {
      parentFolderId: targetFolderId
    });
    await fetchPack();
  };



  // Get view mode icon and text
  const getViewModeIcon = () => {
    if (!pack) return null;
    
    switch (pack.viewMode) {
      case 1: // PUBLIC
        return <EyeIcon className="pack-detail__view-icon public" />;
      case 2: // LINKONLY
        return <UsersIcon className="pack-detail__view-icon linkonly" />;
      case 3: // PRIVATE
        return <LockIcon className="pack-detail__view-icon private" />;
      case 4: // FORCED_PRIVATE
        return <LockIcon className="pack-detail__view-icon forced-private" />;
      default:
        return <EyeIcon className="pack-detail__view-icon public" />;
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
    pack.packOwnerId === user.id || 
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

  return (
    <div className="pack-detail-page">
      <MetaTags 
        title={`${pack.name} - Pack - TUF`}
        description={`Level pack: ${pack.name} by ${pack.packOwner?.username || 'Unknown'}. Contains ${pack.packItems?.length || 0} levels.`}
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
                
                {pack.folder && (
                  <div className="pack-detail-page__folder">
                    <span className="pack-detail-page__folder-icon">📁</span>
                    <span className="pack-detail-page__folder-text">
                      {tPack('inFolder')} {pack.folder.name}
                    </span>
                  </div>
                )}
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
              {pack.packItems?.length || 0}
            </span>
            <span className="pack-detail-page__stat-label">
              {tPack('stats.levels')}
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

        {/* Levels */}
        <div className="pack-detail-page__content" ref={scrollRef}>
          <div className="pack-detail-page__levels-header">
            <h2 className="pack-detail-page__levels-title">
              {tPack('levels.title')}
            </h2>
            <div className="pack-detail-page__levels-header-right">
              <span className="pack-detail-page__levels-count">
                {pack.packItems?.filter(item => !item.folderId).length || 0} {tPack('levels.count')}
              </span>
              {canEdit && pack.packItems && pack.packItems.filter(item => !item.folderId).length > 1 && (
                <span className="pack-detail-page__drag-hint">
                  {tPack('levels.dragHint')}
                </span>
              )}
            </div>
          </div>

          {pack && pack.packItems && pack.packItems.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={`pack-levels-${pack.id}`} isCombineEnabled={true}>
                {(provided, snapshot) => (
                  <div 
                    className={`pack-detail-page__levels-list ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${snapshot.draggingFromThisWith ? 'dragging-from' : ''}`}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {/* Render folders first */}
                    {pack.folders?.map((folder, folderIndex) => (
                      <PackFolder
                        key={`folder-${folder.id}`}
                        folder={folder}
                        index={folderIndex}
                        isExpanded={isFolderExpanded(folder.id)}
                        onToggleExpanded={() => toggleFolderExpanded(folder.id)}
                        canEdit={canEdit}
                        isReordering={isReordering}
                        packId={pack.id}
                        user={user}
                      />
                    ))}
                    
                    {/* Render levels that are NOT in any folder */}
                    {pack.packItems
                      .filter(item => !item.folderId) // Only show levels not in folders
                      .map((item, levelIndex) => (
                        <Draggable 
                          key={`${pack.id}-${item.levelId}`} 
                          draggableId={`${pack.id}-${item.levelId}`} 
                          index={(pack.folders?.length || 0) + levelIndex}
                          isDragDisabled={!canEdit || isReordering}
                        >
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`pack-detail-page__level-item ${snapshot.isDragging ? 'dragging' : ''} ${isReordering ? 'reordering' : ''} ${snapshot.combineTargetFor ? 'combine-target' : ''}`}
                            >
                              {canEdit && (
                                <div 
                                  {...provided.dragHandleProps}
                                  className="pack-detail-page__drag-handle"
                                  title={tPack('levels.dragHint')}
                                >
                                  <DragHandleIcon />
                                </div>
                              )}
                              <LevelCard
                                index={levelIndex}
                                level={item.level}
                                user={user}
                                sortBy="RECENT"
                                displayMode="normal"
                                size="medium"
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="pack-detail-page__empty">
              <p>{tPack('levels.empty')}</p>
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
