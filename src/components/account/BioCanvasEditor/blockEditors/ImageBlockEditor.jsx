import { useCallback, useRef } from "react";
import { CustomSelect } from "@/components/common/selectors";
import {
  IMAGE_CROP_FITS,
  normalizeImageCrop,
} from "@/utils/bioCanvas/blocks/image.js";

const FIT_OPTIONS = IMAGE_CROP_FITS.map((fit) => ({
  value: fit,
  label: fit === "cover" ? "Cover (crop)" : "Contain (full image)",
}));

function clampFocal(value) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function ImageBlockEditor({
  block,
  onPatchData,
  onSelectImage,
  previewUrl,
  onResetCrop,
  onFitToContainer,
}) {
  const crop = normalizeImageCrop(block.data?.crop);
  const dragRef = useRef(null);
  const selectedFit = FIT_OPTIONS.find((option) => option.value === crop.fit) ?? FIT_OPTIONS[0];

  const patchCrop = useCallback(
    (patch) => {
      onPatchData({ crop: { ...crop, ...patch } });
    },
    [crop, onPatchData],
  );

  const handlePointerDown = (ev) => {
    if (!previewUrl) return;
    ev.preventDefault();
    dragRef.current = {
      startX: ev.clientX,
      startY: ev.clientY,
      focalX: crop.focalX,
      focalY: crop.focalY,
      rect: ev.currentTarget.getBoundingClientRect(),
    };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };

  const handlePointerMove = (ev) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ev.clientX - drag.startX;
    const dy = ev.clientY - drag.startY;
    const scaleX = (dx / drag.rect.width) * 100;
    const scaleY = (dy / drag.rect.height) * 100;
    patchCrop({
      focalX: clampFocal(drag.focalX - scaleX),
      focalY: clampFocal(drag.focalY - scaleY),
    });
  };

  const handlePointerUp = (ev) => {
    dragRef.current = null;
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bio-canvas-editor__fields">
      {previewUrl ? (
        <>
          <div
            className="bio-canvas-editor__crop-preview"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              className="bio-canvas-editor__crop-preview-image"
              src={previewUrl}
              alt=""
              draggable={false}
              style={{
                objectFit: crop.fit,
                objectPosition: `${crop.focalX}% ${crop.focalY}%`,
                transform: `scale(${crop.zoom})`,
                transformOrigin: `${crop.focalX}% ${crop.focalY}%`,
              }}
            />
          </div>
          <p className="bio-canvas-editor__hint">Drag the preview to adjust crop position.</p>
          <label className="bio-canvas-editor__field">
            <span>Zoom ({crop.zoom.toFixed(1)}x)</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={crop.zoom}
              onChange={(ev) => patchCrop({ zoom: Number(ev.target.value) })}
            />
          </label>
          <div className="bio-canvas-editor__field">
            <span>Fit</span>
            <CustomSelect
              options={FIT_OPTIONS}
              value={selectedFit}
              onChange={(option) => patchCrop({ fit: option.value })}
              width="100%"
              backgroundColor="var(--color-black-t40)"
              isSearchable={false}
            />
          </div>
          <div className="bio-canvas-editor__crop-actions">
            <button
              type="button"
              className="btn-fill-neutral"
              onClick={() => onResetCrop?.()}
            >
              Reset crop
            </button>
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={() => onFitToContainer?.()}
            >
              Fit to container
            </button>
          </div>
        </>
      ) : (
        <p className="bio-canvas-editor__hint">No image uploaded yet.</p>
      )}
      <button type="button" className="btn-fill-secondary" onClick={onSelectImage}>
        {previewUrl ? "Replace image" : "Upload image"}
      </button>
      <label className="bio-canvas-editor__field">
        <span>Alt text</span>
        <input
          type="text"
          value={block.data?.alt ?? ""}
          maxLength={200}
          onChange={(ev) => onPatchData({ alt: ev.target.value })}
        />
      </label>
    </div>
  );
}
