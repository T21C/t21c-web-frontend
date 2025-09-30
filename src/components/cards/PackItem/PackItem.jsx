import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { ChevronIcon, FolderIcon, DragHandleIcon } from '@/components/common/icons';
import LevelCard from '../LevelCard/LevelCard';
import './PackItem.css';

const PackItem = ({ 
  item, 
  index, 
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

  // If it's a level item, just render the level card
  if (item.type === 'level') {
    return (
      <Draggable
        key={`item-${item.id}`}
        draggableId={`item-${packId}-${item.id}`}
        index={index}
        isDragDisabled={!canEdit || isReordering}
        disableInteractiveElementBlocking={true}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`pack-item pack-item--level ${snapshot.isDragging ? 'dragging' : ''} ${isReordering ? 'reordering' : ''} ${snapshot.combineTargetFor ? 'combine-target' : ''}`}
          >
            {canEdit && (
              <div
                {...provided.dragHandleProps}
                className="pack-item__drag-handle"
                title="Drag to reorder or combine"
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
        )}
      </Draggable>
    );
  }

  // It's a folder item
  const childCount = item.children?.length || 0;

  return (
    <div className="pack-item pack-item--folder-wrapper">
      <Draggable
        key={`item-${item.id}`}
        draggableId={`item-${packId}-${item.id}`}
        index={index}
        isDragDisabled={!canEdit || isReordering}
        isCombineEnabled={!isExpanded}
        disableInteractiveElementBlocking={true}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`pack-item pack-item--folder ${snapshot.isDragging ? 'dragging' : ''} ${isReordering ? 'reordering' : ''} ${snapshot.combineTargetFor && !isExpanded ? 'combine-target' : ''}`}
          >
            {canEdit && (
              <div
                {...provided.dragHandleProps}
                className="pack-item__drag-handle"
                title="Drag to reorder or nest"
              >
                <DragHandleIcon />
              </div>
            )}
            
            <div className="pack-item__content">
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
          </div>
        )}
      </Draggable>
      
      {/* Render folder contents when expanded - OUTSIDE the draggable */}
      {isExpanded && (
        <Droppable
          droppableId={`folder-${packId}-${item.id}`}
          type="PACK_ITEM"
          isCombineEnabled={false}
          ignoreContainerClipping={false}
          direction="vertical"
        >
          {(droppableProvided, droppableSnapshot) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className={`pack-item__contents ${droppableSnapshot.isDraggingOver ? 'dragging-over' : ''} ${!item.children || item.children.length === 0 ? 'empty' : ''}`}
              style={{ 
                zIndex: 10 + depth
              }}
            >
              {item.children && item.children.length > 0 ? (
                item.children
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((childItem, childIndex) => (
                    <PackItem
                      key={childItem.id}
                      item={childItem}
                      index={childIndex}
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
                  ))
              ) : (
                <div className="pack-item__contents-empty">
                  Drop items here
                </div>
              )}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
};

export default PackItem;
