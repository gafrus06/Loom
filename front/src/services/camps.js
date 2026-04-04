import { API_BASE } from "../config/api";
import { authFetch } from "./auth";

async function readJsonOrThrow(response, fallbackMessage) {
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || fallbackMessage);
    }

    return response.json();
}

export async function createCamp(data) {
    const response = await authFetch(`${API_BASE}/camps`, {
        method: "POST",
        body: JSON.stringify(data),
    });

    return readJsonOrThrow(response, "Не удалось создать лагерь");
}

export async function getCamp(id) {
    const response = await authFetch(`${API_BASE}/camps/${id}`);
    return readJsonOrThrow(response, "Не удалось загрузить лагерь");
}

export async function updateCamp(id, data) {
    const response = await authFetch(`${API_BASE}/camps/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });

    return readJsonOrThrow(response, "Не удалось обновить лагерь");
}

export async function deleteCamp(id) {
    const response = await authFetch(`${API_BASE}/camps/${id}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Не удалось удалить лагерь");
    }
}

export async function getMyCamps() {
    const response = await authFetch(`${API_BASE}/camps/my`);
    return readJsonOrThrow(response, "Не удалось загрузить мои лагеря");
}

export async function getMyAccessibleCamps() {
    const response = await authFetch(`${API_BASE}/camps/my-accessible`);
    return readJsonOrThrow(response, "Не удалось загрузить доступные лагеря");
}

export async function getAllCamps() {
    const response = await authFetch(`${API_BASE}/camps`);
    return readJsonOrThrow(response, "Не удалось загрузить список лагерей");
}

export async function getMyChildren() {
    const response = await authFetch(`${API_BASE}/parent-links/by-parent`);
    return readJsonOrThrow(response, "Не удалось загрузить список детей");
}

export async function getChildMemberships(childId) {
    const response = await authFetch(`${API_BASE}/memberships/child/${childId}`);
    return readJsonOrThrow(response, "Не удалось загрузить членства ребёнка");
}

export async function getActiveMembership(childId) {
    const response = await authFetch(`${API_BASE}/memberships/active?childId=${childId}`);
    return readJsonOrThrow(response, "Не удалось загрузить активное членство");
}

export async function getDetachment(detachmentId) {
    const response = await authFetch(`${API_BASE}/detachments/${detachmentId}`);
    return readJsonOrThrow(response, "Не удалось загрузить отряд");
}

export async function getMyActiveAssignments() {
    const response = await authFetch(`${API_BASE}/counselor-assignments/my-active`);
    return readJsonOrThrow(response, "Не удалось загрузить назначения");
}

export async function getCampInfo(campId) {
    return getCamp(campId);
}

export async function getSessionInfo(sessionId) {
    const response = await authFetch(`${API_BASE}/sessions/${sessionId}`);
    return readJsonOrThrow(response, "Не удалось загрузить смену");
}
