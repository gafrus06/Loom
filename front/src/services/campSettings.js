// src/services/campSettings.js
import { API_BASE } from '../config/api';
import { authFetch } from './auth';

/**
 * Получить настройки лагеря
 * GET /api/camp-settings/camp/{campId}
 *
 * CampSettingsResponseDto:
 * { campId, postingMode, calendarEnabled, calendarVisibleForParents }
 */
export async function getCampSettings(campId) {
    const res = await authFetch(`${API_BASE}/camp-settings/camp/${campId}`);
    if (!res.ok) throw new Error('Failed to get camp settings');
    return res.json();
}

/**
 * Создать или обновить настройки лагеря (только ADMIN)
 * PUT /api/camp-settings
 *
 * data: { campId, postingMode, calendarEnabled, calendarVisibleForParents }
 * postingMode: 'FREE' | 'MODERATED' | 'ONLY_SENIOR_AND_ADMIN' | 'ONLY_ADMIN'
 */
export async function upsertCampSettings(data) {
    const res = await authFetch(`${API_BASE}/camp-settings`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const e = await res.text();
        throw new Error(e || 'Failed to save camp settings');
    }
    return res.json();
}