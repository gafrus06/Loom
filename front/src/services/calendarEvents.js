import { API_BASE } from '../config/api';
import { authFetch } from './auth';

export async function createCalendarEvent(data) {
    const res = await authFetch(`${API_BASE}/calendar-events`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.text(); throw new Error(e || 'Failed to create event'); }
    return res.json();
}
export async function updateCalendarEvent(eventId, data) {
    const res = await authFetch(`${API_BASE}/calendar-events/${eventId}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
}
export async function deleteCalendarEvent(eventId) {
    const res = await authFetch(`${API_BASE}/calendar-events/${eventId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
}
export async function getCalendarEventsBySession(sessionId) {
    const res = await authFetch(`${API_BASE}/calendar-events/session/${sessionId}`);
    if (!res.ok) throw new Error('Failed to get calendar events');
    return res.json();
}