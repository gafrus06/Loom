import React from 'react';

const RELATION_MAP = {
    'PARENT': 'Родитель', 'MOTHER': 'Мать', 'FATHER': 'Отец',
    'GUARDIAN': 'Опекун', 'OTHER': 'Родственник'
};

function getRelationText(relation) {
    return RELATION_MAP[relation] || relation;
}

export default function ChildViewModal({
                                           child, editingChild, editForm, savingChild, deletingChild,
                                           viewingChildParents, loadingChildParents,
                                           linkParentUuid, linkParentRelation, linkingNewParent, linkSuccess,
                                           isCounselor, canEdit,
                                           onClose, onStartEdit, onCancelEdit, onSaveChild,
                                           onEditFormChange, onDeleteClick,
                                           onParentClick, onUnlinkParent,
                                           onLinkParentUuidChange, onLinkParentRelationChange, onLinkNewParent
                                       }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-styled child-view-modal" onClick={(e) => e.stopPropagation()}>
                <div
                    className="modal-header-gradient"
                    style={{
                        background: child.gender === 'FEMALE'
                            ? 'linear-gradient(135deg, #FF6B9D, #FF1493)'
                            : 'linear-gradient(135deg, #3C8DFF, #2196F3)'
                    }}
                >
                    <h2>{child.firstName} {child.lastName}</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Закрыть">✕</button>
                </div>

                {editingChild ? (
                    <form onSubmit={onSaveChild} className="child-form-compact">
                        <div className="form-row-compact">
                            <div className="form-group-compact">
                                <label>Имя *</label>
                                <input type="text" required value={editForm?.firstName || ''}
                                       onChange={(e) => onEditFormChange({ ...editForm, firstName: e.target.value })} />
                            </div>
                            <div className="form-group-compact">
                                <label>Фамилия *</label>
                                <input type="text" required value={editForm?.lastName || ''}
                                       onChange={(e) => onEditFormChange({ ...editForm, lastName: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group-compact">
                            <label className="gender-label-text">Пол</label>
                            <label className="gender-switch">
                                <input type="checkbox" checked={editForm?.gender === 'FEMALE'}
                                       onChange={(e) => onEditFormChange({ ...editForm, gender: e.target.checked ? 'FEMALE' : 'MALE' })} />
                                <span>♂️ Мальчик</span>
                                <span>♀️ Девочка</span>
                            </label>
                        </div>

                        <div className="form-group-compact">
                            <label>Дата рождения *</label>
                            <input type="date" required value={editForm?.birthDate || ''}
                                   onChange={(e) => onEditFormChange({ ...editForm, birthDate: e.target.value })} />
                        </div>

                        <div className="form-group-compact">
                            <label>Город</label>
                            <input type="text" value={editForm?.homeCity || ''}
                                   onChange={(e) => onEditFormChange({ ...editForm, homeCity: e.target.value })}
                                   placeholder="Например: Москва" />
                        </div>

                        <div className="form-group-compact">
                            <label>Медицинские заметки</label>
                            <textarea value={editForm?.medicalNotes || ''}
                                      onChange={(e) => onEditFormChange({ ...editForm, medicalNotes: e.target.value })}
                                      placeholder="Хронические заболевания, особенности здоровья..." rows="3" />
                        </div>

                        <div className="form-group-compact">
                            <label>Аллергии</label>
                            <textarea value={editForm?.allergies || ''}
                                      onChange={(e) => onEditFormChange({ ...editForm, allergies: e.target.value })}
                                      placeholder="Пищевые аллергии, реакции на лекарства..." rows="2" />
                        </div>

                        <div className="form-group-compact">
                            <label>Особые потребности</label>
                            <textarea value={editForm?.specialNeeds || ''}
                                      onChange={(e) => onEditFormChange({ ...editForm, specialNeeds: e.target.value })}
                                      placeholder="Диеты, ограничения, необходимое оборудование..." rows="2" />
                        </div>

                        <div className="form-group-compact">
                            <label>Поведенческие особенности</label>
                            <textarea value={editForm?.behavioralNotes || ''}
                                      onChange={(e) => onEditFormChange({ ...editForm, behavioralNotes: e.target.value })}
                                      placeholder="Особенности характера, предпочтения, страхи..." rows="3" />
                        </div>

                        <div className="modal-actions-compact">
                            <button type="button" className="btn-modal-cancel" onClick={onCancelEdit}>Отмена</button>
                            <button type="submit" className="btn-modal-submit" disabled={savingChild}>
                                {savingChild ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="child-view-content">
                        <div className="child-info-section">
                            <div className="info-row">
                                <span className="info-label">Пол:</span>
                                <span className="info-value">{child.gender === 'MALE' ? '♂️ Мальчик' : '♀️ Девочка'}</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Дата рождения: </span>
                                <span className="info-value">
                                    {new Date(child.birthDate).toLocaleDateString('ru-RU')}
                                    {' '}({Math.floor((new Date() - new Date(child.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))} лет)
                                </span>
                            </div>

                            {child.homeCity && (
                                <div className="info-row">
                                    <span className="info-label">Город:</span>
                                    <span className="info-value">{child.homeCity}</span>
                                </div>
                            )}

                            {loadingChildParents ? (
                                <div className="info-block">
                                    <span className="info-label">👨‍👩‍👧‍👦 Родители:</span>
                                    <div className="parents-loading"><div className="loading-dots">Загрузка родителей...</div></div>
                                </div>
                            ) : viewingChildParents.length > 0 && (
                                <div className="info-block">
                                    <span className="info-label">👨‍👩‍👧‍👦 Родители:</span>
                                    <div className="parents-list">
                                        {viewingChildParents.map((parent) => (
                                            <div key={parent.parentUserId} className="parent-link-modal"
                                                 onClick={() => onParentClick(parent.parentUserId)}>
                                                <div className="parent-info-wrapper">
                                                    <span className="parent-relation-modal">{getRelationText(parent.relation)}:</span>
                                                    <span className="parent-name-modal">
                                                        {parent.parentInfo
                                                            ? `${parent.parentInfo.firstName} ${parent.parentInfo.lastName}`
                                                            : `Пользователь ${parent.parentUserId.slice(0, 8)}...`}
                                                    </span>
                                                </div>
                                                {isCounselor && (
                                                    <div className="parent-unlink-btn"
                                                         onClick={(e) => onUnlinkParent(child.id, parent.parentUserId, e)}
                                                         title="Отвязать родителя">✕</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isCounselor && (
                                <div className="info-block link-parent-block">
                                    <div className="link-header">
                                        <svg className="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                        </svg>
                                        <span className="link-title">Привязать родителя</span>
                                    </div>
                                    <form onSubmit={onLinkNewParent} className={`link-form ${linkSuccess ? 'link-success' : ''}`}>
                                        <div className="link-input-group">
                                            <input type="text" value={linkParentUuid}
                                                   onChange={(e) => onLinkParentUuidChange(e.target.value)}
                                                   placeholder="UUID родителя" className="link-uuid-input"
                                                   required disabled={linkingNewParent} />
                                            <select value={linkParentRelation}
                                                    onChange={(e) => onLinkParentRelationChange(e.target.value)}
                                                    className="link-relation-select" disabled={linkingNewParent}>
                                                <option value="PARENT">Родитель</option>
                                                <option value="MOTHER">Мать</option>
                                                <option value="FATHER">Отец</option>
                                                <option value="GUARDIAN">Опекун</option>
                                                <option value="OTHER">Другое</option>
                                            </select>
                                            <button type="submit" className="link-submit-btn"
                                                    disabled={linkingNewParent || !linkParentUuid.trim()}>
                                                {linkingNewParent ? 'Привязка...' : 'Привязать'}
                                            </button>
                                        </div>
                                        {linkSuccess && (
                                            <div className="link-success-message">
                                                <span className="success-icon">✓</span>
                                                <span>Родитель успешно привязан!</span>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}

                            {child.medicalNotes && (
                                <div className="info-block">
                                    <span className="info-label">🏥 Медицинские заметки:</span>
                                    <p className="info-text">{child.medicalNotes}</p>
                                </div>
                            )}
                            {child.allergies && (
                                <div className="info-block">
                                    <span className="info-label">⚠️ Аллергии:</span>
                                    <p className="info-text">{child.allergies}</p>
                                </div>
                            )}
                            {child.specialNeeds && (
                                <div className="info-block">
                                    <span className="info-label">🍽️ Особые потребности:</span>
                                    <p className="info-text">{child.specialNeeds}</p>
                                </div>
                            )}
                            {child.behavioralNotes && (
                                <div className="info-block">
                                    <span className="info-label">💭 Поведенческие особенности:</span>
                                    <p className="info-text">{child.behavioralNotes}</p>
                                </div>
                            )}
                        </div>

                        {canEdit && (
                            <div className="modal-actions-compact">
                                <button className="btn-modal-submit" onClick={onStartEdit}>✏️ Редактировать</button>
                                {isCounselor && (
                                    <button className="btn-modal-delete" onClick={() => onDeleteClick(child.id)} disabled={deletingChild}>
                                        🗑️ {deletingChild ? 'Удаление...' : 'Удалить'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}