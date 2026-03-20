import { authFetch } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

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

export async function getMyApplications(campId) {
    const res = await authFetch(`${API_BASE}/applications/camps/${campId}/my`);
    if (!res.ok) throw new Error('Не удалось загрузить заявки');
    return res.json();
}

export async function getPendingApplications(campId, search = '') {
    const url = `${API_BASE}/applications/camps/${campId}/pending${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить заявки');
    return res.json();
}

export async function confirmApplication(applicationId, detachmentId) {
    const res = await authFetch(`${API_BASE}/applications/${applicationId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ detachmentId })
    });
    if (!res.ok) throw new Error('Не удалось подтвердить заявку');
    return res.json();
}

export async function rejectApplication(applicationId) {
    const res = await authFetch(`${API_BASE}/applications/${applicationId}/reject`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Не удалось отклонить заявку');
    return res.json();
}

/**
 * Сгенерировать код приглашения для конкретной смены (ADMIN).
 * Бэкенд: POST /api/applications/invite-codes/camps/{campId}/sessions/{sessionId}
 */
export async function generateInviteCode(campId, sessionId) {
    const res = await authFetch(
        `${API_BASE}/applications/invite-codes/camps/${campId}/sessions/${sessionId}`,
        { method: 'POST' }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Не удалось создать код');
    }
    return res.json(); // { id, campId, sessionId, code, active, createdAt }
}

/** Получить все активные коды лагеря (ADMIN) */
export async function getInviteCodes(campId) {
    const res = await authFetch(`${API_BASE}/applications/invite-codes/camps/${campId}`);
    if (!res.ok) throw new Error('Не удалось получить коды');
    return res.json();
}

/** Получить активные коды конкретной смены (ADMIN) */
export async function getInviteCodesBySession(campId, sessionId) {
    const res = await authFetch(
        `${API_BASE}/applications/invite-codes/camps/${campId}/sessions/${sessionId}`
    );
    if (!res.ok) throw new Error('Не удалось получить коды смены');
    return res.json();
}

/** Деактивировать код (ADMIN) */
export async function deactivateInviteCode(codeId) {
    const res = await authFetch(`${API_BASE}/applications/invite-codes/${codeId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Не удалось деактивировать код');
}