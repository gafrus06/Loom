import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNewsFeed } from "../hooks/useNews";
import { useSession } from "../state/sessionStore";
import { getCampSettings } from "../services/campSettings";
import { getCalendarEventsBySession } from "../services/calendarEvents";
import Post from "./Post";
import CreatePostModal from "./CreatePostModal";
import "./NewsFeed.css";

function hasRole(roles, roleName) {
    return roles.some((role) => {
        const normalized = String(role).toUpperCase();
        return normalized === roleName || normalized === `ROLE_${roleName}`;
    });
}

function CampDropdown({ camps, selectedCampId, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = camps.find((camp) => camp.id === selectedCampId);

    useEffect(() => {
        const handler = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="camp-dropdown" ref={ref}>
            <button className="camp-dropdown-trigger" onClick={() => setOpen((value) => !value)}>
                <span className="camp-dropdown-icon">🏕</span>
                <span className="camp-dropdown-label">{selected?.name || "Выбрать лагерь"}</span>
                <svg
                    className={`camp-dropdown-arrow ${open ? "open" : ""}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <div className="camp-dropdown-menu">
                    {camps.map((camp) => (
                        <button
                            key={camp.id}
                            className={`camp-dropdown-item ${camp.id === selectedCampId ? "active" : ""}`}
                            onClick={() => {
                                onChange(camp);
                                setOpen(false);
                            }}
                        >
                            {camp.id === selectedCampId && (
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <polyline points="20 6 9 17 4 12" />
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

export default function HomeNewsFeed({ contexts = [], initialContext = null }) {
    const session = useSession();
    const roles = session.user?.roles || [];
    const isAdmin = hasRole(roles, "ADMIN");
    const isCounselor = hasRole(roles, "COUNSELOR");
    const isParent = hasRole(roles, "PARENT");

    const loaderRef = useRef(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCampId, setSelectedCampId] = useState(initialContext?.campId || contexts[0]?.campId || null);
    const [initialFeedFilter] = useState(() => {
        const savedFilter = localStorage.getItem("homeNewsFeedFilter");
        return savedFilter === "my-camp" ? "my-camp" : "all";
    });

    useEffect(() => {
        const availableCampIds = new Set(contexts.map((context) => context.campId));
        if (selectedCampId && availableCampIds.has(selectedCampId)) return;
        setSelectedCampId(initialContext?.campId || contexts[0]?.campId || null);
    }, [contexts, initialContext?.campId, selectedCampId]);

    const showCampSelector = contexts.length > 1;
    const activeContext = useMemo(() => {
        if (showCampSelector) {
            return contexts.find((context) => context.campId === selectedCampId) || initialContext || null;
        }
        return initialContext || contexts[0] || null;
    }, [contexts, initialContext, selectedCampId, showCampSelector]);

    const availableCamps = useMemo(
        () => contexts.map((context) => ({ id: context.campId, name: context.campName })),
        [contexts]
    );

    const campId = activeContext?.campId || null;
    const sessionId = activeContext?.sessionId || null;
    const detachmentId = activeContext?.detachmentId || null;
    const canCreatePost = (isCounselor && Boolean(campId)) || isAdmin;

    const {
        posts,
        loading,
        error,
        filter,
        setFilter: setNewsFilter,
        hasMore,
        totalElements,
        refresh,
        updatePost,
        removePost,
        toggleLike,
        loadMore,
    } = useNewsFeed(campId, sessionId, initialFeedFilter, detachmentId);

    const sidebarQuery = useQuery({
        queryKey: ["home-feed", "sidebar", campId || null, sessionId || null, isParent, filter],
        enabled: filter === "my-camp" && Boolean(campId) && Boolean(sessionId),
        staleTime: 30_000,
        queryFn: async () => {
            const [settings, events] = await Promise.all([
                getCampSettings(campId).catch(() => null),
                getCalendarEventsBySession(sessionId).catch(() => []),
            ]);

            return {
                settings,
                events: Array.isArray(events)
                    ? events.sort((left, right) => String(left.eventDate || "").localeCompare(String(right.eventDate || "")))
                    : [],
            };
        },
    });

    const campSettings = sidebarQuery.data?.settings || null;
    const calendarEvents = sidebarQuery.data?.events || [];
    const sidebarLoading = sidebarQuery.isLoading || sidebarQuery.isFetching;
    const isMyCampView = filter === "my-camp";
    const canSeeCalendar = Boolean(
        campSettings?.calendarEnabled &&
        (!isParent || campSettings?.calendarVisibleForParents)
    );

    const handleLike = useCallback(async (postId) => {
        try {
            await toggleLike(postId);
        } catch {
            // Ошибка already handled в hook.
        }
    }, [toggleLike]);

    const handleUpdate = useCallback((post) => updatePost(post), [updatePost]);
    const handleDelete = useCallback((postId) => removePost(postId), [removePost]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadMore, loading]);

    const handlePostCreated = () => {
        setShowCreateModal(false);
        refresh();
    };

    const hasCampTab = isAdmin || isCounselor || isParent;
    const filters = [
        { value: "all", label: "Все" },
        ...(hasCampTab ? [{ value: "my-camp", label: showCampSelector ? "Лагерь" : "Мой лагерь" }] : []),
    ];

    useEffect(() => {
        if (!hasCampTab && filter !== "all") {
            setNewsFilter("all");
        }
    }, [filter, hasCampTab, setNewsFilter]);

    useEffect(() => {
        localStorage.setItem("homeNewsFeedFilter", filter);
    }, [filter]);

    const handleFilterChange = useCallback((nextFilter) => {
        setNewsFilter(nextFilter);
    }, [setNewsFilter]);

    const postsContent = (
        <>
            <div className="posts-grid">
                {loading && posts.length === 0 && (
                    <>
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="post-card-skeleton shimmer" />
                        ))}
                    </>
                )}

                {error && (
                    <div className="feed-error" style={{ gridColumn: "1/-1" }}>
                        <span>⚠️</span>
                        <p>{error}</p>
                        <button onClick={refresh}>Повторить</button>
                    </div>
                )}

                {!loading && posts.length === 0 && !error && (
                    <div className="feed-empty" style={{ gridColumn: "1/-1" }}>
                        <div className="empty-icon">📰</div>
                        <h3>Пока нет постов</h3>
                        {canCreatePost && (
                            <>
                                <p>Создайте первый пост.</p>
                                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                    Создать пост
                                </button>
                            </>
                        )}
                    </div>
                )}

                {posts.map((post) => (
                    <Post
                        key={post.id}
                        post={post}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onLike={() => handleLike(post.id)}
                        showPinControls={filter === "my-camp" && isAdmin}
                    />
                ))}
            </div>

            {hasMore && (
                <div ref={loaderRef} className="feed-loader">
                    {loading && (
                        <div className="loader-spinner">
                            <div className="spinner" />
                            <span>Загрузка...</span>
                        </div>
                    )}
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="feed-end">
                    <span>Все посты загружены</span>
                </div>
            )}
        </>
    );

    return (
        <div className="news-feed">
            <div className="feed-header">
                <div className="feed-header-left">
                    <h1 className="feed-title">Посты</h1>
                    {totalElements > 0 && <span className="feed-count">{totalElements}</span>}
                </div>
                <div className="feed-header-right">
                    <div className="feed-filters">
                        {filters.map((feedFilter) => (
                            <button
                                key={feedFilter.value}
                                className={`filter-btn ${filter === feedFilter.value ? "active" : ""}`}
                                onClick={() => handleFilterChange(feedFilter.value)}
                            >
                                {feedFilter.label}
                            </button>
                        ))}
                    </div>

                    {showCampSelector && filter === "my-camp" && (
                        <CampDropdown
                            camps={availableCamps}
                            selectedCampId={selectedCampId}
                            onChange={(camp) => {
                                setSelectedCampId(camp.id);
                                if (isAdmin) {
                                    localStorage.setItem("lastSelectedCamp", camp.id);
                                }
                            }}
                        />
                    )}

                    {canCreatePost && (
                        <button
                            className="create-post-fab"
                            onClick={() => setShowCreateModal(true)}
                            title="Создать пост"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Новый пост</span>
                        </button>
                    )}
                </div>
            </div>

            {isMyCampView ? (
                <div className="my-camp-layout">
                    <section className="my-camp-posts">{postsContent}</section>

                    <aside className="my-camp-sidebar">
                        {sidebarLoading ? (
                            <div className="my-camp-side-card my-camp-side-loading">
                                <div className="spinner-small" />
                                <span>Загрузка блока лагеря...</span>
                            </div>
                        ) : (
                            <>
                                {canSeeCalendar && (
                                    <section className="my-camp-side-card">
                                        <div className="my-camp-side-head">
                                            <h3>Календарь</h3>
                                            <span>{calendarEvents.length}</span>
                                        </div>

                                        {calendarEvents.length === 0 ? (
                                            <div className="my-camp-side-empty">
                                                <p>Событий в календаре пока нет</p>
                                            </div>
                                        ) : (
                                            <div className="my-camp-calendar-list">
                                                {calendarEvents.slice(0, 8).map((event) => (
                                                    <div key={event.id} className="my-camp-calendar-item">
                                                        <div className="my-camp-calendar-date">
                                                            <strong>
                                                                {new Date(event.eventDate).toLocaleDateString("ru-RU", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                })}
                                                            </strong>
                                                        </div>
                                                        <div className="my-camp-calendar-body">
                                                            <div className="my-camp-calendar-title">{event.title}</div>
                                                            {event.description && (
                                                                <div className="my-camp-calendar-desc">{event.description}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                <section className="my-camp-side-card">
                                    <div className="my-camp-side-head">
                                        <h3>Полезные материалы</h3>
                                    </div>
                                    <div className="my-camp-side-empty">
                                        <p>Пока материалов для родителей нет</p>
                                    </div>
                                </section>
                            </>
                        )}
                    </aside>
                </div>
            ) : (
                postsContent
            )}

            {posts.length > 10 && (
                <button
                    className="scroll-top-btn"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                    ↑
                </button>
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
