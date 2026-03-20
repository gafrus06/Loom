import React, { useState, useRef } from 'react';
import * as newsAPI from '../api/news';
import { getCurrentUser } from '../api/auth';
import '../styles/news.css';

export default function CreatePost({ campId, sessionId, detachmentId, onPostCreated }) {
    const currentUser = getCurrentUser();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isPinned, setIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    const isAdmin = currentUser?.roles?.includes('ADMIN');

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > 10) {
            alert('Максимум 10 фото');
            return;
        }

        setImages(prev => [...prev, ...files]);

        // Создаем превью
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const postData = {
                campId,
                sessionId,
                detachmentId: detachmentId || null,
                title: title.trim() || null,
                content: content.trim(),
                pinned: isPinned && isAdmin
            };


            const newPost = await newsAPI.createPost(postData, images);

            // Очищаем форму
            setTitle('');
            setContent('');
            setImages([]);
            setImagePreviews([]);
            setIsPinned(false);

            onPostCreated?.(newPost);
        } catch (err) {
            alert('Ошибка при создании поста');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-post-card">
            <form onSubmit={handleSubmit}>
                <div className="create-post-header">
                    <div className="create-post-avatar">
                        {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="avatar" />
                        ) : (
                            <div className="avatar-fallback">
                                {currentUser?.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        className="create-post-title"
                        placeholder="Заголовок (необязательно)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <textarea
                    className="create-post-textarea"
                    placeholder="Что нового?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                />

                {/* Превью изображений */}
                {imagePreviews.length > 0 && (
                    <div className="image-previews">
                        {imagePreviews.map((preview, idx) => (
                            <div key={idx} className="image-preview">
                                <img src={preview} alt={`preview-${idx}`} />
                                <button
                                    type="button"
                                    className="remove-image"
                                    onClick={() => removeImage(idx)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="create-post-actions">
                    <div className="create-post-tools">
                        <button
                            type="button"
                            className="tool-btn"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            📷 Фото
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />

                        {isAdmin && (
                            <label className="pin-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                />
                                📌 Закрепить
                            </label>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="submit-post-btn"
                        disabled={isSubmitting || !content.trim()}
                    >
                        {isSubmitting ? 'Публикация...' : 'Опубликовать'}
                    </button>
                </div>
            </form>
        </div>
    );
}