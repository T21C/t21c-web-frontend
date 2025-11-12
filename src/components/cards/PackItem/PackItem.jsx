import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { ChevronIcon, FolderIcon, DragHandleIcon, DownloadIcon } from '@/components/common/icons';
import { summarizeFolderSize, formatEstimatedSize } from '@/utils/packDownloadUtils';

import LevelCard from '@/components/cards/LevelCard/LevelCard';
import './PackItem.css';

// Reusable level item component for pack display
const PackLevelItem = ({
  item,
  canEdit,
  isReordering,
  packId,
  user,
  onDeleteItem,
  depth = 0,
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
  expandedFolders,
  onToggleExpanded,
  canEdit,
  isReordering,
  packId,
  user,
  onRenameFolder,
  onDeleteItem,
  onDownloadFolder,
  depth = 0,
  isFirstInFolder = false,
  isLastInFolder = false,
  parentId = null,
  siblingCount = 0
}) => {
  const { t } = useTranslation();
  const isExpanded = expandedFolders?.has(item.id) || false;
  const containerRef = useRef(null);
  const [backgroundHeight, setBackgroundHeight] = useState(0);

  // For first-in-folder items, calculate the height to span all siblings
  useEffect(() => {
    if (isFirstInFolder && containerRef.current && parentId !== null) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      const measureHeight = () => {
        if (!containerRef.current) return;
        
        let currentElement = containerRef.current;
        let totalHeight = 0;
        let siblingsFound = 0;
        
      while (currentElement && siblingsFound < siblingCount) {
        totalHeight += currentElement.offsetHeight;
        const nextSibling = currentElement.nextElementSibling;
        // Check if next sibling has same parent (same folder group)
        if (nextSibling && nextSibling.dataset.parentId === String(parentId)) {
          currentElement = nextSibling;
          siblingsFound++;
        } else {
          break;
        }
      }
        
        setBackgroundHeight(totalHeight);
      };
      
      requestAnimationFrame(measureHeight);
    }
  }, [isFirstInFolder, siblingCount, parentId, item.id, isReordering]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: item.id,
    data: {
      type: item.type,
      parentId: item.parentId || null
    },
    disabled: !canEdit || isReordering
  });

  // When dragging, don't apply transform to the original item (DragOverlay handles visual)
  // This prevents visual glitches and allows proper displacement of other items
  const style = isDragging 
    ? {} 
    : {
        transform: CSS.Transform.toString(transform),
        transition
      };

  // If it's a level item, use the new PackLevelItem component
  if (item.type === 'level') {
    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          containerRef.current = node;
        }}
        style={{
          ...style,
          marginLeft: `${depth * 1.5}rem`,  // Indent based on depth
          ...(isFirstInFolder && backgroundHeight && { '--background-height': `${backgroundHeight}px` })
        }}
        className={`pack-item pack-item--level ${isDragging ? 'dragging' : ''} ${isFirstInFolder ? 'first-in-folder' : ''} ${isLastInFolder ? 'last-in-folder' : ''}`}
        data-depth={depth}
        data-parent-id={parentId}
      >
        <PackLevelItem
          item={item}
          canEdit={canEdit}
          isReordering={isReordering}
          packId={packId}
          user={user}
          onDeleteItem={onDeleteItem}
          depth={depth}
          dragHandleProps={{ attributes, listeners }}
        />
      </div>
    );
  }

  // It's a folder item - just show the folder header, children are rendered separately in flat list
  const childCount = item.children?.length || 0;
  const folderSizeSummary = useMemo(() => summarizeFolderSize(item), [item]);
  const folderSizeLabel = useMemo(() => formatEstimatedSize(folderSizeSummary), [folderSizeSummary]);
  const folderDownloadDisabled = folderSizeSummary.levelCount === 0;
  const downloadFolderLabel = t('pages:packDetail.actions.downloadFolder', 'Download Folder');

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        containerRef.current = node;
      }}
      style={{
        ...style,
        marginLeft: `${depth * 1.5}rem`,  // Indent based on depth
        ...(isFirstInFolder && backgroundHeight && { '--background-height': `${backgroundHeight}px` })
      }}
      className={`pack-item pack-item--folder ${isDragging ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''} ${isFirstInFolder ? 'first-in-folder' : ''} ${isLastInFolder ? 'last-in-folder' : ''}`}
      data-depth={depth}
      data-parent-id={parentId}
      data-folder-id={item.id}
    >
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="pack-item__drag-handle pack-item__drag-handle--folder"
          title="Drag to reorder or nest"
        >
          <DragHandleIcon />
        </div>
      )}
      <button
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
            {folderSizeLabel.sizeLabel} <span className="pack-item__download-size-estimated">
              {folderSizeLabel.shortEstimated}
            </span>
          </span>
        </button>
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
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default PackItem;
