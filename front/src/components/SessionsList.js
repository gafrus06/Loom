import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { getCamp, getMyAccessibleCamps } from '../api/camps';
import { getSessionsByCamp, createSession } from '../api/sessions';
import { getMyCamp } from '../api/campMembers';
import Sidebar from './Sidebar';
import SuccessModal from './SuccessModal';
import AccessDeniedModal from './AccessDeniedModal';
import '../styles/badges.css';
import '../styles/sessions.css';

export default function SessionsList() {
    const { campId } = useParams();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [camp, setCamp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);

    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showAccessDeniedAlert, setShowAccessDeniedAlert] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const [formData, setFormData] = useState({
        title: '', campId: campId, startDate: '', endDate: ''
    });

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_admin' || s === 'admin';
    });
    const isCounselor = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_counselor' || s === 'counselor';
    });
    const isParent = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_parent' || s === 'parent';
    });

    const showSuccessMessage = (title, message) => { setAlertTitle(title); setAlertMessage(message); setShowSuccessAlert(true); };
    const showErrorMessage  = (title, message) => { setAlertTitle(title); setAlertMessage(message); setShowAccessDeniedAlert(true); };
    const closeSuccessAlert = () => { setShowSuccessAlert(false); setAlertTitle(''); setAlertMessage(''); };
    const closeErrorMessage = () => { setShowAccessDeniedAlert(false); setAlertTitle(''); setAlertMessage(''); };

    useEffect(() => { loadData(); }, [campId]);

    async function loadData() {
        try {
            setLoading(true);
            setError('');

            const campData = await getCamp(campId);
            setCamp(campData);

            // Загружаем все смены лагеря
            const allSessions = await getSessionsByCamp(campId);
            const sessionsArray = Array.isArray(allSessions) ? allSessions : [];

            if (isParent && !isAdmin) {
                // Родитель видит только смены, в которых участвует его ребёнок.
                // getMyAccessibleCamps() возвращает CampWithRoleDto со списком sessionIds
                try {
                    const myCamps = await getMyAccessibleCamps();
                    const myCamp = Array.isArray(myCamps)
                        ? myCamps.find(c => c.id === campId)
                        : null;
                    const mySessionIds = myCamp?.sessionIds || [];

                    if (mySessionIds.length > 0) {
                        setSessions(sessionsArray.filter(s => mySessionIds.includes(s.id)));
                    } else {
                        setSessions([]);
                    }
                } catch {
                    setSessions([]);
                }
            } else if (isCounselor && !isAdmin) {
                // Вожатый видит только смены, к которым он привязан
                try {
                    const membership = await getMyCamp();
                    const mySessionIds = membership?.sessionIds || [];

                    if (mySessionIds.length > 0) {
                        setSessions(sessionsArray.filter(s => mySessionIds.includes(s.id)));
                    } else {
                        setSessions([]);
                    }
                } catch {
                    setSessions(sessionsArray);
                }
            } else {
                // ADMIN видит все смены
                setSessions(sessionsArray);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Не удалось загрузить смены');
            setSessions([]);
            showErrorMessage('Ошибка загрузки', 'Не удалось загрузить смены');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitCreate(e) {
        e.preventDefault();
        if (!formData.title.trim()) { showErrorMessage('Ошибка заполнения', 'Введите название смены'); return; }
        if (!formData.startDate || !formData.endDate) { showErrorMessage('Ошибка заполнения', 'Укажите даты'); return; }
        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
            showErrorMessage('Ошибка дат', 'Дата окончания должна быть позже даты начала'); return;
        }
        try {
            setCreating(true);
            await createSession(formData);
            setShowCreateModal(false);
            setFormData({ title: '', campId: campId, startDate: '', endDate: '' });
            showSuccessMessage('Создано', 'Смена успешно создана');
            loadData();
        } catch {
            showErrorMessage('Ошибка создания', 'Не удалось создать смену');
        } finally {
            setCreating(false);
        }
    }

    function handleSessionClick(session) {
        navigate(`/camps/${campId}/sessions/${session.id}/detachments`);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function getSessionStatus(session) {
        if (!session.startDate || !session.endDate) return null;
        const now = new Date(), start = new Date(session.startDate), end = new Date(session.endDate);
        if (now < start) return <span className="status-badge status-upcoming">Предстоящая</span>;
        if (now > end)   return <span className="status-badge status-past">Завершена</span>;
        return <span className="status-badge status-active">Активная</span>;
    }

    if (loading) return (
        <div className="layout"><Sidebar />
            <main className="main-content">
                <div className="loading-spinner"><div className="spinner"></div><p>Загрузка смен...</p></div>
            </main>
        </div>
    );

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Смены {camp && `— ${camp.name}`}</h1>
                        <p className="page-subtitle">
                            {sessions.length > 0
                                ? `Найдено смен: ${sessions.length}`
                                : isParent && !isAdmin
                                    ? 'Нет смен с вашим ребёнком'
                                    : isCounselor && !isAdmin
                                        ? 'У вас нет назначенных смен в этом лагере'
                                        : 'В этом лагере пока нет смен'}
                        </p>
                        {/* Подсказка для вожатого */}
                        {isCounselor && !isAdmin && sessions.length === 0 && (
                            <p className="page-hint" style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
                                Администратор лагеря должен назначить вас на смену
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-secondary" onClick={() => navigate('/camps')}>Назад</button>
                        {isAdmin && (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                ➕ Создать смену
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="error-message"><span>⚠️</span><span>{error}</span></div>}

                {sessions.length === 0 && !error ? (
                    <div className="empty-sessions-state">
                        <div className="empty-sessions-icon">📅</div>
                        <h3>Нет смен</h3>
                        <p>
                            {isAdmin
                                ? 'Создайте первую смену для этого лагеря'
                                : isParent
                                    ? 'Ваш ребёнок не записан ни в одну смену этого лагеря'
                                    : 'Смены появятся после назначения администратором'}
                        </p>
                        {isAdmin && (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                Создать первую смену
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="sessions-list">
                        {sessions.map(session => (
                            <div key={session.id} className="session-card"
                                 onClick={() => handleSessionClick(session)}>
                                <div className="session-header">
                                    <div>
                                        <h3>{session.title || session.name}</h3>
                                        {camp && (
                                            <p className="session-camp">
                                                <span className="icon">🏕️</span>
                                                <span>{camp.name}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="session-badges">{getSessionStatus(session)}</div>
                                </div>

                                <div className="session-dates">
                                    <div className="date-item">
                                        <span className="date-label">Начало:</span>
                                        <span className="date-value">{formatDate(session.startDate)}</span>
                                    </div>
                                    <div className="date-separator">→</div>
                                    <div className="date-item">
                                        <span className="date-label">Окончание:</span>
                                        <span className="date-value">{formatDate(session.endDate)}</span>
                                    </div>
                                </div>

                                <div className="session-footer">
                                    <button className="btn-secondary btn-sm"
                                            onClick={(e) => { e.stopPropagation(); handleSessionClick(session); }}>
                                        Смотреть отряды →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать смену</h2>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSubmitCreate}>
                                <div className="form-group">
                                    <label htmlFor="title">Название смены *</label>
                                    <input id="title" type="text" value={formData.title}
                                           onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                           placeholder="Например: 1-я смена, Летняя смена 2026" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="startDate">Дата начала *</label>
                                    <input id="startDate" type="date" value={formData.startDate}
                                           onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="endDate">Дата окончания *</label>
                                    <input id="endDate" type="date" value={formData.endDate}
                                           onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary"
                                            onClick={() => setShowCreateModal(false)} disabled={creating}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={creating}>
                                        {creating ? 'Создание...' : 'Создать смену'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <SuccessModal isOpen={showSuccessAlert} onClose={closeSuccessAlert}
                              title={alertTitle} message={alertMessage} />
                <AccessDeniedModal isOpen={showAccessDeniedAlert} onClose={closeErrorMessage}
                                   title={alertTitle} message={alertMessage} />
            </main>
        </div>
    );
}