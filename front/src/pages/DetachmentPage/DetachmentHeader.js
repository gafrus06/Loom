import React from 'react';

export default function DetachmentHeader({ detachment, memberships, detachmentCounselors, isCounselor, onBack }) {
    return (
        <div className="detachment-header">
            <div className="header-info">
                <h1>{detachment.name}</h1>
                <div className="header-meta">
                    <span>👶 {detachment.ageGroup}</span>
                    <span>👥 {memberships.length} детей</span>
                    {isCounselor && (
                        <span>👥 {detachmentCounselors.filter(c => c.active).length} вожатых</span>
                    )}
                </div>
            </div>
            <button className="btn-back" onClick={onBack}>Назад</button>
        </div>
    );
}
