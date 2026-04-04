import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMediaUrlsBatch } from "../services/news";
import { queryKeys } from "../state/queryKeys";

export function usePostMediaUrls(media = []) {
    const fileIds = useMemo(() => (
        Array.from(new Set((media || []).map((item) => item?.fileId).filter(Boolean)))
    ), [media]);

    return useQuery({
        queryKey: queryKeys.postMediaUrls(fileIds),
        queryFn: async () => {
            if (!fileIds.length) return {};
            return getMediaUrlsBatch(fileIds);
        },
        enabled: fileIds.length > 0,
        staleTime: 3 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
    });
}
