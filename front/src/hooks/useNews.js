import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getMyFeed, likePost, unlikePost } from '../services/news';

const PAGE_SIZE = 6;
const MY_CAMP_STALE_TIME = 20 * 1000;
const MY_CAMP_GC_TIME = 4 * 60 * 1000;
const ALL_FEED_STALE_TIME = 0;
const ALL_FEED_GC_TIME = 60 * 1000;

function sortFeedItems(filter, items) {
    if (filter !== 'all') return items;
    return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function buildFeedQueryKey({ campId, sessionId, filter, detachmentId }) {
    return ['news-feed', {
        campId: campId || null,
        sessionId: sessionId || null,
        filter,
        detachmentId: detachmentId || null,
    }];
}

async function fetchFeedPage({ pageParam = 0, queryKey }) {
    const [, params] = queryKey;
    const { campId, filter } = params;

    const response = filter === 'my-camp'
        ? await getMyFeed('my-camp', pageParam, PAGE_SIZE, campId)
        : await getMyFeed('all', pageParam, PAGE_SIZE);

    return {
        ...response,
        content: sortFeedItems(filter, response.content || []),
    };
}

function patchInfinitePosts(oldData, updater) {
    if (!oldData?.pages) return oldData;

    return {
        ...oldData,
        pages: oldData.pages.map((page, pageIndex) => ({
            ...page,
            content: updater(page.content || [], pageIndex),
        })),
    };
}

export async function prefetchNewsFeed(queryClient, { campId, sessionId, filter = 'all', detachmentId = null }) {
    if (filter !== 'my-camp') return;

    const queryKey = buildFeedQueryKey({ campId, sessionId, filter, detachmentId });

    await queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn: fetchFeedPage,
        initialPageParam: 0,
        staleTime: MY_CAMP_STALE_TIME,
        gcTime: MY_CAMP_GC_TIME,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage) return undefined;
            if (lastPage.last || (lastPage.content?.length || 0) < PAGE_SIZE) return undefined;
            return allPages.length;
        },
    });
}

export function useNewsFeed(campId, sessionId, initialFilter = 'all', detachmentId = null) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState(initialFilter);
    const isMyCampFeed = filter === 'my-camp';

    const queryKey = useMemo(
        () => buildFeedQueryKey({ campId, sessionId, filter, detachmentId }),
        [campId, sessionId, filter, detachmentId]
    );

    const query = useInfiniteQuery({
        queryKey,
        queryFn: fetchFeedPage,
        initialPageParam: 0,
        staleTime: isMyCampFeed ? MY_CAMP_STALE_TIME : ALL_FEED_STALE_TIME,
        gcTime: isMyCampFeed ? MY_CAMP_GC_TIME : ALL_FEED_GC_TIME,
        refetchOnMount: isMyCampFeed ? false : 'always',
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        placeholderData: (previousData) => previousData,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage) return undefined;
            if (lastPage.last || (lastPage.content?.length || 0) < PAGE_SIZE) return undefined;
            return allPages.length;
        },
    });

    const posts = useMemo(() => {
        const seen = new Set();
        const flattened = [];

        for (const page of query.data?.pages || []) {
            for (const post of page.content || []) {
                if (seen.has(post.id)) continue;
                seen.add(post.id);
                flattened.push(post);
            }
        }

        return flattened;
    }, [query.data]);

    const totalElements = query.data?.pages?.[0]?.totalElements || 0;
    const hasMore = Boolean(query.hasNextPage);
    const loading = query.isPending || query.isFetchingNextPage;
    const error = query.error?.message || null;

    const refresh = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey,
            exact: true,
            refetchType: 'active',
        });
    }, [queryClient, queryKey]);

    const loadMore = useCallback(() => {
        if (!query.hasNextPage || query.isFetchingNextPage) return;
        query.fetchNextPage();
    }, [query]);

    const addPost = useCallback((newPost) => {
        queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData?.pages?.length) {
                return {
                    pageParams: [0],
                    pages: [{
                        content: [newPost],
                        totalElements: 1,
                        last: true,
                    }],
                };
            }

            const firstPage = oldData.pages[0];
            const filtered = (firstPage.content || []).filter((post) => post.id !== newPost.id);

            return {
                ...oldData,
                pages: oldData.pages.map((page, index) => {
                    if (index !== 0) return page;
                    return {
                        ...page,
                        totalElements: (page.totalElements || 0) + 1,
                        content: sortFeedItems(filter, [newPost, ...filtered]),
                    };
                }),
            };
        });
    }, [filter, queryClient, queryKey]);

    const updatePost = useCallback((updatedPost) => {
        queryClient.setQueryData(queryKey, (oldData) => patchInfinitePosts(
            oldData,
            (content) => content.map((post) => (post.id === updatedPost.id ? updatedPost : post))
        ));
    }, [queryClient, queryKey]);

    const removePost = useCallback((postId) => {
        queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData?.pages) return oldData;

            const postExists = oldData.pages.some((page) =>
                (page.content || []).some((post) => post.id === postId)
            );
            if (!postExists) return oldData;

            return {
                ...oldData,
                pages: oldData.pages.map((page, index) => ({
                    ...page,
                    totalElements: index === 0 ? Math.max(0, (page.totalElements || 0) - 1) : page.totalElements,
                    content: (page.content || []).filter((post) => post.id !== postId),
                })),
            };
        });
    }, [queryClient, queryKey]);

    const toggleLike = useCallback(async (postId) => {
        const currentPost = posts.find((post) => post.id === postId);
        if (!currentPost) return;

        const nextLiked = !currentPost.userInteraction?.liked;

        queryClient.setQueryData(queryKey, (oldData) => patchInfinitePosts(
            oldData,
            (content) => content.map((post) => {
                if (post.id !== postId) return post;
                return {
                    ...post,
                    userInteraction: { ...post.userInteraction, liked: nextLiked },
                    stats: {
                        ...post.stats,
                        likesCount: Math.max(0, (post.stats?.likesCount || 0) + (nextLiked ? 1 : -1)),
                    },
                };
            })
        ));

        try {
            if (currentPost.userInteraction?.liked) {
                await unlikePost(postId);
            } else {
                await likePost(postId);
            }
        } catch {
            queryClient.setQueryData(queryKey, (oldData) => patchInfinitePosts(
                oldData,
                (content) => content.map((post) => (post.id === postId ? currentPost : post))
            ));
        }
    }, [posts, queryClient, queryKey]);

    return {
        posts,
        loading,
        error,
        filter,
        setFilter,
        hasMore,
        totalElements,
        refresh,
        addPost,
        updatePost,
        removePost,
        toggleLike,
        loadMore,
        isBackgroundRefreshing: query.isRefetching && !query.isPending && !query.isFetchingNextPage,
    };
}
