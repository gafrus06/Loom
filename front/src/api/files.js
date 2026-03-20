// src/api/files.js
import { authFetch } from "./auth";
import { ENDPOINTS, API_BASE } from "../config/api";

const USERS = ENDPOINTS.users;

export const generateAvatarUploadUrl = async (filename, contentType) => {
    const url = `${USERS}/profile/avatar/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    const res = await authFetch(url, { method: "POST" });
    if (!res.ok) throw new Error("Ошибка получения URL для загрузки аватара");
    return res.json();
};

export const confirmAvatarUpload = async (fileId) => {
    const res = await authFetch(`${USERS}/profile/avatar/confirm?fileId=${fileId}`, { method: "POST" });
    if (!res.ok) throw new Error("Ошибка подтверждения загрузки аватара");
};

export const getUserProfile = async () => {
    const res = await authFetch(`${USERS}/profile`, { method: "GET" });
    if (!res.ok) throw new Error("Ошибка получения профиля");
    return res.json();
};

export const updateUserProfile = async (profileData) => {
    const res = await authFetch(`${USERS}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
    });
    if (!res.ok) throw new Error("Ошибка обновления профиля");
    return res.json();
};

export const getProfileCompletionStatus = async () => {
    const res = await authFetch(`${USERS}/profile/completion-status`, { method: "GET" });
    if (!res.ok) throw new Error("Ошибка проверки статуса профиля");
    return res.json();
};

export const startPhoneVerification = async (phone) => {
    const res = await authFetch(`${USERS}/profile/phone/verification/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
    });
    const ok = res.ok;
    let payload = {};
    try { payload = await res.json(); } catch {}
    return { ok, ...payload };
};

export const confirmPhoneVerification = async (phone, code) => {
    const res = await authFetch(`${USERS}/profile/phone/verification/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
    });
    const ok = res.ok;
    let payload = {};
    try { payload = await res.json(); } catch {}
    return { ok, ...payload };
};

export const updateParentProfile = async (payload) => {
    const res = await authFetch(`${USERS}/profile/parent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Ошибка сохранения данных родителя");
    return res.json();
};

export const updateCounselorProfile = async (payload) => {
    const res = await authFetch(`${USERS}/profile/counselor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Ошибка сохранения данных вожатого");
    return res.json();
};

// ===== Education Documents =====

export const generateEducationDocUploadUrl = async (filename, contentType) => {
    const url = `${USERS}/profile/counselor/education-doc/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`;
    const res = await authFetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Ошибка получения URL для загрузки документа');
    return res.json();
};

export const confirmEducationDocUpload = async (fileId) => {
    const res = await authFetch(`${USERS}/profile/counselor/education-doc/confirm?fileId=${fileId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Ошибка подтверждения загрузки документа');
    return res.json();
};

export const removeEducationDoc = async (fileId) => {
    const res = await authFetch(`${USERS}/profile/counselor/education-doc/${fileId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка удаления документа');
    return res.json();
};

export const getFileDownloadUrl = async (fileId) => {
    const [dlRes, infoRes] = await Promise.all([
        authFetch(`${API_BASE}/api/files/${fileId}/download-url`, { method: 'GET' }),
        authFetch(`${API_BASE}/api/files/${fileId}/info`, { method: 'GET' }),
    ]);
    if (!dlRes.ok) throw new Error('Ошибка получения ссылки на файл');
    const { downloadUrl } = await dlRes.json();
    let originalFilename = fileId;
    if (infoRes.ok) {
        const info = await infoRes.json();
        originalFilename = info.originalName || fileId;
    }
    return { downloadUrl, originalFilename };
};