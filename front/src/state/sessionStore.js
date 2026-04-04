import { useSyncExternalStore } from "react";

function readSnapshot() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        return {
            accessToken: null,
            user: null,
            isAuthenticated: false,
        };
    }

    try {
        const base64Url = token.split(".")[1];
        if (!base64Url) throw new Error("Invalid JWT");
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const decoded = JSON.parse(atob(padded));

        return {
            accessToken: token,
            user: {
                id: decoded.id ?? null,
                email: decoded.sub || "",
                roles: Array.isArray(decoded.roles) ? decoded.roles : [],
                tokenVersion: decoded.tv ?? null,
            },
            isAuthenticated: true,
        };
    } catch {
        return {
            accessToken: token,
            user: null,
            isAuthenticated: true,
        };
    }
}

let snapshot = readSnapshot();
const listeners = new Set();

function emit() {
    snapshot = readSnapshot();
    listeners.forEach((listener) => listener());
}

export function subscribeSession(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getSessionSnapshot() {
    return snapshot;
}

export function syncSessionStore() {
    emit();
}

export function useSession() {
    return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
}
