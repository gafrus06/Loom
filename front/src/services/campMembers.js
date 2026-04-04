import { API_BASE } from "../config/api";
import { authFetch } from "./auth";

async function readJsonOrThrow(response, fallbackMessage) {
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || fallbackMessage);
    }

    return response.json();
}

export async function assignCounselorToCamp(campId, userId, sessionIds = []) {
    const response = await authFetch(`${API_BASE}/camp-members/assign`, {
        method: "POST",
        body: JSON.stringify({ campId, userId, sessionIds }),
    });

    return readJsonOrThrow(response, "Не удалось назначить вожатого");
}

export async function leaveCamp() {
    const response = await authFetch(`${API_BASE}/camp-members/leave`, {
        method: "POST",
    });

    if (!response.ok) {
        throw new Error("Не удалось выйти из лагеря");
    }
}

export async function removeCounselorFromCamp(campId, userId) {
    const response = await authFetch(`${API_BASE}/camp-members/camps/${campId}/counselors/${userId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Не удалось удалить вожатого из лагеря");
    }
}

export async function getUserCampInfo(userId) {
    const response = await authFetch(`${API_BASE}/camp-members/users/${userId}/camp`);
    if (response.status === 204) return null;
    return readJsonOrThrow(response, "Не удалось загрузить данные о лагере");
}

export async function getMyCamp() {
    const response = await authFetch(`${API_BASE}/camp-members/my-camp`);
    if (response.status === 204) return null;
    return readJsonOrThrow(response, "Не удалось загрузить текущий лагерь");
}

export async function getUserCamp(userId) {
    const response = await authFetch(`${API_BASE}/camp-members/users/${userId}/camp`);
    if (response.status === 204) return null;
    return readJsonOrThrow(response, "Не удалось загрузить лагерь пользователя");
}

export async function getCampCounselors(campId) {
    const response = await authFetch(`${API_BASE}/camp-members/camps/${campId}/counselors`);
    return readJsonOrThrow(response, "Не удалось загрузить список вожатых");
}

export async function updateCampStaffSubRole(campId, userId, subRole) {
    const response = await authFetch(`${API_BASE}/camp-members/camps/${campId}/staff/${userId}/sub-role`, {
        method: "PATCH",
        body: JSON.stringify({ subRole }),
    });

    return readJsonOrThrow(response, "Не удалось обновить подроль сотрудника");
}

export async function getSessionAssignments(sessionId) {
    const response = await authFetch(`${API_BASE}/camp-members/sessions/${sessionId}/assignments`);
    return readJsonOrThrow(response, "Не удалось загрузить назначения на смену");
}

export async function getMySessionAssignments() {
    const response = await authFetch(`${API_BASE}/camp-members/assignments/my`);
    return readJsonOrThrow(response, "Не удалось загрузить мои назначения");
}

export async function acceptSessionAssignment(assignmentId) {
    const response = await authFetch(`${API_BASE}/camp-members/assignments/accept`, {
        method: "POST",
        body: JSON.stringify({ assignmentId }),
    });

    return readJsonOrThrow(response, "Не удалось принять приглашение");
}

export async function rejectSessionAssignment(assignmentId) {
    const response = await authFetch(`${API_BASE}/camp-members/assignments/reject`, {
        method: "POST",
        body: JSON.stringify({ assignmentId }),
    });

    return readJsonOrThrow(response, "Не удалось отклонить приглашение");
}

export async function checkCounselorAssignment() {
    const response = await authFetch(`${API_BASE}/camp-members/check-assignment`);
    return response.json();
}
