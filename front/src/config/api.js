// Единая точка конфигурации фронтенда.
// Менять адрес API нужно только здесь.
export const HOST = "http://localhost:12717";

export const API_BASE = `${HOST}/api`;
export const ENDPOINTS = {
    auth: `${API_BASE}/auth`,
    users: `${API_BASE}/users`,
};

export const LS_KEYS = {
    ACCESS: "accessToken",
    REFRESH: "refreshToken",
    USER_ROLES: "userRoles",
    USER_EMAIL: "userEmail",
    USER_ID: "userId",
    AVATAR_URL: "avatarUrl",
};

// Оставлены только как совместимость для уже существующего кода.
export const EVENTS = {
    AVATAR_UPDATED: "avatar-url-updated",
    NOTIFICATIONS_UPDATED: "notifications-updated",
};
