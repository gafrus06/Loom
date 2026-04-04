import { ENDPOINTS, HOST, LS_KEYS } from "../config/api";
import { syncSessionStore } from "../state/sessionStore";

export const getAccessToken = () => localStorage.getItem(LS_KEYS.ACCESS);

export const decodeJWT = (token) => {
    try {
        const base64Url = token.split(".")[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
};

export const saveTokens = (access) => {
    localStorage.setItem(LS_KEYS.ACCESS, access);
    const decoded = decodeJWT(access);
    if (decoded) {
        localStorage.setItem(LS_KEYS.USER_ID, decoded.id ?? "");
        localStorage.setItem(LS_KEYS.USER_EMAIL, decoded.sub ?? "");
        localStorage.setItem(LS_KEYS.USER_ROLES, JSON.stringify(decoded.roles || []));
    }
    syncSessionStore();
};

export const getCurrentUser = () => {
    const token = getAccessToken();
    if (!token) return null;
    const decoded = decodeJWT(token);
    if (!decoded) return null;
    return {
        id: decoded.id ?? null,
        email: decoded.sub || "",
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
        tokenVersion: decoded.tv ?? null,
    };
};

export const logout = async () => {
    try {
        await fetch(`${ENDPOINTS.auth}/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch {
        // Локальное состояние всё равно нужно очистить.
    }

    localStorage.removeItem(LS_KEYS.ACCESS);
    localStorage.removeItem(LS_KEYS.USER_ROLES);
    localStorage.removeItem(LS_KEYS.USER_EMAIL);
    localStorage.removeItem(LS_KEYS.USER_ID);
    localStorage.removeItem(LS_KEYS.AVATAR_URL);
    syncSessionStore();
};

let refreshPromise = null;

const processQueue = (() => {
    let queue = [];
    return {
        flush: (error, token = null) => {
            queue.forEach((item) => (error ? item.reject(error) : item.resolve(token)));
            queue = [];
        },
    };
})();

const isTokenExpired = () => {
    const token = getAccessToken();
    if (!token) return true;
    const decoded = decodeJWT(token);
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 < Date.now() + 30_000;
};

const doRefresh = () => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshTokens()
        .then(() => {
            processQueue.flush(null, getAccessToken());
        })
        .catch((error) => {
            processQueue.flush(error, null);
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });
    return refreshPromise;
};

export const authFetch = async (url, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const fullUrl = url.startsWith("http") ? url : `${HOST}${url}`;

    if (refreshPromise) {
        try {
            await refreshPromise;
        } catch {
            // Если refresh уже упал, ниже сработает стандартная обработка.
        }
    }

    if (isTokenExpired() && !refreshPromise) {
        try {
            await doRefresh();
        } catch (error) {
            await logout();
            window.location.href = "/auth/login";
            throw error;
        }
    }

    const buildHeaders = (token) => ({
        Authorization: `Bearer ${token}`,
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
    });

    let response = await fetch(fullUrl, {
        ...options,
        credentials: "include",
        headers: buildHeaders(getAccessToken()),
    });

    if (response.status === 401) {
        try {
            await doRefresh();
            response = await fetch(fullUrl, {
                ...options,
                credentials: "include",
                headers: buildHeaders(getAccessToken()),
            });
        } catch (error) {
            await logout();
            window.location.href = "/auth/login";
            throw error;
        }
    }

    return response;
};

export const login = async (email, password) => {
    const response = await fetch(`${ENDPOINTS.auth}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Не удалось войти");
    }

    const data = await response.json();
    saveTokens(data.accessToken);
    return getCurrentUser();
};

export const register = async (email, password) => {
    const response = await fetch(`${ENDPOINTS.auth}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = new Error("Ошибка регистрации");
        error.status = response.status;
        throw error;
    }

    return response.json().catch(() => ({}));
};

export const refreshTokens = async () => {
    const response = await fetch(`${ENDPOINTS.auth}/refresh`, {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok) {
        await logout();
        throw new Error("Refresh failed");
    }

    const data = await response.json();
    saveTokens(data.accessToken);
    return getCurrentUser();
};

export const assignRole = async (userId, role) => {
    const response = await authFetch(`${ENDPOINTS.auth}/users/${userId}/roles`, {
        method: "POST",
        body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error("Не удалось назначить роль");
    return response.json();
};

export const getUsers = async () => {
    const response = await authFetch(`${ENDPOINTS.auth}/users`, { method: "GET" });
    if (!response.ok) throw new Error("Не удалось загрузить пользователей");
    return response.json();
};

export const getUserProfileById = async (userId) => {
    const response = await authFetch(`${ENDPOINTS.users}/${userId}`, { method: "GET" });
    if (!response.ok) {
        if (response.status === 403) throw new Error("Доступ запрещён");
        if (response.status === 404) throw new Error("Пользователь не найден");
        throw new Error("Не удалось загрузить профиль");
    }
    return response.json();
};

export const getAllUsers = async () => {
    const response = await authFetch(`${ENDPOINTS.auth}/users`, { method: "GET" });
    if (!response.ok) throw new Error("Не удалось загрузить пользователей");
    return response.json();
};

export const revokeRole = async (userId, roleName) =>
    authFetch(`${ENDPOINTS.auth}/users/${userId}/roles/${roleName}`, { method: "DELETE" });

export const createSubscriptionPayment = async () =>
    authFetch(`${ENDPOINTS.auth}/subscription/pay`, { method: "POST" }).then((response) => response.json());

export const getSubscriptionStatus = async () =>
    authFetch(`${ENDPOINTS.auth}/subscription/status`).then((response) => response.json());
