import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { ChevronIcon, FolderIcon, DragHandleIcon } from '@/components/common/icons';
import LevelCard from '../LevelCard/LevelCard';
import './PackFolder.css';

const PackFolder = ({ 
  folder, 
  index, 
  isExpanded, 
  onToggleExpanded, 
  canEdit, 
  isReordering,
  packId,
  user
}) => {
  const { t } = useTranslation();

  return (
    <Draggable
      key={`folder-${folder.id}`}
      draggableId={`folder-${packId}-${folder.id}`}
      index={index}
      isDragDisabled={!canEdit || isReordering}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`pack-folder ${snapshot.isDragging ? 'dragging' : ''} ${isReordering ? 'reordering' : ''} ${snapshot.combineTargetFor ? 'combine-target' : ''}`}
        >
          {canEdit && (
            <div
              {...provided.dragHandleProps}
              className="pack-folder__drag-handle"
              title={t('packDetail.folders.dragHint')}
            >
              <DragHandleIcon />
            </div>
          )}
          
          <div className="pack-folder__content">
            <button
              className="pack-folder__toggle"
              onClick={onToggleExpanded}
              disabled={!canEdit}
            >
              <ChevronIcon className={isExpanded ? 'expanded' : 'collapsed'} />
            </button>
            
            <div className="pack-folder__icon">
              <FolderIcon />
            </div>
            
            <div className="pack-folder__info">
              <div className="pack-folder__name">{folder.name}</div>
              <div className="pack-folder__count">
                {folder.packs?.length || 0} {t('packDetail.folders.items')}
              </div>
            </div>
          </div>
          
          {/* Render folder contents when expanded */}
          {isExpanded && folder.packs && folder.packs.length > 0 && (
            <div className="pack-folder__contents">
              {folder.packs.map((pack, packIndex) => (
                <div key={pack.id} className="pack-folder__pack">
                  <LevelCard
                    index={packIndex}
                    level={pack}
                    user={user}
                    sortBy="RECENT"
                    displayMode="normal"
                    size="small"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default PackFolder;