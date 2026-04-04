import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { getCamp, getMyChildren, getActiveMembership } from '../services/camps';
import { getSessionsByCamp, createSession } from '../services/sessions';
import { getMyCamp } from '../services/campMembers';
import { getDetachment } from '../services/detachments';
import Sidebar from '../layouts/Sidebar';
import SuccessModal from '../components/SuccessModal';
import AccessDeniedModal from '../components/AccessDeniedModal';
import './SessionsList.css';

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
        title: '',
        campId,
        startDate: '',
        endDate: ''
    });

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.some((role) => {
        const value = String(role).toLowerCase();
        return value === 'role_admin' || value === 'admin';
    });
    const isCounselor = currentUser?.roles?.some((role) => {
        const value = String(role).toLowerCase();
        return value === 'role_counselor' || value === 'counselor';
    });
    const isParent = currentUser?.roles?.some((role) => {
        const value = String(role).toLowerCase();
        return value === 'role_parent' || value === 'parent';
    });
    const isUser = currentUser?.roles?.some((role) => {
        const value = String(role).toLowerCase();
        return value === 'role_user' || value === 'user';
    });
    const isApplicant = !isAdmin && !isCounselor && (isParent || isUser);

    const showSuccessMessage = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setShowSuccessAlert(true);
    };

    const showErrorMessage = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setShowAccessDeniedAlert(true);
    };

    useEffect(() => {
        loadData();
    }, [campId]);

    async function loadApplicantSessionIds() {
        const children = await getMyChildren().catch(() => []);
        const childIds = (Array.isArray(children) ? children : [])
            .map((child) => child?.childId || child?.id)
            .filter(Boolean);

        if (childIds.length === 0) {
            return [];
        }

        const detachmentResponses = await Promise.all(
            childIds.map(async (childId) => {
                try {
                    const membership = await getActiveMembership(childId);
                    if (!membership?.detachmentId) {
                        return null;
                    }
                    return await getDetachment(membership.detachmentId);
                } catch {
                    return null;
                }
            })
        );

        return Array.from(new Set(
            detachmentResponses
                .filter((detachment) => detachment?.campId === campId && detachment?.sessionId)
                .map((detachment) => detachment.sessionId)
        ));
    }

    async function loadData() {
        try {
            setLoading(true);
            setError('');

            const campData = await getCamp(campId);
            setCamp(campData);

            const allSessions = await getSessionsByCamp(campId);
            const sessionsArray = Array.isArray(allSessions) ? allSessions : [];

            if (isApplicant) {
                try {
                    const mySessionIds = await loadApplicantSessionIds();
                    setSessions(mySessionIds.length > 0
                        ? sessionsArray.filter((session) => mySessionIds.includes(session.id))
                        : []);
                } catch {
                    setSessions([]);
                }
                return;
            }

            if (isCounselor && !isAdmin) {
                try {
                    const membership = await getMyCamp();
                    const mySessionIds = membership?.sessionIds || [];
                    setSessions(mySessionIds.length > 0
                        ? sessionsArray.filter((session) => mySessionIds.includes(session.id))
                        : []);
                } catch {
                    setSessions(sessionsArray);
                }
                return;
            }

            setSessions(sessionsArray);
        } catch (err) {
            console.error('Failed to load sessions:', err);
            setError('Не удалось загрузить смены');
            setSessions([]);
            showErrorMessage('Ошибка загрузки', 'Не удалось загрузить смены');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitCreate(event) {
        event.preventDefault();

        if (!formData.title.trim()) {
            showErrorMessage('Ошибка заполнения', 'Введите название смены');
            return;
        }

        if (!formData.startDate || !formData.endDate) {
            showErrorMessage('Ошибка заполнения', 'Укажите даты смены');
            return;
        }

        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
            showErrorMessage('Ошибка дат', 'Дата окончания должна быть позже даты начала');
            return;
        }

        try {
            setCreating(true);
            await createSession(formData);
            setShowCreateModal(false);
            setFormData({ title: '', campId, startDate: '', endDate: '' });
            showSuccessMessage('Смена создана', 'Новая смена успешно добавлена');
            loadData();
        } catch {
            showErrorMessage('Ошибка создания', 'Не удалось создать смену');
        } finally {
            setCreating(false);
        }
    }

    function openDetachments(session) {
        navigate(`/camps/${campId}/sessions/${session.id}/detachments`);
    }

    function formatDate(dateString) {
        if (!dateString) {
            return '';
        }
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function getSessionStatus(session) {
        if (!session.startDate || !session.endDate) {
            return null;
        }

        const now = new Date();
        const start = new Date(session.startDate);
        const end = new Date(session.endDate);

        if (now < start) {
            return <span className="status-badge status-upcoming">Предстоящая</span>;
        }
        if (now > end) {
            return <span className="status-badge status-past">Завершена</span>;
        }
        return <span className="status-badge status-active">Активная</span>;
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-spinner">
                        <div className="spinner" />
                        <p>Загрузка смен...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Смены {camp ? `— ${camp.name}` : ''}</h1>
                        <p className="page-subtitle">
                            {sessions.length > 0
                                ? `Найдено смен: ${sessions.length}`
                                : isApplicant
                                    ? 'Нет смен, где участвует ваш ребёнок'
                                    : isCounselor && !isAdmin
                                        ? 'У вас пока нет назначенных смен в этом лагере'
                                        : 'В этом лагере пока нет смен'}
                        </p>
                        {isCounselor && !isAdmin && sessions.length === 0 && (
                            <p className="page-hint" style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
                                Администратор лагеря должен назначить вас на смену
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-secondary" onClick={() => navigate('/camps')}>
                            Назад
                        </button>
                        {isAdmin && (
                            <button className="btn-secondary" onClick={() => navigate(`/camps/${campId}/settings`)}>
                                Настройки лагеря
                            </button>
                        )}
                        {isAdmin && (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                Создать смену
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                    </div>
                )}

                {sessions.length === 0 && !error ? (
                    <div className="empty-sessions-state">
                        <div className="empty-sessions-icon">📅</div>
                        <h3>Нет смен</h3>
                        <p>
                            {isAdmin
                                ? 'Создайте первую смену для этого лагеря'
                                : isApplicant
                                    ? 'Ваш ребёнок пока не записан ни в одну смену этого лагеря'
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
                        {sessions.map((session) => (
                            <div key={session.id} className="session-card" onClick={() => openDetachments(session)}>
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
                                    <button
                                        className="btn-secondary btn-sm"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openDetachments(session);
                                        }}
                                    >
                                        Смотреть отряды →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать смену</h2>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                            </div>

                            <form onSubmit={handleSubmitCreate}>
                                <div className="form-group">
                                    <label htmlFor="title">Название смены *</label>
                                    <input
                                        id="title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                                        placeholder="Например: Летняя смена 2026"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="startDate">Дата начала *</label>
                                    <input
                                        id="startDate"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="endDate">Дата окончания *</label>
                                    <input
                                        id="endDate"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                                        required
                                    />
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowCreateModal(false)}
                                        disabled={creating}
                                    >
                                        Отмена
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={creating}>
                                        {creating ? 'Создание...' : 'Создать смену'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <SuccessModal
                    isOpen={showSuccessAlert}
                    onClose={() => setShowSuccessAlert(false)}
                    title={alertTitle}
                    message={alertMessage}
                />
                <AccessDeniedModal
                    isOpen={showAccessDeniedAlert}
                    onClose={() => setShowAccessDeniedAlert(false)}
                    title={alertTitle}
                    message={alertMessage}
                />
            </main>
        </div>
    );
}
