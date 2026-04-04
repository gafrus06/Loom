import { API_BASE } from '../config/api';
import { authFetch } from "./auth";

export async function getUsers(page = 0, size = 10) {
    const res = await authFetch(`${API_BASE}/users/all?page=${page}&size=${size}`);
    if (!res.ok) throw new Error('Ошибка запроса пользователей');
    return res.json();
}

export async function getUserProfile(userId) {
    const res = await authFetch(`${API_BASE}/users/${userId}`);
    if (!res.ok) throw new Error('Failed to get user profile');
    return res.json();
}