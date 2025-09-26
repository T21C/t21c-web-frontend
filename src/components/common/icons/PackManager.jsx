import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PlusIcon, FolderIcon } from '@/components/common';
import PackFolder from '@/components/cards/PackFolder/PackFolder';
import { useFolders } from '@/contexts/FolderContext';
import { useAuth } from '@/contexts/AuthContext';
import './PackManager.css';

const PackManager = ({ 
  packs = [], 
  onPackSelect, 
  onCreatePack, 
  onEditPack, 
  onDeletePack,
  selectedPackId = null 
}) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const { 
    folders, 
    loading, 
    expandedFolders, 
    fetchFolders, 
    createFolder, 
    renameFolder, 
    deleteFolder, 
    toggleFolderExpansion,
    movePackToFolder,
    reorderItems
  } = useFolders();

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const createFolderInputRef = useRef(null);

  // Group packs by folder
  const packsByFolder = packs.reduce((acc, pack) => {
    const folderId = pack.folderId || 'root';
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(pack);
    return acc;
  }, {});

  // Sort packs within each folder by sortOrder
  Object.keys(packsByFolder).forEach(folderId => {
    packsByFolder[folderId].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  // Sort folders by sortOrder
  const sortedFolders = [...folders].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (error) {
      // Error is handled in the context
    }
  }, [newFolderName, createFolder]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    // Handle pack reordering within same folder
    if (type === 'pack' && source.droppableId === destination.droppableId) {
      const folderId = source.droppableId === 'root' ? null : parseInt(source.droppableId);
      const folderPacks = packsByFolder[folderId] || [];
      
      const newPacks = Array.from(folderPacks);
      const [reorderedPack] = newPacks.splice(source.index, 1);
      newPacks.splice(destination.index, 0, reorderedPack);

      // Update sort orders
      const packUpdates = newPacks.map((pack, index) => ({
        id: pack.id,
        sortOrder: index + 1,
        folderId
      }));

      try {
        await reorderItems([], packUpdates);
      } catch (error) {
        // Error is handled in the context
      }
    }
    // Handle moving pack between folders
    else if (type === 'pack' && source.droppableId !== destination.droppableId) {
      const packId = parseInt(draggableId);
      const targetFolderId = destination.droppableId === 'root' ? null : parseInt(destination.droppableId);
      
      try {
        await movePackToFolder(packId, targetFolderId);
        
        // Update local state optimistically
        const updatedPacks = packs.map(pack => 
          pack.id === packId ? { ...pack, folderId: targetFolderId } : pack
        );
        
        // Trigger parent component to refresh packs
        if (onPackSelect) {
          onPackSelect(updatedPacks.find(p => p.id === packId));
        }
      } catch (error) {
        // Error is handled in the context
      }
    }
    // Handle folder reordering
    else if (type === 'folder') {
      const newFolders = Array.from(sortedFolders);
      const [reorderedFolder] = newFolders.splice(source.index, 1);
      newFolders.splice(destination.index, 0, reorderedFolder);

      const folderUpdates = newFolders.map((folder, index) => ({
        id: folder.id,
        sortOrder: index + 1
      }));

      try {
        await reorderItems(folderUpdates, []);
      } catch (error) {
        // Error is handled in the context
      }
    }
  }, [packs, sortedFolders, packsByFolder, reorderItems, movePackToFolder, onPackSelect]);

  const renderPackItem = (pack, index, folderId) => (
    <Draggable key={pack.id} draggableId={pack.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`pack-manager__pack-item ${selectedPackId === pack.id ? 'selected' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
          onClick={() => onPackSelect && onPackSelect(pack)}
        >
          <div className="pack-manager__pack-icon">
            {pack.iconUrl ? (
              <img src={pack.iconUrl} alt={pack.name} />
            ) : (
              <span>📦</span>
            )}
          </div>
          <div className="pack-manager__pack-info">
            <div className="pack-manager__pack-name">{pack.name}</div>
            <div className="pack-manager__pack-meta">
              {pack.packItems?.length || 0} levels
              {pack.isPinned && <span className="pack-manager__pack-pinned">📌</span>}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

  const renderFolder = (folder, index) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderPacks = packsByFolder[folder.id] || [];

    return (
      <Draggable key={folder.id} draggableId={`folder-${folder.id}`} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`pack-manager__folder ${snapshot.isDragging ? 'dragging' : ''}`}
          >
            <PackFolder
              folder={folder}
              isExpanded={isExpanded}
              canEdit={true}
              onToggleExpand={toggleFolderExpansion}
              onRename={renameFolder}
              onDelete={deleteFolder}
              {...provided.dragHandleProps}
            >
              <Droppable droppableId={folder.id.toString()} type="pack">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`pack-manager__folder-dropspace ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                  >
                    {folderPacks.map((pack, packIndex) => 
                      renderPackItem(pack, packIndex, folder.id)
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </PackFolder>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="pack-manager">
      <div className="pack-manager__header">
        <h3 className="pack-manager__title">My Packs</h3>
        <div className="pack-manager__actions">
          <button
            className="pack-manager__action-btn"
            onClick={() => setShowCreateFolder(true)}
            title="Create Folder"
          >
            <FolderIcon size={16} />
          </button>
          <button
            className="pack-manager__action-btn"
            onClick={onCreatePack}
            title="Create Pack"
          >
            <PlusIcon size={16} />
          </button>
        </div>
      </div>

      {showCreateFolder && (
        <div className="pack-manager__create-folder">
          <input
            ref={createFolderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Folder name"
            autoFocus
            maxLength={100}
          />
          <button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
            Create
          </button>
          <button onClick={() => {
            setNewFolderName('');
            setShowCreateFolder(false);
          }}>
            Cancel
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="pack-manager__content">
          <Droppable droppableId="folders" type="folder">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="pack-manager__folders"
              >
                {sortedFolders.map(renderFolder)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <Droppable droppableId="root" type="pack">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`pack-manager__root-packs ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
              >
                {packsByFolder.root?.map((pack, index) => 
                  renderPackItem(pack, index, null)
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
};

export default PackManager;
