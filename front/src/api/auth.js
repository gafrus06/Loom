// src/api/auth.js
import { ENDPOINTS, LS_KEYS } from "../config/api";

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717';

export const getAccessToken = () => localStorage.getItem(LS_KEYS.ACCESS);

// refresh токен теперь в HttpOnly cookie — JS его не видит, этот метод удалён
// export const getRefreshToken = () => ... // УДАЛЕНО

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

// refresh больше не приходит в теле — не сохраняем
export const saveTokens = (access) => {
    localStorage.setItem(LS_KEYS.ACCESS, access);
    const decoded = decodeJWT(access);
    if (decoded) {
        localStorage.setItem(LS_KEYS.USER_ID,    decoded.id ?? "");
        localStorage.setItem(LS_KEYS.USER_EMAIL, decoded.sub ?? "");
        localStorage.setItem(LS_KEYS.USER_ROLES, JSON.stringify(decoded.roles || []));
    }
};

export const getCurrentUser = () => {
    const token = getAccessToken();
    if (!token) return null;
    const d = decodeJWT(token);
    if (!d) return null;
    return { id: d.id ?? null, email: d.sub || "", roles: d.roles || [] };
};

export const logout = async () => {
    // Сначала инвалидируем refresh токен на сервере
    // credentials: 'include' — браузер отправит cookie с refresh токеном
    try {
        await fetch(`${ENDPOINTS.auth}/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch (_) {
        // Даже если сервер недоступен — чистим локальное состояние
    }
    localStorage.removeItem(LS_KEYS.ACCESS);
    localStorage.removeItem(LS_KEYS.USER_ROLES);
    localStorage.removeItem(LS_KEYS.USER_EMAIL);
    localStorage.removeItem(LS_KEYS.USER_ID);
};

let refreshPromise = null;

const processQueue = (() => {
    let queue = [];
    return {
        add: (resolve, reject) => queue.push({ resolve, reject }),
        flush: (error, token = null) => {
            queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
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
        .then(() => { processQueue.flush(null, getAccessToken()); })
        .catch((err) => { processQueue.flush(err, null); throw err; })
        .finally(() => { refreshPromise = null; });
    return refreshPromise;
};

export const authFetch = async (url, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    if (refreshPromise) {
        try { await refreshPromise; } catch (_) {}
    }

    if (isTokenExpired() && !refreshPromise) {
        try {
            await doRefresh();
        } catch (err) {
            await logout();
            window.location.href = '/auth/login';
            throw err;
        }
    }

    const buildHeaders = (token) => ({
        'Authorization': `Bearer ${token}`,
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
    });

    // credentials: 'include' — браузер отправляет HttpOnly cookie автоматически
    let response = await fetch(fullUrl, {
        ...options,
        credentials: 'include',
        headers: buildHeaders(getAccessToken()),
    });

    if (response.status === 401) {
        try {
            await doRefresh();
            return fetch(fullUrl, {
                ...options,
                credentials: 'include',
                headers: buildHeaders(getAccessToken()),
            });
        } catch (err) {
            await logout();
            window.location.href = '/auth/login';
            throw err;
        }
    }

    return response;
};

export const login = async (email, password) => {
    const res = await fetch(`${ENDPOINTS.auth}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials: 'include' — чтобы браузер принял Set-Cookie с refresh токеном
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
    }
    const data = await res.json();
    // data.accessToken — только access, refresh пришёл в cookie автоматически
    saveTokens(data.accessToken);
    return getCurrentUser();
};

export const register = async (email, password) => {
    const res = await fetch(`${ENDPOINTS.auth}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const error = new Error("Ошибка регистрации");
        error.status = res.status;
        throw error;
    }
    return res.json().catch(() => ({}));
};

export const refreshTokens = async () => {
    // Тело не нужно — refresh токен браузер отправит сам через cookie
    const res = await fetch(`${ENDPOINTS.auth}/refresh`, {
        method: "POST",
        credentials: "include", // ← отправляет cookie, принимает новую
    });
    if (!res.ok) {
        await logout();
        throw new Error("Refresh failed");
    }
    const data = await res.json();
    // Сохраняем только access token
    saveTokens(data.accessToken);
    return getCurrentUser();
};

export const assignRole = async (email, role) => {
    const res = await authFetch(`${ENDPOINTS.auth}/assign-role`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
    });
    if (!res.ok) throw new Error("Ошибка назначения роли");
    return res.json();
};

export const getUsers = async () => {
    const res = await authFetch(`${ENDPOINTS.auth}/users`, { method: "GET" });
    if (!res.ok) throw new Error("Ошибка получения пользователей");
    return res.json();
};

export const getUserProfileById = async (userId) => {
    const res = await authFetch(`${ENDPOINTS.users}/${userId}`, { method: "GET" });
    if (!res.ok) {
        if (res.status === 403) throw new Error("Доступ запрещен");
        if (res.status === 404) throw new Error("Пользователь не найден");
        throw new Error("Ошибка получения профиля");
    }
    return res.json();
};

export const getAllUsers = async () => {
    const res = await authFetch(`${ENDPOINTS.auth}/users`, { method: "GET" });
    if (!res.ok) throw new Error("Ошибка получения пользователей");
    return res.json();
};

export const revokeRole = async (userId, roleName) =>
    authFetch(`${ENDPOINTS.auth}/users/${userId}/roles/${roleName}`, { method: 'DELETE' });

export const createSubscriptionPayment = async () =>
    authFetch(`${ENDPOINTS.auth}/subscription/pay`, { method: 'POST' }).then(r => r.json());

export const getSubscriptionStatus = async () =>
    authFetch(`${ENDPOINTS.auth}/subscription/status`).then(r => r.json());