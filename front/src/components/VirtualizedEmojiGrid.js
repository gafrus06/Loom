import React, { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_COLUMNS = 5;
const DEFAULT_GAP = 4;
const DEFAULT_MAX_HEIGHT = 340;
const DEFAULT_OVERSCAN = 2;

export default function VirtualizedEmojiGrid({
    items,
    renderItem,
    className = '',
    columns = DEFAULT_COLUMNS,
    gap = DEFAULT_GAP,
    maxHeight = DEFAULT_MAX_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
}) {
    const viewportRef = useRef(null);
    const [metrics, setMetrics] = useState({
        width: 0,
        height: maxHeight,
        scrollTop: 0,
    });

    useEffect(() => {
        const element = viewportRef.current;
        if (!element) return undefined;

        const updateMetrics = () => {
            setMetrics((current) => ({
                ...current,
                width: element.clientWidth,
                height: element.clientHeight || maxHeight,
            }));
        };

        updateMetrics();

        const observer = new ResizeObserver(updateMetrics);
        observer.observe(element);

        return () => observer.disconnect();
    }, [maxHeight]);

    const computed = useMemo(() => {
        const width = metrics.width || 1;
        const itemSize = Math.max(40, (width - gap * (columns - 1)) / columns);
        const rowStride = itemSize + gap;
        const rowCount = Math.ceil(items.length / columns);
        const totalHeight = rowCount === 0 ? 0 : rowCount * rowStride - gap;
        const rawVisibleStart = Math.floor(metrics.scrollTop / rowStride);
        const rawVisibleEnd = Math.ceil((metrics.scrollTop + metrics.height) / rowStride);
        const visibleStartRow = Math.max(0, rawVisibleStart - overscan);
        const visibleEndRow = Math.min(Math.max(0, rowCount - 1), rawVisibleEnd + overscan);
        const animatedStartRow = Math.max(0, rawVisibleStart);
        const animatedEndRow = Math.min(Math.max(0, rowCount - 1), rawVisibleEnd);

        return {
            itemSize,
            rowStride,
            rowCount,
            totalHeight,
            visibleStartRow,
            visibleEndRow,
            animatedStartRow,
            animatedEndRow,
        };
    }, [columns, gap, items.length, metrics.height, metrics.scrollTop, metrics.width, overscan]);

    const renderedItems = useMemo(() => {
        if (items.length === 0) return null;

        const children = [];
        for (let row = computed.visibleStartRow; row <= computed.visibleEndRow; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const index = row * columns + column;
                if (index >= items.length) break;

                const item = items[index];
                const shouldAnimate = row >= computed.animatedStartRow && row <= computed.animatedEndRow;

                children.push(
                    <div
                        key={item.key || item.id || index}
                        className="emoji-picker-panel__slot"
                        style={{
                            width: computed.itemSize,
                            height: computed.itemSize,
                            left: column * (computed.itemSize + gap),
                            top: row * computed.rowStride,
                        }}
                    >
                        {renderItem(item, { index, shouldAnimate })}
                    </div>
                );
            }
        }

        return children;
    }, [
        columns,
        computed.animatedEndRow,
        computed.animatedStartRow,
        computed.itemSize,
        computed.rowStride,
        computed.visibleEndRow,
        computed.visibleStartRow,
        gap,
        items,
        renderItem,
    ]);

    return (
        <div
            ref={viewportRef}
            className={`emoji-picker-panel__viewport ${className}`.trim()}
            style={{ maxHeight }}
            onScroll={(event) => {
                const nextScrollTop = event.currentTarget.scrollTop;
                setMetrics((current) => (
                    current.scrollTop === nextScrollTop
                        ? current
                        : { ...current, scrollTop: nextScrollTop }
                ));
            }}
        >
            <div
                className="emoji-picker-panel__spacer"
                style={{ height: computed.totalHeight }}
            >
                {renderedItems}
            </div>
        </div>
    );
}
