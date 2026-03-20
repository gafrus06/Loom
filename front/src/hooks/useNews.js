// src/hooks/useNews.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getMyFeed,
    getCampFeed,
    likePost,
    unlikePost,
} from '../api/news';
import { getCurrentUser } from '../api/auth';

export function useNewsFeed(campId, sessionId, initialFilter = 'all', detachmentId = null) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState(initialFilter);
    const [hasMore, setHasMore] = useState(true);
    const [totalElements, setTotalElements] = useState(0);

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');

    const paramsRef = useRef({ campId, sessionId, filter, isAdmin, detachmentId });
    useEffect(() => {
        paramsRef.current = { campId, sessionId, filter, isAdmin, detachmentId };
    });

    const loadedPostIds = useRef(new Set());
    const pageRef = useRef(0);
    const isLoadingRef = useRef(false);

    const loadPosts = useCallback(async (reset = false) => {
        if (isLoadingRef.current) return;

        const { campId, filter, isAdmin } = paramsRef.current;
        const currentPage = reset ? 0 : pageRef.current;

        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            let response;

            if (filter === 'my-camp') {
                // Всегда используем getMyFeed, передаём campId если выбран в селекторе
                // Бэкенд использует campId напрямую или резолвит сам если не передан
                response = await getMyFeed('my-camp', currentPage, 6, campId);
            } else {
                // Вкладка "Все" — filter=all, бэкенд сортирует только по дате
                response = await getMyFeed('all', currentPage, 6);
            }

            const incoming = response.content || [];

            // Для вкладки "Все" дополнительно сортируем на фронте по дате
            // на случай, если бэкенд ещё не обновлён
            const sorted = filter === 'all'
                ? [...incoming].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                : incoming;

            if (reset) {
                loadedPostIds.current.clear();
                sorted.forEach(p => loadedPostIds.current.add(p.id));
                setPosts(sorted);
            } else {
                const fresh = sorted.filter(p => {
                    if (loadedPostIds.current.has(p.id)) return false;
                    loadedPostIds.current.add(p.id);
                    return true;
                });
                if (fresh.length > 0) {
                    setPosts(prev => [...prev, ...fresh]);
                } else {
                    setHasMore(false);
                }
            }

            setTotalElements(response.totalElements || 0);

            if ((response.content?.length || 0) < 6 || response.last) {
                setHasMore(false);
            } else {
                setHasMore(true);
                pageRef.current = currentPage + 1;
            }

            if (reset) pageRef.current = 1;

        } catch (err) {
            setError(err.message);
            setHasMore(false);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, []);

    useEffect(() => {
        pageRef.current = 0;
        loadedPostIds.current.clear();
        setHasMore(true);
        isLoadingRef.current = false;
        loadPosts(true);
    }, [filter, campId, sessionId, detachmentId, loadPosts]);

    const loadMore = useCallback(() => {
        if (!isLoadingRef.current && hasMore) loadPosts(false);
    }, [hasMore, loadPosts]);

    const refresh = useCallback(() => {
        pageRef.current = 0;
        loadedPostIds.current.clear();
        setHasMore(true);
        isLoadingRef.current = false;
        loadPosts(true);
    }, [loadPosts]);

    const addPost = useCallback((newPost) => {
        if (!loadedPostIds.current.has(newPost.id)) {
            loadedPostIds.current.add(newPost.id);
            setPosts(prev => [newPost, ...prev]);
            setTotalElements(prev => prev + 1);
        }
    }, []);

    const updatePost = useCallback((updatedPost) => {
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    }, []);

    const removePost = useCallback((postId) => {
        loadedPostIds.current.delete(postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
        setTotalElements(prev => prev - 1);
    }, []);

    const toggleLike = useCallback(async (postId) => {
        try {
            const post = posts.find(p => p.id === postId);
            if (!post) return;
            if (post.userInteraction?.liked) {
                await unlikePost(postId);
            } else {
                await likePost(postId);
            }
            setPosts(prev => prev.map(p => {
                if (p.id !== postId) return p;
                const liked = !p.userInteraction?.liked;
                return {
                    ...p,
                    userInteraction: { ...p.userInteraction, liked },
                    stats: { ...p.stats, likesCount: p.stats.likesCount + (liked ? 1 : -1) }
                };
            }));
        } catch {}
    }, [posts]);



    return {
        posts, loading, error, filter, setFilter,
        hasMore, totalElements, refresh,
        addPost, updatePost, removePost,
        toggleLike, loadMore
    };
}