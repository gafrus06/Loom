// src/services/parentDetachments.js
import { API_BASE } from '../config/api';
import { authFetch } from './auth';

/**
 * Родительский агрегированный вид отряда.
 * GET /api/parent-detachments/{detachmentId}
 *
 * Возвращает ParentDetachmentViewDto:
 * {
 *   detachmentId, detachmentName, stage,
 *   campId, campName, sessionId, sessionName,
 *   counselors: [{ userId, firstName, lastName, roleInDetachment }],
 *   childDisplayNames: string[],
 *   myChildIds: UUID[],
 *   recentJournal: ParentDetachmentJournalResponseDto[]
 * }
 */
export async function getParentDetachmentView(detachmentId) {
    const res = await authFetch(`${API_BASE}/parent-detachments/${detachmentId}`);
    if (!res.ok) {
        const e = await res.text();
        throw new Error(e || 'Failed to get parent detachment view');
    }
    return res.json();
}