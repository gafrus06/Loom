import React from 'react';

export default function ChildrenPanel({
                                          memberships, isCounselor, isParent, myChildrenIds,
                                          onAddChild, onViewChild
                                      }) {
    return (
        <div className="children-panel">
            <div className="panel-header">
                <h2>Состав отряда</h2>
                {/* Кнопка добавить — только для вожатых отряда и ADMIN, не для родителей */}
                {isCounselor && !isParent && (
                    <button className="btn-add-child" onClick={onAddChild}>
                        ➕ Добавить
                    </button>
                )}
            </div>

            <div className="children-grid-scroll">
                {memberships.length === 0 ? (
                    <div className="empty-children">
                        <div className="empty-icon">👥</div>
                        <p>Нет участников</p>
                    </div>
                ) : (
                    memberships.map(m => {
                        const isMyChild = isParent && m.child && myChildrenIds.includes(m.child.id);
                        // Родитель: чужих детей видит по имени, но не может открыть
                        const restricted = isParent && !isMyChild;

                        return (
                            <div
                                key={m.id}
                                className={[
                                    'child-badge',
                                    m.child?.gender === 'MALE' ? 'male' :
                                        m.child?.gender === 'FEMALE' ? 'female' : 'neutral',
                                    isMyChild ? 'my-child' : '',
                                    restricted ? 'other-child' : ''
                                ].filter(Boolean).join(' ')}
                                onClick={() => {
                                    if (restricted) {
                                        // Родитель видит имя, но не может открыть карточку
                                        return;
                                    }
                                    if (m.child?.id) onViewChild(m.child.id);
                                }}
                                style={{
                                    cursor: restricted ? 'default' : 'pointer',
                                    opacity: restricted ? 0.82 : 1
                                }}
                                title={restricted ? `${m.child?.firstName || ''} ${m.child?.lastName || ''}` : ''}
                            >
                                <div className="child-avatar">
                                    {m.child ? (m.child.firstName?.[0] || '?') : '?'}
                                    {isMyChild && <span className="my-child-badge">⭐</span>}
                                </div>
                                <div className="child-name">
                                    {m.child
                                        ? `${m.child.firstName} ${m.child.lastName}`
                                        : 'Загрузка...'}
                                </div>
                                {/* Для чужих детей родителя — замочек вместо клика */}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
