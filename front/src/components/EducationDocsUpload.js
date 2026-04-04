import { useEffect, useRef, useState } from "react";
import {
    confirmEducationDocUpload,
    generateEducationDocUploadUrl,
    getFileDownloadUrl,
    removeEducationDoc,
} from "../services/files";

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXT = ".jpg, .jpeg, .png, .webp, .pdf";

export default function EducationDocsUpload({ fileIds, readOnly, onChange }) {
    const inputRef = useRef(null);
    const [docs, setDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!fileIds) {
            setDocs([]);
            return;
        }

        const ids = fileIds.split(",").map((value) => value.trim()).filter(Boolean);
        if (!ids.length) {
            setDocs([]);
            return;
        }

        Promise.all(
            ids.map(async (id) => {
                try {
                    const { downloadUrl, originalFilename } = await getFileDownloadUrl(id);
                    return { id, name: originalFilename || id, url: downloadUrl, loading: false };
                } catch {
                    return { id, name: id, url: null, loading: false };
                }
            })
        ).then(setDocs);
    }, [fileIds]);

    async function handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError("Допустимые форматы: JPG, PNG, WEBP, PDF.");
            return;
        }

        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`Размер файла не должен превышать ${MAX_SIZE_MB} МБ.`);
            return;
        }

        setError("");
        setUploading(true);

        const tempId = `tmp-${Date.now()}`;
        setDocs((previous) => [...previous, { id: tempId, name: file.name, url: null, loading: true }]);

        try {
            const { fileId, uploadUrl } = await generateEducationDocUploadUrl(file.name, file.type);
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            if (!uploadResponse.ok) {
                throw new Error(`Ошибка загрузки: ${uploadResponse.status}`);
            }

            const payload = await confirmEducationDocUpload(fileId);
            onChange?.(payload.educationDocumentIds);

            const { downloadUrl } = await getFileDownloadUrl(fileId);
            setDocs((previous) =>
                previous.map((document) =>
                    document.id === tempId
                        ? { id: fileId, name: file.name, url: downloadUrl, loading: false }
                        : document
                )
            );
        } catch (requestError) {
            setError(`Ошибка: ${requestError.message}`);
            setDocs((previous) => previous.filter((document) => document.id !== tempId));
        } finally {
            setUploading(false);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    async function handleRemove(documentId) {
        try {
            const payload = await removeEducationDoc(documentId);
            onChange?.(payload.educationDocumentIds);
            setDocs((previous) => previous.filter((document) => document.id !== documentId));
        } catch (requestError) {
            setError(`Ошибка удаления: ${requestError.message}`);
        }
    }

    const isPdf = (name) => name?.toLowerCase().endsWith(".pdf");

    return (
        <div className="edu-docs-widget">
            {error && <div className="edu-docs-error">{error}</div>}

            {docs.length > 0 && (
                <div className="edu-docs-list">
                    {docs.map((doc) => (
                        <div key={doc.id} className={`edu-doc-card${doc.loading ? " loading" : ""}`}>
                            {doc.loading ? (
                                <div className="edu-doc-preview edu-doc-loading">
                                    <div className="spinner-sm" />
                                </div>
                            ) : isPdf(doc.name) ? (
                                <a className="edu-doc-preview edu-doc-pdf" href={doc.url} target="_blank" rel="noreferrer" title={doc.name}>
                                    <span className="edu-doc-pdf-icon">📄</span>
                                    <span className="edu-doc-pdf-label">PDF</span>
                                </a>
                            ) : (
                                <a className="edu-doc-preview" href={doc.url} target="_blank" rel="noreferrer" title={doc.name}>
                                    <img src={doc.url} alt={doc.name} className="edu-doc-img" />
                                </a>
                            )}
                            <div className="edu-doc-name" title={doc.name}>{doc.name}</div>
                            {!readOnly && !doc.loading && (
                                <button
                                    type="button"
                                    className="edu-doc-remove"
                                    onClick={() => handleRemove(doc.id)}
                                    title="Удалить"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!readOnly && (
                <>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ALLOWED_EXT}
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                    />
                    <button
                        type="button"
                        className="edu-docs-add-btn"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <><span className="spinner-sm" /> Загрузка...</>
                        ) : (
                            <><span>＋</span> Добавить документ</>
                        )}
                    </button>
                    <div className="edu-docs-hint">JPG, PNG, PDF · до {MAX_SIZE_MB} МБ</div>
                </>
            )}

            {readOnly && docs.length === 0 && (
                <div className="edu-docs-empty">Документы не добавлены</div>
            )}
        </div>
    );
}
