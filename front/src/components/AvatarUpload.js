import { useRef, useState } from "react";
import { generateAvatarUploadUrl, confirmAvatarUpload, getUserProfile } from "../api/files";

/**
 * Виджет загрузки аватара.
 * variant: 'primary' (по умолчанию, залитая) | 'ghost' (полупрозрачная)
 */
export default function AvatarUpload({
                                         onAvatarChange,
                                         currentAvatarUrl,
                                         disabled,
                                         variant = "primary",
                                     }) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const handlePick = () => {
        if (disabled || uploading) return;
        inputRef.current?.click();
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Пожалуйста, выберите изображение (JPEG/PNG/GIF)");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Размер файла не должен превышать 5MB");
            return;
        }

        setUploading(true);
        try {
            const uploadData = await generateAvatarUploadUrl(file.name, file.type);
            const res = await fetch(uploadData.uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });
            if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);

            await confirmAvatarUpload(uploadData.fileId);
            const updated = await getUserProfile();
            onAvatarChange?.(updated.avatarUrl);
        } catch (err) {
            console.error(err);
            alert(`Ошибка загрузки аватара: ${err.message}`);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const btnClass =
        variant === "primary"
            ? "btn-primary sm mt8"
            : "btn-ghost small mt8";

    return (
        <div className="avatar-upload">
            <div className="avatar-preview">
                <img
                    src={currentAvatarUrl || "/user.png"}
                    alt="Аватар"
                    className="avatar-preview-image"
                />
                {uploading && (
                    <div className="upload-dim">
                        <div className="spinner" />
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
            />

            {!disabled && (
                <button
                    type="button"
                    className={btnClass}
                    onClick={handlePick}
                    disabled={uploading}
                >
                    {uploading ? "Загрузка..." : "Сменить аватар"}
                </button>
            )}
        </div>
    );
}
