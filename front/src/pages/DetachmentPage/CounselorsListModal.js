import React from 'react';

export default function CounselorsListModal({
                                                detachmentCounselors, counselorProfiles, loadingCounselors,
                                                isCounselor, onCounselorClick, onUnassign, onClose,
                                                canRemoveCounselor
                                            }) {
    const defaultCanRemove = canRemoveCounselor || (() => isCounselor);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-styled counselors-list-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-gradient" style={{ background: 'linear-gradient(135deg, #2196F3, #4CAF50)' }}>
                    <h2>Все вожатые отряда</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Закрыть">✕</button>
                </div>

                <div className="counselors-list-content">
                    {loadingCounselors ? (
                        <div className="loading-full"><div className="loading-dots">Загрузка вожатых...</div></div>
                    ) : detachmentCounselors.length === 0 ? (
                        <div className="empty-full"><p>Нет назначенных вожатых</p></div>
                    ) : (
                        <div className="counselors-full-list">
                            {detachmentCounselors.map(counselor => {
                                const profile = counselorProfiles[counselor.userId];
                                const showRemove = defaultCanRemove(counselor) && counselor.active;
                                return (
                                    <div
                                        key={counselor.id}
                                        className="counselor-full-card"
                                        onClick={() => onCounselorClick(counselor.userId)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="counselor-full-info">
                                            {profile ? (
                                                <>
                                                    <div className="counselor-full-avatar">
                                                        {profile.avatarUrl ? (
                                                            <img src={profile.avatarUrl} alt={`${profile.firstName} ${profile.secondName}`} />
                                                        ) : (
                                                            <div className="counselor-full-avatar-fallback">{profile.firstName?.[0] || '?'}</div>
                                                        )}
                                                    </div>
                                                    <div className="counselor-full-details">
                                                        <h4>{profile.firstName} {profile.secondName}</h4>
                                                        <div className="counselor-meta">
                                                            <span className="counselor-meta-item">
                                                                <strong>Роль:</strong>{' '}
                                                                {counselor.roleInDetachment === 'LEAD' ? '👑 Главный' : '🤝 Помощник'}
                                                            </span>
                                                            <span className={`counselor-meta-item ${counselor.active ? 'active' : 'inactive'}`}>
                                                                <strong>Статус:</strong> {counselor.active ? 'Активен' : 'Неактивен'}
                                                            </span>
                                                            <span className="counselor-meta-item">
                                                                <strong>Назначен:</strong> {new Date(counselor.assignedAt).toLocaleDateString('ru-RU')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="counselor-full-details">
                                                    <h4>Вожатый: {counselor.userId}</h4>
                                                    <div className="counselor-meta">
                                                        <span className="counselor-meta-item">
                                                            <strong>Роль:</strong>{' '}
                                                            {counselor.roleInDetachment === 'LEAD' ? '👑 Главный' : '🤝 Помощник'}
                                                        </span>
                                                        <span className={`counselor-meta-item ${counselor.active ? 'active' : 'inactive'}`}>
                                                            <strong>Статус:</strong> {counselor.active ? 'Активен' : 'Неактивен'}
                                                        </span>
                                                        <span className="counselor-meta-item">
                                                            <strong>Назначен:</strong> {new Date(counselor.assignedAt).toLocaleDateString('ru-RU')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {showRemove && (
                                            <button
                                                className="counselor-full-unassign-btn"
                                                onClick={(e) => { e.stopPropagation(); onUnassign(counselor.id); }}
                                                title="Открепить от отряда"
                                            >
                                                Открепить
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="modal-actions-compact">
                    <button className="btn-modal-cancel" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
}