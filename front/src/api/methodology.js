// Файл: api/methodology.js
import { authFetch } from './auth';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:12717';

export const methodologyAPI = {
    // Получить игры для отряда
    getGames: async (detachmentId, stage) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/games?stage=${stage}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch games: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    },

    // Получить огоньки для отряда
    getCampfires: async (detachmentId, stage) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/campfires?stage=${stage}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch campfires: ${response.status}`);
        }

        const data = await response.json();
        return data;
    },

    // Получить упражнения для отряда
    getExercises: async (detachmentId, stage) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/exercises?stage=${stage}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch exercises: ${response.status}`);
        }

        const data = await response.json();
        return data;
    },

    // Получить физиологические особенности по возрастной группе
    getPhysiologicalFeatures: async (ageGroup) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/methodology/physiological/${encodeURIComponent(ageGroup)}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch physiological features: ${response.status}`);
        }

        const data = await response.json();
        return data;
    },

    // Отметить материал как использованный
    markAsUsed: async (detachmentId, materialId, materialType, stage, notes = '') => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/usage`,
            {
                method: 'POST',
                body: JSON.stringify({
                    materialId,
                    materialType: materialType.toUpperCase(),
                    stage,
                    notes
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to mark material as used: ${response.status}`);
        }

        const data = await response.json();
        return data;
    },

    // Получить рекомендованные материалы для этапа
    getRecommendedForStage: async (detachmentId, stage) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/recommended?stage=${stage}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch recommendations: ${response.status}`);
        }

        const data = await response.json();
        return data;
    },

    // Получить историю использования материалов
    getUsageHistory: async (detachmentId) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/usage/history`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch usage history: ${response.status}`);
        }

        const data = await response.json();
        return data;
    },

    // Добавить материал в избранное
    addToFavorites: async (detachmentId, materialId, materialType) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/favorites`,
            {
                method: 'POST',
                body: JSON.stringify({
                    materialId,
                    materialType: materialType.toUpperCase()
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to add to favorites: ${response.status}`);
        }

        return true;
    },

    // Удалить из избранного
    removeFromFavorites: async (detachmentId, materialId, materialType) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/favorites/${materialType.toUpperCase()}/${materialId}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            throw new Error(`Failed to remove from favorites: ${response.status}`);
        }

        return true;
    },

    // Получить избранное по типу
    getFavorites: async (detachmentId, materialType) => {

        const response = await authFetch(
            `${API_BASE}/api/detachments/${detachmentId}/methodology/favorites/${materialType.toUpperCase()}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch favorites: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }
};