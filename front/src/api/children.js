import { authFetch } from './auth';
import { getCurrentUser } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

/**
 * Получить ребёнка по ID (полная карточка)
 * Доступно: ADMIN, COUNSELOR (всех в отряде), PARENT (только своего)
 */
export async function getChild(id) {
    const res = await authFetch(`${API_BASE}/children/${id}`);
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error('У вас нет доступа к этому ребёнку');
        }
        throw new Error('Failed to get child');
    }
    return res.json();
}

/**
 * Получить краткую карточку ребёнка (только имя + фамилия)
 * Используется родителем для просмотра чужих детей в отряде.
 */
export async function getChildSummary(id) {
    const res = await authFetch(`${API_BASE}/children/${id}/summary`);
    if (!res.ok) throw new Error('Failed to get child summary');
    return res.json();
}

/**
 * Обновить данные ребёнка.
 * Автоматически выбирает эндпоинт по роли текущего пользователя:
 *   - PARENT → PUT /children/{id}/parent (только мед. данные, без имени/даты)
 *   - ADMIN/COUNSELOR → PUT /children/{id}/counselor (все поля)
 */
export async function updateChild(id, data) {
    const currentUser = getCurrentUser();
    const isParent = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_parent' || s === 'parent';
    });
    const isAdmin = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_admin' || s === 'admin';
    });

    // Родитель → /parent, остальные → /counselor
    const suffix = (isParent && !isAdmin) ? 'parent' : 'counselor';
    const payload = data;

    const res = await authFetch(`${API_BASE}/children/${id}/${suffix}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error('У вас нет прав на редактирование этого ребёнка');
        }
        const error = await res.text();
        throw new Error(error || 'Failed to update child');
    }
    return res.json();
}

/**
 * Создать ребёнка (только ADMIN, COUNSELOR)
 */
export async function createChild(data) {
    const res = await authFetch(`${API_BASE}/children`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to create child');
    }
    return res.json();
}

/**
 * Удалить ребёнка (только ADMIN, COUNSELOR)
 */
export async function deleteChild(id) {
    const res = await authFetch(`${API_BASE}/children/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        throw new Error('Failed to delete child');
    }
}

/**
 * Получить всех детей (только ADMIN)
 */
export async function getAllChildren() {
    const res = await authFetch(`${API_BASE}/children`);
    if (!res.ok) throw new Error('Failed to get all children');
    return res.json();
}