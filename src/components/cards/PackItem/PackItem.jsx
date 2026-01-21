import React, { useMemo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import { ChevronIcon, FolderIcon, DragHandleIcon, DownloadIcon } from '@/components/common/icons';
import { summarizeFolderSize, formatEstimatedSize } from '@/utils/packDownloadUtils';

import LevelCard from '@/components/cards/LevelCard/LevelCard';
import './PackItem.css';
import { Tooltip } from 'react-tooltip';
// Registry for folder droppable elements - used for manual collision detection
if (typeof window !== 'undefined' && !window.__folderDroppables) {
  window.__folderDroppables = new Map();
}

// Reusable level item component for pack display
export const PackLevelItem = ({
  item,
  canEdit,
  isReordering,
  user,
  onDeleteItem,
  dragHandleProps
}) => {
  return (
    <LevelCard 
      packItem={item}
      displayMode="pack"
      user={user}
      canEdit={canEdit}
      isReordering={isReordering}
      onDeleteItem={onDeleteItem}
      dragHandleProps={dragHandleProps}
    />
  );
};

const PackItem = ({
  item,
  index,
  expandedFolders,
  onToggleExpanded,
  canEdit,
  isReordering,
  user,
  onRenameFolder,
  onDeleteItem,
  onDownloadFolder,
  depth = 0,
  // For renderClone support in nested Droppables
  allItems,
  findItemFn
}) => {
  const { t } = useTranslation();
  const isExpanded = expandedFolders?.has(item.id) || false;
  const childCount = item.children?.length || 0;
  const folderSizeSummary = useMemo(() => summarizeFolderSize(item), [item]);
  const folderSizeLabel = useMemo(() => formatEstimatedSize(folderSizeSummary), [folderSizeSummary]);
  const folderDownloadDisabled = folderSizeSummary.levelCount === 0;
  const downloadFolderLabel = t('pages:packDetail.actions.downloadFolder', 'Download Folder');
  const sortedChildren = useMemo(() => {
    if (!item.children) return [];
    return [...item.children].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [item.children]);

  if (item.type === 'level') {
    return (
      <Draggable 
        draggableId={`item-${item.id}`} 
        index={index}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`pack-item pack-item--level ${snapshot.isDragging ? 'dragging' : ''}`}
            style={provided.draggableProps.style}
          >
            <div className="pack-item__level-wrapper">
              <PackLevelItem
                item={item}
                canEdit={canEdit}
                isReordering={isReordering}
                user={user}
                onDeleteItem={onDeleteItem}
                dragHandleProps={provided.dragHandleProps}
              />
            </div>
          </div>
        )}
      </Draggable>
    );
  }

  return (
    <Draggable 
      draggableId={`item-${item.id}`} 
      index={index}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            zIndex: snapshot.isDragging ? 1000 : undefined
          }}
          className={`pack-item pack-item--folder ${snapshot.isDragging ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''}`}
        >
          <div className="pack-item__header">
            {canEdit && (
              <button
                type="button"
                className="pack-item__drag-handle"
                {...provided.dragHandleProps}
                title={t('pages:packDetail.items.dragToReorder', 'Drag to reorder')}
              >
                <DragHandleIcon />
              </button>
            )}
            <button
              type="button"
              className="pack-item__toggle"
              disabled={!canEdit && childCount === 0}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(item.id);
              }}
            >
              <ChevronIcon direction={isExpanded ? 'down' : 'right'} />
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

            <div className="pack-item__download">
              <button
                type="button"
                className="pack-item__download-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadFolder?.(item);
                }}
                disabled={folderDownloadDisabled || !user}
                data-tooltip-id="download-folder-tooltip"
                data-tooltip-content={
                  folderDownloadDisabled
                    ? 'No downloadable levels in this folder'
                    : !user
                      ? 'You must be logged in to download a folder'
                      : `${downloadFolderLabel} (${folderSizeLabel.sizeLabel}) ${folderSizeLabel.isEstimated ? folderSizeLabel.isEstimated : ''}`
                }
                data-tooltip-place="bottom"
              >
                <div className="pack-item__download-main">
                  <DownloadIcon color="#ffffff" size={"18px"} />
                  <span>{downloadFolderLabel}</span>
                </div>
                <span className="pack-item__download-size">
                  {folderSizeLabel.sizeLabel}{' '}
                  <span className="pack-item__download-size-estimated">
                    {folderSizeLabel.shortEstimated}
                  </span>
                </span>
              </button>
              <Tooltip id="download-folder-tooltip" place="bottom" noArrow />
            </div>

            {canEdit && (
              <div className="pack-item__actions">
                <button
                  type="button"
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
                  type="button"
                  className="pack-item__action-btn pack-item__action-btn--delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem?.(item);
                  }}
                  title="Delete folder"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          <Droppable 
            droppableId={`folder-${item.id}`} 
            type="ITEM"
            //isDropDisabled={snapshot.isDragging || !isExpanded}
            direction="vertical"
            renderClone={(provided, cloneSnapshot, rubric) => {
              // Find the item being dragged
              const draggedItemId = parseInt(rubric.draggableId.replace('item-', ''), 10);
              // Try to find item in children first, then in all items
              let draggedItem = sortedChildren.find(c => c.id === draggedItemId);
              if (!draggedItem && findItemFn && allItems) {
                draggedItem = findItemFn(allItems, draggedItemId);
              }
              
              if (draggedItem?.type === 'level') {
                return (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`pack-item pack-item--level dragging-clone ${cloneSnapshot.isDragging ? 'is-dragging' : ''}`}
                    style={{
                      ...provided.draggableProps.style,
                      zIndex: 9999,
                      opacity: 1,
                    }}
                  >
                    <div className="pack-item__level-wrapper">
                      <PackLevelItem
                        item={draggedItem}
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
              
              // Fallback for folders or unknown items
              return (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="pack-item pack-item--folder dragging-clone"
                  style={{
                    ...provided.draggableProps.style,
                    zIndex: 9999,
                    opacity: 1,
                  }}
                >
                  <div className="pack-item__header">
                    <div className="pack-item__icon">📁</div>
                    <div className="pack-item__info">
                      <div className="pack-item__name">{draggedItem?.name || 'Unknown'}</div>
                    </div>
                  </div>
                </div>
              );
            }}
          >
            {(droppableProvided, droppableSnapshot) => {
              // Register folder droppable element for manual collision detection
              const combinedRef = (el) => {
                droppableProvided.innerRef(el);
                if (el && isExpanded) {
                  window.__folderDroppables?.set(item.id, {
                    element: el,
                    folderId: item.id,
                    folderName: item.name,
                    childCount: sortedChildren.length
                  });
                } else {
                  window.__folderDroppables?.delete(item.id);
                }
              };
              
              return (
              <div
                ref={combinedRef}
                {...droppableProvided.droppableProps}
                className={`pack-item__children ${droppableSnapshot.isDraggingOver ? 'is-dragging-over' : ''} ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
              >
                {isExpanded &&
                  sortedChildren.map((child, childIndex) => (
                    <PackItem
                      key={child.id}
                      item={child}
                      index={childIndex}
                      depth={depth + 1}
                      expandedFolders={expandedFolders}
                      onToggleExpanded={onToggleExpanded}
                      canEdit={canEdit}
                      user={user}
                      onRenameFolder={onRenameFolder}
                      onDeleteItem={onDeleteItem}
                      onDownloadFolder={onDownloadFolder}
                      allItems={allItems}
                      findItemFn={findItemFn}
                    />
                  ))}
                {droppableProvided.placeholder}
              </div>
            );}}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
};

export default PackItem;
