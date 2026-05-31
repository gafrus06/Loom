import { API_BASE } from "../config/api";
import { authFetch } from "./auth";

export async function getMyNotifications({ page = 0, size = 20 } = {}) {
    const response = await authFetch(`${API_BASE}/notifications/me?page=${page}&size=${size}`);
    if (!response.ok) throw new Error("Не удалось загрузить уведомления");
    return response.json();
}

export async function getUnreadCount() {
    const response = await authFetch(`${API_BASE}/notifications/me/unread-count`);
    if (!response.ok) throw new Error("Не удалось загрузить счётчик уведомлений");
    const data = await response.json();
    return data.count ?? 0;
}

export async function markNotificationRead(id) {
    const response = await authFetch(`${API_BASE}/notifications/${id}/read`, { method: "POST" });
    if (!response.ok) throw new Error("Не удалось отметить уведомление как прочитанное");
}

export async function markAllNotificationsRead() {
    const response = await authFetch(`${API_BASE}/notifications/read-all`, { method: "POST" });
    if (!response.ok) throw new Error("Не удалось отметить все уведомления как прочитанные");
}

export async function deleteNotification(id) {
    const response = await authFetch(`${API_BASE}/notifications/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Не удалось удалить уведомление");
}