// src/api/campMembers.js
import { authFetch } from './auth';

const API_BASE = 'http://localhost:12717/api';

/**
 * ADMIN назначает вожатого на лагерь
 */
export async function assignCounselorToCamp(campId, userId) {
    const res = await authFetch(`${API_BASE}/camp-members/assign`, {
        method: 'POST',
        body: JSON.stringify({ campId, userId })
    });
    return res.json();
}

/**
 * Вожатый выходит из лагеря
 */
export async function leaveCamp() {
    await authFetch(`${API_BASE}/camp-members/leave`, {
        method: 'POST'
    });
}

/**
 * ADMIN выгоняет вожатого из лагеря
 */
export async function removeCounselorFromCamp(campId, userId) {
    await authFetch(`${API_BASE}/camp-members/camps/${campId}/counselors/${userId}`, {
        method: 'DELETE'
    });
}
export async function getUserCampInfo(userId) {
    const res = await authFetch(`${API_BASE}/camp-members/users/${userId}/camp`);
    if (res.status === 204) {
        console.log('[getUserCampInfo] No camp assignment for user', userId);
        return null;
    }
    const data = await res.json();
    console.log('[getUserCampInfo] User', userId, 'camp:', data);
    return data;
}
/**
 * Получить текущий лагерь вожатого
 */
export async function getMyCamp() {
    const res = await authFetch(`${API_BASE}/camp-members/my-camp`);
    if (res.status === 204) {
        console.log('[getMyCamp] No camp assignment (204)');
        return null; // Не прикреплен к лагерю
    }
    const data = await res.json();
    console.log('[getMyCamp] Response:', data);
    return data;
}

/**
 * ADMIN получает лагерь конкретного вожатого по userId
 */
export async function getUserCamp(userId) {
    const res = await authFetch(`${API_BASE}/camp-members/users/${userId}/camp`);
    if (res.status === 204) {
        console.log('[getUserCamp] No camp assignment for user', userId);
        return null;
    }
    const data = await res.json();
    console.log('[getUserCamp] User', userId, 'camp:', data);
    return data;
}

/**
 * Получить список вожатых лагеря
 */
export async function getCampCounselors(campId) {
    const res = await authFetch(`${API_BASE}/camp-members/camps/${campId}/counselors`);
    return res.json();
}

/**
 * Проверить прикреплен ли вожатый к лагерю
 */
export async function checkCounselorAssignment() {
    const res = await authFetch(`${API_BASE}/camp-members/check-assignment`);
    return res.json();
}