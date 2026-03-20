import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewsFeed } from '../hooks/useNews';
import { getCurrentUser } from '../api/auth';
import * as campsAPI from '../api/camps';
import { authFetch } from '../api/auth';
import Post from './Post';
import CreatePostModal from './CreatePostModal';
import '../styles/news.css';

function CampDropdown({ camps, selectedCampId, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = camps.find(c => c.id === selectedCampId);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="camp-dropdown" ref={ref}>
            <button className="camp-dropdown-trigger" onClick={() => setOpen(o => !o)}>
                <span className="camp-dropdown-icon">🏕</span>
                <span className="camp-dropdown-label">{selected?.name || 'Выбрать лагерь'}</span>
                <svg className={`camp-dropdown-arrow ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>
            {open && (
                <div className="camp-dropdown-menu">
                    {camps.map(camp => (
                        <button
                            key={camp.id}
                            className={`camp-dropdown-item ${camp.id === selectedCampId ? 'active' : ''}`}
                            onClick={() => { onChange(camp); setOpen(false); }}
                        >
                            {camp.id === selectedCampId && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                            <span>{camp.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function NewsFeed({ campId: initialCampId, sessionId, detachmentId }) {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const loaderRef = useRef(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const isAdmin     = currentUser?.roles?.some(r => r === 'ADMIN'     || r === 'ROLE_ADMIN');
    const isCounselor = currentUser?.roles?.some(r => r === 'COUNSELOR' || r === 'ROLE_COUNSELOR');
    const isParent    = currentUser?.roles?.some(r => r === 'PARENT'    || r === 'ROLE_PARENT');

    // Показываем селектор лагеря если:
    // - админ (всегда)
    // - или пользователь с несколькими лагерями (вожатый + родитель в разных лагерях)
    const [availableCamps, setAvailableCamps]   = useState([]);
    const [selectedCampId, setSelectedCampId]   = useState(initialCampId || null);
    const [campsLoaded, setCampsLoaded]         = useState(false);

    // Загружаем доступные лагеря из всех источников:
    // - для админа/вожатого: /camps/my-accessible
    // - для родителя: через parent-links → memberships → detachment → camp
    useEffect(() => {
        if (!isAdmin && !isCounselor && !isParent) { setCampsLoaded(true); return; }

        const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

        async function loadAllCamps() {
            const campMap = new Map(); // id → camp, дедупликация

            // 1. Лагеря как вожатый/админ
            if (isAdmin || isCounselor) {
                try {
                    const list = await campsAPI.getMyAccessibleCamps() || [];
                    list.forEach(c => campMap.set(c.id, c));
                } catch {}
            }

            // 2. Лагерь как родитель — через ребёнка → членство → отряд → лагерь
            if (isParent) {
                try {
                    const linksRes = await authFetch(`${API_BASE}/parent-links/by-parent`);
                    if (linksRes.ok) {
                        const links = await linksRes.json();
                        for (const link of (links || []).slice(0, 3)) {
                            try {
                                // Получаем активное членство ребёнка
                                const memRes = await authFetch(`${API_BASE}/memberships/active?childId=${link.childId}`);
                                if (!memRes.ok) continue;
                                const membership = await memRes.json();
                                if (!membership?.detachmentId) continue;

                                // Получаем отряд → лагерь
                                const detRes = await authFetch(`${API_BASE}/detachments/${membership.detachmentId}`);
                                if (!detRes.ok) continue;
                                const detachment = await detRes.json();
                                if (!detachment?.campId) continue;

                                // Получаем лагерь
                                const campRes = await authFetch(`${API_BASE}/camps/${detachment.campId}`);
                                if (!campRes.ok) continue;
                                const camp = await campRes.json();
                                if (camp?.id) campMap.set(camp.id, camp);
                            } catch {}
                        }
                    }
                } catch {}
            }

            const allCamps = Array.from(campMap.values());
            setAvailableCamps(allCamps);
            if (!selectedCampId && allCamps.length > 0) {
                setSelectedCampId(allCamps[0].id);
            }
        }

        loadAllCamps().finally(() => setCampsLoaded(true));
    }, [isAdmin, isCounselor, isParent]);

    // Синхронизируем с prop если он изменился (для не-мультилагерных)
    useEffect(() => {
        if (initialCampId && !isAdmin) setSelectedCampId(initialCampId);
    }, [initialCampId, isAdmin]);

    // Показываем селектор если у пользователя больше одного лагеря
    const showCampSelector = campsLoaded && availableCamps.length > 1;

    // campId для запросов: если показываем селектор — берём выбранный,
    // иначе берём initialCampId (для вожатых/родителей с одним лагерём)
    const campId = showCampSelector ? selectedCampId : initialCampId;

    const canCreatePost = (isCounselor && !!campId) || isAdmin;

    const {
        posts, loading, error, filter, setFilter,
        hasMore, totalElements, refresh,
        addPost, updatePost, removePost,
        toggleLike, loadMore
    } = useNewsFeed(campId, sessionId, 'all', detachmentId);

    const handleLike   = useCallback(async (postId) => { try { await toggleLike(postId);   } catch {} }, [toggleLike]);
    const handleUpdate = useCallback((p)  => updatePost(p),  [updatePost]);
    const handleDelete = useCallback((id) => removePost(id), [removePost]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMore(); },
            { threshold: 0.1 }
        );
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadMore]);

    const handlePostCreated = () => { setShowCreateModal(false); refresh(); };

    const hasCampTab = isAdmin || isCounselor || isParent;
    const filters = [
        { value: 'all',     label: 'Все' },
        ...(hasCampTab ? [{ value: 'my-camp', label: showCampSelector ? 'Лагерь' : 'Мой лагерь' }] : []),
    ];

    return (
        <div className="news-feed">
            <div className="feed-header">
                <div className="feed-header-left">
                    <h1 className="feed-title">Посты</h1>
                    {totalElements > 0 && <span className="feed-count">{totalElements}</span>}
                </div>
                <div className="feed-header-right">
                    <div className="feed-filters">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                className={`filter-btn ${filter === f.value ? 'active' : ''}`}
                                onClick={() => setFilter(f.value)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Селектор лагеря — показываем на вкладке "Лагерь" если лагерей > 1 */}
                    {showCampSelector && filter === 'my-camp' && (
                        <CampDropdown
                            camps={availableCamps}
                            selectedCampId={selectedCampId}
                            onChange={(camp) => setSelectedCampId(camp.id)}
                        />
                    )}

                    {canCreatePost && (
                        <button className="create-post-fab" onClick={() => setShowCreateModal(true)} title="Создать пост">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            <span>Новый пост</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="posts-grid">
                {loading && posts.length === 0 && (
                    <>{[1,2,3,4,5,6].map(i => <div key={i} className="post-card-skeleton shimmer"></div>)}</>
                )}

                {error && (
                    <div className="feed-error" style={{ gridColumn: '1/-1' }}>
                        <span>⚠️</span><p>{error}</p>
                        <button onClick={refresh}>Повторить</button>
                    </div>
                )}

                {!loading && posts.length === 0 && !error && (
                    <div className="feed-empty" style={{ gridColumn: '1/-1' }}>
                        <div className="empty-icon">📭</div>
                        <h3>Пока нет постов</h3>
                        {canCreatePost && (
                            <>
                                <p>Создайте первый пост!</p>
                                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>Создать пост</button>
                            </>
                        )}
                    </div>
                )}

                {posts.map(post => (
                    <Post
                        key={post.id}
                        post={post}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onLike={() => handleLike(post.id)}
                        showPinControls={filter === 'my-camp' && isAdmin}
                    />
                ))}
            </div>

            {hasMore && (
                <div ref={loaderRef} className="feed-loader">
                    {loading && (
                        <div className="loader-spinner">
                            <div className="spinner"></div>
                            <span>Загрузка...</span>
                        </div>
                    )}
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="feed-end"><span>Все посты загружены</span></div>
            )}

            {posts.length > 10 && (
                <button className="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
            )}

            <CreatePostModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                campId={campId}
                sessionId={sessionId}
                detachmentId={detachmentId}
                onPostCreated={handlePostCreated}
            />
        </div>
    );
}