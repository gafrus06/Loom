import { API_BASE } from '../config/api';
import { authFetch } from './auth';


/**
 * Получить смену по ID
 */
export async function getSession(id) {
    const res = await authFetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error('Failed to get session');
    return res.json();
}

export async function getSessionContext(id) {
    const res = await authFetch(`${API_BASE}/sessions/${id}/context`);
    if (!res.ok) throw new Error('Failed to get session context');
    return res.json();
}

/**
 * Получить все доступные смены с учётом ролей
 */
export async function getMyAccessibleSessions() {
    const res = await authFetch(`${API_BASE}/sessions/my-accessible`);
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to get accessible sessions');
    }
    return res.json();
}

/**
 * Получить смены конкретного лагеря
 */
export async function getSessionsByCamp(campId) {
    const res = await authFetch(`${API_BASE}/sessions/camp/${campId}`);
    if (!res.ok) throw new Error('Failed to get sessions');
    return res.json();
}

/**
 * Создать смену
 */
export async function createSession(data) {
    const res = await authFetch(`${API_BASE}/sessions`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
}

/**
 * Обновить смену
 */
export async function updateSession(id, data) {
    const res = await authFetch(`${API_BASE}/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update session');
    return res.json();
}

/**
 * Удалить смену
 */
export async function deleteSession(id) {
    const res = await authFetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete session');
}
