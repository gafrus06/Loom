import { API_BASE } from '../config/api';
import { authFetch } from './auth';

/** Создать/обновить запись журнала (вожатый/ADMIN) */
export async function upsertJournal(detachmentId, data) {
    const res = await authFetch(`${API_BASE}/detachment-journals/detachments/${detachmentId}`, {
        method: 'POST', body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to upsert journal'); }
    return res.json();
}
/** Список журналов (внутренний, для вожатых) */
export async function getJournals(detachmentId) {
    const res = await authFetch(`${API_BASE}/detachment-journals/detachments/${detachmentId}`);
    if (!res.ok) throw new Error('Failed to get journals');
    return res.json();
}
/** Конкретная запись по дате (внутренний вид) */
export async function getJournalByDate(detachmentId, date) {
    const res = await authFetch(`${API_BASE}/detachment-journals/detachments/${detachmentId}/by-date?date=${date}`);
    if (!res.ok) throw new Error('Failed to get journal by date');
    return res.json();
}
/** Родительский вид — список */
export async function getJournalsParentView(detachmentId) {
    const res = await authFetch(`${API_BASE}/detachment-journals/detachments/${detachmentId}/parent-view`);
    if (!res.ok) throw new Error('Failed to get parent journals');
    return res.json();
}
/** Родительский вид — по дате */
export async function getJournalParentViewByDate(detachmentId, date) {
    const res = await authFetch(
        `${API_BASE}/detachment-journals/detachments/${detachmentId}/parent-view/by-date?date=${date}`
    );
    if (!res.ok) throw new Error('Failed to get parent journal by date');
    return res.json();
}