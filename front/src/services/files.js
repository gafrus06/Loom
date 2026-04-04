import { authFetch } from "./auth";
import { ENDPOINTS, HOST } from "../config/api";

const USERS = ENDPOINTS.users;

async function ensureOk(response, fallbackMessage) {
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || fallbackMessage);
    }

    return response;
}

export async function generateAvatarUploadUrl(filename, contentType) {
    const url = `${USERS}/profile/avatar/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    const response = await authFetch(url, { method: "POST" });
    await ensureOk(response, "Не удалось получить ссылку для загрузки аватара");
    return response.json();
}

export async function confirmAvatarUpload(fileId) {
    const response = await authFetch(`${USERS}/profile/avatar/confirm?fileId=${fileId}`, { method: "POST" });
    await ensureOk(response, "Не удалось подтвердить загрузку аватара");
    return response.status === 204 ? null : response.json().catch(() => null);
}

export async function getUserProfile() {
    const response = await authFetch(`${USERS}/profile`, { method: "GET" });
    await ensureOk(response, "Не удалось загрузить профиль");
    return response.json();
}

export async function updateUserProfile(profileData) {
    const response = await authFetch(`${USERS}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
    });
    await ensureOk(response, "Не удалось обновить профиль");
    return response.json();
}

export async function getProfileCompletionStatus() {
    const response = await authFetch(`${USERS}/profile/completion-status`, { method: "GET" });
    await ensureOk(response, "Не удалось проверить статус профиля");
    return response.json();
}

export async function startPhoneVerification(phone) {
    const response = await authFetch(`${USERS}/profile/phone/verification/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
    });

    const ok = response.ok;
    let payload = {};
    try {
        payload = await response.json();
    } catch {
        payload = {};
    }
    return { ok, ...payload };
}

export async function confirmPhoneVerification(phone, code) {
    const response = await authFetch(`${USERS}/profile/phone/verification/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
    });

    const ok = response.ok;
    let payload = {};
    try {
        payload = await response.json();
    } catch {
        payload = {};
    }
    return { ok, ...payload };
}

export async function updateParentProfile(payload) {
    const response = await authFetch(`${USERS}/profile/parent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    await ensureOk(response, "Не удалось сохранить данные родителя");
    return response.json();
}

export async function updateCounselorProfile(payload) {
    const response = await authFetch(`${USERS}/profile/counselor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    await ensureOk(response, "Не удалось сохранить данные вожатого");
    return response.json();
}

export async function generateEducationDocUploadUrl(filename, contentType) {
    const url = `${USERS}/profile/counselor/education-doc/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    const response = await authFetch(url, { method: "POST" });
    await ensureOk(response, "Не удалось получить ссылку для загрузки документа");
    return response.json();
}

export async function confirmEducationDocUpload(fileId) {
    const response = await authFetch(`${USERS}/profile/counselor/education-doc/confirm?fileId=${fileId}`, { method: "POST" });
    await ensureOk(response, "Не удалось подтвердить загрузку документа");
    return response.json();
}

export async function removeEducationDoc(fileId) {
    const response = await authFetch(`${USERS}/profile/counselor/education-doc/${fileId}`, { method: "DELETE" });
    await ensureOk(response, "Не удалось удалить документ");
    return response.json();
}

export async function getFileDownloadUrl(fileId) {
    const [downloadResponse, infoResponse] = await Promise.all([
        authFetch(`${HOST}/api/files/${fileId}/download-url`, { method: "GET" }),
        authFetch(`${HOST}/api/files/${fileId}/info`, { method: "GET" }),
    ]);

    await ensureOk(downloadResponse, "Не удалось получить ссылку на файл");

    const { downloadUrl } = await downloadResponse.json();
    let originalFilename = fileId;

    if (infoResponse.ok) {
        const info = await infoResponse.json();
        originalFilename = info.originalName || fileId;
    }

    return { downloadUrl, originalFilename };
}

export async function generateFileUploadUrl(service, entityType, filename, contentType) {
    const url = `${HOST}/api/files/generate-upload-url?service=${encodeURIComponent(service)}&entityType=${encodeURIComponent(entityType)}&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    const response = await authFetch(url, { method: "POST" });
    await ensureOk(response, "Не удалось получить ссылку для загрузки файла");
    return response.json();
}

export async function confirmFileUpload(fileId, ownerEntityId) {
    const response = await authFetch(`${HOST}/api/files/${fileId}/confirm-upload?ownerEntityId=${encodeURIComponent(ownerEntityId)}`, { method: "POST" });
    await ensureOk(response, "Не удалось подтвердить загрузку файла");
    return response.status === 204 ? null : response.json().catch(() => null);
}
