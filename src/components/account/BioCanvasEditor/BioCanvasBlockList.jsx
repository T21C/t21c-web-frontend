import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { BLOCK_TYPE_LABELS } from "./blockEditors/index.js";

const DROPPABLE_ID = "bio-canvas-blocks";

export default function BioCanvasBlockList({
  blocks,
  selectedBlockId,
  onSelectBlockId,
  onReorderBlocks,
  onRemoveBlock,
  onAddBlock,
}) {
  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;
    onReorderBlocks(source.index, destination.index);
  };

  return (
    <div className="bio-canvas-editor__block-list">
      <div className="bio-canvas-editor__block-list-head">
        <span className="bio-canvas-editor__block-list-label">Blocks ({blocks.length})</span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={DROPPABLE_ID}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="bio-canvas-editor__blocks">
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={[
                        "bio-canvas-editor__block-item",
                        selectedBlockId === block.id ? "bio-canvas-editor__block-item--selected" : "",
                        snapshot.isDragging ? "bio-canvas-editor__block-item--dragging" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <button
                        type="button"
                        className="bio-canvas-editor__block-select"
                        onClick={() => onSelectBlockId(block.id)}
                      >
                        {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                      </button>
                      <span {...dragProvided.dragHandleProps} className="bio-canvas-editor__drag-handle" aria-hidden="true">
                        ⋮⋮
                      </span>
                      <button
                        type="button"
                        className="bio-canvas-editor__block-remove"
                        onClick={() => onRemoveBlock(block.id)}
                        aria-label="Remove block"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="bio-canvas-editor__add-menu">
        {Object.entries(BLOCK_TYPE_LABELS).map(([type, label]) => (
          <button key={type} type="button" className="btn-fill-secondary bio-canvas-editor__add-btn" onClick={() => onAddBlock(type)}>
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}
