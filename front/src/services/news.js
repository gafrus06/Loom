import { API_BASE } from '../config/api';
import { authFetch } from './auth';

export async function getMyFeed(filter = 'all', page = 0, size = 20, campId = null) {
    const campParam = campId ? `&campId=${campId}` : '';
    const res = await authFetch(
        `${API_BASE}/feed/my-feed?filter=${filter}&page=${page}&size=${size}${campParam}`,
        { method: 'GET' }
    );
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch feed');
    return res.json();
}

export async function getCampArchive(campId, page = 0, size = 30) {
    const res = await authFetch(
        `${API_BASE}/feed/camps/${campId}/archive?page=${page}&size=${size}`,
        { method: 'GET' }
    );
    if (!res.ok) throw new Error('Failed to fetch archive');
    return res.json();
}

export async function getCampFeed(campId, page = 0, size = 20) {
    const res = await authFetch(
        `${API_BASE}/feed/camps/${campId}/feed?page=${page}&size=${size}`,
        { method: 'GET' }
    );
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch camp feed');
    return res.json();
}

export async function getPendingModerationPosts(campId, page = 0, size = 20) {
    const res = await authFetch(
        `${API_BASE}/feed/camps/${campId}/moderation/pending?page=${page}&size=${size}`,
        { method: 'GET' }
    );
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch pending moderation posts');
    return res.json();
}

async function createDirectUpload(file) {
    const params = new URLSearchParams({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
    });
    const initRes = await authFetch(`${API_BASE}/feed/media/upload-url?${params.toString()}`, {
        method: 'POST',
    });
    if (!initRes.ok) throw new Error(await initRes.text() || 'Failed to init upload');

    const uploadMeta = await initRes.json();
    const uploadRes = await fetch(uploadMeta.uploadUrl, {
        method: uploadMeta.method || 'PUT',
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
    });
    if (!uploadRes.ok) {
        throw new Error(`Direct upload failed: ${uploadRes.status}`);
    }
    return uploadMeta.fileId;
}

async function uploadFiles(files = []) {
    if (!files.length) return [];
    return Promise.all(files.map(createDirectUpload));
}

export async function createPost(postData, images = [], videos = []) {
    const [imageFileIds, videoFileIds] = await Promise.all([
        uploadFiles(images),
        uploadFiles(videos),
    ]);

    const res = await authFetch(`${API_BASE}/feed/posts`, {
        method: 'POST',
        body: JSON.stringify({
            ...postData,
            imageFileIds,
            videoFileIds,
        }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create post');
    return res.json();
}

export async function updatePost(postId, postData, newImages = [], newVideos = []) {
    const [newImageFileIds, newVideoFileIds] = await Promise.all([
        uploadFiles(newImages),
        uploadFiles(newVideos),
    ]);

    const res = await authFetch(`${API_BASE}/feed/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({
            ...postData,
            newImageFileIds,
            newVideoFileIds,
        }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update post');
    return res.json();
}

export async function getMediaUrlsBatch(fileIds = []) {
    if (!fileIds.length) return {};

    const res = await authFetch(`${API_BASE}/feed/media/urls/batch`, {
        method: "POST",
        body: JSON.stringify(fileIds),
    });
    if (!res.ok) throw new Error(await res.text() || "Failed to fetch media URLs");
    return res.json();
}

export async function deletePost(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete post');
}

export async function getPost(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch post');
    return res.json();
}

export async function togglePin(postId, pin) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}/pin?pin=${pin}`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to toggle pin');
    return res.json();
}

export async function approvePost(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}/approve`, { method: 'PATCH' });
    if (!res.ok) throw new Error(await res.text() || 'Failed to approve post');
    return res.json();
}

export async function rejectPost(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}/reject`, { method: 'PATCH' });
    if (!res.ok) throw new Error(await res.text() || 'Failed to reject post');
    return res.json();
}

export async function likePost(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}/likes`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to like post');
}

export async function unlikePost(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}/likes`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to unlike post');
}

export async function getLikesCount(postId) {
    const res = await authFetch(`${API_BASE}/feed/posts/${postId}/likes/count`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to get likes count');
    return res.json();
}
