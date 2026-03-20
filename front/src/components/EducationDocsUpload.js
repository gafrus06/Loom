import { useRef, useState, useEffect } from 'react';
import {
    generateEducationDocUploadUrl,
    confirmEducationDocUpload,
    removeEducationDoc,
    getFileDownloadUrl,
} from '../api/files';

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXT = '.jpg, .jpeg, .png, .webp, .pdf';

/**
 * Виджет загрузки документов об образовании.
 * Props:
 *   fileIds  {string}  — comma-separated UUIDs из counselor.educationDocumentIds
 *   readOnly {boolean}
 *   onChange {fn}      — вызывается с новым comma-separated string после изменений
 */
export default function EducationDocsUpload({ fileIds, readOnly, onChange }) {
    const inputRef = useRef(null);
    const [docs, setDocs] = useState([]); // [{ id, name, url, loading }]
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Загружаем download URLs для уже сохранённых файлов
    useEffect(() => {
        if (!fileIds) { setDocs([]); return; }
        const ids = fileIds.split(',').map(s => s.trim()).filter(Boolean);
        if (!ids.length) { setDocs([]); return; }

        Promise.all(ids.map(async (id) => {
            try {
                const { downloadUrl, originalFilename } = await getFileDownloadUrl(id);
                return { id, name: originalFilename || id, url: downloadUrl, loading: false };
            } catch {
                return { id, name: id, url: null, loading: false };
            }
        })).then(setDocs);
    }, [fileIds]);

    async function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Допустимые форматы: JPG, PNG, WEBP, PDF');
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`Размер файла не должен превышать ${MAX_SIZE_MB} МБ`);
            return;
        }

        setError('');
        setUploading(true);

        // Optimistic placeholder
        const tempId = `tmp-${Date.now()}`;
        setDocs(prev => [...prev, { id: tempId, name: file.name, url: null, loading: true }]);

        try {
            const { fileId, uploadUrl } = await generateEducationDocUploadUrl(file.name, file.type);
            const putRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!putRes.ok) throw new Error(`Ошибка загрузки: ${putRes.status}`);

            const dto = await confirmEducationDocUpload(fileId);
            // dto.educationDocumentIds is the updated comma-separated string
            onChange?.(dto.educationDocumentIds);

            // Replace placeholder with real entry
            const { downloadUrl } = await getFileDownloadUrl(fileId);
            setDocs(prev => prev.map(d =>
                d.id === tempId ? { id: fileId, name: file.name, url: downloadUrl, loading: false } : d
            ));
        } catch (err) {
            setError(`Ошибка: ${err.message}`);
            setDocs(prev => prev.filter(d => d.id !== tempId));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    async function handleRemove(docId) {
        try {
            const dto = await removeEducationDoc(docId);
            onChange?.(dto.educationDocumentIds);
            setDocs(prev => prev.filter(d => d.id !== docId));
        } catch (err) {
            setError(`Ошибка удаления: ${err.message}`);
        }
    }

    const isPdf = (name) => name?.toLowerCase().endsWith('.pdf');

    return (
        <div className="edu-docs-widget">
            {error && <div className="edu-docs-error">{error}</div>}

            {docs.length > 0 && (
                <div className="edu-docs-list">
                    {docs.map(doc => (
                        <div key={doc.id} className={`edu-doc-card${doc.loading ? ' loading' : ''}`}>
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
                        style={{ display: 'none' }}
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