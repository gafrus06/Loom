import { API_BASE } from '../config/api';
import { authFetch } from './auth';

export async function sendCampMessage(data) {
    const res = await authFetch(`${API_BASE}/camp-messages`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to send message'); }
    return res.json();
}
export async function getMessagesByDetachment(detachmentId) {
    const res = await authFetch(`${API_BASE}/camp-messages/detachment/${detachmentId}`);
    if (!res.ok) throw new Error('Failed to get messages');
    return res.json();
}
export async function getInbox() {
    const res = await authFetch(`${API_BASE}/camp-messages/inbox`);
    if (!res.ok) throw new Error('Failed to get inbox');
    return res.json();
}
export async function markMessageRead(messageId) {
    const res = await authFetch(`${API_BASE}/camp-messages/${messageId}/read`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to mark read');
}