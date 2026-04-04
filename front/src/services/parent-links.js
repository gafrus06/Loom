import { API_BASE } from '../config/api';
import { authFetch } from './auth';


/**
 * Привязать родителя к ребёнку
 */
export async function linkParent(childId, parentUserId, relation = 'PARENT') {
    console.log('Linking parent:', { childId, parentUserId, relation });

    const res = await authFetch(`${API_BASE}/parent-links`, {
        method: 'POST',
        body: JSON.stringify({
            childId,
            parentUserId,
            relation
        })
    });

    if (!res.ok) {
        let errorMessage = `Failed to link parent (${res.status})`;
        let errorDetails = null;

        try {
            errorDetails = await res.json();
            console.error('Backend validation error:', errorDetails);
            console.error('Validation errors details:', JSON.stringify(errorDetails.errors, null, 2));

            // Извлекаем сообщение
            if (errorDetails.message) {
                errorMessage = errorDetails.message;
            } else if (errorDetails.error) {
                errorMessage = errorDetails.error;
            }

            if (errorDetails.errors) {
                // Если есть массив ошибок валидации
                const validationErrors = Object.entries(errorDetails.errors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join(', ');
                errorMessage = `Validation failed: ${validationErrors}`;
                console.error('Parsed validation errors:', validationErrors);
            }
        } catch (e) {
            console.error('Could not parse error response:', e);
        }

        const error = new Error(errorMessage);
        error.response = errorDetails;
        throw error;
    }

    return res.json();
}

/**
 * Отвязать родителя от ребёнка
 */
export async function unlinkParent(childId, parentUserId) {
    const res = await authFetch(`${API_BASE}/parent-links?childId=${childId}&parentUserId=${parentUserId}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to unlink parent');
    }
}

/**
 * Получить связи ребёнка с родителями
 */
export async function getChildParents(childId) {
    const res = await authFetch(`${API_BASE}/parent-links/by-child/${childId}`);

    if (!res.ok) {
        throw new Error('Failed to get child parents');
    }

    return res.json();
}

/**
 * Получить детей родителя (для роли PARENT)
 */
export async function getMyChildren() {
    const res = await authFetch(`${API_BASE}/parent-links/by-parent`);

    if (!res.ok) {
        throw new Error('Failed to get my children');
    }

    return res.json();
}