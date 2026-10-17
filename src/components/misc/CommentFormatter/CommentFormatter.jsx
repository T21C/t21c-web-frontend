// tuf-search: #CommentFormatter #commentFormatter
import React, { useEffect, useMemo, useState } from 'react';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { getSongDisplayName } from '@/utils/levelHelpers';
import {
  getLevelReferences,
  peekLevelReferences,
  splitCommentLevelRefs,
} from '@/utils/levelReferences';
import './commentFormatter.css';

const EMPTY_IDS = [];

export const CommentFormatter = ({ prefix = '#', resolveLevelRefs = false, children }) => {
  const textContent = React.Children.toArray(children).join('');
  const { difficultyDict } = useDifficultyContext();
  const { parts, ids: levelIds } = useMemo(() => {
    const split = splitCommentLevelRefs(textContent, prefix);
    if (!resolveLevelRefs) {
      return { parts: split.parts, ids: EMPTY_IDS };
    }
    return split.ids.length ? split : { parts: split.parts, ids: EMPTY_IDS };
  }, [textContent, prefix, resolveLevelRefs]);

  const [levelsById, setLevelsById] = useState(() =>
    resolveLevelRefs ? peekLevelReferences(levelIds) || {} : {}
  );

  useEffect(() => {
    if (!resolveLevelRefs || levelIds.length === 0) return undefined;
    const cached = peekLevelReferences(levelIds);
    if (cached) {
      setLevelsById(cached);
      return undefined;
    }
    let cancelled = false;
    getLevelReferences(levelIds).then((map) => {
      if (!cancelled) setLevelsById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [resolveLevelRefs, levelIds]);

  const renderLevelLink = (levelId, key) => {
    if (!resolveLevelRefs) {
      return (
        <a
          key={key}
          href={`${import.meta.env.VITE_OWN_URL}/levels/${levelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="level-link"
          onClick={(e) => e.stopPropagation()}
        >
          Level {levelId}
        </a>
      );
    }

    const level = levelsById[levelId];
    const song = level ? getSongDisplayName(level) : '';
    const diff = level?.diffId != null ? difficultyDict[level.diffId] : null;

    return (
      <a
        key={key}
        href={`${import.meta.env.VITE_OWN_URL}/levels/${levelId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="level-link level-ref"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="level-ref-id">#{levelId}</span>
        {diff?.icon && (
          <img
            className="level-ref-icon"
            src={selectIconSize(diff.icon, ICON_SIZE.SMALL)}
            alt={diff?.name || ''}
            referrerPolicy="no-referrer"
          />
        )}
        {song && <span className="level-ref-title">{song}</span>}
      </a>
    );
  };

  return (
    <div className="formatted-comment">
      {parts.map((part) =>
        typeof part === 'string' ? part : renderLevelLink(part.levelId, part.key)
      )}
    </div>
  );
};
