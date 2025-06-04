import React, { useState, useEffect } from 'react';
import './LevelSelectionPopup.css';
import { useTranslation } from 'react-i18next';

const LevelSelectionPopup = ({ levelFiles, onSelect, onClose }) => {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const { t } = useTranslation(['components']);
    const tSelection = (key, params = {}) => t(`levelSelection.${key}`, params);

    useEffect(() => {
        // Set the default selection to the largest file
        if (levelFiles.length > 0) {
            const largestFile = levelFiles.reduce((prev, current) => 
                (current.size > prev.size) ? current : prev
            );
            setSelectedLevel(largestFile.name);
        }
    }, [levelFiles]);

    const handleSubmit = () => {
        if (selectedLevel) {
            onSelect(selectedLevel);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="level-selection-popup-overlay">
            <div className="level-selection-popup">
                <h2>{tSelection('title')}</h2>
                <p>{tSelection('description')}</p>
                
                <div className="level-selection-list">
                    {levelFiles.map((file) => (
                        <div 
                            key={file.name}
                            className={`level-selection-item ${selectedLevel === file.name ? 'selected' : ''}`}
                            onClick={() => setSelectedLevel(file.name)}
                        >
                            <div className="level-selection-radio">
                                <input
                                    type="radio"
                                    name="levelFile"
                                    checked={selectedLevel === file.name}
                                    onChange={() => setSelectedLevel(file.name)}
                                />
                            </div>
                            <div className="level-selection-info">
                                <div className="level-selection-name">{file.name}</div>
                                <div className="level-selection-details">
                                    {file.songFilename && (
                                        <div className="level-selection-song">
                                            {tSelection('fileInfo.song', { song: file.songFilename })}
                                        </div>
                                    )}
                                    <div className="level-selection-size">
                                        {tSelection('fileInfo.size', { size: formatFileSize(file.size) })}
                                    </div>
                                    {file.hasYouTubeStream && (
                                        <div className="level-selection-youtube">
                                            {tSelection('fileInfo.youtube')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="level-selection-buttons">
                    <button 
                        className="level-selection-cancel"
                        onClick={onClose}
                    >
                        {tSelection('buttons.cancel')}
                    </button>
                    <button 
                        className="level-selection-submit"
                        onClick={handleSubmit}
                        disabled={!selectedLevel}
                    >
                        {tSelection('buttons.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LevelSelectionPopup; 