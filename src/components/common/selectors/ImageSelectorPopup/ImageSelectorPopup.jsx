import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Cropper, FixedCropper, CircleStencil, RectangleStencil, ImageRestriction } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import './ImageSelectorPopup.css';
import { CDN_IMAGE_ACCEPT, isCdnSupportedImageMimeType } from '@/constants/cdnImageAccept';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';

const DEFAULT_AVATAR_STENCIL_SIZE = { width: 300, height: 300 };
/** Matches server `BANNER` image validator loose bounds. */
const BANNER_FREE_MIN_ASPECT = 0.01;
const BANNER_FREE_MAX_ASPECT = 100;

function computeStencilSize(mode, aspect) {
    if (mode !== 'banner') return DEFAULT_AVATAR_STENCIL_SIZE;
    const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const BANNER_STENCIL_BASE_WIDTH = 500;
    const BANNER_STENCIL_BASE_HEIGHT = 240;
    const widthFromHeight = BANNER_STENCIL_BASE_HEIGHT * a;
    if (widthFromHeight <= BANNER_STENCIL_BASE_WIDTH) {
        return { width: Math.round(widthFromHeight), height: BANNER_STENCIL_BASE_HEIGHT };
    }
    return { width: BANNER_STENCIL_BASE_WIDTH, height: Math.round(BANNER_STENCIL_BASE_WIDTH / a) };
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
    /** `'fixed'` = FixedCropper (avatar). `'basic'` = Cropper with free-aspect movable/resizable stencil (banner). */
    cropperVariant = 'fixed',
}) => {
    const { t } = useTranslation('common');
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rotation, setRotation] = useState(0);
    const fileInputRef = useRef(null);
    const cropperRef = useRef(null);
    const rotationTimerRef = useRef(null);
    const pendingRotationRef = useRef(0);
    const lastAppliedRotationRef = useRef(0);

    const isBanner = mode === 'banner';
    const useBasicCropper = cropperVariant === 'basic' && isBanner;
    const stencilComponent = isBanner ? RectangleStencil : CircleStencil;

    /** FixedCropper only: 1 for avatar circle; wide default if a fixed banner path is ever used. */
    const fixedAspect = isBanner && !useBasicCropper ? 50 / 9 : 1;

    const stencilSize = useMemo(
        () => computeStencilSize(mode, fixedAspect),
        [mode, fixedAspect],
    );

    const sharedTransitions = { duration: 200, timingFunction: 'ease-out' };

    const popupTitle = title ?? (isBanner ? 'Edit Banner' : 'Edit Profile Picture');
    const resolvedFileName = outputFileName ?? (isBanner ? 'banner.jpg' : 'profile.jpg');

    const resetRotation = useCallback(() => {
        setRotation(0);
        pendingRotationRef.current = 0;
        lastAppliedRotationRef.current = 0;
        if (cropperRef.current) {
            cropperRef.current.rotateImage(-cropperRef.current.getState()?.transforms?.rotate || 0);
        }
    }, []);

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
        if (!cropperRef.current) return;

        const currentRotation = cropperRef.current.getState()?.transforms?.rotate || 0;
        cropperRef.current.rotateImage(newRotation - currentRotation);
        lastAppliedRotationRef.current = newRotation;
    }, []);

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
            if (!image || !cropperRef.current) return;

            const step = e.shiftKey ? 10 : 1;
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
        const newRotation = parseInt(e.target.value);
        setRotation(newRotation);
        pendingRotationRef.current = newRotation;
    };

    const handleSave = async () => {
        if (!cropperRef.current) return;

        setIsLoading(true);
        try {
            const canvasOptions = {};
            if (typeof outputMaxWidth === 'number' && outputMaxWidth > 0) {
                canvasOptions.maxWidth = outputMaxWidth;
            }
            if (typeof outputMaxHeight === 'number' && outputMaxHeight > 0) {
                canvasOptions.maxHeight = outputMaxHeight;
            }
            const canvas = Object.keys(canvasOptions).length
                ? cropperRef.current.getCanvas(canvasOptions)
                : cropperRef.current.getCanvas();
            if (!canvas) {
                throw new Error('Failed to get canvas');
            }

            const blob = await new Promise(resolve =>
                canvas.toBlob(resolve, outputMimeType, outputQuality),
            );

            const file = new File([blob], resolvedFileName, { type: outputMimeType });

            await onSave(file);
            onClose();
        } catch (error) {
            toast.error('Failed to process image');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="image-selector-popup-overlay">
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
                            useBasicCropper ? (
                                <Cropper
                                    ref={cropperRef}
                                    src={image}
                                    className="cropper"
                                    stencilComponent={RectangleStencil}
                                    stencilProps={{
                                        className: 'stencil',
                                        lines: true,
                                        handlers: true,
                                        movable: true,
                                        resizable: true,
                                        minAspectRatio: BANNER_FREE_MIN_ASPECT,
                                        maxAspectRatio: BANNER_FREE_MAX_ASPECT,
                                    }}
                                    imageRestriction={ImageRestriction.fitArea}
                                    minWidth={48}
                                    minHeight={48}
                                    moveImage={{ disabled: false }}
                                    rotateImage={{ disabled: false }}
                                    zoomImage={{ disabled: false }}
                                    transitions={sharedTransitions}
                                />
                            ) : (
                                <FixedCropper
                                    ref={cropperRef}
                                    src={image}
                                    className="cropper"
                                    stencilComponent={stencilComponent}
                                    stencilProps={{
                                        className: 'stencil',
                                        lines: true,
                                        handlers: false,
                                        movable: false,
                                        resizable: false,
                                        aspectRatio: fixedAspect,
                                    }}
                                    stencilSize={stencilSize}
                                    imageRestriction={ImageRestriction.stencil}
                                    moveImage={{ disabled: false }}
                                    rotateImage={{ disabled: false }}
                                    zoomImage={{ disabled: false }}
                                    autoZoom={true}
                                    transitions={sharedTransitions}
                                />
                            )
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
                            <label htmlFor="rotation">Rotation: {rotation}°</label>
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
                            disabled={!image || isLoading}
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
