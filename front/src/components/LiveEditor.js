// src/components/LiveEditor.js
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import TGSEmoji, { CUSTOM_EMOJI } from "./TGSEmoji";

const LiveEditor = forwardRef(({ value, onChange, placeholder, onFocus }, ref) => {

    const editorRef = useRef(null);


    useImperativeHandle(ref, () => ({
        insertEmoji
    }));

    useEffect(() => {
        if (!editorRef.current) return;
        if (editorRef.current.innerHTML === "") {
            editorRef.current.innerHTML = "";
        }
    }, []);

    function emitChange() {
        if (!editorRef.current) return;

        const nodes = editorRef.current.childNodes;
        let text = "";

        nodes.forEach(node => {

            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            }

            if (node.dataset?.emojiKey) {
                text += node.dataset.emojiKey;
            }

        });

        onChange?.(text);
    }

    function insertEmoji(key) {

        const emoji = CUSTOM_EMOJI[key];
        if (!emoji) return;

        const span = document.createElement("span");
        span.className = "editor-emoji";
        span.dataset.emojiKey = key;
        span.contentEditable = "false";

        const container = document.createElement("span");

        span.appendChild(container);

        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        range.insertNode(span);

        range.setStartAfter(span);
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);

        emitChange();
    }

    function handleInput() {
        emitChange();
    }

    function handleKeyDown(e) {

        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);

        if (e.key === "Backspace") {

            const node = range.startContainer;
            const offset = range.startOffset;

            if (node.nodeType === Node.TEXT_NODE && offset === 0) {

                const prev = node.previousSibling;

                if (prev?.dataset?.emojiKey) {
                    e.preventDefault();
                    prev.remove();
                    emitChange();
                }
            }
        }
    }

    return (
        <div
            ref={editorRef}
            className="live-editor"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
        />
    );
});

export default LiveEditor;