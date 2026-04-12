import React from 'react';
import './ziplevelfileslist.css';

/**
 * Stable key for a chart entry (matches server select-level matching: fullPath, relativePath, or name).
 */
export function zipLevelFileKey(file) {
  if (!file || typeof file !== 'object') {
    return '';
  }
  return String(file.fullPath || file.relativePath || file.name || '').trim();
}

/**
 * Shared list of .adofai charts inside a zip (level upload management, submission zip picker).
 */
const ZipLevelFilesList = ({
  levelFiles,
  selectedKey,
  onSelectKey,
  targetKey,
  className = '',
  selectionDisabled = false,
}) => {
  if (!Array.isArray(levelFiles) || levelFiles.length === 0) {
    return null;
  }

  return (
    <div
      className={`zip-level-files-list${selectionDisabled ? ' zip-level-files-list--selection-disabled' : ''} ${className}`.trim()}
    >
      {levelFiles.map((file) => {
        const key = zipLevelFileKey(file);
        const rowKey = key || `idx-${file.name}-${file.size}`;
        const isSelected = selectedKey && key && selectedKey === key;
        const isTarget = targetKey && key && targetKey === key;
        return (
          <div
            key={rowKey}
            role="button"
            tabIndex={0}
            className={`zip-level-files-list__item${isSelected ? ' zip-level-files-list__item--selected' : ''}${
              isTarget ? ' zip-level-files-list__item--target' : ''
            }`}
            onClick={() => !selectionDisabled && key && onSelectKey?.(key)}
            onKeyDown={(e) => {
              if (selectionDisabled) {
                return;
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (key) {
                  onSelectKey?.(key);
                }
              }
            }}
          >
            <div className="zip-level-files-list__name">{file.name}</div>
            {key ? (
              <div className="zip-level-files-list__path">{key}</div>
            ) : null}
            <div className="zip-level-files-list__meta">
              {typeof file.size === 'number' ? (
                <span>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
              ) : null}
              {file.hasYouTubeStream ? <span>Has YouTube Stream</span> : null}
              {file.songFilename ? <span>Song: {file.songFilename}</span> : null}
              {file.artist ? <span>Artist: {file.artist}</span> : null}
              {file.author ? <span>Author: {file.author}</span> : null}
              {file.difficulty ? <span>Difficulty: {file.difficulty}</span> : null}
              {typeof file.bpm === 'number' ? <span>BPM: {file.bpm.toFixed(2)}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ZipLevelFilesList;
