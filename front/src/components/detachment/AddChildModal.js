import React, { useState, useEffect } from 'react';
import { getPendingApplications, confirmApplication, rejectApplication } from '../../api/applications';

export default function AddChildModal({
                                          detachmentId, campId,
                                          childForm, parentUuid, parentRelation, linkingParent,
                                          onChange, onParentUuidChange, onParentRelationChange,
                                          onSubmit, onClose, onApplicationConfirmed
                                      }) {
    const [activeTab, setActiveTab] = useState('manual');
    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (activeTab === 'applications' && campId) {
            loadApplications();
        }
    }, [activeTab, campId]);

    async function loadApplications() {
        setLoadingApps(true);
        try {
            const data = await getPendingApplications(campId, searchQuery);
            setApplications(data);
        } catch { setApplications([]); }
        finally { setLoadingApps(false); }
    }

    async function handleConfirm(applicationId) {
        setProcessingId(applicationId);
        try {
            await confirmApplication(applicationId, detachmentId);
            setApplications(prev => prev.filter(a => a.id !== applicationId));
            onApplicationConfirmed?.();
        } catch (err) { alert(`Ошибка: ${err.message}`); }
        finally { setProcessingId(null); }
    }

    async function handleReject(applicationId) {
        setProcessingId(applicationId);
        try {
            await rejectApplication(applicationId);
            setApplications(prev => prev.filter(a => a.id !== applicationId));
        } catch (err) { alert(`Ошибка: ${err.message}`); }
        finally { setProcessingId(null); }
    }

    const headerGradient = activeTab === 'applications'
        ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
        : childForm.gender === 'FEMALE'
            ? 'linear-gradient(135deg, #FF6B9D, #FF1493)'
            : 'linear-gradient(135deg, #3C8DFF, #2196F3)';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content-styled${activeTab === 'applications' ? ' add-child-modal-applications' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header-gradient" style={{ background: headerGradient }}>
                    <h2>{activeTab === 'manual' ? 'Добавить ребёнка' : 'Заявки родителей'}</h2>
                </div>

                {/* Враппер — единый padding для табов и контента */}
                <div className="add-child-modal-body">
                    <div className="add-child-tabs">
                        <button
                            className={`add-child-tab${activeTab === 'manual' ? ' active' : ''}`}
                            onClick={() => setActiveTab('manual')}
                        >
                            ✏️ Вручную
                        </button>
                        <button
                            className={`add-child-tab${activeTab === 'applications' ? ' active' : ''}`}
                            onClick={() => setActiveTab('applications')}
                        >
                            📋 Заявки
                        </button>
                    </div>

                    {activeTab === 'manual' && (
                        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
                            <div className="form-row-compact">
                                <div className="form-group-compact">
                                    <label>Имя *</label>
                                    <input type="text" required value={childForm.firstName}
                                           onChange={(e) => onChange({ ...childForm, firstName: e.target.value })}
                                           placeholder="Иван" />
                                </div>
                                <div className="form-group-compact">
                                    <label>Фамилия *</label>
                                    <input type="text" required value={childForm.lastName}
                                           onChange={(e) => onChange({ ...childForm, lastName: e.target.value })}
                                           placeholder="Иванов" />
                                </div>
                            </div>

                            <div className="form-group-compact">
                                <label className="gender-label-text">Пол</label>
                                <label className="gender-switch" aria-label="Выбор пола">
                                    <input type="checkbox" checked={childForm.gender === 'FEMALE'}
                                           onChange={(e) => onChange({ ...childForm, gender: e.target.checked ? 'FEMALE' : 'MALE' })} />
                                    <span>👦🏻️ Мальчик</span>
                                    <span>👧🏼 Девочка</span>
                                </label>
                            </div>

                            <div className="form-group-compact">
                                <label>Дата рождения *</label>
                                <input type="date" required value={childForm.birthDate}
                                       onChange={(e) => onChange({ ...childForm, birthDate: e.target.value })} />
                            </div>

                            <div className="parent-link-section">
                                <div className="parent-link-header">
                                    <svg className="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                    <span>Привязать родителя</span>
                                </div>
                                <div className="parent-link-input-group">
                                    <input type="text" value={parentUuid}
                                           onChange={(e) => onParentUuidChange(e.target.value)}
                                           placeholder="UUID родителя" className="parent-uuid-input" />
                                    {parentUuid.trim() && (
                                        <select value={parentRelation}
                                                onChange={(e) => onParentRelationChange(e.target.value)}
                                                className="parent-relation-select">
                                            <option value="PARENT">Родитель</option>
                                            <option value="MOTHER">Мать</option>
                                            <option value="FATHER">Отец</option>
                                            <option value="GUARDIAN">Опекун</option>
                                            <option value="OTHER">Другое</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="modal-actions-compact">
                                <button type="button" className="btn-modal-cancel" onClick={onClose}>Отмена</button>
                                <button type="submit" className="btn-modal-submit" disabled={linkingParent}>
                                    {linkingParent ? 'Привязка...' : 'Добавить'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'applications' && (
                        <div className="applications-tab">
                            <form className="app-search-form" onSubmit={(e) => { e.preventDefault(); loadApplications(); }}>
                                <input type="text" placeholder="Поиск по имени..."
                                       value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                       className="app-search-input" />
                                <button type="submit" className="app-search-btn">🔍</button>
                            </form>

                            {loadingApps ? (
                                <div className="apps-loading"><div className="loading-dots">Загрузка заявок...</div></div>
                            ) : applications.length === 0 ? (
                                <div className="apps-empty">
                                    <span>📭</span>
                                    <p>Нет ожидающих заявок</p>
                                </div>
                            ) : (
                                <div className="applications-list">
                                    {applications.map(app => (
                                        <div key={app.id} className="application-card">
                                            <div className="app-gender-stripe"
                                                 style={{ background: app.gender === 'FEMALE' ? '#FF6B9D' : '#3C8DFF' }} />
                                            <div className="app-info">
                                                <div className="app-name">{app.lastName} {app.firstName}</div>
                                                <div className="app-meta">
                                                    <span>{app.gender === 'MALE' ? '♂ Мальчик' : '♀ Девочка'}</span>
                                                    <span>·</span>
                                                    <span>{new Date(app.birthDate).toLocaleDateString('ru-RU')}</span>
                                                    {app.homeCity && <><span>·</span><span>{app.homeCity}</span></>}
                                                </div>
                                                {(app.medicalNotes || app.allergies) && (
                                                    <div className="app-health">
                                                        {app.medicalNotes && <span>🏥 {app.medicalNotes}</span>}
                                                        {app.allergies && <span>⚠️ {app.allergies}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="app-actions">
                                                <button className="app-btn-confirm"
                                                        onClick={() => handleConfirm(app.id)}
                                                        disabled={processingId === app.id}
                                                        title="Принять в отряд">
                                                    {processingId === app.id ? '…' : '✓'}
                                                </button>
                                                <button className="app-btn-reject"
                                                        onClick={() => handleReject(app.id)}
                                                        disabled={processingId === app.id}
                                                        title="Отклонить">
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="modal-actions-compact">
                                <button className="btn-modal-cancel" onClick={onClose}>Закрыть</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}