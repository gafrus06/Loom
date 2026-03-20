import { authFetch } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

/**
 * Создать лагерь (только ADMIN)
 */
export async function createCamp(data) {
    const res = await authFetch(`${API_BASE}/camps`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to create camp');
    }
    return res.json();
}

/**
 * Получить лагерь по ID
 */
export async function getCamp(id) {
    const res = await authFetch(`${API_BASE}/camps/${id}`);
    if (!res.ok) throw new Error('Failed to get camp');
    return res.json();
}

/**
 * Обновить лагерь
 */
export async function updateCamp(id, data) {
    const res = await authFetch(`${API_BASE}/camps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update camp');
    return res.json();
}

/**
 * Удалить лагерь
 */
export async function deleteCamp(id) {
    const res = await authFetch(`${API_BASE}/camps/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete camp');
}

/**
 * Получить мои созданные лагеря (только ADMIN)
 */
export async function getMyCamps() {
    const res = await authFetch(`${API_BASE}/camps/my`);
    if (!res.ok) throw new Error('Failed to get my camps');
    return res.json();
}

/**
 * Получить все доступные лагеря с учётом ролей (ADMIN + COUNSELOR)
 */
export async function getMyAccessibleCamps() {
    console.log('Fetching accessible camps...');
    const res = await authFetch(`${API_BASE}/camps/my-accessible`, {
        method: 'GET'
    });
    if (!res.ok) {
        console.error('Failed to fetch accessible camps:', res.status);
        throw new Error('Failed to fetch accessible camps');
    }
    const data = await res.json();
    console.log('Accessible camps response:', data);
    return data;
}

/**
 * Получить все лагеря (для администрирования)
 */
export async function getAllCamps() {
    const res = await authFetch(`${API_BASE}/camps`);
    if (!res.ok) throw new Error('Failed to get all camps');
    return res.json();
}

// ============= МЕТОДЫ ДЛЯ РАБОТЫ С ДЕТЬМИ И РОДИТЕЛЯМИ =============

/**
 * Получить моих детей (для родителя)
 */
export async function getMyChildren() {
    const res = await authFetch(`${API_BASE}/parent-links/by-parent`);
    if (!res.ok) throw new Error('Failed to fetch children');
    return res.json();
}

/**
 * Получить членства ребенка
 */
export async function getChildMemberships(childId) {
    const res = await authFetch(`${API_BASE}/memberships/child/${childId}`);
    if (!res.ok) throw new Error('Failed to fetch memberships');
    return res.json();
}

/**
 * Получить активное членство ребенка
 */
export async function getActiveMembership(childId) {
    const res = await authFetch(`${API_BASE}/memberships/active?childId=${childId}`);
    if (!res.ok) throw new Error('Failed to fetch active membership');
    return res.json();
}

/**
 * Получить детальную информацию об отряде
 */
export async function getDetachment(detachmentId) {
    const res = await authFetch(`${API_BASE}/detachments/${detachmentId}`);
    if (!res.ok) throw new Error('Failed to fetch detachment');
    return res.json();
}

/**
 * Получить активные назначения вожатого
 */
export async function getMyActiveAssignments() {
    const res = await authFetch(`${API_BASE}/counselor-assignments/my-active`);
    if (!res.ok) {
        throw new Error('Failed to fetch assignments');
    }
    return res.json();
}

/**
 * Получить информацию о лагере (алиас для getCamp)
 */
export async function getCampInfo(campId) {
    return getCamp(campId);
}

/**
 * Получить информацию о смене
 */
export async function getSessionInfo(sessionId) {
    const res = await authFetch(`${API_BASE}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
}