import React from "react";
import { createPortal } from "react-dom";

export default function RichTextSelectionToolbar({
    visible,
    top,
    left,
    toolbarRef,
    quoteColors,
    selectedQuoteColor,
    onSelectQuoteColor,
    onBold,
    onItalic,
    onStrike,
    onSpoiler,
    onLink,
    onSubheading,
    onQuote,
    onBulletList,
    onOrderedList,
}) {
    if (!visible) return null;

    return createPortal(
        <div
            ref={toolbarRef}
            className="post-selection-toolbar"
            style={{ top, left }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onBold(); }}>B</button>
            <button type="button" className="post-selection-btn post-selection-btn--italic" onMouseDown={(e) => { e.preventDefault(); onItalic(); }}>I</button>
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onStrike(); }}>S</button>
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onSpoiler(); }}>?</button>
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onLink(); }}>L</button>
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onSubheading(); }}>H2</button>
            <div className="post-selection-colors">
                {quoteColors.map((quoteColor) => (
                    <button
                        key={quoteColor.key}
                        type="button"
                        className={`post-selection-color-btn ${selectedQuoteColor === quoteColor.key ? "is-active" : ""}`}
                        style={{ "--quote-color": quoteColor.color }}
                        onMouseDown={(e) => { e.preventDefault(); onSelectQuoteColor(quoteColor.key); }}
                        aria-label={`???? ?????? ${quoteColor.key}`}
                    />
                ))}
            </div>
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onQuote(); }}>&quot;</button>
            <button type="button" className="post-selection-btn post-selection-btn--list" onMouseDown={(e) => { e.preventDefault(); onBulletList(); }}>
                <span className="post-format-list-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
            </button>
            <button type="button" className="post-selection-btn" onMouseDown={(e) => { e.preventDefault(); onOrderedList(); }}>1.</button>
        </div>,
        document.body
    );
}
