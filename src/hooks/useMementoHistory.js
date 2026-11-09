// tuf-search: #useMementoHistory #memento #undo #redo
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MAX_PAST = 100;

function parseSnapshot(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Two-stack JSON snapshot history. Past is capped; future is cleared on a new record.
 * `beginStep` / `endStep` coalesce a gesture into one past entry.
 */
export function useMementoHistory({ resetKey, maxPast = DEFAULT_MAX_PAST } = {}) {
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const suspendRef = useRef(false);
  const [historyDepth, setHistoryDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);

  useEffect(() => {
    historyRef.current = [];
    redoRef.current = [];
    suspendRef.current = false;
    setHistoryDepth(0);
    setRedoDepth(0);
  }, [resetKey]);

  const record = useCallback(
    (present) => {
      if (suspendRef.current) return;
      if (present == null) return;
      historyRef.current.push(JSON.stringify(present));
      if (historyRef.current.length > maxPast) historyRef.current.shift();
      setHistoryDepth(historyRef.current.length);
      if (redoRef.current.length) {
        redoRef.current = [];
        setRedoDepth(0);
      }
    },
    [maxPast],
  );

  const beginStep = useCallback(
    (present) => {
      if (suspendRef.current) return;
      record(present);
      suspendRef.current = true;
    },
    [record],
  );

  const endStep = useCallback(() => {
    suspendRef.current = false;
  }, []);

  const undo = useCallback((present) => {
    if (!historyRef.current.length) return null;
    const prevJson = historyRef.current.pop();
    setHistoryDepth(historyRef.current.length);
    if (present != null) {
      redoRef.current.push(JSON.stringify(present));
      setRedoDepth(redoRef.current.length);
    }
    return parseSnapshot(prevJson);
  }, []);

  const redo = useCallback((present) => {
    if (!redoRef.current.length) return null;
    const nextJson = redoRef.current.pop();
    setRedoDepth(redoRef.current.length);
    if (present != null) {
      historyRef.current.push(JSON.stringify(present));
      setHistoryDepth(historyRef.current.length);
    }
    return parseSnapshot(nextJson);
  }, []);

  return {
    record,
    beginStep,
    endStep,
    undo,
    redo,
    canUndo: historyDepth > 0,
    canRedo: redoDepth > 0,
  };
}

export function useMementoShortcuts({ enabled, undo, redo }) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
      if (!isUndo && !isRedo) return;

      const target = event.target;
      const isTextEntry =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTextEntry) return;

      event.preventDefault();
      if (isRedo) redo?.();
      else undo?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, undo, redo]);
}
