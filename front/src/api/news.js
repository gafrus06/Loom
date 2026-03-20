// src/api/news.js
import { authFetch } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

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

/**
 * Создать пост с изображениями и/или видео.
 * images и videos — массивы File объектов.
 */
export async function createPost(postData, images = [], videos = []) {
    const formData = new FormData();
    formData.append('post', new Blob([JSON.stringify(postData)], { type: 'application/json' }));
    images.forEach(img => formData.append('images', img));
    videos.forEach(vid => formData.append('videos', vid));

    const res = await authFetch(`${API_BASE}/feed/posts`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create post');
    return res.json();
}

/**
 * Обновить пост с новыми изображениями и/или видео.
 */
export async function updatePost(postId, postData, newImages = [], newVideos = []) {
    const formData = new FormData();
    formData.append('post', new Blob([JSON.stringify(postData)], { type: 'application/json' }));
    newImages.forEach(img => formData.append('newImages', img));
    newVideos.forEach(vid => formData.append('newVideos', vid));

    const res = await authFetch(`${API_BASE}/feed/posts/${postId}`, { method: 'PUT', body: formData });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update post');
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