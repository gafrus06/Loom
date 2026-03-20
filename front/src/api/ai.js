import { authFetch } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

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