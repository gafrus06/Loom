export const queryKeys = {
    me: ["app", "me"],
    homeContext: (userId, rolesKey) => ["home", "context", userId || "anonymous", rolesKey || "no-roles"],
    unreadNotifications: ["notifications", "unread-count"],
    notifications: (pageSize = 20) => ["notifications", "list", pageSize],
    postMediaUrls: (fileIds) => ["feed", "media-urls", [...fileIds].sort().join(",")],
    subscriptionStatus: ["subscription", "status"],
};
