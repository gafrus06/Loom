import React, {
    useState, useRef, useEffect, useCallback,
    forwardRef, useImperativeHandle,
} from 'react';
import { createRoot } from 'react-dom/client';
import * as newsAPI from '../services/news';
import { getCurrentUser } from '../services/auth';
import * as campsAPI from '../services/camps';
import TGSEmoji, { CUSTOM_EMOJI } from './TGSEmoji';
import EmojiPickerPanel from './EmojiPickerPanel';
import RichPostEditor from './RichPostEditor';
import RichTextSelectionToolbar from './RichTextSelectionToolbar';
import addIcon from '../assets/news/add.png';
import smileIcon from '../assets/news/smile.png';
import pinIcon from '../assets/news/zak.png';
import './CreatePostModal.css';

const CUSTOM_KEYS = Object.keys(CUSTOM_EMOJI);
const TITLE_LIMIT = 40;
const CONTENT_LIMIT = 1500;
const QUOTE_COLORS = [
    { key: 'purple', color: '#8c5eff' },
    { key: 'blue', color: '#4da3ff' },
    { key: 'green', color: '#5ecf86' },
    { key: 'yellow', color: '#f0c85c' },
    { key: 'red', color: '#ff6b7a' },
];

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function readEditorText(editor) {
    let text = '';
    editor.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.dataset?.emojiKey) {
            text += node.dataset.emojiKey;
        } else if (node.nodeName === 'BR') {
            text += '\n';
        }
    });
    return text;
}

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

function enforceMaxLength(editor, rootsRef, maxLength) {
    if (!editor || typeof maxLength !== 'number') return;

    let used = 0;
    let truncated = false;
    const nodes = Array.from(editor.childNodes);

    nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const remaining = maxLength - used;
            if (remaining <= 0) {
                node.textContent = '';
                truncated = true;
                return;
            }
            if (text.length > remaining) {
                node.textContent = text.slice(0, remaining);
                used = maxLength;
                truncated = true;
                return;
            }
            used += text.length;
            return;
        }

        if (node.nodeName === 'BR') {
            if (used >= maxLength) {
                node.remove();
                truncated = true;
                return;
            }
            used += 1;
            return;
        }

        if (node.dataset?.emojiKey) {
            const emojiLength = node.dataset.emojiKey.length;
            if (used + emojiLength > maxLength) {
                const root = rootsRef?.current?.get(node);
                if (root) {
                    root.unmount();
                    rootsRef.current.delete(node);
                }
                node.remove();
                truncated = true;
                return;
            }
            used += emojiLength;
            return;
        }
    });

    const selection = window.getSelection();
    if (truncated && selection && editor.contains(selection.anchorNode)) {
        placeCaretAtEnd(editor);
    }
}

