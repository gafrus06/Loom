// src/components/CreatePostModal.js
import React, {
    useState, useRef, useEffect, useCallback,
    forwardRef, useImperativeHandle,
} from 'react';
import { createRoot } from 'react-dom/client';
import * as newsAPI from '../api/news';
import { getCurrentUser } from '../api/auth';
import * as campsAPI from '../api/camps';
import EMOJI_CATEGORIES from '../data/emojiData';
import TGSEmoji, { CUSTOM_EMOJI } from './TGSEmoji';
import '../styles/news.css';

const CUSTOM_EMOJI_LIST = Object.entries(CUSTOM_EMOJI).map(([key, val]) => ({
    key, src: val.src, type: val.type,
}));
const CUSTOM_KEYS = Object.keys(CUSTOM_EMOJI);

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

// ─── contentEditable LiveEditor ───────────────────────────────────────────────
const LiveEditor = forwardRef(({ onChange, placeholder }, ref) => {
    const editorRef = useRef(null);
    const rootsRef  = useRef(new Map());

    useImperativeHandle(ref, () => ({
        insertText(text) {
            const editor = editorRef.current;
            if (!editor) return;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            emitChange();
        },
        insertCustomEmoji(key) {
            insertCustomEmojiNode(key);
        },
        clear() {
            const editor = editorRef.current;
            if (!editor) return;
            rootsRef.current.forEach(r => r.unmount());
            rootsRef.current.clear();
            editor.innerHTML = '';
            emitChange();
        },
    }));

    function emitChange() {
        const editor = editorRef.current;
        if (!editor) return;
        onChange?.(readEditorText(editor));
    }

    function insertCustomEmojiNode(key) {
        const emoji = CUSTOM_EMOJI[key];
        if (!emoji) return;
        const editor = editorRef.current;
        if (!editor) return;

        const span = document.createElement('span');
        span.className = 'editor-emoji';
        span.dataset.emojiKey = key;
        span.contentEditable = 'false';

        const mount = document.createElement('span');
        span.appendChild(mount);

        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) {
            editor.appendChild(span);
        } else {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(span);
            range.setStartAfter(span);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        const root = createRoot(mount);
        rootsRef.current.set(span, root);
        root.render(<TGSEmoji name={key} src={emoji.src} type={emoji.type} size={26} />);

        emitChange();
    }

    function handleInput() { emitChange(); }

    function handleKeyDown(e) {
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

        if (e.key === 'Enter') {
            e.preventDefault();
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);
            range.setStartAfter(br);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            emitChange();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        emitChange();
    }

    useEffect(() => {
        const roots = rootsRef.current;
        return () => { roots.forEach(r => r.unmount()); roots.clear(); };
    }, []);

    return (
        <div
            ref={editorRef}
            className="live-editor"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
        />
    );
});

// ─── Заголовок (contentEditable, однострочный) ───────────────────────────────
const LiveInput = forwardRef(({ onChange, placeholder, onFocus }, ref) => {
    const editorRef = useRef(null);
    const rootsRef  = useRef(new Map());

    useImperativeHandle(ref, () => ({
        insertText(text) {
            const el = editorRef.current;
            if (!el) return;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            emitChange();
        },
        insertCustomEmoji(key) {
            const emoji = CUSTOM_EMOJI[key];
            if (!emoji) return;
            const el = editorRef.current;
            if (!el) return;

            const span = document.createElement('span');
            span.className = 'editor-emoji';
            span.dataset.emojiKey = key;
            span.contentEditable = 'false';
            const mount = document.createElement('span');
            span.appendChild(mount);

            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) {
                el.appendChild(span);
            } else {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(span);
                range.setStartAfter(span);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }

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
            emitChange();
        },
    }));

    function emitChange() {
        const el = editorRef.current;
        if (!el) return;
        onChange?.(readEditorText(el));
    }

    function handleInput() { emitChange(); }

    function handleKeyDown(e) {
        // Запрещаем Enter в заголовке
        if (e.key === 'Enter') {
            e.preventDefault();
            return;
        }

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
        const text = e.clipboardData.getData('text/plain').replace(/\n/g, ' ');
        document.execCommand('insertText', false, text);
        emitChange();
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
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={onFocus}
        />
    );
});

// ─── Кастомный эмодзи в пикере ────────────────────────────────────────────────
function CustomEmojiItem({ item, onSelect }) {
    return (
        <button type="button" className="emoji-item custom-emoji-item"
                onClick={() => onSelect(item.key)} title={item.key}>
            <TGSEmoji name={item.key} src={item.src} type={item.type} size={32} />
        </button>
    );
}

