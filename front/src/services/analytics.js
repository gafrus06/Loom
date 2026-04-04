// src/services/analytics.js
import { API_BASE } from '../config/api';
import { authFetch } from './auth';

/**
 * Получить аналитику лагеря
 * GET /api/analytics/camp/{campId}
 */
export async function getCampAnalytics(campId) {
    const res = await authFetch(`${API_BASE}/analytics/camp/${campId}`);
    if (!res.ok) throw new Error('Failed to get camp analytics');
    return res.json();
}

/**
 * Получить аналитику смены
 * GET /api/analytics/session/{sessionId}
 */
export async function getSessionAnalytics(sessionId) {
    const res = await authFetch(`${API_BASE}/analytics/session/${sessionId}`);
    if (!res.ok) throw new Error('Failed to get session analytics');
    return res.json();
}