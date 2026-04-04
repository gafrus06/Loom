import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EMOJI_CATEGORIES from '../data/emojiData';
import TGSEmoji, { CUSTOM_EMOJI } from './TGSEmoji';
import VirtualizedEmojiGrid from './VirtualizedEmojiGrid';
import './EmojiPickerPanel.css';

const CUSTOM_EMOJI_LIST = Object.entries(CUSTOM_EMOJI).map(([key, value]) => ({
    key,
    src: value.src,
    type: value.type,
    filename: value.filename,
}));

const PLACEHOLDER_ITEMS = Array.from({ length: 20 }, (_, index) => ({
    key: `placeholder-${index}`,
}));

const StandardEmojiButton = React.memo(function StandardEmojiButton({ emoji, onSelect }) {
    return (
        <button
            type="button"
            className="emoji-picker-panel__item"
            onClick={() => onSelect(emoji)}
            title={emoji}
        >
            {emoji}
        </button>
    );
});

const PlaceholderEmoji = React.memo(function PlaceholderEmoji() {
    return <div className="emoji-picker-panel__placeholder" />;
});

const CustomEmojiButton = React.memo(function CustomEmojiButton({ item, onSelect, shouldMountStatic }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            type="button"
            className="emoji-picker-panel__item emoji-picker-panel__item--custom"
            onClick={() => onSelect(item.key)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            title={item.key}
        >
            <TGSEmoji
                name={item.key}
                src={item.src}
                type={item.type}
                size={32}
                animate={isHovered}
                mountAnimation={shouldMountStatic || isHovered}
                filename={item.filename}
                fallbackMode="soft"
            />
        </button>
    );
});

function scheduleIdleWork(callback) {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const idleId = window.requestIdleCallback(callback, { timeout: 180 });
        return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(callback, 0);
    return () => window.clearTimeout(timeoutId);
}

export default function EmojiPickerPanel({ onSelect, onClose }) {
    const [activeTab, setActiveTab] = useState(-1);
    const [tabReady, setTabReady] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        setTabReady(false);

        let cancelled = false;
        let cancelIdle = () => {};

        cancelIdle = scheduleIdleWork(() => {
            if (cancelled) return;
            setTabReady(true);
        });

        return () => {
            cancelled = true;
            cancelIdle();
        };
    }, [activeTab]);

    const isCustomTab = activeTab === -1;
    const activeCategory = EMOJI_CATEGORIES[activeTab];
    const categoryItems = useMemo(() => activeCategory?.emojis ?? [], [activeCategory]);

    const renderPlaceholder = useCallback(() => <PlaceholderEmoji />, []);

    const renderCustomItem = useCallback((item, { shouldAnimate }) => (
        <CustomEmojiButton
            item={item}
            onSelect={onSelect}
            shouldMountStatic={shouldAnimate}
        />
    ), [onSelect]);

    const renderStandardItem = useCallback((emoji) => (
        <StandardEmojiButton emoji={emoji} onSelect={onSelect} />
    ), [onSelect]);

    const displayedItems = useMemo(() => {
        if (!tabReady) return PLACEHOLDER_ITEMS;
        if (isCustomTab) return CUSTOM_EMOJI_LIST;
        return categoryItems;
    }, [categoryItems, isCustomTab, tabReady]);

    return (
        <div className="emoji-picker-panel">
            <div className="emoji-picker-panel__tabs">
                <button
                    type="button"
                    className={`emoji-picker-panel__tab ${isCustomTab ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(-1)}
                    title="Кастомные"
                >
                    ✨
                </button>

                {EMOJI_CATEGORIES.map((category, index) => (
                    <button
                        key={category.id}
                        type="button"
                        className={`emoji-picker-panel__tab ${activeTab === index ? 'is-active' : ''}`}
                        onClick={() => setActiveTab(index)}
                        title={category.name}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            <div className="emoji-picker-panel__label">
                {isCustomTab ? 'Кастомные' : activeCategory?.name}
            </div>

            {!tabReady ? (
                <VirtualizedEmojiGrid
                    items={displayedItems}
                    renderItem={renderPlaceholder}
                    className="emoji-picker-panel__grid"
                />
            ) : isCustomTab ? (
                CUSTOM_EMOJI_LIST.length === 0 ? (
                    <p className="emoji-picker-panel__empty">Нет кастомных эмодзи</p>
                ) : (
                    <VirtualizedEmojiGrid
                        items={displayedItems}
                        renderItem={renderCustomItem}
                        className="emoji-picker-panel__grid emoji-picker-panel__grid--custom"
                    />
                )
            ) : categoryItems.length === 0 ? (
                <p className="emoji-picker-panel__empty">В этой категории пока пусто</p>
            ) : (
                <VirtualizedEmojiGrid
                    items={displayedItems}
                    renderItem={renderStandardItem}
                    className="emoji-picker-panel__grid"
                />
            )}
        </div>
    );
}
