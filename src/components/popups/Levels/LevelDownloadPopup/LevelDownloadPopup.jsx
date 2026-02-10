import React, { useState, useEffect, useRef } from 'react';
import './LevelDownloadPopup.css';
import EnhancedSelect from './EnhancedSelect';
import { Tooltip } from 'react-tooltip';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '@/utils/zipUtils';

const LevelDownloadPopup = ({ isOpen, onClose, levelId, dlLink, legacyDllink, incrementAccessCount, metadata }) => {
    const { t } = useTranslation('components');
    const [step, setStep] = useState(1);
    const { user } = useAuth();
    const [selectionMode, setSelectionMode] = useState('drop'); // 'keep' or 'drop'
    const [availableFilters, setAvailableFilters] = useState([]);
    const [availableOptions, setAvailableOptions] = useState(null);
    const [isFileCorrupted, setIsFileCorrupted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isOversizedLevel, setIsOversizedLevel] = useState(false);
    const [transformOptions, setTransformOptions] = useState({
        keepEvents: [],
        dropEvents: [],
        baseCameraZoom: 1,
        constantBackgroundColor: '#000000',
        backgroundColorOpacity: 1,
        useCustomBackground: false,
        removeForegroundFlash: false,
        dropFilters: []
    });

    const popupRef = useRef(null);
    const fileId = dlLink.split('/').pop();

    // Fetch available options from the server
    useEffect(() => {
        if (!levelId || !fileId) return;

        const fetchTransformOptions = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_CDN_URL}/levels/transform-options?fileId=${fileId}`);
                
                if (response.status === 500) {
                    // File is missing/corrupted - show error without auto-downloading
                    setIsFileCorrupted(true);
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch transform options: ${response.status}`);
                }

                const data = await response.json();
                setAvailableOptions(data);
                setIsFileCorrupted(false);
                setIsOversizedLevel(!!data.transformUnavailable);
            } catch (error) {
                console.error('Error fetching transform options:', error);
                setIsFileCorrupted(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransformOptions();
    }, [levelId, fileId]);

    useEffect(() => {
        if (metadata?.transformUnavailable) {
            setIsOversizedLevel(true);
        }
    }, [metadata?.transformUnavailable]);

    // Handle scroll locking
    useEffect(() => {
        if (isOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }

        return () => {
            // Cleanup in case component unmounts while popup is open
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handleClickOutside = (event) => {
            // Check if click is on a dropdown
            const isDropdownClick = event.target.closest('.enhanced-select-dropdown');
            if (isDropdownClick) return;

            // Check if click is on a select header
            const isSelectHeaderClick = event.target.closest('.enhanced-select-header');
            if (isSelectHeaderClick) return;

            if (popupRef.current && !popupRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    useEffect(() => {
        if (!availableOptions) return;
        const basicToBeDropped = transformOptions.dropEvents.includes('SetFilter') && selectionMode === 'drop' 
        || !transformOptions.keepEvents.includes('SetFilter') && selectionMode === 'keep';
        
        const advancedToBeDropped = transformOptions.dropEvents.includes('SetFilterAdvanced') && selectionMode === 'drop' 
        || !transformOptions.keepEvents.includes('SetFilterAdvanced') && selectionMode === 'keep';

        const filters = [!basicToBeDropped ? availableOptions.filterTypes : [], !advancedToBeDropped ? availableOptions.advancedFilterTypes : []].flat();
        setAvailableFilters(filters);
        
    }, [transformOptions.dropEvents, transformOptions.keepEvents, availableOptions, selectionMode]);

    const handleSelectionChange = (selectedEvents) => {
        setTransformOptions(prev => ({
            ...prev,
            keepEvents: selectionMode === 'keep' ? selectedEvents : [],
            dropEvents: selectionMode === 'drop' ? selectedEvents : []
        }));
    };

    const handleDownload = (format) => {

        if (format === 'legacy' && legacyDllink) {
            window.location.href = legacyDllink;
            onClose();
            return;
        }

        incrementAccessCount();
        
        if (format === 'original') {
            window.location.href = dlLink;
            onClose();
            return;
        }

        // Build query string for transform options
        const queryParams = new URLSearchParams();
        if (selectionMode === 'keep') {
            queryParams.append('keepEvents', transformOptions.keepEvents.join(','));
        }
        if (selectionMode === 'drop') {
            queryParams.append('dropEvents', transformOptions.dropEvents.join(','));
        }
        if (transformOptions.baseCameraZoom !== 1) {
            queryParams.append('baseCameraZoom', transformOptions.baseCameraZoom);
        }
        if (transformOptions.useCustomBackground && transformOptions.constantBackgroundColor) {
            // Convert opacity to hex (0-255)
            const opacityHex = Math.round(transformOptions.backgroundColorOpacity * 255).toString(16).padStart(2, '0');
            queryParams.append('constantBackgroundColor', transformOptions.constantBackgroundColor.replace('#', '') + opacityHex);
        }
        if (transformOptions.removeForegroundFlash) {
            queryParams.append('removeForegroundFlash', 'true');
        }
        if (transformOptions.dropFilters.length > 0) {
            queryParams.append('dropFilters', transformOptions.dropFilters.join(','));
        }

        // Add format parameter
        queryParams.append('format', 'zip');

        // Download transformed level
        window.location.href = `${import.meta.env.VITE_CDN_URL}/levels/${fileId}/transform?${queryParams.toString()}`;
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <div className="level-download-popup">
            <div className="level-download-content" ref={popupRef}>
                <button 
                    className="close-popup-btn"
                    onClick={onClose}
                    aria-label={t('levelPopups.download.closePopup')}
                >
                    <svg 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path 
                            d="M6 6L18 18M6 18L18 6" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                        />
                    </svg>
                </button>

                <h2>{t('levelPopups.download.title')}</h2>
                
                {isFileCorrupted ? (
                    <div className="download-step error-state">
                        <div className="error-icon">⚠️</div>
                        <h3>{t('levelPopups.download.errors.corrupted')}</h3>
                        <p>{t('levelPopups.download.errors.fileMissing')}</p>
                        {hasFlag(user, permissionFlags.SUPER_ADMIN) && <p className="error-message">{t('levelPopups.download.errors.reupload')}</p>}
                        {!legacyDllink &&
                            <p className="no-backup-info">{t('levelPopups.download.errors.noBackup')}</p>
                        }
                        <div className="download-buttons">
                            <button onClick={onClose}>{t('levelPopups.download.close')}</button>
                            {legacyDllink && (
                                <button 
                                    className="legacy-download-btn"
                                    onClick={() => {
                                        window.location.href = legacyDllink;
                                        setTimeout(() => {
                                            onClose();
                                        }, 500);
                                    }}
                                >
                                    {t('levelPopups.download.errors.downloadLegacy')}
                                </button>
                            )}
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="download-step loading-state">
                        <p>{t('loading.generic', { ns: 'common' })}</p>
                    </div>
                ) : step === 1 ? (
                    <div className="download-step">
                        <p>{t('levelPopups.download.step1.prompt')}</p>
                        {(isOversizedLevel || metadata?.transformUnavailable) && (
                            <p className="level-download-popup__oversized-notice">
                                {t('levelPopups.download.oversizedNotice')}
                            </p>
                        )}
                        <div className="download-buttons">
                            <button onClick={() => handleDownload('original')}>
                                {t('levelPopups.download.step1.downloadOriginal')} ({formatFileSize(metadata?.originalZip?.size)})
                            </button>
                            {!(isOversizedLevel || metadata?.transformUnavailable) && (
                                <button onClick={() => setStep(2)}>
                                    {t('levelPopups.download.step1.convertDownload')}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="transform-step">
                        {availableOptions && (
                            <div className="transform-options">
                                <div className="selection-mode-toggle">
                                    <button 
                                        className={selectionMode === 'drop' ? 'active' : ''}
                                        onClick={() => setSelectionMode('drop')}
                                        data-tooltip-id='drop-events-tooltip'
                                    >
                                        {t('levelPopups.download.step2.dropEvents')}
                                    </button>
                                    <button 
                                        className={selectionMode === 'keep' ? 'active' : ''}
                                        onClick={() => setSelectionMode('keep')}
                                        data-tooltip-id='keep-events-tooltip'
                                    >
                                        {t('levelPopups.download.step2.keepEvents')}
                                    </button>
                                    <Tooltip id='drop-events-tooltip' place="bottom"> 
                                        {t('levelPopups.download.step2.tooltips.dropEvents')}
                                    </Tooltip>
                                    <Tooltip id='keep-events-tooltip' place="bottom">
                                        {t('levelPopups.download.step2.tooltips.keepEvents')}
                                    </Tooltip>
                                </div>

                                <div className="option-group">
                                    <EnhancedSelect
                                        options={availableOptions.eventTypes}
                                        value={selectionMode === 'keep' ? transformOptions.keepEvents : transformOptions.dropEvents}
                                        onChange={handleSelectionChange}
                                        searchField={"events"}
                                        placeholder={t(`levelPopups.download.step2.selectEventsPlaceholder.${selectionMode}`)}
                                    />
                                </div>

                                <div className="option-group">
                                    <label>{t('levelPopups.download.step2.cameraZoom')}</label>
                                    <input 
                                        type="number" 
                                        value={transformOptions.baseCameraZoom}
                                        onChange={(e) => setTransformOptions(prev => ({
                                            ...prev,
                                            baseCameraZoom: parseFloat(e.target.value)
                                        }))}
                                        step="0.1"
                                        min="0.1"
                                        max="10"
                                    />
                                </div>

                                <div className="option-group">
                                    <label>
                                        <input 
                                            type="checkbox"
                                            checked={transformOptions.useCustomBackground}
                                            onChange={(e) => setTransformOptions(prev => ({
                                                ...prev,
                                                useCustomBackground: e.target.checked
                                            }))}
                                        />
                                        {t('levelPopups.download.step2.customBackground')}
                                    </label>
                                    {transformOptions.useCustomBackground && (
                                        <div className="color-picker-group">
                                            <div className="color-selection">
                                                <label>{t('levelPopups.download.step2.color')}</label>
                                                <input 
                                                    type="color" 
                                                    value={transformOptions.constantBackgroundColor}
                                                    onChange={(e) => setTransformOptions(prev => ({
                                                        ...prev,
                                                        constantBackgroundColor: e.target.value
                                                    }))}
                                                />
                                                <div 
                                                    className="color-preview"
                                                    style={{
                                                        '--preview-color': transformOptions.constantBackgroundColor,
                                                        '--preview-opacity': transformOptions.backgroundColorOpacity
                                                    }}
                                                />
                                            </div>
                                            <div className="opacity-control">
                                                <label>{t('levelPopups.download.step2.opacity')}</label>
                                                <input 
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={transformOptions.backgroundColorOpacity}
                                                    onChange={(e) => setTransformOptions(prev => ({
                                                        ...prev,
                                                        backgroundColorOpacity: parseFloat(e.target.value)
                                                    }))}
                                                />
                                                <span>{Math.round(transformOptions.backgroundColorOpacity * 100)}%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="option-group">
                                    <label>
                                        <input 
                                            type="checkbox"
                                            checked={transformOptions.removeForegroundFlash}
                                            onChange={(e) => setTransformOptions(prev => ({
                                                ...prev,
                                                removeForegroundFlash: e.target.checked
                                            }))}
                                        />
                                        {t('levelPopups.download.step2.removeForegroundFlash')}
                                    </label>
                                </div>

                                {(
                                    <div className="option-group">
                                        <label>{t('levelPopups.download.step2.dropFilters')}</label>
                                        <EnhancedSelect
                                            options={availableFilters}
                                            value={transformOptions.dropFilters}
                                            onChange={(value) => setTransformOptions(prev => ({
                                                ...prev,
                                                dropFilters: value
                                            }))}
                                            position={"top"}
                                            searchField={"filters"}
                                            placeholder={t('levelPopups.download.step2.dropFiltersPlaceholder')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="transform-buttons">
                            <button onClick={() => setStep(1)}>{t('levelPopups.download.step2.back')}</button>
                            <button onClick={() => handleDownload('transformed')}>
                                {t('levelPopups.download.step2.downloadConverted')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LevelDownloadPopup; 