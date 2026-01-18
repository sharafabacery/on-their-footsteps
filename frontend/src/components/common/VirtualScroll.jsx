/**
 * Virtual scrolling component for large lists.
 * Efficiently renders only visible items for better performance.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

const VirtualScroll = ({
  items = [],
  itemHeight = 80,
  height = 400,
  width = '100%',
  renderItem,
  overscanCount = 5,
  className = '',
  onScroll,
  ...props
}) => {
  const listRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    items,
    renderItem
  }), [items, renderItem]);

  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset }) => {
    setScrollOffset(scrollOffset);
    if (onScroll) {
      onScroll(scrollOffset);
    }
  }, [onScroll]);

  // Render item function
  const Row = useCallback(({ index, style }) => {
    const item = items[index];
    
    if (!item) {
      return (
        <div style={style}>
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Item not found</div>
          </div>
        </div>
      );
    }

    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, renderItem]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!listRef.current) {
      return { start: 0, end: 0 };
    }

    const { scrollTop, clientHeight } = listRef.current._outerRef;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + clientHeight) / itemHeight) + overscanCount
    );

    return { start, end };
  }, [scrollOffset, itemHeight, items.length, overscanCount]);

  // Scroll to item
  const scrollToItem = useCallback((index, align = 'auto') => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, align);
    }
  }, []);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, []);

  // Get visible items
  const getVisibleItems = useCallback(() => {
    const { start, end } = visibleRange;
    return items.slice(start, end + 1);
  }, [visibleRange, items]);

  // Expose methods via ref
  React.useImperativeHandle(props.forwardRef, () => ({
    scrollToItem,
    scrollToTop,
    getVisibleItems,
    listRef: listRef.current
  }));

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-gray-500 text-center">
          <div className="text-lg font-medium">No items to display</div>
          <div className="text-sm mt-1">Try adjusting your filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`virtual-scroll-container ${className}`} style={{ width }}>
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={overscanCount}
        onScroll={handleScroll}
        className="virtual-scroll-list"
        {...props}
      >
        {Row}
      </List>
    </div>
  );
};

// Variable size virtual scroll component
export const VariableSizeVirtualScroll = ({
  items = [],
  getItemHeight = () => 80,
  height = 400,
  width = '100%',
  renderItem,
  overscanCount = 5,
  className = '',
  onScroll,
  ...props
}) => {
  const listRef = useRef(null);
  const [itemSizes, setItemSizes] = useState(new Map());

  // Calculate item sizes
  useEffect(() => {
    const sizes = new Map();
    items.forEach((item, index) => {
      sizes.set(index, getItemHeight(item, index));
    });
    setItemSizes(sizes);
  }, [items, getItemHeight]);

  // Get item size
  const getItemSize = useCallback((index) => {
    return itemSizes.get(index) || 80;
  }, [itemSizes]);

  // Render item function
  const Row = useCallback(({ index, style }) => {
    const item = items[index];
    
    if (!item) {
      return (
        <div style={style}>
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Item not found</div>
          </div>
        </div>
      );
    }

    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, renderItem]);

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-gray-500 text-center">
          <div className="text-lg font-medium">No items to display</div>
          <div className="text-sm mt-1">Try adjusting your filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`virtual-scroll-container ${className}`} style={{ width }}>
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={getItemSize}
        itemData={{ items, renderItem }}
        overscanCount={overscanCount}
        onScroll={onScroll}
        className="virtual-scroll-list"
        {...props}
      >
        {Row}
      </List>
    </div>
  );
};

// Masonry virtual scroll for different sized items
export const MasonryVirtualScroll = ({
  items = [],
  columnCount = 2,
  columnWidth = 300,
  height = 400,
  renderItem,
  className = '',
  ...props
}) => {
  const [columns, setColumns] = useState([]);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate column layout
  useEffect(() => {
    const cols = Array.from({ length: columnCount }, () => ({
      items: [],
      height: 0
    }));

    items.forEach((item, index) => {
      const itemHeight = item.height || 200; // Default height
      const shortestColumn = cols.reduce((min, col) => 
        col.height < min.height ? col : min
      );
      
      shortestColumn.items.push({ ...item, index });
      shortestColumn.height += itemHeight;
    });

    setColumns(cols);
  }, [items, columnCount]);

  // Render column
  const Column = ({ column, columnIndex }) => (
    <div 
      className="masonry-column"
      style={{ 
        width: columnWidth,
        marginRight: columnIndex < columnCount - 1 ? 16 : 0
      }}
    >
      {column.items.map((item) => (
        <div 
          key={item.index}
          className="masonry-item mb-4"
          style={{ height: item.height || 200 }}
        >
          {renderItem(item, item.index)}
        </div>
      ))}
    </div>
  );

  return (
    <div 
      className={`masonry-virtual-scroll ${className}`}
      style={{ height }}
    >
      <div className="flex">
        {columns.map((column, index) => (
          <Column key={index} column={column} columnIndex={index} />
        ))}
      </div>
    </div>
  );
};

// Enhanced virtual scroll with search and filtering
export const EnhancedVirtualScroll = ({
  items = [],
  itemHeight = 80,
  height = 400,
  width = '100%',
  renderItem,
  searchQuery = '',
  filterFn = null,
  className = '',
  ...props
}) => {
  const [filteredItems, setFilteredItems] = useState(items);
  const [searchResults, setSearchResults] = useState([]);

  // Apply search and filters
  useEffect(() => {
    let filtered = items;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.arabic_name?.includes(searchQuery) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }

    // Apply custom filter
    if (filterFn) {
      filtered = filtered.filter(filterFn);
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, filterFn]);

  // Enhanced render item with search highlighting
  const enhancedRenderItem = useCallback((item, index) => {
    const isSearchResult = searchResults.length > 0 && searchResults.includes(item);
    const highlightedItem = isSearchResult ? { ...item, isSearchResult } : item;
    
    return renderItem(highlightedItem, index);
  }, [searchResults, renderItem]);

  return (
    <div className={`enhanced-virtual-scroll ${className}`}>
      {searchResults.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-800">
            Found {searchResults.length} results for "{searchQuery}"
          </div>
        </div>
      )}
      
      <VirtualScroll
        items={filteredItems}
        itemHeight={itemHeight}
        height={height}
        width={width}
        renderItem={enhancedRenderItem}
        {...props}
      />
    </div>
  );
};

// Hook for virtual scroll
export const useVirtualScroll = (options = {}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await options.fetchItems(page, options.pageSize || 20);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, options.fetchItems, options.pageSize]);

  const reset = useCallback(() => {
    setItems([]);
    setLoading(false);
    setError(null);
    setHasMore(true);
    setPage(1);
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reset
  };
};

export default VirtualScroll;
