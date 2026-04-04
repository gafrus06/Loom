import { API_BASE } from '../config/api';
import { authFetch } from './auth';

export async function createShiftTask(data) {
    const res = await authFetch(`${API_BASE}/shift-tasks`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to create task'); }
    return res.json();
}
export async function getShiftTask(taskId) {
    const res = await authFetch(`${API_BASE}/shift-tasks/${taskId}`);
    if (!res.ok) throw new Error('Failed to get task');
    return res.json();
}
export async function getTasksBySession(sessionId) {
    const res = await authFetch(`${API_BASE}/shift-tasks/session/${sessionId}`);
    if (!res.ok) throw new Error('Failed to get tasks');
    return res.json();
}
/** date: 'YYYY-MM-DD' опционально */
export async function getTasksForToday(sessionId, date, detachmentId) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (detachmentId) params.set('detachmentId', detachmentId);
    const query = params.toString();
    const url = `${API_BASE}/shift-tasks/session/${sessionId}/today${query ? `?${query}` : ''}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to get today tasks');
    return res.json();
}
/** data: { taskId, detachmentId, completed, comment? } */
export async function upsertTaskCompletion(data) {
    const res = await authFetch(`${API_BASE}/shift-tasks/completions`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to upsert completion'); }
    return res.json();
}
