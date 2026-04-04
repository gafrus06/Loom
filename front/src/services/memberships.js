import { API_BASE } from '../config/api';
import { authFetch } from './auth';


/**
 * Получить членство по ID отряда
 */
export async function getMembershipsByDetachment(detachmentId) {
    const res = await authFetch(`${API_BASE}/memberships/detachment/${detachmentId}`);
    if (!res.ok) throw new Error('Failed to get memberships');
    return res.json();
}

/**
 * Создать членство
 */
export async function createMembership(data) {
    const res = await authFetch(`${API_BASE}/memberships`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create membership');
    return res.json();
}

/**
 * Удалить членство
 */
export async function deleteMembership(id) {
    const res = await authFetch(`${API_BASE}/memberships/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete membership');
}