import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { getSession, getSessionContext } from '../services/sessions';
import { getCamp } from '../services/camps';
import { getDetachmentsBySession } from '../services/detachments';
import { getCalendarEventsBySession, createCalendarEvent, deleteCalendarEvent } from '../services/calendarEvents';
import { getTasksForToday, getTasksBySession, createShiftTask, upsertTaskCompletion } from '../services/shiftTasks';
import { getNoticesForSession } from '../services/seniorNotices';
import { getSessionAnalytics } from '../services/analytics';
import Sidebar from '../layouts/Sidebar';
import AccessDeniedModal from '../components/AccessDeniedModal';
import SuccessModal from '../components/SuccessModal';
import './SessionPage.css';

const TABS = [
    { id: 'overview', label: '📋 Обзор' },
    { id: 'tasks',    label: '✅ Задачи' },
    { id: 'calendar', label: '📅 Календарь' },
    { id: 'notices',  label: '📢 Объявления' },
    { id: 'analytics',label: '📊 Аналитика' },
];

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function today() {
    return new Date().toISOString().split('T')[0];
}

export default function SessionPage() {
    const { campId, sessionId } = useParams();
    const navigate = useNavigate();
    const currentUser = getCurrentUser();

    const isAdmin = currentUser?.roles?.some(r => ['role_admin','admin'].includes(String(r).toLowerCase()));
    const isCounselor = currentUser?.roles?.some(r => ['role_counselor','counselor'].includes(String(r).toLowerCase()));
    const isParent = currentUser?.roles?.some(r => ['role_parent','parent'].includes(String(r).toLowerCase()));

    const [activeTab, setActiveTab] = useState('overview');
    const [session, setSession] = useState(null);
    const [sessionContext, setSessionContext] = useState(null);
    const [camp, setCamp] = useState(null);
    const [detachments, setDetachments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tasks
    const [todayTasks, setTodayTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', targetDate: today(), taskType: 'GENERAL', detachmentId: '' });
    const [savingTask, setSavingTask] = useState(false);

    // Calendar
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [eventForm, setEventForm] = useState({ title: '', description: '', eventDate: today(), visibleForParents: true });
    const [savingEvent, setSavingEvent] = useState(false);

    // Notices
    const [notices, setNotices] = useState([]);
    const [loadingNotices, setLoadingNotices] = useState(false);

    // Analytics
    const [analytics, setAnalytics] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // Modals
    const [errorModal, setErrorModal] = useState({ open: false, title: '', msg: '' });
    const [successModal, setSuccessModal] = useState({ open: false, title: '', msg: '' });

    const showError = (title, msg) => setErrorModal({ open: true, title, msg });
    const showSuccess = (title, msg) => setSuccessModal({ open: true, title, msg });

    useEffect(() => {
        loadBase();
    }, [sessionId]);

    async function loadBase() {
        try {
            setLoading(true);
            const [s, ds] = await Promise.all([
                getSession(sessionId),
                getDetachmentsBySession(sessionId).catch(() => [])
            ]);
            setSession(s);
            setDetachments(Array.isArray(ds) ? ds : []);
            const ctx = await getSessionContext(sessionId).catch(() => null);
            setSessionContext(ctx);
            if (s?.campId || campId) {
                const c = await getCamp(s?.campId || campId).catch(() => null);
                setCamp(c);
            }
        } catch (e) {
            showError('Ошибка загрузки', e.message);
        } finally {
            setLoading(false);
        }
    }

    const loadTasks = useCallback(async () => {
        setLoadingTasks(true);
        try {
            const [t, all] = await Promise.all([
                getTasksForToday(sessionId).catch(() => []),
                getTasksBySession(sessionId).catch(() => []),
            ]);
            setTodayTasks(Array.isArray(t) ? t : []);
            setAllTasks(Array.isArray(all) ? all : []);
        } catch { setTodayTasks([]); setAllTasks([]); }
        finally { setLoadingTasks(false); }
    }, [sessionId]);

    const loadCalendar = useCallback(async () => {
        setLoadingEvents(true);
        try {
            const ev = await getCalendarEventsBySession(sessionId).catch(() => []);
            setEvents(Array.isArray(ev) ? ev.sort((a,b) => (a.eventDate||'').localeCompare(b.eventDate||'')) : []);
        } catch { setEvents([]); }
        finally { setLoadingEvents(false); }
    }, [sessionId]);

    const loadNotices = useCallback(async () => {
        setLoadingNotices(true);
        try {
            const n = await getNoticesForSession(sessionId).catch(() => []);
            setNotices(Array.isArray(n) ? n : []);
        } catch { setNotices([]); }
        finally { setLoadingNotices(false); }
    }, [sessionId]);

    const loadAnalytics = useCallback(async () => {
        setLoadingAnalytics(true);
        try {
            const a = await getSessionAnalytics(sessionId).catch(() => null);
            setAnalytics(a);
        } catch { setAnalytics(null); }
        finally { setLoadingAnalytics(false); }
    }, [sessionId]);

    useEffect(() => {
        if (activeTab === 'tasks') loadTasks();
        if (activeTab === 'calendar') loadCalendar();
        if (activeTab === 'notices') loadNotices();
        if (activeTab === 'analytics') loadAnalytics();
    }, [activeTab]);

    async function handleCreateTask(e) {
        e.preventDefault();
        if (!taskForm.title.trim()) { showError('Ошибка', 'Введите название задачи'); return; }
        setSavingTask(true);
        try {
            const data = {
                campId: session?.campId || campId,
                sessionId,
                taskType: taskForm.taskType,
                targetDate: taskForm.targetDate,
                title: taskForm.title,
                description: taskForm.description,
                detachmentId: taskForm.detachmentId || null,
            };
            await createShiftTask(data);
            setShowCreateTask(false);
            setTaskForm({ title: '', description: '', targetDate: today(), taskType: 'GENERAL', detachmentId: '' });
            showSuccess('Создано', 'Задача успешно создана');
            loadTasks();
        } catch (e) { showError('Ошибка', e.message); }
        finally { setSavingTask(false); }
    }

    async function handleToggleTask(task, detachmentId) {
        try {
            const completed = !task.completedByCurrentUser;
            await upsertTaskCompletion({ taskId: task.id, detachmentId, completed });
            loadTasks();
        } catch (e) { showError('Ошибка', e.message); }
    }

    async function handleCreateEvent(e) {
        e.preventDefault();
        if (!eventForm.title.trim()) { showError('Ошибка', 'Введите название события'); return; }
        setSavingEvent(true);
        try {
            await createCalendarEvent({
                campId: session?.campId || campId,
                sessionId,
                eventDate: eventForm.eventDate,
                title: eventForm.title,
                description: eventForm.description,
                visibleForParents: eventForm.visibleForParents,
            });
            setShowCreateEvent(false);
            setEventForm({ title: '', description: '', eventDate: today(), visibleForParents: true });
            showSuccess('Создано', 'Событие добавлено в календарь');
            loadCalendar();
        } catch (e) { showError('Ошибка', e.message); }
        finally { setSavingEvent(false); }
    }

    async function handleDeleteEvent(eventId) {
        try {
            await deleteCalendarEvent(eventId);
            loadCalendar();
        } catch (e) { showError('Ошибка', e.message); }
    }

    // Фильтруем вкладки: родитель видит только обзор и календарь
    const visibleTabs = TABS.filter(t => {
        if (isParent && !isAdmin && !isCounselor) {
            return ['overview', 'calendar'].includes(t.id);
        }
        return true;
    });
    const canManageCamp = Boolean(sessionContext?.canManageCamp);
    const canManageCalendar = Boolean(sessionContext?.canManageCalendar);
    const canManageShiftTasks = Boolean(sessionContext?.canManageShiftTasks);
    const canAccessSeniorDashboard = Boolean(sessionContext?.canAccessSeniorDashboard);
    const canOpenCampSettings = Boolean(sessionContext?.canOpenCampSettings);
    const calendarEnabled = sessionContext?.calendarEnabled !== false;

    if (loading) return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <div className="loading-spinner"><div className="spinner" /><p>Загрузка смены...</p></div>
            </main>
        </div>
    );

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content session-page">

                {/* ── Header ── */}
                <div className="page-header">
                    <div>
                        <div className="breadcrumb">
                            <button className="breadcrumb-link" onClick={() => navigate('/camps')}>Лагеря</button>
                            <span className="breadcrumb-sep">›</span>
                            {camp && (
                                <>
                                    <button className="breadcrumb-link" onClick={() => navigate(`/camps/${session?.campId || campId}/sessions`)}>
                                        {camp.name}
                                    </button>
                                    <span className="breadcrumb-sep">›</span>
                                </>
                            )}
                            <span className="breadcrumb-current">{session?.title || 'Смена'}</span>
                        </div>
                        <h1>{session?.title || 'Смена'}</h1>
                        <p className="page-subtitle">
                            {formatDate(session?.startDate)} — {formatDate(session?.endDate)}
                        </p>
                    </div>
                    <button className="btn-secondary" onClick={() => navigate(`/camps/${session?.campId || campId}/sessions`)}>
                        ← Назад
                    </button>
                </div>

                {(canOpenCampSettings || canAccessSeniorDashboard) && (
                    <div className="section-header-row" style={{ marginBottom: '20px' }}>
                        <div />
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {canOpenCampSettings && (
                                <button
                                    className="btn-secondary"
                                    onClick={() => navigate(`/camps/${session?.campId || campId}/settings`)}
                                >
                                    Настройки лагеря
                                </button>
                            )}
                            {canAccessSeniorDashboard && (
                                <button
                                    className="btn-primary"
                                    onClick={() => navigate(`/camps/${session?.campId || campId}/sessions/${sessionId}/dashboard`)}
                                >
                                    Дашборд старшего вожатого
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="session-tabs">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`session-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ── */}
                <div className="session-tab-content">

                    {/* ОБЗОР */}
                    {activeTab === 'overview' && (
                        <div className="tab-overview">
                            <div className="overview-cards">
                                <div className="overview-card">
                                    <span className="overview-icon">🏕️</span>
                                    <div>
                                        <div className="overview-label">Лагерь</div>
                                        <div className="overview-value">{camp?.name || '—'}</div>
                                    </div>
                                </div>
                                <div className="overview-card">
                                    <span className="overview-icon">📅</span>
                                    <div>
                                        <div className="overview-label">Начало</div>
                                        <div className="overview-value">{formatDate(session?.startDate)}</div>
                                    </div>
                                </div>
                                <div className="overview-card">
                                    <span className="overview-icon">🏁</span>
                                    <div>
                                        <div className="overview-label">Окончание</div>
                                        <div className="overview-value">{formatDate(session?.endDate)}</div>
                                    </div>
                                </div>
                                <div className="overview-card">
                                    <span className="overview-icon">👥</span>
                                    <div>
                                        <div className="overview-label">Отрядов</div>
                                        <div className="overview-value">{detachments.length}</div>
                                    </div>
                                </div>
                                <div className="overview-card">
                                    <span className="overview-icon">📆</span>
                                    <div>
                                        <div className="overview-label">Дней в смене</div>
                                        <div className="overview-value">{sessionContext?.shiftDays?.length ?? '—'}</div>
                                    </div>
                                </div>
                            </div>

                            {sessionContext && (
                                <div className="overview-cards" style={{ marginTop: '20px' }}>
                                    <div className="overview-card">
                                        <span className="overview-icon">⚙️</span>
                                        <div>
                                            <div className="overview-label">Управление лагерем</div>
                                            <div className="overview-value">{canManageCamp ? 'Доступно' : 'Только просмотр'}</div>
                                        </div>
                                    </div>
                                    <div className="overview-card">
                                        <span className="overview-icon">📅</span>
                                        <div>
                                            <div className="overview-label">Календарь</div>
                                            <div className="overview-value">{calendarEnabled ? 'Включен' : 'Отключен'}</div>
                                        </div>
                                    </div>
                                    <div className="overview-card">
                                        <span className="overview-icon">✅</span>
                                        <div>
                                            <div className="overview-label">Задачи по смене</div>
                                            <div className="overview-value">{canManageShiftTasks ? 'Можно вести' : 'Без управления'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Отряды */}
                            <div className="section-header-row">
                                <h2>Отряды смены</h2>
                                {(isAdmin || isCounselor || canManageCamp) && (
                                    <button className="btn-primary btn-sm"
                                            onClick={() => navigate(`/camps/${session?.campId || campId}/sessions/${sessionId}/detachments`)}>
                                        Все отряды →
                                    </button>
                                )}
                            </div>
                            {detachments.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">🏕️</span>
                                    <p>Отрядов пока нет</p>
                                </div>
                            ) : (
                                <div className="detachments-grid">
                                    {detachments.map(d => (
                                        <div key={d.id} className="detachment-mini-card"
                                             onClick={() => navigate(`/detachments/${d.id}`)}>
                                            <div className="dmc-name">{d.name}</div>
                                            <div className="dmc-meta">{d.ageGroup && `${d.ageGroup} лет`}</div>
                                            <div className={`dmc-stage stage-${(d.stage||'NEW').toLowerCase()}`}>
                                                {stageLabel(d.stage)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ЗАДАЧИ */}
                    {activeTab === 'tasks' && (
                        <div className="tab-tasks">
                            <div className="section-header-row">
                                <h2>Задачи на сегодня</h2>
                                {canManageShiftTasks && (
                                    <button className="btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>
                                        ➕ Создать задачу
                                    </button>
                                )}
                            </div>

                            {loadingTasks ? (
                                <div className="inline-loading">Загрузка задач...</div>
                            ) : todayTasks.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">✅</span>
                                    <p>Задач на сегодня нет</p>
                                </div>
                            ) : (
                                <div className="tasks-list">
                                    {todayTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isCounselor={isCounselor}
                                            detachments={detachments}
                                            onToggle={handleToggleTask}
                                        />
                                    ))}
                                </div>
                            )}

                            {allTasks.length > 0 && (
                                <>
                                    <div className="section-header-row" style={{ marginTop: '32px' }}>
                                        <h2>Все задачи смены</h2>
                                        <span className="count-badge">{allTasks.length}</span>
                                    </div>
                                    <div className="tasks-list tasks-list-all">
                                        {allTasks.map(task => (
                                            <TaskCard key={task.id} task={task} isCounselor={false}
                                                      detachments={detachments} onToggle={null} compact />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* КАЛЕНДАРЬ */}
                    {activeTab === 'calendar' && (
                        <div className="tab-calendar">
                            <div className="section-header-row">
                                <h2>Календарь событий</h2>
                                {canManageCalendar && !isParent && (
                                    <button className="btn-primary btn-sm" onClick={() => setShowCreateEvent(true)}>
                                        ➕ Добавить событие
                                    </button>
                                )}
                            </div>

                            {!calendarEnabled ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📅</span>
                                    <p>Календарь для этого лагеря отключен в настройках</p>
                                </div>
                            ) : loadingEvents ? (
                                <div className="inline-loading">Загрузка...</div>
                            ) : events.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📅</span>
                                    <p>Событий в календаре нет</p>
                                </div>
                            ) : (
                                <div className="calendar-list">
                                    {events.map(ev => (
                                        <div key={ev.id} className="calendar-event-card">
                                            <div className="cev-date">
                                                <span className="cev-day">{new Date(ev.eventDate).getDate()}</span>
                                                <span className="cev-month">
                                                    {new Date(ev.eventDate).toLocaleDateString('ru-RU', { month: 'short' })}
                                                </span>
                                            </div>
                                            <div className="cev-body">
                                                <div className="cev-title">{ev.title}</div>
                                                {ev.description && <div className="cev-desc">{ev.description}</div>}
                                                {ev.visibleForParents && (
                                                    <span className="cev-badge">👨‍👩‍👧 видно родителям</span>
                                                )}
                                            </div>
                                            {canManageCalendar && !isParent && (
                                                <button className="btn-icon-danger"
                                                        onClick={() => handleDeleteEvent(ev.id)}
                                                        title="Удалить">🗑️</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ОБЪЯВЛЕНИЯ */}
                    {activeTab === 'notices' && (
                        <div className="tab-notices">
                            <div className="section-header-row">
                                <h2>Служебные объявления</h2>
                            </div>
                            {loadingNotices ? (
                                <div className="inline-loading">Загрузка...</div>
                            ) : notices.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📢</span>
                                    <p>Объявлений нет</p>
                                </div>
                            ) : (
                                <div className="notices-list">
                                    {notices.map(n => (
                                        <div key={n.id} className="notice-card">
                                            <div className="notice-title">{n.title}</div>
                                            <div className="notice-body">{n.body}</div>
                                            <div className="notice-meta">
                                                {n.scope && <span className="notice-scope">{n.scope}</span>}
                                                {n.createdAt && (
                                                    <span className="notice-date">
                                                        {new Date(n.createdAt).toLocaleDateString('ru-RU')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* АНАЛИТИКА */}
                    {activeTab === 'analytics' && (
                        <div className="tab-analytics">
                            <h2>Аналитика смены</h2>
                            {loadingAnalytics ? (
                                <div className="inline-loading">Загрузка...</div>
                            ) : !analytics ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📊</span>
                                    <p>Данные аналитики недоступны</p>
                                </div>
                            ) : (
                                <div className="analytics-grid">
                                    <AnalyticsCard icon="👧" label="Детей" value={analytics.totalChildren ?? '—'} />
                                    <AnalyticsCard icon="👨‍🏫" label="Сотрудников" value={analytics.totalStaff ?? '—'} />
                                    <AnalyticsCard icon="🏕️" label="Отрядов" value={analytics.totalDetachments ?? '—'} />
                                    <AnalyticsCard icon="📋" label="Заявок" value={analytics.totalApplications ?? '—'} />
                                    <AnalyticsCard icon="✅" label="Принято" value={analytics.acceptedApplications ?? '—'} />
                                    <AnalyticsCard icon="⏳" label="Ожидают" value={analytics.pendingApplications ?? '—'} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Модал создания задачи ── */}
                {showCreateTask && (
                    <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать задачу</h2>
                                <button className="modal-close" onClick={() => setShowCreateTask(false)}>✕</button>
                            </div>
                            <form onSubmit={handleCreateTask}>
                                <div className="form-group">
                                    <label>Название *</label>
                                    <input type="text" value={taskForm.title}
                                           onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                                           placeholder="Заполнить вечерний отчёт" required />
                                </div>
                                <div className="form-group">
                                    <label>Описание</label>
                                    <textarea value={taskForm.description}
                                              onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                                              placeholder="Подробности задачи" rows={3} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Дата *</label>
                                        <input type="date" value={taskForm.targetDate}
                                               onChange={e => setTaskForm({...taskForm, targetDate: e.target.value})} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Тип</label>
                                        <select value={taskForm.taskType}
                                                onChange={e => setTaskForm({...taskForm, taskType: e.target.value})}>
                                            <option value="GENERAL">Общая (все отряды)</option>
                                            <option value="DETACHMENT">Для конкретного отряда</option>
                                        </select>
                                    </div>
                                </div>
                                {taskForm.taskType === 'DETACHMENT' && (
                                    <div className="form-group">
                                        <label>Отряд</label>
                                        <select value={taskForm.detachmentId}
                                                onChange={e => setTaskForm({...taskForm, detachmentId: e.target.value})}>
                                            <option value="">Выберите отряд</option>
                                            {detachments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary"
                                            onClick={() => setShowCreateTask(false)} disabled={savingTask}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={savingTask}>
                                        {savingTask ? 'Создание...' : 'Создать'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Модал создания события ── */}
                {showCreateEvent && (
                    <div className="modal-overlay" onClick={() => setShowCreateEvent(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Добавить событие</h2>
                                <button className="modal-close" onClick={() => setShowCreateEvent(false)}>✕</button>
                            </div>
                            <form onSubmit={handleCreateEvent}>
                                <div className="form-group">
                                    <label>Название *</label>
                                    <input type="text" value={eventForm.title}
                                           onChange={e => setEventForm({...eventForm, title: e.target.value})}
                                           placeholder="Открытие смены" required />
                                </div>
                                <div className="form-group">
                                    <label>Описание</label>
                                    <textarea value={eventForm.description}
                                              onChange={e => setEventForm({...eventForm, description: e.target.value})}
                                              placeholder="Подробности" rows={3} />
                                </div>
                                <div className="form-group">
                                    <label>Дата *</label>
                                    <input type="date" value={eventForm.eventDate}
                                           onChange={e => setEventForm({...eventForm, eventDate: e.target.value})} required />
                                </div>
                                <div className="form-group form-group-checkbox">
                                    <label>
                                        <input type="checkbox" checked={eventForm.visibleForParents}
                                               onChange={e => setEventForm({...eventForm, visibleForParents: e.target.checked})} />
                                        <span>Видно родителям</span>
                                    </label>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary"
                                            onClick={() => setShowCreateEvent(false)} disabled={savingEvent}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={savingEvent}>
                                        {savingEvent ? 'Сохранение...' : 'Добавить'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <SuccessModal isOpen={successModal.open} onClose={() => setSuccessModal({open:false,title:'',msg:''})}
                              title={successModal.title} message={successModal.msg} />
                <AccessDeniedModal isOpen={errorModal.open} onClose={() => setErrorModal({open:false,title:'',msg:''})}
                                   title={errorModal.title} message={errorModal.msg} />
            </main>
        </div>
    );
}

function TaskCard({ task, isCounselor, detachments, onToggle, compact }) {
    const det = detachments.find(d => d.id === task.detachmentId);
    return (
        <div className={`task-card ${compact ? 'compact' : ''} ${task.completedByCurrentUser ? 'completed' : ''}`}>
            <div className="task-card-left">
                {!compact && isCounselor && onToggle && (
                    <button
                        className={`task-check ${task.completedByCurrentUser ? 'checked' : ''}`}
                        onClick={() => onToggle(task, task.detachmentId || detachments[0]?.id)}
                        title={task.completedByCurrentUser ? 'Отменить выполнение' : 'Отметить выполненным'}
                    >
                        {task.completedByCurrentUser ? '✅' : '⬜'}
                    </button>
                )}
                <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    {task.description && !compact && <div className="task-desc">{task.description}</div>}
                    <div className="task-meta">
                        {task.targetDate && (
                            <span className="task-date">📅 {new Date(task.targetDate).toLocaleDateString('ru-RU')}</span>
                        )}
                        {det && <span className="task-det">🏕️ {det.name}</span>}
                        <span className={`task-type-badge ${task.taskType === 'GENERAL' ? 'general' : 'specific'}`}>
                            {task.taskType === 'GENERAL' ? 'Общая' : 'Отряд'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalyticsCard({ icon, label, value }) {
    return (
        <div className="analytics-card">
            <span className="analytics-icon">{icon}</span>
            <div className="analytics-value">{value}</div>
            <div className="analytics-label">{label}</div>
        </div>
    );
}

function stageLabel(stage) {
    const map = {
        NEW: 'Новый', ORGANIZATIONAL: 'Орг.', BUSINESS: 'Деловой',
        CONSTRUCTIVE: 'Конструктивный', FINAL: 'Финальный', COMPLETED: 'Завершён'
    };
    return map[stage] || stage || '—';
}
