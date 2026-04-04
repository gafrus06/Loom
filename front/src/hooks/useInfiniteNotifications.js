import { useInfiniteQuery } from "@tanstack/react-query";
import { getMyNotifications } from "../services/notifications";
import { queryKeys } from "../state/queryKeys";
import { useSession } from "../state/sessionStore";

export function useInfiniteNotifications(pageSize = 20, options = {}) {
    const session = useSession();

    return useInfiniteQuery({
        queryKey: queryKeys.notifications(pageSize),
        queryFn: ({ pageParam = 0 }) => getMyNotifications({ page: pageParam, size: pageSize }),
        enabled: session.isAuthenticated && options.enabled !== false,
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const items = Array.isArray(lastPage) ? lastPage : [];
            return items.length < pageSize ? undefined : allPages.length;
        },
        staleTime: 15_000,
        gcTime: 10 * 60_000,
        ...options,
    });
}
