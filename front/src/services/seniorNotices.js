import { API_BASE } from '../config/api';
import { authFetch } from './auth';

// ─── seniorNotices.js ────────────────────────────────────────────────────────
export async function createSeniorNotice(data) {
    const res = await authFetch(`${API_BASE}/senior-notices`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to create notice'); }
    return res.json();
}
export async function updateSeniorNotice(noticeId, data) {
    const res = await authFetch(`${API_BASE}/senior-notices/${noticeId}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update notice');
    return res.json();
}
export async function deactivateSeniorNotice(noticeId) {
    const res = await authFetch(`${API_BASE}/senior-notices/${noticeId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to deactivate notice');
}
export async function getNoticesForSession(sessionId) {
    const res = await authFetch(`${API_BASE}/senior-notices/session/${sessionId}`);
    if (!res.ok) throw new Error('Failed to get session notices');
    return res.json();
}
export async function getNoticesForDetachment(sessionId, detachmentId) {
    const res = await authFetch(`${API_BASE}/senior-notices/session/${sessionId}/detachment/${detachmentId}`);
    if (!res.ok) throw new Error('Failed to get detachment notices');
    return res.json();
}