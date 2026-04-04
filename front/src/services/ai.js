import { API_BASE } from '../config/api';
import { authFetch } from './auth';


/**
 * Задать вопрос AI
 */
export async function askAI(question) {
    const res = await authFetch(`${API_BASE}/ai/ask`, {
        method: 'POST',
        body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error('Failed to ask AI');
    return res.json();
}