import { authFetch } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

/**
 * Получить отряд по ID
 */
export async function getDetachment(id) {
    const res = await authFetch(`${API_BASE}/detachments/${id}`);
    if (!res.ok) throw new Error('Failed to get detachment');
    return res.json();
}

/**
 * Получить все доступные отряды с учётом ролей
 */
export async function getMyAccessibleDetachments() {
    const res = await authFetch(`${API_BASE}/detachments/my-accessible`);
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to get accessible detachments');
    }
    return res.json();
}

/**
 * Получить отряды конкретной смены
 */
export async function getDetachmentsBySession(sessionId) {
    const res = await authFetch(`${API_BASE}/detachments/session/${sessionId}`);
    if (!res.ok) throw new Error('Failed to get detachments');
    return res.json();
}

/**
 * Создать отряд
 */
export async function createDetachment(data) {
    const res = await authFetch(`${API_BASE}/detachments`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to create detachment');
    }
    return res.json();
}

/**
 * Обновить отряд
 */
export async function updateDetachment(id, data) {
    const res = await authFetch(`${API_BASE}/detachments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update detachment');
    return res.json();
}

/**
 * Удалить отряд
 */
export async function deleteDetachment(id) {
    const res = await authFetch(`${API_BASE}/detachments/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete detachment');
}

/**
 * Изменить этап отряда
 */
export async function changeDetachmentStage(id, stage) {
    const res = await authFetch(`${API_BASE}/detachments/${id}/stage`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage })
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to change stage');
    }
    return res.json();
}

/**
 * Получить список вожатых отряда
 */
export async function getDetachmentCounselors(detachmentId) {
    if (!detachmentId || detachmentId === 'undefined') {
        console.warn('getDetachmentCounselors: detachmentId is undefined, skipping');
        return [];
    }
    const res = await authFetch(`${API_BASE}/counselor-assignments/by-detachment?detachmentId=${detachmentId}`);
    if (!res.ok) throw new Error('Failed to get detachment counselors');
    return res.json();
}

/**
 * Назначить вожатого на отряд
 */
export async function assignCounselor(detachmentId, userId, roleInDetachment = 'Помощник') {
    const res = await authFetch(`${API_BASE}/counselor-assignments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            detachmentId,
            userId,
            roleInDetachment
        })
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to assign counselor');
    }
    return res.json();
}

/**
 * Открепить вожатого от отряда
 */
export async function unassignCounselor(assignmentId) {
    const res = await authFetch(`${API_BASE}/counselor-assignments/unassign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentId })
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to unassign counselor');
    }
    return res.json();
}