import { forwardRef, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
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

/**
 * Windowed list/grid wrapper around react-virtuoso.
 * Drop-in replacement for react-infinite-scroll-component + .map().
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
  style,
  className = '',
}) => {
  const safeItems = items ?? [];
  const waitingForScrollParent = customScrollParent === null;

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

  const listComponents = useMemo(() => {
    const listClass = ['virtual-list__list', listClassName].filter(Boolean).join(' ');
    const listItemClass = ['virtual-list__list-item', itemClassName].filter(Boolean).join(' ');

    return {
      List: forwardRef(function VirtualListList({ style: listStyle, children, ...props }, ref) {
        return (
          <div ref={ref} {...props} style={listStyle} className={listClass}>
            {children}
          </div>
        );
      }),
      Item: ({ children, className, item: _item, ...props }) => (
        <div {...props} className={[listItemClass, className].filter(Boolean).join(' ')}>
          {children}
        </div>
      ),
      Footer: footerComponent,
    };
  }, [listClassName, itemClassName, footerComponent]);

  const gridComponents = useMemo(() => {
    const gridListClass = ['virtual-list__grid-list', listClassName].filter(Boolean).join(' ');
    const gridItemClass = ['virtual-list__grid-item', itemClassName].filter(Boolean).join(' ');

    return {
      List: forwardRef(function VirtualGridList({ style: listStyle, children, ...props }, ref) {
        return (
          <div ref={ref} {...props} style={listStyle} className={gridListClass}>
            {children}
          </div>
        );
      }),
      Item: ({ children, className, item: _item, ...props }) => (
        <div {...props} className={[gridItemClass, className].filter(Boolean).join(' ')}>
          {children}
        </div>
      ),
      Footer: footerComponent,
    };
  }, [listClassName, itemClassName, footerComponent]);

  const itemContent = useCallback(
    (index, item) => renderItem(item, index),
    [renderItem],
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

  const sharedProps = {
    ...scrollProps,
    data: safeItems,
    endReached: handleEndReached,
    increaseViewportBy: { top: overscan, bottom: overscan },
    computeItemKey: (index) => computeItemKey(index, safeItems[index]),
    style,
  };

  if (grid) {
    return (
      <div className={rootClassName} style={style}>
        <VirtuosoGrid
          {...sharedProps}
          components={gridComponents}
          itemContent={itemContent}
        />
      </div>
    );
  }

  return (
    <div className={rootClassName} style={style}>
      <Virtuoso
        {...sharedProps}
        components={listComponents}
        itemContent={itemContent}
      />
    </div>
  );
};

export default VirtualList;
