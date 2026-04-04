import React from 'react';
import './SuccessModal.css';

export default function SuccessModal({ isOpen, onClose, message, title }) {
    if (!isOpen) return null;
    const handleOverlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };
    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content access">
                <div className="access-icon"></div>
                <h2>{title}✅</h2>
                <p>{message || 'Действия выполнены'}</p>
                <button className="btn-primary" onClick={onClose}>Понятно</button>
            </div>
        </div>
    );
}
