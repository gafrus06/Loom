import React, { useCallback, useEffect, useRef, useState } from "react";
import * as newsAPI from "../services/news";
import { buildPostContentDocument } from "../utils/postContent";
import EmojiPickerPanel from "./EmojiPickerPanel";
import RichPostEditor from "./RichPostEditor";
import RichTextSelectionToolbar from "./RichTextSelectionToolbar";
import addIcon from "../assets/news/add.png";
import smileIcon from "../assets/news/smile.png";
import "./CreatePostModal.css";

const CONTENT_LIMIT = 1500;
const QUOTE_COLORS = [
    { key: "purple", color: "#8c5eff" },
    { key: "blue", color: "#4da3ff" },
    { key: "green", color: "#5ecf86" },
    { key: "yellow", color: "#f0c85c" },
    { key: "red", color: "#ff6b7a" },
];

export default function EditRichPostModal({ post, isOpen, onClose, onUpdate }) {
    const [title, setTitle] = useState(post.title || "");
    const [content, setContent] = useState(post.content || "");
    const [editorDocument, setEditorDocument] = useState(
        post.contentJson || buildPostContentDocument(post.content || "")
    );
    const [newImages, setNewImages] = useState([]);
    const [newPreviews, setNewPreviews] = useState([]);
    const [newVideos, setNewVideos] = useState([]);
    const [newVideoPreviews, setNewVideoPreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedQuoteColor, setSelectedQuoteColor] = useState("purple");
    const [formatToolbar, setFormatToolbar] = useState({ visible: false, top: 0, left: 0 });

    const fileInputRef = useRef(null);
    const modalRef = useRef(null);
    const editorRef = useRef(null);
    const selectionToolbarRef = useRef(null);
    const toolbarShowTimeoutRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const nextDocument = post.contentJson || buildPostContentDocument(post.content || "");
        setTitle(post.title || "");
        setContent(post.content || "");
        setEditorDocument(nextDocument);
        setNewImages([]);
        setNewPreviews([]);
        setNewVideos([]);
        setNewVideoPreviews([]);
        setShowEmojiPicker(false);
        setSelectedQuoteColor("purple");
        setFormatToolbar({ visible: false, top: 0, left: 0 });
        requestAnimationFrame(() => {
            editorRef.current?.setStructuredContent?.(nextDocument);
        });
    }, [isOpen, post]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleOutsideClick = (event) => {
            if (selectionToolbarRef.current?.contains(event.target)) return;
            if (modalRef.current && !modalRef.current.contains(event.target)) onClose();
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;
        const previousBodyOverflow = body.style.overflow;
        const previousHtmlOverflow = html.style.overflow;

        body.style.overflow = "hidden";
        html.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.width = "100%";

        const preventTouch = (event) => event.preventDefault();
        document.addEventListener("touchmove", preventTouch, { passive: false });

        return () => {
            body.style.overflow = previousBodyOverflow;
            html.style.overflow = previousHtmlOverflow;
            body.style.position = "";
            body.style.top = "";
            body.style.width = "";
            window.scrollTo(0, scrollY);
            document.removeEventListener("touchmove", preventTouch);
        };
    }, [isOpen]);

    useEffect(() => (
        () => {
            newVideoPreviews.forEach((url) => URL.revokeObjectURL(url));
        }
    ), [newVideoPreviews]);

    const updateFloatingToolbar = useCallback(() => {
        const editorElement = editorRef.current?.getElement?.();
        const selection = window.getSelection();

        if (!isOpen || !editorElement || !selection || !selection.rangeCount || selection.isCollapsed) {
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }

        const range = selection.getRangeAt(0);
        const common = range.commonAncestorContainer;
        if (!common || !editorElement.contains(common) || !range.toString().trim()) {
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }

        const rangeRect = range.getBoundingClientRect();
        if (!rangeRect.width && !rangeRect.height) {
            setFormatToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }

        const toolbarWidth = selectionToolbarRef.current?.offsetWidth || 280;
        const horizontalPadding = toolbarWidth / 2 + 12;
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

        const hideToolbar = () => {
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

        document.addEventListener("selectionchange", handleSelectionChange);
        window.addEventListener("resize", hideToolbar);
        window.addEventListener("scroll", hideToolbar, true);

        return () => {
            if (toolbarShowTimeoutRef.current) {
                clearTimeout(toolbarShowTimeoutRef.current);
                toolbarShowTimeoutRef.current = null;
            }
            document.removeEventListener("selectionchange", handleSelectionChange);
            window.removeEventListener("resize", hideToolbar);
            window.removeEventListener("scroll", hideToolbar, true);
        };
    }, [isOpen, updateFloatingToolbar]);

    const handleImageChange = (files) => {
        if (files.length + newImages.length > 10) {
            alert("Максимум 10 фото");
            return;
        }
        setNewImages((prev) => [...prev, ...files]);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => setNewPreviews((prev) => [...prev, reader.result]);
            reader.readAsDataURL(file);
        });
    };

    const handleVideoChange = (files) => {
        if (files.length + newVideos.length > 3) {
            alert("Максимум 3 видео");
            return;
        }
        const oversized = files.filter((file) => file.size > 200 * 1024 * 1024);
        if (oversized.length > 0) {
            alert(`Слишком большой файл: ${oversized.map((file) => file.name).join(", ")}`);
            return;
        }
        setNewVideos((prev) => [...prev, ...files]);
        files.forEach((file) => {
            setNewVideoPreviews((prev) => [...prev, URL.createObjectURL(file)]);
        });
    };

    const handleMediaChange = (event) => {
        const files = Array.from(event.target.files || []);
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));
        const videoFiles = files.filter((file) => file.type.startsWith("video/"));
        if (imageFiles.length) handleImageChange(imageFiles);
        if (videoFiles.length) handleVideoChange(videoFiles);
        event.target.value = "";
    };

    const removeNewImage = (index) => {
        setNewImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
        setNewPreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const removeNewVideo = (index) => {
        URL.revokeObjectURL(newVideoPreviews[index]);
        setNewVideos((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
        setNewVideoPreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const handleEmojiSelect = useCallback((emoji) => {
        editorRef.current?.insertCustomEmoji?.(emoji);
    }, []);

    const applyInlineFormat = useCallback((prefix, suffix = prefix, fallbackText = "") => {
        editorRef.current?.wrapSelection(prefix, suffix, fallbackText);
    }, []);

    const insertBlockToken = useCallback((prefix) => {
        editorRef.current?.insertBlockLine(prefix);
    }, []);

    const insertDividerToken = useCallback(() => {
        editorRef.current?.insertDivider();
    }, []);

    const insertLinkToken = useCallback(() => {
        const href = window.prompt("Введите ссылку");
        if (!href) return;
        editorRef.current?.wrapSelection("[", `](${href})`, "ссылка");
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const plainContent = editorRef.current?.getPlainText?.() || content;
        const structuredContent = editorRef.current?.getStructuredContent?.()
            || editorDocument
            || buildPostContentDocument(content.trim());
        if (!plainContent.trim()) return;

        setIsSubmitting(true);
        try {
            const updated = await newsAPI.updatePost(
                post.id,
                {
                    title: title.trim() || null,
                    content: plainContent.trim(),
                    contentJson: structuredContent,
                },
                newImages,
                newVideos
            );
            onUpdate?.(updated);
            onClose();
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="create-post-modal-wrap" ref={modalRef}>
                {showEmojiPicker && (
                    <div className="emoji-side-panel" onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                        <EmojiPickerPanel onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                    </div>
                )}

                <div className="modal-content create-post-modal">
                    <div className="modal-header">
                        <h2>Редактировать пост</h2>
                        <button className="modal-close-btn" onClick={onClose}>✕</button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="create-post-form-body">
                            <input
                                type="text"
                                className="create-post-title-input"
                                placeholder="Заголовок"
                                value={title}
                                maxLength={40}
                                onChange={(event) => setTitle(event.target.value.slice(0, 40))}
                            />

                            <div className="post-editor-shell">
                                <button
                                    type="button"
                                    className={`post-editor-emoji-trigger ${showEmojiPicker ? "is-active" : ""}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => setShowEmojiPicker((value) => !value)}
                                    aria-label="Emoji"
                                    title="Emoji"
                                >
                                    <img src={smileIcon} alt="" />
                                </button>
                                <button
                                    type="button"
                                    className="post-editor-divider-trigger"
                                    onMouseDown={(event) => event.preventDefault()}
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
                                        placeholder={"Что нового?"}
                                        maxLength={CONTENT_LIMIT}
                                    />
                                </div>
                            </div>

                            {(newPreviews.length > 0 || newVideoPreviews.length > 0) && (
                                <div className="media-preview-grid">
                                    {newPreviews.map((src, index) => (
                                        <div key={`${src}-${index}`} className="media-preview-card">
                                            <img src={src} alt="" className="media-preview-image" />
                                            <button
                                                type="button"
                                                className="media-preview-remove"
                                                onClick={() => removeNewImage(index)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {newVideoPreviews.map((src, index) => (
                                        <div key={`${src}-${index}`} className="media-preview-card">
                                            <video src={src} className="media-preview-image" muted playsInline />
                                            <button
                                                type="button"
                                                className="media-preview-remove"
                                                onClick={() => removeNewVideo(index)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="create-post-actions">
                            <div className="create-post-tools">
                                <button
                                    type="button"
                                    className="tool-btn tool-btn--media"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Добавить медиа"
                                >
                                    <img src={addIcon} alt="" className="tool-btn-icon" />
                                    {(newImages.length + newVideos.length) > 0 && (
                                        <span className="media-count">{newImages.length + newVideos.length}</span>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleMediaChange}
                                    hidden
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={isSubmitting}>
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    disabled={isSubmitting || !(editorRef.current?.getPlainText?.() || content).trim()}
                                >
                                    {isSubmitting ? "Сохранение..." : "Сохранить"}
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
                    onBold={() => applyInlineFormat("**", "**", "текст")}
                    onItalic={() => applyInlineFormat("_", "_", "текст")}
                    onStrike={() => applyInlineFormat("~~", "~~", "зачёркнуто")}
                    onSpoiler={() => applyInlineFormat("||", "||", "спойлер")}
                    onLink={insertLinkToken}
                    onSubheading={() => insertBlockToken("## ", "Подзаголовок")}
                    onQuote={() => applyInlineFormat(`>[${selectedQuoteColor}]`, "<", "цитата")}
                    onBulletList={() => insertBlockToken("- ")}
                    onOrderedList={() => insertBlockToken("1. ")}
                />
            </div>
        </div>
    );
}
