import { confirmFileUpload, generateFileUploadUrl, getFileDownloadUrl } from './files';

export async function uploadCampPhoto(campId, file) {
    const contentType = file.type || 'application/octet-stream';
    const { fileId, uploadUrl } = await generateFileUploadUrl('camp-service', 'camp-photo', file.name, contentType);
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
    });
    if (!uploadResponse.ok) {
        throw new Error(`Не удалось загрузить фото "${file.name}"`);
    }
    await confirmFileUpload(fileId, campId);
    return fileId;
}

export async function resolveCampPhotoUrl(photoFileId) {
    if (!photoFileId) {
        return null;
    }
    try {
        const { downloadUrl } = await getFileDownloadUrl(photoFileId);
        return downloadUrl || null;
    } catch {
        return null;
    }
}
