import { useCallback, useEffect, useRef, useState } from "react";

function readStoredWidths(columns, storageKey) {
  if (!storageKey) {
    return columns.map((column) => column.defaultWidth);
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return columns.map((column) => column.defaultWidth);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== columns.length) {
      return columns.map((column) => column.defaultWidth);
    }

    return parsed.map((width, index) => {
      const column = columns[index];
      const minWidth = column.minWidth ?? 40;
      const fallback = column.defaultWidth;
      return Number.isFinite(width) ? Math.max(minWidth, width) : fallback;
    });
  } catch {
    return columns.map((column) => column.defaultWidth);
  }
}

/**
 * @param {Array<{ id: string, defaultWidth: number, minWidth?: number, resizable?: boolean }>} columns
 * @param {string | null} [storageKey]
 */
export function useResizableTableColumns(columns, storageKey = null) {
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const [columnWidths, setColumnWidths] = useState(() =>
    readStoredWidths(columns, storageKey),
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);

  useEffect(() => {
    setColumnWidths(readStoredWidths(columnsRef.current, storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    } catch {
      // ignore quota / private mode
    }
  }, [columnWidths, storageKey]);

  const stopResize = useCallback(() => {
    resizeRef.current = null;
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const onMove = useCallback((event) => {
    const active = resizeRef.current;
    if (!active) return;

    const clientX = event.touches?.[0]?.clientX ?? event.clientX;
    const delta = clientX - active.startX;
    const column = columnsRef.current[active.index];
    const minWidth = column?.minWidth ?? 40;
    const nextWidth = Math.max(minWidth, active.startWidth + delta);

    setColumnWidths((prev) => {
      if (prev[active.index] === nextWidth) return prev;
      const next = [...prev];
      next[active.index] = nextWidth;
      return next;
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (event) => onMove(event);
    const handleTouchMove = (event) => onMove(event);
    const handleEnd = () => stopResize();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
      stopResize();
    };
  }, [onMove, stopResize]);

  const startResize = useCallback(
    (index, event) => {
      const column = columnsRef.current[index];
      if (!column?.resizable) return;

      event.preventDefault();
      event.stopPropagation();

      const clientX = event.touches?.[0]?.clientX ?? event.clientX;
      resizeRef.current = {
        index,
        startX: clientX,
        startWidth: columnWidths[index],
      };
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths],
  );

  return {
    columnWidths,
    isResizing,
    startResize,
  };
}
