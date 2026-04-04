import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "../services/notifications";
import { queryKeys } from "../state/queryKeys";
import { useSession } from "../state/sessionStore";

export function useUnreadNotificationsCount(options = {}) {
    const session = useSession();

    return useQuery({
        queryKey: queryKeys.unreadNotifications,
        queryFn: getUnreadCount,
        enabled: session.isAuthenticated && options.enabled !== false,
        staleTime: 15_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        ...options,
    });
}
