import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../services/files";
import { useSession } from "../state/sessionStore";
import { queryKeys } from "../state/queryKeys";

export function useCurrentUserProfile(options = {}) {
    const session = useSession();

    return useQuery({
        queryKey: queryKeys.me,
        queryFn: getUserProfile,
        enabled: session.isAuthenticated && options.enabled !== false,
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        ...options,
    });
}
