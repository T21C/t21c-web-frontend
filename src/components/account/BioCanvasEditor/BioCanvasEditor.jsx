import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import BioCanvasBlockList from "./BioCanvasBlockList.jsx";
import BioCanvasLayoutControls from "./BioCanvasLayoutControls.jsx";
import BioCanvasStage from "./BioCanvasStage.jsx";
import { getBlockDescriptor, collectBioCanvasBlockErrors } from "@/utils/bioCanvas";
import { getBlockEditor, BLOCK_TYPE_LABELS } from "./blockEditors/index.js";

export default function BioCanvasEditor({
  editor,
  selectedBlockId,
  onSelectBlockId,
}) {
  const { t } = useTranslation(["pages"]);
  const {
    workingCanvas,
    previewImageAssets,
    patchBlock,
    patchBlockData,
    patchLayout,
    reorderBlocks,
    removeBlock,
    addBlock,
    fileInputRef,
    selectImageFile,
    handleImageFileChange,
    resetImageCrop,
    fitImageToContainer,
  } = editor;

  const blocks = workingCanvas?.blocks ?? [];
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;
  const selectedDescriptor = selectedBlock ? getBlockDescriptor(selectedBlock.type) : null;
  const BlockEditor = selectedBlock ? getBlockEditor(selectedBlock.type) : null;

  const previewUrl = selectedBlock?.type === "image"
    ? previewImageAssets[selectedBlock.id]?.url
    : null;

  const validationErrors = useMemo(
    () => collectBioCanvasBlockErrors(workingCanvas),
    [workingCanvas],
  );

  return (
    <div className="bio-canvas-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={handleImageFileChange}
      />

      <div className="bio-canvas-editor__stage-panel">
        <h3 className="bio-canvas-editor__section-title">
          {t("settings.bioCanvas.stage", { defaultValue: "Canvas" })}
        </h3>
        <p className="bio-canvas-editor__hint">
          {t("settings.bioCanvas.stageHint", {
            defaultValue: "Drag blocks to position them. Use handles to resize.",
          })}
        </p>
        <BioCanvasStage
          canvas={workingCanvas}
          imageAssets={previewImageAssets}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={onSelectBlockId}
          onPatchLayout={patchLayout}
        />
        {validationErrors.length ? (
          <div className="bio-canvas-editor__validation-errors" role="alert">
            <p className="bio-canvas-editor__validation-title">
              {validationErrors.length === 1
                ? "Fix this issue before saving:"
                : `Fix ${validationErrors.length} issues before saving:`}
            </p>
            <ul className="bio-canvas-editor__validation-list">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="bio-canvas-editor__workspace">
        <BioCanvasBlockList
          blocks={blocks}
          imageAssets={previewImageAssets}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={onSelectBlockId}
          onReorderBlocks={reorderBlocks}
          onRemoveBlock={removeBlock}
          onAddBlock={(type) => {
            const id = addBlock(type);
            if (id) onSelectBlockId(id);
          }}
        />

        {selectedBlock ? (
          <div className="bio-canvas-editor__settings">
            <h3 className="bio-canvas-editor__section-title">
              {BLOCK_TYPE_LABELS[selectedBlock.type] ?? selectedBlock.type}
            </h3>
            <BioCanvasLayoutControls
              blockId={selectedBlock.id}
              layout={selectedBlock.layout}
              descriptor={selectedDescriptor}
              onChange={(layout) => patchLayout(selectedBlock.id, layout)}
            />
            {BlockEditor ? (
              <BlockEditor
                block={selectedBlock}
                onPatchData={(patch) => patchBlockData(selectedBlock.id, patch)}
                onSelectImage={() => selectImageFile(selectedBlock.id)}
                previewUrl={previewUrl}
                onResetCrop={
                  selectedBlock.type === "image"
                    ? () => resetImageCrop(selectedBlock.id)
                    : undefined
                }
                onFitToContainer={
                  selectedBlock.type === "image"
                    ? () => fitImageToContainer(selectedBlock.id)
                    : undefined
                }
              />
            ) : null}
          </div>
        ) : (
          <p className="bio-canvas-editor__hint">
            {t("settings.bioCanvas.selectBlock", { defaultValue: "Select a block to edit it." })}
          </p>
        )}
      </div>
    </div>
  );
}
