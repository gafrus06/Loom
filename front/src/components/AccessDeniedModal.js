import React from 'react';
import '../styles/access-denied.css';

/**
 * Модальное окно для отображения сообщения об ограничении доступа
 */
export default function AccessDeniedModal({ isOpen, onClose, message, title }) {
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content access-denied">
                <div className="access-denied-icon">⚠️</div>
                <h2>{title || 'Доступ ограничен'}</h2>
                <p>
                    {message || 'У вас недостаточно прав для выполнения этого действия.'}
                </p>
                <button className="btn-primary" onClick={onClose}>
                    Понятно
                </button>
            </div>
        </div>
    );
}