import { API_BASE } from '../config/api';
import { authFetch } from './auth';

// ─── Инвайт-коды ─────────────────────────────────────────────────────────────

/**
 * Использовать код приглашения (родитель).
 * Возвращает { id: campId }
 * @alias useInviteCode
 */
export async function applyInviteCode(code) {
    const res = await authFetch(`${API_BASE}/applications/invite-codes/use`, {
        method: 'POST',
        body: JSON.stringify({ code })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Неверный код приглашения');
    }
    return res.json();
}

/** Алиас — используется в новых компонентах */


export async function generateInviteCode(campId, sessionId) {
    const res = await authFetch(
        `${API_BASE}/applications/invite-codes/camps/${campId}/sessions/${sessionId}`,
        { method: 'POST' }
    );
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to generate code'); }
    return res.json();
}

export async function getInviteCodes(campId) {
    const res = await authFetch(`${API_BASE}/applications/invite-codes/camps/${campId}`);
    if (!res.ok) throw new Error('Failed to get invite codes');
    return res.json();
}

export async function getInviteCodesBySession(campId, sessionId) {
    const res = await authFetch(
        `${API_BASE}/applications/invite-codes/camps/${campId}/sessions/${sessionId}`
    );
    if (!res.ok) throw new Error('Failed to get session invite codes');
    return res.json();
}

export async function deactivateInviteCode(codeId) {
    const res = await authFetch(`${API_BASE}/applications/invite-codes/${codeId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to deactivate code');
}

// ─── Заявки ──────────────────────────────────────────────────────────────────

/**
 * Создать заявку на ребёнка.
 * data: { firstName, lastName, birthDate, gender, homeCity,
 *         medicalNotes, allergies, specialNeeds, behavioralNotes, relation }
 * @alias createApplication
 */
export async function createChildApplication(campId, data) {
    const res = await authFetch(`${API_BASE}/applications/camps/${campId}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Не удалось подать заявку');
    }
    return res.json();
}

/** Алиас — используется в новых компонентах */
export const createApplication = createChildApplication;

export async function getMyApplications(campId) {
    const res = await authFetch(`${API_BASE}/applications/camps/${campId}/my`);
    if (!res.ok) throw new Error('Не удалось загрузить заявки');
    return res.json();
}

export async function getPendingApplications(campId, search = '') {
    const url = `${API_BASE}/applications/camps/${campId}/pending${
        search ? `?search=${encodeURIComponent(search)}` : ''
    }`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить заявки');
    return res.json();
}

/** detachmentId — отряд для зачисления ребёнка */
export async function confirmApplication(applicationId, detachmentId) {
    const res = await authFetch(`${API_BASE}/applications/${applicationId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ detachmentId })
    });
    if (!res.ok) throw new Error('Не удалось подтвердить заявку');
    return res.json();
}

export async function rejectApplication(applicationId) {
    const res = await authFetch(`${API_BASE}/applications/${applicationId}/reject`, { method: 'POST' });
    if (!res.ok) throw new Error('Не удалось отклонить заявку');
    return res.json();
}