import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { confirmAvatarUpload, generateAvatarUploadUrl, getUserProfile } from "../services/files";
import { queryKeys } from "../state/queryKeys";

export default function AvatarUpload({
    onAvatarChange,
    currentAvatarUrl,
    disabled,
    variant = "primary",
}) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);
    const queryClient = useQueryClient();

    const handlePick = () => {
        if (disabled || uploading) return;
        inputRef.current?.click();
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Пожалуйста, выберите изображение (JPEG/PNG/GIF).");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Размер файла не должен превышать 5 МБ.");
            return;
        }

        setUploading(true);
        try {
            const uploadData = await generateAvatarUploadUrl(file.name, file.type);
            const response = await fetch(uploadData.uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки: ${response.status}`);
            }

            await confirmAvatarUpload(uploadData.fileId);
            const updatedProfile = await getUserProfile();
            queryClient.setQueryData(queryKeys.me, updatedProfile);
            onAvatarChange?.(updatedProfile.avatarUrl);
        } catch (error) {
            console.error(error);
            alert(`Ошибка загрузки аватара: ${error.message}`);
        } finally {
            setUploading(false);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    };

    const buttonClassName = variant === "primary" ? "btn-primary sm mt8" : "btn-ghost small mt8";
    const hasCustomAvatar = Boolean(currentAvatarUrl && currentAvatarUrl !== "/user.png");

    const previewStyle = {
        position: "relative",
        width: 150,
        height: 150,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 12px 30px rgba(0,0,0,.35)",
        background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,.08)",
    };

    const imageStyle = {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    };

    const fallbackStyle = {
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, rgba(201,193,226,.55), rgba(60,141,255,.55))",
        color: "rgba(255,255,255,.92)",
    };

    return (
        <div className="avatar-upload">
            <div className="avatar-preview" style={previewStyle}>
                {hasCustomAvatar ? (
                    <img
                        src={currentAvatarUrl}
                        alt="Аватар"
                        className="avatar-preview-image"
                        style={imageStyle}
                    />
                ) : (
                    <div className="avatar-preview-fallback" style={fallbackStyle} aria-label="Аватар по умолчанию">
                        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="8" r="4" fill="currentColor" />
                            <path
                                d="M4.5 19.5C5.8 16.6 8.5 15 12 15C15.5 15 18.2 16.6 19.5 19.5"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                )}

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
                    className={buttonClassName}
                    onClick={handlePick}
                    disabled={uploading}
                >
                    {uploading ? "Загрузка..." : "Сменить аватар"}
                </button>
            )}
        </div>
    );
}
