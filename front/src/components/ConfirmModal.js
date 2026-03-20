import { useEffect } from "react";
import "../styles/confirm-modal.css";

/**
 * Кастомный диалог подтверждения.
 *
 * Props:
 *   open      {boolean}   — показывать ли модалку
 *   title     {string}    — заголовок
 *   message   {string}    — текст вопроса
 *   confirmLabel {string} — текст кнопки подтверждения (default "Да, снять")
 *   cancelLabel  {string} — текст кнопки отмены (default "Отмена")
 *   danger    {boolean}   — красная кнопка подтверждения
 *   onConfirm {function}  — колбэк при подтверждении
 *   onCancel  {function}  — колбэк при отмене / закрытии
 */
export default function ConfirmModal({
                                         open,
                                         title = "Подтвердите действие",
                                         message,
                                         confirmLabel = "Да, снять",
                                         cancelLabel = "Отмена",
                                         danger = true,
                                         onConfirm,
                                         onCancel,
                                     }) {
    // Закрытие по Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onCancel]);

    // Блокируем прокрутку страницы пока модалка открыта
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="cm-backdrop" onClick={onCancel}>
            <div
                className={`cm-dialog${danger ? " cm-danger" : ""}`}
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="cm-title"
                aria-describedby="cm-message"
            >
                {/* иконка */}
                <div className="cm-icon-wrap">
                    {danger ? (
                        <svg className="cm-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                  stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg className="cm-icon" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </div>

                <h3 className="cm-title" id="cm-title">{title}</h3>
                {message && <p className="cm-message" id="cm-message">{message}</p>}

                <div className="cm-actions">
                    <button className="cm-btn cm-cancel" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className={`cm-btn cm-confirm${danger ? " cm-confirm-danger" : ""}`} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}