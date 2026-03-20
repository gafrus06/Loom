// src/config/api.js
const readApiBase = () => {
    // порядок приоритетов: Vite -> CRA -> глобалка -> дефолт
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) {
        return import.meta.env.VITE_API_BASE;
    }
    if (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE) {
        return process.env.REACT_APP_API_BASE;
    }
    if (typeof window !== "undefined" && window.__APP_API_BASE__) {
        return window.__APP_API_BASE__;
    }
    return "http://localhost:12717";
};

export const API_BASE = readApiBase();

export const ENDPOINTS = {
    auth:  `${API_BASE}/api/auth`,
    users: `${API_BASE}/api/users`,
};

export const LS_KEYS = {
    ACCESS:     "accessToken",
    REFRESH:    "refreshToken",
    USER_ROLES: "userRoles",
    USER_EMAIL: "userEmail",
    USER_ID:    "userId",
    AVATAR_URL: "avatarUrl",
};

export const EVENTS = {
    AVATAR_UPDATED: "avatar-url-updated",
};
