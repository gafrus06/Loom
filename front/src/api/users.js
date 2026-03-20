import axios from "axios";
import {authFetch} from "./auth";

// Базовый URL твоего бэка
const API_BASE = "http://localhost:12717/api/users";

export async function getUsers(page = 0, size = 10) {
    try {
        const response = await axios.get(`${API_BASE}/all`, {
            params: { page, size },
        });
        return response.data; // должен возвращать объект { users: [...], currentPage, totalPages, totalElements }
    } catch (error) {
        console.error("Ошибка запроса пользователей:", error);
        throw error;
    }
}
export async function getUserProfile(userId) {
    const res = await authFetch(`${API_BASE}/${userId}`);

    if (!res.ok) {
        throw new Error('Failed to get user profile');
    }

    return res.json();
}