// ─── contentEditable LiveEditor ───────────────────────────────────────────────
const LiveInput = forwardRef(({ onChange, placeholder, onFocus, maxLength }, ref) => {
    const editorRef = useRef(null);
    const rootsRef  = useRef(new Map());
    const lastRangeRef = useRef(null);

    function rememberSelection() {
        const el = editorRef.current;
        const selection = window.getSelection();
        if (!el || !selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!isRangeInside(el, range)) return;
        lastRangeRef.current = range.cloneRange();
    }

    function resolveInsertRange() {
        const el = editorRef.current;
        if (!el) return null;

        const selection = window.getSelection();
        if (selection?.rangeCount) {
            const liveRange = selection.getRangeAt(0);
            if (isRangeInside(el, liveRange)) {
                return liveRange;
            }
        }

        if (lastRangeRef.current && isRangeInside(el, lastRangeRef.current)) {
            const restored = lastRangeRef.current.cloneRange();
            selection?.removeAllRanges();
            selection?.addRange(restored);
            return restored;
        }

        return placeCaretAtEnd(el);
    }

    useImperativeHandle(ref, () => ({
        insertText(text) {
            const el = editorRef.current;
            if (!el) return;
            const selectedLength = getSelectedTextLength(el);
            const currentLength = readEditorText(el).length;
            const available = typeof maxLength === 'number'
                ? Math.max(0, maxLength - currentLength + selectedLength)
                : text.length;
            const nextText = typeof maxLength === 'number' ? text.slice(0, available) : text;
            if (!nextText) return;
            const sel = window.getSelection();
            const range = resolveInsertRange();
            if (!sel || !range) return;
            range.deleteContents();
            const textNode = document.createTextNode(nextText);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            lastRangeRef.current = range.cloneRange();
            emitChange();
        },
        insertCustomEmoji(key) {
            const emoji = CUSTOM_EMOJI[key];
            if (!emoji) return;
            const el = editorRef.current;
            if (!el) return;
            if (typeof maxLength === 'number') {
                const selectedLength = getSelectedTextLength(el);
                const currentLength = readEditorText(el).length;
                const available = Math.max(0, maxLength - currentLength + selectedLength);
                if (available <= 0) return;
            }

            const span = document.createElement('span');
            span.className = 'editor-emoji';
            span.dataset.emojiKey = key;
            span.contentEditable = 'false';
            const mount = document.createElement('span');
            span.appendChild(mount);

            const sel = window.getSelection();
            const range = resolveInsertRange();
            if (!sel || !range) return;
            range.deleteContents();
            range.insertNode(span);
            range.setStartAfter(span);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            lastRangeRef.current = range.cloneRange();

            const root = createRoot(mount);
            rootsRef.current.set(span, root);
            root.render(<TGSEmoji name={key} src={emoji.src} type={emoji.type} size={22} />);
            emitChange();
        },
        clear() {
            const el = editorRef.current;
            if (!el) return;
            rootsRef.current.forEach(r => r.unmount());
            rootsRef.current.clear();
            el.innerHTML = '';
            lastRangeRef.current = null;
            emitChange();
        },
    }));

    function emitChange() {
        const el = editorRef.current;
        if (!el) return;
        onChange?.(readEditorText(el));
    }

    function handleInput() {
        rememberSelection();
        enforceMaxLength(editorRef.current, rootsRef, maxLength);
        emitChange();
    }

    function handleBeforeInput(e) {
        if (typeof maxLength !== 'number') return;
        if (!e.inputType?.startsWith('insert')) return;
        const el = editorRef.current;
        if (!el) return;

        const selectedLength = getSelectedTextLength(el);
        const currentLength = readEditorText(el).length;
        const available = Math.max(0, maxLength - currentLength + selectedLength);

        if (available <= 0) {
            e.preventDefault();
            return;
        }

        if (typeof e.data === 'string' && e.data.length > available) {
            e.preventDefault();
            ref?.current?.insertText?.(e.data.slice(0, available));
        }
    }

    function handleKeyDown(e) {
        // Запрещаем Enter в заголовке
        if (e.key === 'Enter') {
            e.preventDefault();
            return;
        }

        rememberSelection();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        if (e.key === 'Backspace') {
            const node   = range.startContainer;
            const offset = range.startOffset;

            if (node.nodeType === Node.TEXT_NODE && offset === 0) {
                const prev = node.previousSibling;
                if (prev?.dataset?.emojiKey) {
                    e.preventDefault();
                    const root = rootsRef.current.get(prev);
                    if (root) { root.unmount(); rootsRef.current.delete(prev); }
                    prev.remove();
                    emitChange();
                }
            }
            if (node === editorRef.current) {
                const prevNode = editorRef.current.childNodes[offset - 1];
                if (prevNode?.dataset?.emojiKey) {
                    e.preventDefault();
                    const root = rootsRef.current.get(prevNode);
                    if (root) { root.unmount(); rootsRef.current.delete(prevNode); }
                    prevNode.remove();
                    emitChange();
                }
            }
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        // В заголовке убираем переносы строк
        const el = editorRef.current;
        if (!el) return;
        const selectedLength = getSelectedTextLength(el);
        const currentLength = readEditorText(el).length;
        const available = typeof maxLength === 'number'
            ? Math.max(0, maxLength - currentLength + selectedLength)
            : Number.MAX_SAFE_INTEGER;
        const text = e.clipboardData.getData('text/plain').replace(/\n/g, ' ').slice(0, available);
        if (!text) return;
        ref?.current?.insertText?.(text);
    }

    useEffect(() => {
        const roots = rootsRef.current;
        return () => { roots.forEach(r => r.unmount()); roots.clear(); };
    }, []);

    return (
        <div
            ref={editorRef}
            className="post-title-editor"
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
        />
    );
});

// ─── MediaPreview ─────────────────────────────────────────────────────────────
function MediaPreview({ images, imagePreviews, videos, videoPreviews, onRemoveImage, onRemoveVideo }) {
    if (imagePreviews.length === 0 && videoPreviews.length === 0) return null;
    return (
        <div className="image-previews">
            {imagePreviews.map((preview, idx) => (
                <div key={`img-${idx}`} className="image-preview">
                    <img src={preview} alt="" />
                    <button type="button" className="remove-image" onClick={() => onRemoveImage(idx)}>✕</button>
                </div>
            ))}
            {videoPreviews.map((preview, idx) => (
                <div key={`vid-${idx}`} className="image-preview video-preview">
                    <video src={preview} className="video-preview-player" controls muted preload="metadata" />
                    <div className="video-preview-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        {videos[idx]?.name}
                    </div>
                    <button type="button" className="remove-image" onClick={() => onRemoveVideo(idx)}>✕</button>
                </div>
            ))}
        </div>
    );
}

// ─── Основной компонент ───────────────────────────────────────────────────────
export default function CreatePostModal({ isOpen, onClose, campId, sessionId, detachmentId, onPostCreated }) {
    const currentUser = getCurrentUser();

    const [title, setTitle]                   = useState('');
    const [content, setContent]               = useState('');
    const [images, setImages]                 = useState([]);
    const [imagePreviews, setImagePreviews]   = useState([]);
    const [videos, setVideos]                 = useState([]);
    const [videoPreviews, setVideoPreviews]   = useState([]);
    const [isPinned, setIsPinned]             = useState(false);
    const [isSubmitting, setIsSubmitting]     = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedQuoteColor, setSelectedQuoteColor] = useState('purple');
    const [formatToolbar, setFormatToolbar] = useState({ visible: false, top: 0, left: 0 });

    const mediaInputRef  = useRef(null);
    const wrapRef        = useRef(null);
    const editorShellRef = useRef(null);
    const selectionToolbarRef = useRef(null);
    const toolbarShowTimeoutRef = useRef(null);
    const previousVideoPreviewsRef = useRef([]);
    const titleRef       = useRef(null);
    const editorRef      = useRef(null);
    const activeFieldRef = useRef('content');

    const isAdmin = currentUser?.roles?.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');
    const [adminCamps, setAdminCamps]         = useState([]);
    const [selectedCampId, setSelectedCampId] = useState(campId || null);

    useEffect(() => {
        if (!isAdmin || !isOpen) return undefined;

        let isCancelled = false;

        campsAPI.getMyAccessibleCamps()
            .then((camps) => {
                if (isCancelled) return;

                const nextCamps = camps || [];
                setAdminCamps(nextCamps);
                setSelectedCampId((prev) => prev || nextCamps[0]?.id || null);
            })
            .catch(() => {});

        return () => {
            isCancelled = true;
        };
    }, [isAdmin, isOpen]);

    useEffect(() => {
        const h = (e) => {
            if (selectionToolbarRef.current?.contains(e.target)) return;
            if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setTitle(''); setContent('');
            setImages([]); setImagePreviews([]);
            setVideos([]); setVideoPreviews([]);
            setIsPinned(false); setShowEmojiPicker(false);
            setFormatToolbar({ visible: false, top: 0, left: 0 });
            if (toolbarShowTimeoutRef.current) {
                clearTimeout(toolbarShowTimeoutRef.current);
                toolbarShowTimeoutRef.current = null;
            }
            activeFieldRef.current = 'content';
            titleRef.current?.clear();
            editorRef.current?.clear();
        }
    }, [isOpen]);

    const handleEmojiSelect = useCallback((emoji) => {
        const isCustom = CUSTOM_KEYS.includes(emoji);
        const activeElement = document.activeElement;
        const shouldInsertIntoTitle = activeFieldRef.current === 'title'
            && activeElement?.classList?.contains('post-title-editor');

        if (shouldInsertIntoTitle) {
            if (isCustom) {
                titleRef.current?.insertCustomEmoji(emoji);
            } else {
                titleRef.current?.insertText(emoji);
            }
        } else {
            if (isCustom) {
                editorRef.current?.insertCustomEmoji(emoji);
            } else {
                editorRef.current?.insertText(emoji);
            }
        }
    }, []);

    const applyInlineFormat = useCallback((prefix, suffix = prefix, fallbackText = '') => {
        activeFieldRef.current = 'content';
        editorRef.current?.wrapSelection(prefix, suffix, fallbackText);
    }, []);

    const insertBlockToken = useCallback((prefix, fallbackText = '') => {
        activeFieldRef.current = 'content';
        editorRef.current?.insertBlockLine(prefix, fallbackText);
    }, []);

    const insertDividerToken = useCallback(() => {
        activeFieldRef.current = 'content';
        editorRef.current?.insertDivider();
    }, []);

    const insertLinkToken = useCallback(() => {
        const href = window.prompt('Введите ссылку');
        if (!href) return;
        activeFieldRef.current = 'content';
        editorRef.current?.wrapSelection('[', `](${href})`, 'ссылка');
    }, []);

    const updateFloatingToolbar = useCallback(() => {
        const editorElement = editorRef.current?.getElement?.();
        const shellElement = editorShellRef.current;
        const selection = window.getSelection();

        if (!isOpen || !editorElement || !shellElement || !selection || !selection.rangeCount || selection.isCollapsed) {
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }

        const range = selection.getRangeAt(0);
        if (!isRangeInside(editorElement, range) || !range.toString().trim()) {
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }

        const rangeRect = range.getBoundingClientRect();
        if (!rangeRect.width && !rangeRect.height) {
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }

        const toolbarWidth = selectionToolbarRef.current?.offsetWidth || 280;
        const horizontalPadding = (toolbarWidth / 2) + 12;
        const nextLeft = Math.min(
            Math.max(rangeRect.left + rangeRect.width / 2, horizontalPadding),
            Math.max(horizontalPadding, window.innerWidth - horizontalPadding)
        );
        const nextTop = Math.max(16, rangeRect.top - 14);

        setFormatToolbar({
            visible: true,
            top: nextTop,
            left: nextLeft,
        });
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleHide = () => {
            if (toolbarShowTimeoutRef.current) {
                clearTimeout(toolbarShowTimeoutRef.current);
                toolbarShowTimeoutRef.current = null;
            }
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        };

        const handleSelectionChange = () => {
            if (toolbarShowTimeoutRef.current) {
                clearTimeout(toolbarShowTimeoutRef.current);
            }
            toolbarShowTimeoutRef.current = window.setTimeout(() => {
                window.requestAnimationFrame(updateFloatingToolbar);
            }, 180);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('resize', handleHide);
        window.addEventListener('scroll', handleHide, true);

        return () => {
            if (toolbarShowTimeoutRef.current) {
                clearTimeout(toolbarShowTimeoutRef.current);
                toolbarShowTimeoutRef.current = null;
            }
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('resize', handleHide);
            window.removeEventListener('scroll', handleHide, true);
        };
    }, [isOpen, updateFloatingToolbar]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > 10) { alert('Максимум 10 фото'); return; }
        setImages(prev => [...prev, ...files]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result]);
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const handleMediaChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const nextImages = files.filter(file => file.type.startsWith('image/'));
        const nextVideos = files.filter(file => file.type.startsWith('video/'));

        if (nextImages.length) {
            const syntheticImageEvent = { target: { files: nextImages, value: '' } };
            handleImageChange(syntheticImageEvent);
        }

        if (nextVideos.length) {
            const syntheticVideoEvent = { target: { files: nextVideos, value: '' } };
            handleVideoChange(syntheticVideoEvent);
        }

        e.target.value = '';
    };

    const removeImage = (idx) => {
        setImages(p => p.filter((_, i) => i !== idx));
        setImagePreviews(p => p.filter((_, i) => i !== idx));
    };

    const handleVideoChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + videos.length > 3) { alert('Максимум 3 видео'); return; }
        const oversized = files.filter(f => f.size > 200 * 1024 * 1024);
        if (oversized.length > 0) { alert(`Слишком большой файл: ${oversized.map(f => f.name).join(', ')}`); return; }
        setVideos(prev => [...prev, ...files]);
        files.forEach(file => setVideoPreviews(prev => [...prev, URL.createObjectURL(file)]));
        e.target.value = '';
    };

    const removeVideo = (idx) => {
        URL.revokeObjectURL(videoPreviews[idx]);
        setVideos(p => p.filter((_, i) => i !== idx));
        setVideoPreviews(p => p.filter((_, i) => i !== idx));
    };

    useEffect(() => {
        const previousVideoPreviews = previousVideoPreviewsRef.current;

        previousVideoPreviews
            .filter((url) => !videoPreviews.includes(url))
            .forEach((url) => URL.revokeObjectURL(url));

        previousVideoPreviewsRef.current = videoPreviews;
    }, [videoPreviews]);

    useEffect(() => () => {
        previousVideoPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const structuredContent = editorRef.current?.getStructuredContent?.();
        const plainContent = editorRef.current?.getPlainText?.() || content;
        if (!plainContent.trim()) return;
        setIsSubmitting(true);
        try {
            const newPost = await newsAPI.createPost({
                campId: isAdmin ? selectedCampId : campId,
                sessionId,
                detachmentId: detachmentId || null,
                title: title.trim() || null,
                content: plainContent.trim(),
                contentJson: structuredContent,
                isPinned: isPinned && isAdmin,
            }, images, videos);
            onPostCreated?.(newPost);
            onClose();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;
    const totalMedia = images.length + videos.length;

    return (
        <div className="modal-overlay">
            <div className="create-post-modal-wrap" ref={wrapRef}>

                {showEmojiPicker && (
                    <div className="emoji-side-panel" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}>
                        <EmojiPickerPanel
                            onSelect={handleEmojiSelect}
                            onClose={() => setShowEmojiPicker(false)}
                        />
                    </div>
                )}

                <div className="modal-content create-post-modal">
                    <div className="modal-header">
                        <h2>Создать пост</h2>
                        <button className="modal-close-btn" onClick={onClose}>✕</button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="create-post-form-body">

                        {isAdmin && (
                            <div className="create-post-camp-selector">
                                <span className="create-post-camp-label">🏕️ Лагерь</span>
                                <div className="create-post-camp-select-wrap">
                                    <select className="create-post-camp-select"
                                            value={selectedCampId || ''}
                                            onChange={e => setSelectedCampId(e.target.value)}>
                                        <option value="" disabled>Выберите лагерь</option>
                                        {adminCamps.map(camp => (
                                            <option key={camp.id} value={camp.id}>{camp.name}</option>
                                        ))}
                                    </select>
                                    <span className="create-post-camp-arrow">▾</span>
                                </div>
                            </div>
                        )}

                        <LiveInput
                            ref={titleRef}
                            onChange={setTitle}
                            placeholder="Заголовок (необязательно)"
                            onFocus={() => { activeFieldRef.current = 'title'; }}
                            maxLength={TITLE_LIMIT}
                        />

                        <div className="post-editor-shell" ref={editorShellRef}>
                            <button
                                type="button"
                                className={`post-editor-emoji-trigger ${showEmojiPicker ? 'is-active' : ''}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowEmojiPicker((value) => !value)}
                                aria-label="Emoji"
                                title="Emoji"
                            >
                                <img src={smileIcon} alt="" />
                            </button>
                            <button
                                type="button"
                                className="post-editor-divider-trigger"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={insertDividerToken}
                                aria-label="Разделитель"
                                title="Разделитель"
                            >
                                ---
                            </button>

                            <div className="post-editor-input-layer">
                                <RichPostEditor
                                    ref={editorRef}
                                    onChange={setContent}
                                    placeholder={"\u0427\u0442\u043e \u043d\u043e\u0432\u043e\u0433\u043e?"}
                                    onFocus={() => { activeFieldRef.current = 'content'; }}
                                    maxLength={CONTENT_LIMIT}
                                />
                            </div>
                        </div>

                        <MediaPreview
                            images={images} imagePreviews={imagePreviews}
                            videos={videos} videoPreviews={videoPreviews}
                            onRemoveImage={removeImage} onRemoveVideo={removeVideo}
                        />
                        </div>

                        <div className="create-post-actions">
                            <div className="create-post-tools">

                                <button
                                    type="button"
                                    className="tool-btn tool-btn--media"
                                    onClick={() => mediaInputRef.current?.click()}
                                    title="Добавить медиа"
                                >
                                    <img src={addIcon} alt="" className="tool-btn-icon" />
                                    {totalMedia > 0 && <span className="media-count">{totalMedia}</span>}
                                </button>
                                <input
                                    ref={mediaInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleMediaChange}
                                    style={{ display: 'none' }}
                                />

                                {isAdmin && (
                                    <label className={`pin-checkbox ${isPinned ? 'is-active' : ''}`}>
                                        <input type="checkbox" checked={isPinned}
                                               onChange={e => setIsPinned(e.target.checked)} />
                                        <img src={pinIcon} alt="" className="pin-checkbox-icon" />
                                    </label>
                                )}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-modal-cancel"
                                        onClick={onClose} disabled={isSubmitting}>Отмена</button>
                                <button type="submit" className="btn-modal-submit"
                                        disabled={isSubmitting || !(editorRef.current?.getPlainText?.() || content).trim()}>
                                    {isSubmitting
                                        ? (totalMedia > 0 ? 'Загрузка медиа...' : 'Публикация...')
                                        : 'Опубликовать'}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
                <RichTextSelectionToolbar
                    visible={formatToolbar.visible}
                    top={formatToolbar.top}
                    left={formatToolbar.left}
                    toolbarRef={selectionToolbarRef}
                    quoteColors={QUOTE_COLORS}
                    selectedQuoteColor={selectedQuoteColor}
                    onSelectQuoteColor={setSelectedQuoteColor}
                    onBold={() => applyInlineFormat('**', '**', '??????')}
                    onItalic={() => applyInlineFormat('_', '_', '??????')}
                    onStrike={() => applyInlineFormat('~~', '~~', '??????????')}
                    onSpoiler={() => applyInlineFormat('||', '||', '???????')}
                    onLink={insertLinkToken}
                    onSubheading={() => insertBlockToken('## ', '????????????')}
                    onQuote={() => applyInlineFormat(`>[${selectedQuoteColor}]`, '<', '??????')}
                    onBulletList={() => insertBlockToken('- ')}
                    onOrderedList={() => insertBlockToken('1. ')}
                />
            </div>
        </div>
    );
}
