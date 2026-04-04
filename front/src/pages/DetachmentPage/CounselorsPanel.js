import React from 'react';

export default function CounselorsPanel({
                                            detachmentCounselors, counselorProfiles, loadingCounselors,
                                            isCounselor, onAddCounselor, onUnassign, onCounselorClick, onShowAll,
                                            // Функция (counselor) => boolean — можно ли удалить конкретного
                                            canRemoveCounselor
                                        }) {
    const defaultCanRemove = canRemoveCounselor || (() => isCounselor);

    return (
        <div className="counselors-panel">
            <div className="counselors-header">
                <h3>👥 Вожатые отряда</h3>
                {isCounselor && (
                    <button className="btn-add-counselor" onClick={onAddCounselor} title="Добавить вожатого">
                        ➕ Добавить
                    </button>
                )}
            </div>

            {loadingCounselors ? (
                <div className="loading-counselors">
                    <div className="loading-dots">Загрузка вожатых...</div>
                </div>
            ) : (
                <div className="counselors-list">
                    {detachmentCounselors.length === 0 ? (
                        <div className="empty-counselors">
                            <p>Нет назначенных вожатых</p>
                        </div>
                    ) : (
                        <div className="counselors-grid">
                            {detachmentCounselors.slice(0, 3).map(counselor => {
                                const profile = counselorProfiles[counselor.userId];
                                const showRemove = defaultCanRemove(counselor) && counselor.active;
                                return (
                                    <div
                                        key={counselor.id}
                                        className="counselor-card"
                                        onClick={() => onCounselorClick(counselor.userId)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="counselor-info">
                                            {profile ? (
                                                <>
                                                    <div className="counselor-avatar">
                                                        {profile.avatarUrl ? (
                                                            <img src={profile.avatarUrl} alt={`${profile.firstName} ${profile.secondName}`} />
                                                        ) : (
                                                            <div className="counselor-avatar-fallback">{profile.firstName?.[0] || '?'}</div>
                                                        )}
                                                    </div>
                                                    <div className="counselor-details">
                                                        <span className="counselor-name">{profile.firstName} {profile.secondName}</span>
                                                        <span className="counselor-role">
                                                            {counselor.roleInDetachment === 'LEAD' ? '👑 Главный' : '🤝 Помощник'}
                                                        </span>
                                                        <span className={`counselor-status ${counselor.active ? 'active' : 'inactive'}`}>
                                                            {counselor.active ? 'Активен' : 'Неактивен'}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="counselor-details">
                                                    <span className="counselor-uuid">Вожатый: {counselor.userId?.slice(0, 8)}...</span>
                                                    <span className="counselor-role">
                                                        {counselor.roleInDetachment === 'LEAD' ? '👑 Главный' : '🤝 Помощник'}
                                                    </span>
                                                    <span className={`counselor-status ${counselor.active ? 'active' : 'inactive'}`}>
                                                        {counselor.active ? 'Активен' : 'Неактивен'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {showRemove && (
                                            <button
                                                className="counselor-unassign-btn"
                                                onClick={(e) => { e.stopPropagation(); onUnassign(counselor.id); }}
                                                title="Открепить от отряда"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {detachmentCounselors.length > 3 && (
                <button className="btn-view-counselors" onClick={onShowAll}>
                    Показать всех ({detachmentCounselors.length})
                </button>
            )}
        </div>
    );
}