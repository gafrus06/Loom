import { API_BASE } from '../config/api';
import { authFetch } from './auth';

// ─── Шаблоны ─────────────────────────────────────────────────────────────────
export async function createReportTemplate(campId, data) {
    const res = await authFetch(`${API_BASE}/shift-report-templates/camps/${campId}`, {
        method: 'POST', body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to create template'); }
    return res.json();
}
export async function getReportTemplates(campId, sessionId) {
    const url = sessionId
        ? `${API_BASE}/shift-report-templates/camps/${campId}?sessionId=${sessionId}`
        : `${API_BASE}/shift-report-templates/camps/${campId}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to get templates');
    return res.json();
}
export async function deactivateReportTemplate(templateId) {
    const res = await authFetch(`${API_BASE}/shift-report-templates/${templateId}/deactivate`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to deactivate template');
    return res.json();
}

// ─── Ежедневные отчёты ───────────────────────────────────────────────────────
export async function upsertDailyReport(detachmentId, data) {
    const res = await authFetch(`${API_BASE}/detachment-daily-reports/detachments/${detachmentId}`, {
        method: 'POST', body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to upsert report'); }
    return res.json();
}
export async function getDetachmentReports(detachmentId) {
    const res = await authFetch(`${API_BASE}/detachment-daily-reports/detachments/${detachmentId}`);
    if (!res.ok) throw new Error('Failed to get detachment reports');
    return res.json();
}
export async function getSessionReports(sessionId, campId) {
    const res = await authFetch(`${API_BASE}/detachment-daily-reports/sessions/${sessionId}?campId=${campId}`);
    if (!res.ok) throw new Error('Failed to get session reports');
    return res.json();
}