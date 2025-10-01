import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { ChevronIcon, FolderIcon, DragHandleIcon } from '@/components/common/icons';
import LevelCard from '../LevelCard/LevelCard';
import './PackItem.css';

const PackItem = ({ 
  item, 
  expandedFolders,
  onToggleExpanded, 
  canEdit, 
  isReordering,
  packId,
  user,
  onRenameFolder,
  onDeleteItem,
  depth = 0
}) => {
  const { t } = useTranslation();
  const isExpanded = expandedFolders?.has(item.id) || false;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: item.id,
    data: {
      type: item.type,
      parentId: item.parentId || null
    },
    disabled: !canEdit || isReordering
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // If it's a level item, just render the level card
  if (item.type === 'level') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`pack-item pack-item--level ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
      >
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            className="pack-item__drag-handle"
            title="Drag to reorder or move"
          >
            <DragHandleIcon />
          </div>
        )}
        <LevelCard
          level={item.referencedLevel}
          user={user}
          sortBy="RECENT"
          displayMode="normal"
          size="medium"
        />
      </div>
    );
  }

  // It's a folder item
  const childCount = item.children?.length || 0;

  return (
    <div className="pack-item__folder-container">
      <div
        ref={setNodeRef}
        style={style}
        className={`pack-item pack-item--folder ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
      >
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            className="pack-item__drag-handle"
            title="Drag to reorder or nest"
          >
            <DragHandleIcon />
          </div>
        )}
        
        <button
          className="pack-item__toggle"
          onClick={() => onToggleExpanded(item.id)}
          disabled={!canEdit && childCount === 0}
        >
          <ChevronIcon className={isExpanded ? 'expanded' : 'collapsed'} />
        </button>
        
        <div className="pack-item__icon">
          <FolderIcon />
        </div>
        
        <div className="pack-item__info">
          <div className="pack-item__name">{item.name}</div>
          <div className="pack-item__count">
            {childCount} {childCount === 1 ? 'item' : 'items'}
          </div>
        </div>

        {canEdit && (
          <div className="pack-item__actions">
            <button
              className="pack-item__action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRenameFolder?.(item);
              }}
              title="Rename folder"
            >
              ✏️
            </button>
            <button
              className="pack-item__action-btn pack-item__action-btn--delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem?.(item);
              }}
              title="Delete folder"
              disabled={childCount > 0}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      
      {/* Render folder contents when expanded */}
      {isExpanded && (
        <FolderDropZone
          folderId={item.id}
          children={item.children}
          expandedFolders={expandedFolders}
          onToggleExpanded={onToggleExpanded}
          canEdit={canEdit}
          isReordering={isReordering}
          packId={packId}
          user={user}
          onRenameFolder={onRenameFolder}
          onDeleteItem={onDeleteItem}
          depth={depth}
        />
      )}
    </div>
  );
};

// Separate component for folder drop zone
const FolderDropZone = ({
  folderId,
  children = [],
  expandedFolders,
  onToggleExpanded,
  canEdit,
  isReordering,
  packId,
  user,
  onRenameFolder,
  onDeleteItem,
  depth
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folderId}`,
    data: {
      type: 'folder-container',
      parentId: folderId
    }
  });

  const sortedChildren = children ? [...children].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <div
      ref={setNodeRef}
      className={`pack-item__contents ${isOver ? 'dragging-over' : ''} ${!children || children.length === 0 ? 'empty' : ''}`}
    >
      {sortedChildren.length > 0 ? (
        <>
          {sortedChildren.map((childItem) => (
            <PackItem
              key={childItem.id}
              item={childItem}
              expandedFolders={expandedFolders}
              onToggleExpanded={onToggleExpanded}
              canEdit={canEdit}
              isReordering={isReordering}
              packId={packId}
              user={user}
              onRenameFolder={onRenameFolder}
              onDeleteItem={onDeleteItem}
              depth={depth + 1}
            />
          ))}
        </>
      ) : (
        <div className="pack-item__contents-empty">
          Drop items here
        </div>
      )}
    </div>
  );
};

export default PackItem;
