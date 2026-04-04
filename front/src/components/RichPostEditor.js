import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createRoot } from "react-dom/client";
import TGSEmoji, { CUSTOM_EMOJI } from "./TGSEmoji";
import { normalizePostContentDocument } from "../utils/postContent";

const CARET_GUARD = "\u200B";

function isRangeInside(container, range) {
    const common = range?.commonAncestorContainer;
    return Boolean(container && common && container.contains(common));
}

function placeCaretAtEnd(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    return range;
}

function getSelectedTextLength(container) {
    const selection = window.getSelection();
    if (!container || !selection || !selection.rangeCount) return 0;
    const range = selection.getRangeAt(0);
    if (!isRangeInside(container, range)) return 0;
    return range.toString().length;
}

const RichPostEditor = forwardRef(({ onChange, placeholder, onFocus, maxLength, initialContent }, ref) => {
    const editorRef = useRef(null);
    const rootsRef = useRef(new Map());
    const lastRangeRef = useRef(null);
    const initialContentRef = useRef(null);
    const setEditorDocumentRef = useRef(null);

    function rememberSelection() {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!isRangeInside(editor, range)) return;
        lastRangeRef.current = range.cloneRange();
    }

    function restoreSelection() {
        const editor = editorRef.current;
        if (!editor) return null;
        const selection = window.getSelection();
        if (selection?.rangeCount) {
            const liveRange = selection.getRangeAt(0);
            if (isRangeInside(editor, liveRange)) return liveRange;
        }
        if (lastRangeRef.current && isRangeInside(editor, lastRangeRef.current)) {
            const restored = lastRangeRef.current.cloneRange();
            selection?.removeAllRanges();
            selection?.addRange(restored);
            return restored;
        }
        return placeCaretAtEnd(editor);
    }

    function mergeInlineText(nodes) {
        const merged = [];
        nodes.forEach((node) => {
            if (node == null || node === "") return;
            if (typeof node === "string" && typeof merged[merged.length - 1] === "string") {
                merged[merged.length - 1] += node;
            } else {
                merged.push(node);
            }
        });
        return merged;
    }

    function wrapInlineMark(content, patch) {
        if (!content || (Array.isArray(content) && content.length === 0)) return [];
        return [{ ...patch, content: Array.isArray(content) ? content : [content] }];
    }

    function mountEmoji(span, key, size = 22) {
        const emoji = CUSTOM_EMOJI[key];
        if (!emoji || !span) return;
        span.className = "editor-emoji post-rich-emoji";
        span.dataset.emojiKey = key;
        span.contentEditable = "false";
        const mount = document.createElement("span");
        span.innerHTML = "";
        span.appendChild(mount);
        const root = createRoot(mount);
        rootsRef.current.set(span, root);
        root.render(
            <TGSEmoji
                name={key}
                src={emoji.src}
                type={emoji.type}
                size={size}
                animate
                mountAnimation
                fallbackMode="soft"
                filename={emoji.filename}
            />
        );
    }

    function createInlineFragment(nodes) {
        const fragment = document.createDocumentFragment();

        (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            if (typeof node === "string") {
                const parts = node.split("\n");
                parts.forEach((part, index) => {
                    if (part) {
                        fragment.appendChild(document.createTextNode(part));
                    }
                    if (index < parts.length - 1) {
                        fragment.appendChild(document.createElement("br"));
                    }
                });
                return;
            }

            if (!node || typeof node !== "object") return;

            if (node.type === "emoji" && node.name && CUSTOM_EMOJI[node.name]) {
                fragment.appendChild(document.createTextNode(CARET_GUARD));
                const span = document.createElement("span");
                mountEmoji(span, node.name);
                fragment.appendChild(span);
                fragment.appendChild(document.createTextNode(CARET_GUARD));
                return;
            }

            let element = null;
            if (node.href) {
                element = document.createElement("a");
                element.href = node.href;
                element.target = "_blank";
                element.rel = "noreferrer";
                element.className = "post-rich-link";
            } else if (node.spoiler) {
                element = document.createElement("span");
                element.className = "post-rich-spoiler";
            } else if (node.strike) {
                element = document.createElement("s");
            } else if (node.italic) {
                element = document.createElement("em");
            } else if (node.bold) {
                element = document.createElement("strong");
            }

            if (element) {
                element.appendChild(createInlineFragment(node.content || []));
                fragment.appendChild(element);
                return;
            }

            fragment.appendChild(createInlineFragment(node.content || []));
        });

        return fragment;
    }

    function createBlockNodes(blocks) {
        const fragment = document.createDocumentFragment();

        (Array.isArray(blocks) ? blocks : []).forEach((block) => {
            if (!block || typeof block !== "object") return;

            if (block.type === "divider") {
                const divider = document.createElement("hr");
                divider.className = "post-rich-divider";
                fragment.appendChild(divider);
                return;
            }

            if (block.type === "quote") {
                const quote = document.createElement("blockquote");
                quote.className = `post-rich-quote post-rich-quote--${block.color || "purple"}`;
                const body = document.createElement("div");
                body.className = "post-rich-quote-body";
                body.appendChild(createBlockNodes(block.blocks || []));
                quote.appendChild(body);
                fragment.appendChild(quote);
                return;
            }

            if (block.type === "bullet_list" || block.type === "ordered_list") {
                const list = document.createElement(block.type === "ordered_list" ? "ol" : "ul");
                (block.items || []).forEach((item) => {
                    const li = document.createElement("li");
                    li.appendChild(createInlineFragment(item));
                    if (!li.childNodes.length) {
                        li.appendChild(document.createElement("br"));
                    }
                    list.appendChild(li);
                });
                fragment.appendChild(list);
                return;
            }

            if (block.type === "subheading") {
                const heading = document.createElement("h4");
                heading.className = "post-rich-subheading";
                heading.appendChild(createInlineFragment(block.content || []));
                if (!heading.childNodes.length) {
                    heading.appendChild(document.createElement("br"));
                }
                fragment.appendChild(heading);
                return;
            }

            const paragraph = document.createElement("p");
            paragraph.className = "post-rich-paragraph";
            paragraph.appendChild(createInlineFragment(block.content || []));
            if (!paragraph.childNodes.length) {
                paragraph.appendChild(document.createElement("br"));
            }
            fragment.appendChild(paragraph);
        });

        return fragment;
    }

    function setEditorDocument(documentValue, shouldEmitChange = true) {
        const editor = editorRef.current;
        if (!editor) return;

        rootsRef.current.forEach((root) => root.unmount());
        rootsRef.current.clear();
        editor.innerHTML = "";

        const normalized = normalizePostContentDocument(documentValue, "");
        const blocks = Array.isArray(normalized?.blocks) ? normalized.blocks : [];
        editor.appendChild(createBlockNodes(blocks.length ? blocks : [{ type: "paragraph", content: [""] }]));
        placeCaretAtEnd(editor);
        rememberSelection();
        if (shouldEmitChange) {
            emitChange();
        }
    }

    setEditorDocumentRef.current = setEditorDocument;

    function serializeInlineNodes(nodes) {
        const result = [];
        Array.from(nodes || []).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = (node.textContent || "").replace(/\u200B/g, "");
                if (text) {
                    result.push(text);
                }
                return;
            }
            if (node.nodeName === "BR") {
                result.push("\n");
                return;
            }
            if (node.dataset?.emojiKey) {
                result.push({ type: "emoji", name: node.dataset.emojiKey });
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName;
            const children = serializeInlineNodes(node.childNodes);
            if (tag === "A") {
                result.push(...wrapInlineMark(children, { href: node.getAttribute("href") || "" }));
                return;
            }
            if (tag === "STRONG" || tag === "B") {
                result.push(...wrapInlineMark(children, { bold: true }));
                return;
            }
            if (tag === "EM" || tag === "I") {
                result.push(...wrapInlineMark(children, { italic: true }));
                return;
            }
            if (tag === "S" || tag === "STRIKE") {
                result.push(...wrapInlineMark(children, { strike: true }));
                return;
            }
            if (node.classList?.contains("post-rich-spoiler")) {
                result.push(...wrapInlineMark(children, { spoiler: true }));
                return;
            }
            result.push(...children);
        });
        return mergeInlineText(result);
    }

    function getQuoteColor(node) {
        const colorClass = Array.from(node.classList || []).find((className) => className.startsWith("post-rich-quote--"));
        return colorClass ? colorClass.replace("post-rich-quote--", "") : "purple";
    }

    function serializeBlockNode(node) {
        if (!node) return [];
        if (node.nodeType === Node.TEXT_NODE) {
            const value = node.textContent || "";
            return value.trim() ? [{ type: "paragraph", content: [value] }] : [];
        }
        if (node.nodeName === "BR" || node.nodeType !== Node.ELEMENT_NODE) return [];

        const tag = node.tagName;
        if (tag === "HR") return [{ type: "divider" }];

        if (tag === "BLOCKQUOTE") {
            const body = node.querySelector(".post-rich-quote-body") || node;
            return [{ type: "quote", color: getQuoteColor(node), blocks: serializeBlockNodes(body.childNodes) }];
        }

        if (tag === "UL" || tag === "OL") {
            const items = Array.from(node.children)
                .filter((child) => child.tagName === "LI")
                .map((li) => serializeInlineNodes(li.childNodes));
            return [{ type: tag === "OL" ? "ordered_list" : "bullet_list", items }];
        }

        if (/^H[1-6]$/.test(tag) || node.classList?.contains("post-rich-subheading")) {
            return [{ type: "subheading", content: serializeInlineNodes(node.childNodes) }];
        }

        if (tag === "DIV" || tag === "P") {
            const hasNestedBlocks = Array.from(node.childNodes).some(
                (child) => child.nodeType === Node.ELEMENT_NODE
                    && ["DIV", "P", "UL", "OL", "BLOCKQUOTE", "HR", "H1", "H2", "H3", "H4", "H5", "H6"].includes(child.tagName)
            );

            if (hasNestedBlocks) {
                return serializeBlockNodes(node.childNodes);
            }
        }

        const content = serializeInlineNodes(node.childNodes);
        if (!content.length) return [];
        return [{ type: "paragraph", content }];
    }

    function serializeBlockNodes(nodes) {
        const blocks = [];
        let inlineBuffer = [];
        const flushInlineBuffer = () => {
            const content = serializeInlineNodes(inlineBuffer);
            inlineBuffer = [];
            if (!content.length) return;
            blocks.push({ type: "paragraph", content });
        };

        Array.from(nodes || []).forEach((node) => {
            const isBlock = node.nodeType === Node.ELEMENT_NODE && ["DIV", "P", "UL", "OL", "BLOCKQUOTE", "HR", "H1", "H2", "H3", "H4", "H5", "H6"].includes(node.tagName);
            if (isBlock) {
                flushInlineBuffer();
                blocks.push(...serializeBlockNode(node));
                return;
            }
            inlineBuffer.push(node);
        });
        flushInlineBuffer();
        return blocks;
    }

    function extractPlainTextFromInline(nodes) {
        return (nodes || []).map((node) => {
            if (typeof node === "string") return node.replace(/\u200B/g, "");
            if (!node || typeof node !== "object") return "";
            if (node.type === "emoji") return node.name || "";
            return extractPlainTextFromInline(node.content || []);
        }).join("");
    }

    function extractPlainTextFromBlocks(blocks) {
        return (blocks || []).map((block) => {
            switch (block.type) {
                case "divider":
                    return "---";
                case "quote":
                    return extractPlainTextFromBlocks(block.blocks || []);
                case "bullet_list":
                case "ordered_list":
                    return (block.items || []).map((item) => extractPlainTextFromInline(item)).join("\n");
                default:
                    return extractPlainTextFromInline(block.content || []);
            }
        }).join("\n").trim();
    }

    function serializeEditorDocument() {
        const blocks = serializeBlockNodes(editorRef.current?.childNodes || []);
        return { version: 1, blocks: blocks.length ? blocks : [{ type: "paragraph", text: "" }] };
    }

    function emitChange() {
        onChange?.(extractPlainTextFromBlocks(serializeEditorDocument().blocks));
    }

    function focusEditor() {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        restoreSelection();
    }

    function insertNodeAtSelection(node) {
        focusEditor();
        const range = restoreSelection();
        if (!range) return;
        range.deleteContents();
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        lastRangeRef.current = range.cloneRange();
    }

    function isTopLevelBlockNode(node) {
        return Boolean(
            node
            && node.nodeType === Node.ELEMENT_NODE
            && ["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "HR"].includes(node.tagName)
        );
    }

    function getClosestElement(node) {
        if (!node) return null;
        return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    }

    function getTopLevelBlock(node) {
        const editor = editorRef.current;
        if (!editor || !node) return null;

        let current = getClosestElement(node);
        while (current && current !== editor) {
            if (current.parentNode === editor && isTopLevelBlockNode(current)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    function fragmentHasContent(fragment) {
        if (!fragment) return false;
        return Array.from(fragment.childNodes).some((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return Boolean(node.textContent?.trim());
            }
            if (node.nodeName === "BR") return false;
            if (node.dataset?.emojiKey) return true;
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.dataset?.emojiKey) return true;
                if (node.tagName === "HR") return true;
                return Boolean(node.textContent?.trim()) || Boolean(node.querySelector?.("[data-emoji-key]"));
            }
            return false;
        });
    }

    function createParagraphFromFragment(fragment) {
        const paragraph = document.createElement("p");
        paragraph.className = "post-rich-paragraph";
        if (fragment) {
            paragraph.appendChild(fragment);
        }
        if (!fragmentHasContent(paragraph)) {
            paragraph.innerHTML = "";
            paragraph.appendChild(document.createElement("br"));
        }
        return paragraph;
    }

    function createBlockFromFragment(tagName, className, fragment) {
        const block = document.createElement(tagName);
        if (className) {
            block.className = className;
        }
        if (fragment) {
            block.appendChild(fragment);
        }
        if (!fragmentHasContent(block)) {
            block.innerHTML = "";
            block.appendChild(document.createElement("br"));
        }
        return block;
    }

    function placeCaretAfterNode(node) {
        const selection = window.getSelection();
        if (!selection || !node?.parentNode) return;
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        lastRangeRef.current = range.cloneRange();
    }

    function splitSelectionIntoTopLevelBlock(tagName, className) {
        focusEditor();
        const editor = editorRef.current;
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!editor || !selection || !range || range.collapsed) return false;
        if (!isRangeInside(editor, range)) return false;

        const startBlock = getTopLevelBlock(range.startContainer);
        const endBlock = getTopLevelBlock(range.endContainer);

        if (startBlock && endBlock && startBlock === endBlock && ["P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(startBlock.tagName)) {
            const beforeRange = document.createRange();
            beforeRange.selectNodeContents(startBlock);
            beforeRange.setEnd(range.startContainer, range.startOffset);

            const selectedRange = range.cloneRange();

            const afterRange = document.createRange();
            afterRange.selectNodeContents(startBlock);
            afterRange.setStart(range.endContainer, range.endOffset);

            const beforeFragment = beforeRange.cloneContents();
            const selectedFragment = selectedRange.cloneContents();
            const afterFragment = afterRange.cloneContents();

            const replacementNodes = [];
            if (fragmentHasContent(beforeFragment)) {
                replacementNodes.push(createParagraphFromFragment(beforeFragment));
            }
            const newBlock = createBlockFromFragment(tagName, className, selectedFragment);
            replacementNodes.push(newBlock);
            if (fragmentHasContent(afterFragment)) {
                replacementNodes.push(createParagraphFromFragment(afterFragment));
            }

            replacementNodes.forEach((node) => startBlock.parentNode.insertBefore(node, startBlock));
            startBlock.remove();
            placeCaretAfterNode(newBlock);
            emitChange();
            return true;
        }

        if (!startBlock && !endBlock) {
            const beforeRange = document.createRange();
            beforeRange.selectNodeContents(editor);
            beforeRange.setEnd(range.startContainer, range.startOffset);

            const selectedRange = range.cloneRange();

            const afterRange = document.createRange();
            afterRange.selectNodeContents(editor);
            afterRange.setStart(range.endContainer, range.endOffset);

            const beforeFragment = beforeRange.cloneContents();
            const selectedFragment = selectedRange.cloneContents();
            const afterFragment = afterRange.cloneContents();

            editor.innerHTML = "";

            if (fragmentHasContent(beforeFragment)) {
                editor.appendChild(createParagraphFromFragment(beforeFragment));
            }
            const newBlock = createBlockFromFragment(tagName, className, selectedFragment);
            editor.appendChild(newBlock);
            if (fragmentHasContent(afterFragment)) {
                editor.appendChild(createParagraphFromFragment(afterFragment));
            }

            placeCaretAfterNode(newBlock);
            emitChange();
            return true;
        }

        return false;
    }

    function resolveEditableBlock(range) {
        const editor = editorRef.current;
        if (!editor || !range) return null;

        const directBlock = getTopLevelBlock(range.startContainer);
        if (directBlock) {
            return directBlock;
        }

        const currentNode = getClosestElement(range.startContainer);
        if (range.startContainer === editor || currentNode === editor) {
            const paragraph = document.createElement("p");
            paragraph.className = "post-rich-paragraph";
            editor.appendChild(paragraph);
            return paragraph;
        }

        return null;
    }

    function replaceCurrentBlock(tagName, className) {
        focusEditor();
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!selection || !range) return null;

        const block = resolveEditableBlock(range);
        if (!block || !block.parentNode) return null;

        const replacement = document.createElement(tagName);
        if (className) {
            replacement.className = className;
        }
        replacement.innerHTML = block.innerHTML;
        block.parentNode.replaceChild(replacement, block);

        if (!replacement.childNodes.length) {
            replacement.appendChild(document.createElement("br"));
        }

        const nextRange = placeCaretAtEnd(replacement);
        lastRangeRef.current = nextRange.cloneRange();
        return replacement;
    }

    function insertSubheadingFromSelection() {
        return splitSelectionIntoTopLevelBlock("h4", "post-rich-subheading");
    }

    function wrapCurrentSelection(factory, fallbackText = "") {
        focusEditor();
        const range = restoreSelection();
        if (!range) return;
        const selectedText = range.toString() || fallbackText || "\u200b";
        insertNodeAtSelection(factory(selectedText));
        emitChange();
    }

    function runExec(command, value = null, resetTypingState = false) {
        focusEditor();
        const selection = window.getSelection();
        const hadExpandedSelection = Boolean(selection && selection.rangeCount && !selection.getRangeAt(0).collapsed);

        document.execCommand(command, false, value);
        rememberSelection();

        if (resetTypingState && hadExpandedSelection) {
            try {
                const activeSelection = window.getSelection();
                if (activeSelection && activeSelection.rangeCount) {
                    const currentRange = activeSelection.getRangeAt(0).cloneRange();
                    currentRange.collapse(false);
                    activeSelection.removeAllRanges();
                    activeSelection.addRange(currentRange);
                    lastRangeRef.current = currentRange.cloneRange();
                }

                if (document.queryCommandState(command)) {
                    document.execCommand(command, false, value);
                    rememberSelection();
                }
            } catch (_) {
                // Some browsers can throw on queryCommandState for specific commands.
            }
        }

        emitChange();
    }

    function insertLineBreak() {
        focusEditor();
        document.execCommand("insertLineBreak", false, null);
        rememberSelection();
        emitChange();
    }

    function exitCurrentQuote() {
        focusEditor();
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!selection || !range) return false;

        const anchorElement = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        const quote = anchorElement?.closest?.("blockquote");
        if (!quote) return false;

        const paragraph = document.createElement("p");
        paragraph.className = "post-rich-paragraph";
        paragraph.appendChild(document.createElement("br"));

        quote.insertAdjacentElement("afterend", paragraph);

        const nextRange = document.createRange();
        nextRange.setStart(paragraph, 0);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        lastRangeRef.current = nextRange.cloneRange();
        emitChange();
        return true;
    }

    function exitCurrentSubheading() {
        focusEditor();
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!selection || !range || !range.collapsed) return false;

        const block = resolveEditableBlock(range);
        const isSubheading = block && (
            /^H[1-6]$/.test(block.tagName) ||
            block.classList?.contains("post-rich-subheading")
        );
        if (!isSubheading || !block.parentNode) return false;

        const paragraph = document.createElement("p");
        paragraph.className = "post-rich-paragraph";
        paragraph.appendChild(document.createElement("br"));
        block.insertAdjacentElement("afterend", paragraph);

        const nextRange = document.createRange();
        nextRange.setStart(paragraph, 0);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        lastRangeRef.current = nextRange.cloneRange();
        emitChange();
        return true;
    }

    function getCurrentSpoiler() {
        const range = restoreSelection();
        if (!range) return null;

        const anchorElement = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        return anchorElement?.closest?.(".post-rich-spoiler") || null;
    }

    function getCurrentLink() {
        const range = restoreSelection();
        if (!range) return null;

        const anchorElement = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        return anchorElement?.closest?.("a") || null;
    }

    function getCurrentStrike() {
        const range = restoreSelection();
        if (!range) return null;

        const anchorElement = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        return anchorElement?.closest?.("s,strike") || null;
    }

    function getCurrentQuote() {
        const range = restoreSelection();
        if (!range) return null;

        const anchorElement = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        return anchorElement?.closest?.("blockquote") || null;
    }

    function unwrapElement(element) {
        if (!element || !element.parentNode) return false;
        const parent = element.parentNode;
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        emitChange();
        return true;
    }

    function exitCurrentStrikeWithSpace() {
        focusEditor();
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!selection || !range || !range.collapsed) return false;

        const strike = getCurrentStrike();
        if (!strike || !strike.parentNode) return false;

        const spaceNode = document.createTextNode("\u00A0");
        strike.parentNode.insertBefore(spaceNode, strike.nextSibling);

        const nextRange = document.createRange();
        nextRange.setStart(spaceNode, 1);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        lastRangeRef.current = nextRange.cloneRange();
        emitChange();
        return true;
    }

    function exitSpoilerToNextLine() {
        focusEditor();
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!selection || !range || !range.collapsed) return false;

        const spoiler = getCurrentSpoiler();
        if (!spoiler || !spoiler.parentNode) return false;

        const paragraph = document.createElement("p");
        paragraph.className = "post-rich-paragraph";
        paragraph.appendChild(document.createElement("br"));
        spoiler.insertAdjacentElement("afterend", paragraph);

        const nextRange = document.createRange();
        nextRange.setStart(paragraph, 0);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        lastRangeRef.current = nextRange.cloneRange();
        emitChange();
        return true;
    }

    function insertCustomEmojiNode(key) {
        const emoji = CUSTOM_EMOJI[key];
        if (!emoji) return;
        focusEditor();
        const selection = window.getSelection();
        const range = restoreSelection();
        if (!selection || !range) return;

        const span = document.createElement("span");
        span.className = "editor-emoji post-rich-emoji";
        span.dataset.emojiKey = key;
        span.contentEditable = "false";
        const mount = document.createElement("span");
        span.appendChild(mount);
        const leadingGuard = document.createTextNode(CARET_GUARD);
        const trailingGuard = document.createTextNode(CARET_GUARD);
        const fragment = document.createDocumentFragment();
        fragment.appendChild(leadingGuard);
        fragment.appendChild(span);
        fragment.appendChild(trailingGuard);

        range.deleteContents();
        range.insertNode(fragment);

        const nextRange = document.createRange();
        nextRange.setStart(trailingGuard, trailingGuard.textContent.length);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        lastRangeRef.current = nextRange.cloneRange();

        const root = createRoot(mount);
        rootsRef.current.set(span, root);
        root.render(<TGSEmoji name={key} src={emoji.src} type={emoji.type} size={22} animate mountAnimation fallbackMode="soft" filename={emoji.filename} />);
        emitChange();
    }

    function handleBeforeInput(e) {
        if (typeof maxLength !== "number" || !e.inputType?.startsWith("insert")) return;
        const currentLength = extractPlainTextFromBlocks(serializeEditorDocument().blocks).length;
        const selectedLength = getSelectedTextLength(editorRef.current);
        const incomingLength = typeof e.data === "string" ? e.data.length : 1;
        if (currentLength - selectedLength + incomingLength > maxLength) {
            e.preventDefault();
        }
    }

    function handleInput() {
        rememberSelection();
        emitChange();
    }

    function handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        if (!text) return;
        ref?.current?.insertText?.(text);
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!e.shiftKey && exitCurrentSubheading()) {
                return;
            }
            if (e.shiftKey && exitCurrentQuote()) {
                return;
            }
            insertLineBreak();
            return;
        }

        if (e.key === " " || e.code === "Space") {
            if (exitSpoilerToNextLine()) {
                e.preventDefault();
                return;
            }
            if (exitCurrentStrikeWithSpace()) {
                e.preventDefault();
            }
        }
    }

    useImperativeHandle(ref, () => ({
        getElement() {
            return editorRef.current;
        },
        getStructuredContent() {
            return serializeEditorDocument();
        },
        getPlainText() {
            return extractPlainTextFromBlocks(serializeEditorDocument().blocks);
        },
        isEmpty() {
            return !this.getPlainText().trim();
        },
        insertText(text) {
            focusEditor();
            document.execCommand("insertText", false, text);
            rememberSelection();
            emitChange();
        },
        insertCustomEmoji(key) {
            insertCustomEmojiNode(key);
        },
        wrapSelection(prefix, suffix = prefix, fallbackText = "") {
            if (prefix === "**") { runExec("bold", null, true); return; }
            if (prefix === "_") { runExec("italic", null, true); return; }
            if (prefix === "~~") { runExec("strikeThrough", null, true); return; }
            if (prefix === "||") {
                const spoiler = getCurrentSpoiler();
                if (spoiler) {
                    unwrapElement(spoiler);
                    return;
                }
                wrapCurrentSelection((text) => {
                    const span = document.createElement("span");
                    span.className = "post-rich-spoiler";
                    span.textContent = text;
                    return span;
                }, fallbackText || "спойлер");
                return;
            }
            if (prefix === "[" && typeof suffix === "string" && suffix.startsWith("](")) {
                if (getCurrentLink()) {
                    runExec("unlink");
                    return;
                }
                const href = suffix.slice(2, -1);
                wrapCurrentSelection((text) => {
                    const link = document.createElement("a");
                    link.href = href;
                    link.target = "_blank";
                    link.rel = "noreferrer";
                    link.className = "post-rich-link";
                    link.textContent = text;
                    return link;
                }, fallbackText || "ссылка");
                return;
            }
            if (typeof prefix === "string" && prefix.startsWith(">[") && suffix === "<") {
                const quote = getCurrentQuote();
                if (quote) {
                    const body = quote.querySelector(".post-rich-quote-body") || quote;
                    if (body && quote.parentNode) {
                        while (body.firstChild) {
                            quote.parentNode.insertBefore(body.firstChild, quote);
                        }
                        quote.parentNode.removeChild(quote);
                        emitChange();
                    }
                    return;
                }
                const color = prefix.slice(2, -1) || "purple";
                wrapCurrentSelection((text) => {
                    const quote = document.createElement("blockquote");
                    quote.className = `post-rich-quote post-rich-quote--${color}`;
                    const body = document.createElement("div");
                    body.className = "post-rich-quote-body";
                    const paragraph = document.createElement("p");
                    paragraph.className = "post-rich-paragraph";
                    paragraph.textContent = text;
                    body.appendChild(paragraph);
                    quote.appendChild(body);
                    return quote;
                }, fallbackText || "Цитата");
            }
        },
        insertBlockLine(prefix) {
            if (prefix === "## ") {
                const currentSelection = window.getSelection();
                if (currentSelection?.rangeCount && !currentSelection.getRangeAt(0).collapsed) {
                    if (insertSubheadingFromSelection()) {
                        return;
                    }
                }

                const selection = window.getSelection();
                const currentNode = selection?.anchorNode?.parentElement?.closest("h1,h2,h3,h4,h5,h6,p,div");
                const isAlreadySubheading = currentNode && (
                    /^H[1-6]$/.test(currentNode.tagName) ||
                    currentNode.classList.contains("post-rich-subheading")
                );

                if (isAlreadySubheading) {
                    replaceCurrentBlock("p", "post-rich-paragraph");
                    emitChange();
                    return;
                }

                replaceCurrentBlock("h4", "post-rich-subheading");
                emitChange();
                return;
            }
            if (prefix === "- ") { runExec("insertUnorderedList"); return; }
            if (prefix === "1. ") { runExec("insertOrderedList"); return; }
        },
        insertDivider() {
            const divider = document.createElement("hr");
            divider.className = "post-rich-divider";
            insertNodeAtSelection(divider);
            emitChange();
        },
        insertLineBreak() {
            insertLineBreak();
        },
        clear() {
            const editor = editorRef.current;
            if (!editor) return;
            rootsRef.current.forEach((root) => root.unmount());
            rootsRef.current.clear();
            editor.innerHTML = "";
            lastRangeRef.current = null;
            emitChange();
        },
        setStructuredContent(documentValue) {
            setEditorDocument(documentValue, true);
        },
    }));

    useEffect(() => {
        const roots = rootsRef.current;
        return () => { roots.forEach((root) => root.unmount()); roots.clear(); };
    }, []);

    useEffect(() => {
        if (initialContentRef.current === initialContent) return;
        initialContentRef.current = initialContent;
        if (initialContent) {
            setEditorDocumentRef.current?.(initialContent, true);
        }
    }, [initialContent]);

    return (
        <div
            ref={editorRef}
            className="live-editor live-editor-rich"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onBeforeInput={handleBeforeInput}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={onFocus}
            onMouseUp={rememberSelection}
            onKeyUp={rememberSelection}
            onBlur={rememberSelection}
            spellCheck
        />
    );
});

export default RichPostEditor;
