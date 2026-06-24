import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import {
  buildVirtualListFingerprint,
  buildVirtualListStoreKey,
  getVirtualListScrollState,
  setVirtualListScrollState,
} from './virtualListScrollStore';
import './virtuallist.css';

const defaultComputeItemKey = (index, item) => item?.id ?? index;

function VirtualListFooter({ hasMore, loader, endMessage, itemCount }) {
  if (hasMore) {
    return loader ? <div className="virtual-list__footer">{loader}</div> : null;
  }
  if (itemCount > 0 && endMessage) {
    return <div className="virtual-list__footer">{endMessage}</div>;
  }
  return null;
}

function chunkRows(items, columns) {
  if (columns <= 1) return items.map((item) => [item]);
  const rows = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}

/**
 * Windowed list/grid wrapper around react-virtuoso.
 *
 * Both list and grid modes use the standard `Virtuoso` component. Grid mode
 * packs `columns` items into each virtual row so rows size to their tallest
 * card — this avoids VirtuosoGrid's uniform-height requirement, which causes
 * scroll jitter/oscillation with variable-height cards.
 */
const VirtualList = ({
  items = [],
  renderItem,
  computeItemKey = defaultComputeItemKey,
  hasMore = false,
  loadMore,
  loader = null,
  endMessage = null,
  grid = false,
  listClassName = '',
  itemClassName = '',
  customScrollParent,
  loadingMore = false,
  overscan = 200,
  defaultItemHeight,
  style,
  className = '',
  stateKey = 'main',
  restoreScroll = true,
  minColumnWidth = 280,
  gap = 24,
}) => {
  const { pathname, search } = useLocation();
  const safeItems = items ?? [];
  const waitingForScrollParent = customScrollParent === null;

  const virtuosoRef = useRef(null);
  const containerRef = useRef(null);
  const storeKeyRef = useRef('');
  const fingerprintRef = useRef('0');

  const [columns, setColumns] = useState(1);

  // Measure available width and derive a responsive column count for grid mode.
  useLayoutEffect(() => {
    if (!grid) {
      setColumns(1);
      return undefined;
    }
    const el = containerRef.current;
    if (!el) return undefined;

    const measure = () => {
      const width = el.clientWidth;
      if (!width) return;
      const next = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
      setColumns((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [grid, gap, minColumnWidth]);

  const containerScroll = Boolean(customScrollParent);
  const storeKey = useMemo(
    () => buildVirtualListStoreKey(pathname, search, stateKey, grid, containerScroll),
    [pathname, search, stateKey, grid, containerScroll],
  );

  const fingerprint = useMemo(
    () => buildVirtualListFingerprint(safeItems, computeItemKey),
    [safeItems, computeItemKey],
  );

  const restoredSnapshot = useMemo(() => {
    if (!restoreScroll || safeItems.length === 0) return undefined;
    return getVirtualListScrollState(storeKey, fingerprint) ?? undefined;
  }, [restoreScroll, storeKey, fingerprint, safeItems.length]);

  storeKeyRef.current = storeKey;
  fingerprintRef.current = fingerprint;

  const persistSnapshot = useCallback(() => {
    if (!restoreScroll || safeItems.length === 0) return;
    virtuosoRef.current?.getState((snapshot) => {
      setVirtualListScrollState(storeKeyRef.current, fingerprintRef.current, snapshot);
    });
  }, [restoreScroll, safeItems.length]);

  const handleIsScrolling = useCallback(
    (isScrolling) => {
      if (!isScrolling) persistSnapshot();
    },
    [persistSnapshot],
  );

  useEffect(() => {
    return () => {
      persistSnapshot();
    };
  }, [persistSnapshot]);

  const scrollProps = useMemo(() => {
    if (customScrollParent) {
      return { customScrollParent, useWindowScroll: false };
    }
    return { useWindowScroll: true };
  }, [customScrollParent]);

  const handleEndReached = useCallback(() => {
    if (hasMore && loadMore && !loadingMore && safeItems.length > 0) {
      loadMore();
    }
  }, [hasMore, loadMore, loadingMore, safeItems.length]);

  const footerComponent = useCallback(
    () => (
      <VirtualListFooter
        hasMore={hasMore}
        loader={loader}
        endMessage={endMessage}
        itemCount={safeItems.length}
      />
    ),
    [hasMore, loader, endMessage, safeItems.length],
  );

  const rows = useMemo(
    () => (grid ? chunkRows(safeItems, columns) : null),
    [grid, safeItems, columns],
  );

  // List/Item refs must stay stable across data changes (e.g. loadMore),
  // otherwise Virtuoso remounts every item and the scroll position jumps.
  const listClass = useMemo(
    () => ['virtual-list__list', listClassName].filter(Boolean).join(' '),
    [listClassName],
  );
  const listItemClass = useMemo(
    () => ['virtual-list__list-item', itemClassName].filter(Boolean).join(' '),
    [itemClassName],
  );

  const ListComponent = useMemo(
    () =>
      forwardRef(function VirtualListContainer({ style: listStyle, children, ...props }, ref) {
        return (
          <div
            ref={ref}
            {...props}
            style={listStyle}
            className={grid ? 'virtual-list__rows' : listClass}
          >
            {children}
          </div>
        );
      }),
    [grid, listClass],
  );

  const ItemComponent = useMemo(() => {
    if (grid) {
      return ({ children, className: itemCls, item: _item, ...props }) => (
        <div {...props} className={['virtual-list__row-item', itemCls].filter(Boolean).join(' ')}>
          {children}
        </div>
      );
    }
    return ({ children, className: itemCls, item: _item, ...props }) => (
      <div {...props} className={[listItemClass, itemCls].filter(Boolean).join(' ')}>
        {children}
      </div>
    );
  }, [grid, listItemClass]);

  const components = useMemo(
    () => ({ List: ListComponent, Item: ItemComponent, Footer: footerComponent }),
    [ListComponent, ItemComponent, footerComponent],
  );

  const rowStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: `${gap}px`,
      paddingBottom: `${gap}px`,
      alignItems: 'stretch',
    }),
    [columns, gap],
  );

  const itemContent = useCallback(
    (index, item) => {
      if (grid) {
        const rowItems = item ?? [];
        const rowClass = ['virtual-list__row', listClassName].filter(Boolean).join(' ');
        return (
          <div className={rowClass} style={rowStyle}>
            {rowItems.map((rowItem, columnIndex) => {
              const realIndex = index * columns + columnIndex;
              const cellClass = ['virtual-list__cell', itemClassName].filter(Boolean).join(' ');
              return (
                <div key={computeItemKey(realIndex, rowItem)} className={cellClass}>
                  {renderItem(rowItem, realIndex)}
                </div>
              );
            })}
          </div>
        );
      }
      return renderItem(item, index);
    },
    [grid, columns, listClassName, itemClassName, rowStyle, computeItemKey, renderItem],
  );

  const itemKey = useCallback(
    (index) => {
      if (grid) {
        const firstItem = rows?.[index]?.[0];
        return firstItem ? computeItemKey(index * columns, firstItem) : index;
      }
      return computeItemKey(index, safeItems[index]);
    },
    [grid, rows, columns, computeItemKey, safeItems],
  );

  const rootClassName = [
    'virtual-list',
    customScrollParent ? 'virtual-list--container' : 'virtual-list--window',
    grid ? 'virtual-list--grid' : 'virtual-list--list',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Container scroll: wait until useScrollParent() provides the DOM node.
  if (waitingForScrollParent) {
    return null;
  }

  const restoreProps = restoredSnapshot ? { restoreStateFrom: restoredSnapshot } : {};

  return (
    <div className={rootClassName} style={style} ref={containerRef}>
      <Virtuoso
        {...scrollProps}
        {...restoreProps}
        {...(defaultItemHeight ? { defaultItemHeight } : {})}
        ref={virtuosoRef}
        data={grid ? rows : safeItems}
        endReached={handleEndReached}
        increaseViewportBy={{ top: overscan, bottom: overscan }}
        computeItemKey={itemKey}
        components={components}
        itemContent={itemContent}
        isScrolling={handleIsScrolling}
      />
    </div>
  );
};

export default VirtualList;
