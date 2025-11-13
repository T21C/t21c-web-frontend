import React, { useMemo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import { ChevronIcon, FolderIcon, DragHandleIcon, DownloadIcon } from '@/components/common/icons';
import { summarizeFolderSize, formatEstimatedSize } from '@/utils/packDownloadUtils';

import LevelCard from '@/components/cards/LevelCard/LevelCard';
import './PackItem.css';

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

const INDENT_REM = 1.5;

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
  depth = 0
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
        isDragDisabled={!canEdit || isReordering}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`pack-item pack-item--level ${snapshot.isDragging ? 'dragging' : ''}`}
            style={provided.draggableProps.style}
            data-depth={depth}
          >
            <div
              className="pack-item__level-wrapper"
            >
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
      isDragDisabled={!canEdit || isReordering}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            marginLeft: 0
          }}
          className={`pack-item pack-item--folder ${snapshot.isDragging ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''}`}
          data-depth={depth}
          data-folder-id={item.id}
        >
          <div
            className="pack-item__header"
          >
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
                disabled={folderDownloadDisabled}
                title={
                  folderDownloadDisabled
                    ? 'No downloadable levels in this folder'
                    : `${downloadFolderLabel} (${folderSizeLabel.sizeLabel}) ${folderSizeLabel.isEstimated ? folderSizeLabel.isEstimated : ''}`
                }
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
          >
            {(droppableProvided, droppableSnapshot) => (
              <div
                ref={droppableProvided.innerRef}
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
                      isReordering={isReordering}
                      user={user}
                      onRenameFolder={onRenameFolder}
                      onDeleteItem={onDeleteItem}
                      onDownloadFolder={onDownloadFolder}
                    />
                  ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
};

export default PackItem;