// ─── EmojiPicker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
    const [activeTab, setActiveTab] = useState(-1);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const searchResults = search.trim()
        ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(search.trim())).slice(0, 60)
        : null;
    const isCustomTab = activeTab === -1 && !search;

    return (
        <div className="emoji-picker">
            <div className="emoji-picker-search">
                <input autoFocus type="text" className="emoji-search-input"
                       placeholder="Поиск эмодзи..." value={search}
                       onChange={e => setSearch(e.target.value)} />
            </div>
            {!search && (
                <div className="emoji-picker-tabs">
                    <button type="button" className={`emoji-tab ${activeTab === -1 ? 'active' : ''}`}
                            onClick={() => setActiveTab(-1)} title="Кастомные">✨</button>
                    {EMOJI_CATEGORIES.map((cat, i) => (
                        <button key={cat.id} type="button"
                                className={`emoji-tab ${activeTab === i ? 'active' : ''}`}
                                onClick={() => setActiveTab(i)} title={cat.name}>{cat.label}</button>
                    ))}
                </div>
            )}
            <div className="emoji-picker-category-label">
                {search
                    ? (searchResults?.length ? `Найдено: ${searchResults.length}` : 'Ничего не найдено')
                    : isCustomTab ? 'Кастомные' : EMOJI_CATEGORIES[activeTab]?.name}
            </div>
            {isCustomTab ? (
                <div className="emoji-picker-grid custom-emoji-grid">
                    {CUSTOM_EMOJI_LIST.length === 0
                        ? <p style={{ gridColumn: '1/-1', color: 'var(--color-text-secondary)', fontSize: 13, padding: '8px 4px' }}>Нет кастомных эмодзи</p>
                        : CUSTOM_EMOJI_LIST.map(item => <CustomEmojiItem key={item.key} item={item} onSelect={onSelect} />)
                    }
                </div>
            ) : (
                <div className="emoji-picker-grid">
                    {(searchResults ?? EMOJI_CATEGORIES[activeTab]?.emojis ?? []).map((emoji, idx) => (
                        <button key={`${emoji}-${idx}`} type="button" className="emoji-item"
                                onClick={() => onSelect(emoji)} title={emoji}>{emoji}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

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

    const fileInputRef   = useRef(null);
    const videoInputRef  = useRef(null);
    const wrapRef        = useRef(null);
    const titleRef       = useRef(null);
    const editorRef      = useRef(null);
    const activeFieldRef = useRef('content');

    const isAdmin = currentUser?.roles?.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');
    const [adminCamps, setAdminCamps]         = useState([]);
    const [selectedCampId, setSelectedCampId] = useState(campId || null);

    useEffect(() => {
        if (isAdmin && isOpen) {
            campsAPI.getMyAccessibleCamps().then(camps => {
                setAdminCamps(camps || []);
                if (!selectedCampId && camps?.length > 0) setSelectedCampId(camps[0].id);
            }).catch(() => {});
        }
    }, [isAdmin, isOpen]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setTitle(''); setContent('');
            setImages([]); setImagePreviews([]);
            setVideos([]); setVideoPreviews([]);
            setIsPinned(false); setShowEmojiPicker(false);
            activeFieldRef.current = 'content';
            titleRef.current?.clear();
            editorRef.current?.clear();
        }
    }, [isOpen]);

    const handleEmojiSelect = useCallback((emoji) => {
        const isCustom = CUSTOM_KEYS.includes(emoji);
        // activeFieldRef точно актуален — selection не сбрасывался
        // благодаря onMouseDown.preventDefault() на кнопке и панели
        if (activeFieldRef.current === 'title') {
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
        return () => { videoPreviews.forEach(url => URL.revokeObjectURL(url)); };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSubmitting(true);
        try {
            const newPost = await newsAPI.createPost({
                campId: isAdmin ? selectedCampId : campId,
                sessionId,
                detachmentId: detachmentId || null,
                title: title.trim() || null,
                content: content.trim(),
                pinned: isPinned && isAdmin,
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
                        <EmojiPicker
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
                        />

                        <LiveEditor
                            ref={editorRef}
                            onChange={setContent}
                            placeholder="Что нового?"
                            onFocus={() => { activeFieldRef.current = 'content'; }}
                        />

                        <MediaPreview
                            images={images} imagePreviews={imagePreviews}
                            videos={videos} videoPreviews={videoPreviews}
                            onRemoveImage={removeImage} onRemoveVideo={removeVideo}
                        />

                        <div className="create-post-actions">
                            <div className="create-post-tools">

                                <button type="button" className="tool-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={videos.length > 0 && images.length === 0}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                    Фото {images.length > 0 && <span className="media-count">{images.length}</span>}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" multiple
                                       onChange={handleImageChange} style={{ display: 'none' }} />

                                <button type="button" className="tool-btn"
                                        onClick={() => videoInputRef.current?.click()}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="23 7 16 12 23 17 23 7"/>
                                        <rect x="1" y="5" width="15" height="14" rx="2"/>
                                    </svg>
                                    Видео {videos.length > 0 && <span className="media-count">{videos.length}</span>}
                                </button>
                                <input ref={videoInputRef} type="file"
                                       accept="video/mp4,video/quicktime,video/webm,video/avi,video/*"
                                       multiple onChange={handleVideoChange} style={{ display: 'none' }} />

                                <button type="button"
                                        className={`tool-btn ${showEmojiPicker ? 'active' : ''}`}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setShowEmojiPicker(v => !v)}>
                                    😊 Эмодзи
                                </button>

                                {isAdmin && (
                                    <label className="pin-checkbox">
                                        <input type="checkbox" checked={isPinned}
                                               onChange={e => setIsPinned(e.target.checked)} />
                                        📌 Закрепить
                                    </label>
                                )}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-modal-cancel"
                                        onClick={onClose} disabled={isSubmitting}>Отмена</button>
                                <button type="submit" className="btn-modal-submit"
                                        disabled={isSubmitting || !content.trim()}>
                                    {isSubmitting
                                        ? (totalMedia > 0 ? 'Загрузка медиа...' : 'Публикация...')
                                        : 'Опубликовать'}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}