// tuf-search: #ImageSelectorPopup #imageSelectorPopup #selectors #imageSelector
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import CropperJS from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { SuperImageCropper } from 'super-image-cropper';
import './ImageSelectorPopup.css';
import { CDN_IMAGE_ACCEPT, isCdnSupportedImageMimeType } from '@/constants/cdnImageAccept';
import { Trans, useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { CloseButton } from '@/components/common/buttons';

const ROTATION_HINT_TOOLTIP_ID = 'image-selector-rotation-hint';

const rotationTooltipTransComponents = {
    p: <p />,
    strong: <strong />,
    em: <em />,
    kbd: <kbd />,
    br: <br />,
};

/** True when `src` is an animated/static GIF (CropperJS + SuperImageCropper export path). */
export function isGifImageSrc(src) {
    if (!src || typeof src !== 'string') return false;
    if (src.startsWith('data:image/gif')) return true;
    const path = src.split('?')[0].toLowerCase();
    return path.endsWith('.gif');
}

const ImageSelectorPopup = ({
    isOpen,
    onClose,
    onSave,
    currentAvatar,
    initialImage,
    mode = 'avatar',
    title,
    outputMimeType = 'image/jpeg',
    outputQuality = 0.95,
    outputMaxWidth,
    outputMaxHeight,
    outputFileName,
    /** `'fixed'` = fixed aspect banner (50/9). `'basic'` = free-aspect banner crop box. */
    cropperVariant = 'fixed',
}) => {
    const { t } = useTranslation('common');
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [cropperReady, setCropperReady] = useState(false);
    const fileInputRef = useRef(null);
    const cropImageRef = useRef(null);
    const popupShellRef = useRef(null);
    const cropperInstanceRef = useRef(null);
    const rotationTimerRef = useRef(null);
    const pendingRotationRef = useRef(0);
    const lastAppliedRotationRef = useRef(0);

    const isBanner = mode === 'banner';
    const useBasicCropper = cropperVariant === 'basic' && isBanner;
    const fixedAspect = isBanner && !useBasicCropper ? 50 / 9 : 1;

    const popupTitle = title ?? (isBanner ? 'Edit Banner' : 'Edit Profile Picture');
    const resolvedFileName = outputFileName ?? (isBanner ? 'banner.jpg' : 'profile.jpg');

    const isGif = Boolean(image && isGifImageSrc(image));

    const gifOutputFileName = useMemo(() => {
        if (outputFileName?.toLowerCase().endsWith('.gif')) return outputFileName;
        return isBanner ? 'banner.gif' : 'profile.gif';
    }, [outputFileName, isBanner]);

    const getCropperJsOptions = useCallback(() => {
        const base = {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.85,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        };
        if (isBanner && useBasicCropper) {
            return { ...base, autoCropArea: 1 };
        }
        if (isBanner && !useBasicCropper) {
            return { ...base, aspectRatio: fixedAspect };
        }
        return { ...base, aspectRatio: 1 };
    }, [isBanner, useBasicCropper, fixedAspect]);

    useEffect(() => {
        if (!image) {
            setCropperReady(false);
            return undefined;
        }

        const img = cropImageRef.current;
        if (!img) {
            setCropperReady(false);
            return undefined;
        }

        let cancelled = false;

        const boot = () => {
            if (cancelled || !cropImageRef.current) return;
            cropperInstanceRef.current?.destroy();
            cropperInstanceRef.current = null;
            const cropper = new CropperJS(cropImageRef.current, getCropperJsOptions());
            cropperInstanceRef.current = cropper;
            setCropperReady(true);
        };

        setCropperReady(false);
        cropperInstanceRef.current?.destroy();
        cropperInstanceRef.current = null;

        if (img.complete && img.naturalWidth) {
            boot();
        } else {
            img.addEventListener('load', boot, { once: true });
        }

        return () => {
            cancelled = true;
            img.removeEventListener('load', boot);
            cropperInstanceRef.current?.destroy();
            cropperInstanceRef.current = null;
            setCropperReady(false);
        };
    }, [image, getCropperJsOptions]);

    /**
     * CropperJS rotates the image around the canvas center. After each rotateTo,
     * pan the canvas so the crop stencil center remains the effective pivot (same
     * point under the crosshair as if rotation used transform-origin on the stencil).
     */
    const applyRotationToCropper = useCallback((newRotation) => {
        const crop = cropperInstanceRef.current;
        if (!crop) return;

        const imgData = crop.getImageData();
        const oldRotation = typeof imgData.rotate === 'number' ? imgData.rotate : 0;
        if (oldRotation === newRotation) {
            lastAppliedRotationRef.current = newRotation;
            return;
        }

        const canvasBefore = crop.getCanvasData();
        const cropBox = crop.getCropBoxData() || {};

        let tx = 0;
        let ty = 0;
        if (
            cropBox.width > 0 &&
            cropBox.height > 0 &&
            canvasBefore.width > 0 &&
            canvasBefore.height > 0
        ) {
            const ix = canvasBefore.left + canvasBefore.width / 2;
            const iy = canvasBefore.top + canvasBefore.height / 2;
            const sx = cropBox.left + cropBox.width / 2;
            const sy = cropBox.top + cropBox.height / 2;
            // create vector from crop box center to image center
            const vx = sx - ix;
            const vy = sy - iy;
            const rad = ((newRotation - oldRotation) * Math.PI) / 180;
            // calculate rotation matrix
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            // apply rotation matrix to vector
            const rvx = vx * cos - vy * sin;
            const rvy = vx * sin + vy * cos;
            // calculate difference between original vector and rotated vector
            tx = vx - rvx;
            ty = vy - rvy;
        }
        // rotate the cropper
        crop.rotateTo(newRotation);
        // apply diff translation
        if (tx !== 0 || ty !== 0) {
            const cAfter = crop.getCanvasData();
            crop.setCanvasData({
                left: cAfter.left + tx,
                top: cAfter.top + ty,
            });
        }

        lastAppliedRotationRef.current = newRotation;
    }, []);

    const resetRotation = useCallback(() => {
        setRotation(0);
        pendingRotationRef.current = 0;
        const crop = cropperInstanceRef.current;
        if (crop) {
            applyRotationToCropper(0);
        } else {
            lastAppliedRotationRef.current = 0;
        }
    }, [applyRotationToCropper]);

    React.useEffect(() => {
        if (initialImage) {
            setImage(initialImage);
            resetRotation();
        } else if (currentAvatar) {
            setImage(currentAvatar);
            resetRotation();
        }
    }, [currentAvatar, initialImage, resetRotation]);

    useEffect(() => {
        if (isOpen) {
            resetRotation();
        }
    }, [isOpen, resetRotation]);

    const applyRotation = useCallback((newRotation) => {
        applyRotationToCropper(newRotation);
    }, [applyRotationToCropper]);

    useEffect(() => {
        if (!image) return;

        const pollRotation = () => {
            if (pendingRotationRef.current !== lastAppliedRotationRef.current) {
                applyRotation(pendingRotationRef.current);
            }
        };

        rotationTimerRef.current = setInterval(pollRotation, 50);

        return () => {
            if (rotationTimerRef.current) {
                clearInterval(rotationTimerRef.current);
            }
        };
    }, [image, applyRotation]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!image || !cropperInstanceRef.current) return;

            const step = e.shiftKey && e.ctrlKey ? 1 : e.shiftKey ? 10 : 1;
            let newRotation = rotation;

            if (e.key === 'ArrowLeft') {
                newRotation = Math.max(-180, rotation - step);
            } else if (e.key === 'ArrowRight') {
                newRotation = Math.min(180, rotation + step);
            } else {
                return;
            }

            setRotation(newRotation);
            pendingRotationRef.current = newRotation;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [image, rotation]);

    useEffect(() => {
        if (!isOpen || !image) return undefined;
        const el = popupShellRef.current;
        if (!el) return undefined;

        const onWheel = (e) => {
            if (!e.shiftKey) return;
            if (!cropperInstanceRef.current) return;
            e.preventDefault();
            e.stopImmediatePropagation();

            let dy = e.deltaY;
            if (e.deltaMode === 1) dy *= 14;
            else if (e.deltaMode === 2) dy *= 22;

            const sensitivity = 0.08;
            const maxStep = e.ctrlKey ? 1 : 10;
            let delta = -dy * sensitivity;
            delta = Math.max(-maxStep, Math.min(maxStep, delta));

            setRotation((prev) => {
                const next = Math.max(-180, Math.min(180, Math.round(prev + delta)));
                pendingRotationRef.current = next;
                return next;
            });
        };

        el.addEventListener('wheel', onWheel, { capture: true, passive: false });
        return () => el.removeEventListener('wheel', onWheel, { capture: true });
    }, [isOpen, image]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!isCdnSupportedImageMimeType(file.type)) {
            toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, GIF, or SVG image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImage(reader.result);
            resetRotation();
        };
        reader.readAsDataURL(file);
    };

    const handleRotationChange = (e) => {
        const newRotation = parseInt(e.target.value, 10);
        setRotation(newRotation);
        pendingRotationRef.current = newRotation;
    };

    const handleSave = async () => {
        if (!cropperInstanceRef.current) return;

        setIsLoading(true);
        try {
            if (isGif) {
                const superIc = new SuperImageCropper();
                const out = await superIc.crop({
                    cropperInstance: cropperInstanceRef.current,
                    outputType: 'blob',
                });
                if (!(out instanceof Blob)) {
                    throw new Error('Unexpected crop output');
                }
                const file = new File([out], gifOutputFileName, { type: 'image/gif' });
                await onSave(file);
                onClose();
                return;
            }

            const canvasOpts = {};
            if (typeof outputMaxWidth === 'number' && outputMaxWidth > 0) {
                canvasOpts.maxWidth = outputMaxWidth;
            }
            if (typeof outputMaxHeight === 'number' && outputMaxHeight > 0) {
                canvasOpts.maxHeight = outputMaxHeight;
            }
            if (!isBanner && mode === 'avatar') {
                canvasOpts.rounded = true;
            }

            const canvas = cropperInstanceRef.current.getCroppedCanvas(canvasOpts);
            if (!canvas) {
                throw new Error('Failed to get cropped canvas');
            }

            const blob = await new Promise(resolve =>
                canvas.toBlob(resolve, outputMimeType, outputQuality),
            );

            const file = new File([blob], resolvedFileName, { type: outputMimeType });

            await onSave(file);
            onClose();
        } catch {
            toast.error('Failed to process image');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const avatarCircle = !isBanner && mode === 'avatar';

    return (
        <div
            ref={popupShellRef}
            className="image-selector-popup-overlay"
        >
            <div
                className={`image-selector-popup image-selector-popup--${mode}${useBasicCropper ? ' image-selector-popup--banner-basic' : ''}`}
            >
                <div className="image-selector-popup-header">
                    <h2>{popupTitle}</h2>
                    <CloseButton variant="inline" onClick={onClose} aria-label={t('buttons.close')} />
                </div>

                <div className="image-selector-popup-content">
                    <div
                        className={`cropper-container cropper-container--${mode}${useBasicCropper ? ' cropper-container--basic' : ''}`}
                    >
                        {image ? (
                            <div
                                className={`image-selector-popup__cropper-wrap${avatarCircle ? ' image-selector-popup__cropper-wrap--avatar-circle' : ''}`}
                            >
                                <img
                                    ref={cropImageRef}
                                    key={image}
                                    src={image}
                                    alt=""
                                    className="image-selector-popup__cropper-img"
                                    crossOrigin={image.startsWith('http') ? 'anonymous' : undefined}
                                />
                            </div>
                        ) : (
                            <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                                <i className="fas fa-cloud-upload-alt"></i>
                                <span>Click to upload image</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={CDN_IMAGE_ACCEPT}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="image-selector-popup-footer">
                    {image && (
                        <div className="rotation-control">
                            <Tooltip id={ROTATION_HINT_TOOLTIP_ID} place="top" noArrow className="image-selector-popup__rotation-tooltip">
                                <Trans
                                    ns="common"
                                    i18nKey="imageSelector.rotationHintTooltip"
                                    components={rotationTooltipTransComponents}
                                />
                            </Tooltip>
                            <label htmlFor="rotation">
                                Rotation: {rotation}°{' '}
                                <span
                                    className="rotation-hint"
                                    data-tooltip-id={ROTATION_HINT_TOOLTIP_ID}
                                    tabIndex={0}
                                    role="note"
                                >
                                    (Shift+wheel)
                                </span>
                            </label>
                            <input
                                type="range"
                                id="rotation"
                                min="-180"
                                max="180"
                                value={rotation}
                                onChange={handleRotationChange}
                                className="rotation-slider"
                            />
                        </div>
                    )}
                    <div className="footer-buttons">
                        <button className="cancel-button" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="save-button btn-fill-primary"
                            onClick={handleSave}
                            disabled={!image || isLoading || !cropperReady}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageSelectorPopup;
