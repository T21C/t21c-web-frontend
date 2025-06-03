import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FixedCropper, CircleStencil, ImageRestriction } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import './ProfilePicturePopup.css';

const ProfilePicturePopup = ({ isOpen, onClose, onSave, currentAvatar, initialImage }) => {
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rotation, setRotation] = useState(0);
    const fileInputRef = useRef(null);
    const cropperRef = useRef(null);
    const rotationTimerRef = useRef(null);
    const pendingRotationRef = useRef(0);
    const lastAppliedRotationRef = useRef(0);

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

    // Reset rotation when popup opens
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

    // Polling timer for rotation changes
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

    // Keyboard controls for rotation
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

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
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
            const canvas = cropperRef.current.getCanvas();
            if (!canvas) {
                throw new Error('Failed to get canvas');
            }

            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            
            // Create file from blob
            const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
            
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
        <div className="profile-picture-popup-overlay">
            <div className="profile-picture-popup">
                <div className="profile-picture-popup-header">
                    <h2>Edit Profile Picture</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="profile-picture-popup-content">
                    <div className="cropper-container">
                        {image ? (
                            <FixedCropper
                                ref={cropperRef}
                                src={image}
                                className="cropper"
                                stencilComponent={CircleStencil}
                                stencilProps={{
                                    // Stencil appearance settings
                                    className: 'stencil',
                                    lines: true,
                                    handlers: false,
                                    // Stencil behavior settings
                                    movable: false,
                                    resizable: false,
                                    aspectRatio: 1,
                                }}
                                // Fixed size for the stencil in pixels
                                stencilSize={{
                                    width: 300,
                                    height: 300
                                }}
                                // Image behavior settings
                                imageRestriction={ImageRestriction.stencil}
                                moveImage={{
                                    disabled: false,
                                }}
                                rotateImage={{
                                    disabled: false,
                                }}
                                zoomImage={{
                                    disabled: false,
                                }}
                                // Auto features
                                autoZoom={true}
                                transitions={{duration: 200, timingFunction: 'ease-out'}}
                            />
                        ) : (
                            <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                                <i className="fas fa-cloud-upload-alt"></i>
                                <span>Click to upload image</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-picture-popup-footer">
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
                            className="save-button" 
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

export default ProfilePicturePopup; 