import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../layouts/Sidebar';
import { getSession, getSessionContext } from '../services/sessions';
import { getDetachmentsBySession, getDetachmentCounselors } from '../services/detachments';
import { getTasksBySession, createShiftTask } from '../services/shiftTasks';
import { getCalendarEventsBySession, createCalendarEvent } from '../services/calendarEvents';
import { createSeniorNotice, getNoticesForSession } from '../services/seniorNotices';
import { getUserProfile } from '../services/users';
import { getPendingModerationPosts, approvePost, rejectPost } from '../services/news';
import { confirmFileUpload, generateFileUploadUrl, getFileDownloadUrl } from '../services/files';
import {
    createReportTemplate,
    getReportTemplates,
    deactivateReportTemplate,
    getSessionReports
} from '../services/shiftReports';
import {
    parseTemplateFields,
    buildTemplateFieldsSchema,
    parseReportData,
    getReportStatusClass,
    getReportStatusLabel
} from '../utils/shiftReports';
import Post from '../components/Post';
import counselorsArt from '../assets/panel/cons.png';
import detachmentsArt from '../assets/panel/det.png';
import tasksArt from '../assets/panel/task.png';
import eventsArt from '../assets/panel/event.png';
import infoArt from '../assets/panel/info.png';
import templatesArt from '../assets/panel/temp.png';
import reportsArt from '../assets/panel/report.png';
import moderationArt from '../assets/panel/wait.png';
import './SeniorDashboardPage.css';

function today() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function stageLabel(stage) {
    const map = {
        NEW: 'Новый',
        ORGANIZATIONAL: 'Организационный',
        BUSINESS: 'Деловой',
        CONSTRUCTIVE: 'Конструктивный',
        FINAL: 'Финальный',
        COMPLETED: 'Завершён'
    };
    return map[stage] || stage || '—';
}

function stageTone(stage) {
    const map = {
        NEW: 'danger',
        ORGANIZATIONAL: 'warning',
        BUSINESS: 'sun',
        CONSTRUCTIVE: 'success',
        FINAL: 'info',
        COMPLETED: 'violet'
    };
    return map[stage] || 'default';
}

function taskProgressTone(percent) {
    if (percent >= 100) return 'done';
    if (percent > 0) return 'in-progress';
    return 'new';
}

function taskProgressLabel(progress) {
    const percent = Math.round(progress?.completionPercent || 0);
    if (percent >= 100) return 'Готово';
    if (percent > 0) return 'В процессе';
    return 'Не начато';
}

function buildTemplateFieldDraft(fieldsSchema) {
    const fields = parseTemplateFields(fieldsSchema);
    return fields.length > 0 ? fields.map((field) => field.label) : [''];
}

function createEmptyTaskForm() {
    return {
        title: '',
        description: '',
        targetDate: today(),
        taskType: 'GENERAL',
        detachmentId: '',
        checklistItems: [{ title: '', required: true }],
        attachments: []
    };
}

export default function SeniorDashboardPage() {
    const { campId, sessionId } = useParams();
    const navigate = useNavigate();

    const [sessionContext, setSessionContext] = useState(null);
    const [session, setSession] = useState(null);
    const [detachments, setDetachments] = useState([]);
    const [staffRows, setStaffRows] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [reportTemplates, setReportTemplates] = useState([]);
    const [sessionReports, setSessionReports] = useState([]);
    const [pendingPosts, setPendingPosts] = useState([]);
    const [sessionNotices, setSessionNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasAccess, setHasAccess] = useState(true);
    const [toastMessages, setToastMessages] = useState([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showReportViewModal, setShowReportViewModal] = useState(false);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [savingTask, setSavingTask] = useState(false);
    const [savingEvent, setSavingEvent] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [moderatingPostId, setModeratingPostId] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [calendarTooltip, setCalendarTooltip] = useState(null);
    const [taskForm, setTaskForm] = useState(createEmptyTaskForm);
    const [eventForm, setEventForm] = useState({ title: '', description: '', eventDate: today(), visibleForParents: true });
    const [templateForm, setTemplateForm] = useState({ title: '', fields: [''] });
    const [noticeForm, setNoticeForm] = useState({ title: '', body: '' });
    const [uploadingTaskAttachment, setUploadingTaskAttachment] = useState(false);

    const pushToast = useCallback((message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToastMessages((prev) => [...prev, { id, message }]);
        window.setTimeout(() => {
            setToastMessages((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);

    const resetTaskForm = useCallback(() => {
        setTaskForm(createEmptyTaskForm());
    }, []);

    const resetEventForm = useCallback(() => {
        setEventForm({ title: '', description: '', eventDate: today(), visibleForParents: true });
    }, []);

    const resetTemplateForm = useCallback(() => {
        setTemplateForm({ title: '', fields: [''] });
        setEditingTemplate(null);
    }, []);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const [ctx, sessionData, detachmentData, taskData, eventData, templatesData, reportsData, noticesData] = await Promise.all([
                getSessionContext(sessionId),
                getSession(sessionId),
                getDetachmentsBySession(sessionId).catch(() => []),
                getTasksBySession(sessionId).catch(() => []),
                getCalendarEventsBySession(sessionId).catch(() => []),
                getReportTemplates(campId, sessionId).catch(() => []),
                getSessionReports(sessionId, campId).catch(() => []),
                getNoticesForSession(sessionId).catch(() => [])
            ]);

            setSessionContext(ctx);
            if (!ctx?.canAccessSeniorDashboard) {
                setHasAccess(false);
                setError('У вас нет доступа к управлению этой сменой.');
                return;
            }

            setHasAccess(true);
            setSession(sessionData);
            setDetachments(Array.isArray(detachmentData) ? detachmentData : []);
            setTasks(Array.isArray(taskData) ? taskData : []);
            setEvents(Array.isArray(eventData) ? eventData : []);
            setReportTemplates(Array.isArray(templatesData) ? templatesData.filter((item) => item?.active !== false) : []);
            setSessionReports(Array.isArray(reportsData) ? reportsData : []);
            setSessionNotices(Array.isArray(noticesData) ? noticesData : []);

            const counselorsByDetachment = await Promise.all(
                (Array.isArray(detachmentData) ? detachmentData : []).map(async (detachment) => ({
                    detachment,
                    assignments: await getDetachmentCounselors(detachment.id).catch(() => [])
                }))
            );

            const assignments = counselorsByDetachment.flatMap(({ detachment, assignments }) =>
                (assignments || []).map((assignment) => ({
                    ...assignment,
                    detachmentName: assignment.detachmentName || detachment.name
                }))
            );

            const uniqueUserIds = [...new Set(assignments.map((item) => item.userId).filter(Boolean))];
            const profiles = await Promise.all(
                uniqueUserIds.map(async (userId) => {
                    try {
                        return [userId, await getUserProfile(userId)];
                    } catch {
                        return [userId, null];
                    }
                })
            );
            const profileMap = Object.fromEntries(profiles);

            const mergedStaff = assignments
                .map((assignment) => {
                    const profile = profileMap[assignment.userId];
                    return {
                        id: assignment.id,
                        userId: assignment.userId,
                        detachmentName: assignment.detachmentName || 'Без отряда',
                        roleInDetachment: assignment.roleInDetachment,
                        firstName: profile?.firstName || '',
                        lastName: profile?.lastName || '',
                        avatarUrl: profile?.avatarUrl || null
                    };
                })
                .sort((a, b) => {
                    const byLast = (a.lastName || '').localeCompare(b.lastName || '', 'ru');
                    if (byLast !== 0) return byLast;
                    return (a.firstName || '').localeCompare(b.firstName || '', 'ru');
                });

            setStaffRows(mergedStaff);

            const moderation = await getPendingModerationPosts(campId).catch(() => ({ content: [] }));
            setPendingPosts(Array.isArray(moderation?.content) ? moderation.content : []);
        } catch (e) {
            setError(e.message || 'Не удалось загрузить управление сменой.');
        } finally {
            setLoading(false);
        }
    }, [campId, sessionId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || ''))),
        [events]
    );
    const sortedTasks = useMemo(
        () => [...tasks].sort((a, b) => {
            const dateCompare = String(b.targetDate || '').localeCompare(String(a.targetDate || ''));
            if (dateCompare !== 0) return dateCompare;
            return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
        }),
        [tasks]
    );
    const detachmentMap = useMemo(
        () => Object.fromEntries(detachments.map((detachment) => [detachment.id, detachment])),
        [detachments]
    );

    async function handleCreateTask(event) {
        event.preventDefault();
        if (!taskForm.title.trim()) {
            setError('Введите название задачи.');
            return;
        }
        if (taskForm.taskType === 'DETACHMENT' && !taskForm.detachmentId) {
            setError('Выберите отряд для отрядной задачи.');
            return;
        }

        try {
            setSavingTask(true);
            setError('');
            const createdTask = await createShiftTask({
                campId,
                sessionId,
                taskType: taskForm.taskType,
                targetDate: taskForm.targetDate,
                title: taskForm.title,
                description: taskForm.description,
                detachmentId: taskForm.taskType === 'DETACHMENT' ? taskForm.detachmentId || null : null,
                checklistItems: taskForm.checklistItems
                    .map((item, index) => ({
                        title: item.title.trim(),
                        required: item.required !== false,
                        sortOrder: index
                    }))
                    .filter((item) => item.title),
                attachments: taskForm.attachments.map((attachment) => ({
                    fileId: attachment.fileId,
                    originalFileName: attachment.originalFileName
                }))
            });
            setTasks((prev) => [createdTask, ...prev]);
            pushToast('Задача создана.');
            setShowTaskModal(false);
            resetTaskForm();
        } catch (e) {
            setError(e.message || 'Не удалось создать задачу.');
        } finally {
            setSavingTask(false);
        }
    }

    function handleTaskChecklistChange(index, key, value) {
        setTaskForm((prev) => ({
            ...prev,
            checklistItems: prev.checklistItems.map((item, itemIndex) => (
                itemIndex === index ? { ...item, [key]: value } : item
            ))
        }));
    }

    function handleAddTaskChecklistItem() {
        setTaskForm((prev) => ({
            ...prev,
            checklistItems: [...prev.checklistItems, { title: '', required: true }]
        }));
    }

    function handleRemoveTaskChecklistItem(index) {
        setTaskForm((prev) => ({
            ...prev,
            checklistItems: prev.checklistItems.length === 1
                ? [{ title: '', required: true }]
                : prev.checklistItems.filter((_, itemIndex) => itemIndex !== index)
        }));
    }

    async function handleTaskAttachmentUpload(event) {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        try {
            setUploadingTaskAttachment(true);
            setError('');
            const uploadedAttachments = [];

            for (const file of files) {
                const { fileId, uploadUrl } = await generateFileUploadUrl('camp-service', 'shift-task-attachment', file.name, file.type || 'application/octet-stream');
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type || 'application/octet-stream' }
                });
                if (!uploadResponse.ok) {
                    throw new Error(`Не удалось загрузить файл ${file.name}`);
                }
                await confirmFileUpload(fileId, sessionId);
                uploadedAttachments.push({
                    fileId,
                    originalFileName: file.name
                });
            }

            setTaskForm((prev) => ({
                ...prev,
                attachments: [...prev.attachments, ...uploadedAttachments]
            }));
        } catch (uploadError) {
            setError(uploadError.message || 'Не удалось загрузить вложение задачи.');
        } finally {
            event.target.value = '';
            setUploadingTaskAttachment(false);
        }
    }

    function handleRemoveTaskAttachment(fileId) {
        setTaskForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((attachment) => attachment.fileId !== fileId)
        }));
    }

    async function handleOpenTaskAttachment(fileId) {
        try {
            const { downloadUrl } = await getFileDownloadUrl(fileId);
            window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        } catch (attachmentError) {
            setError(attachmentError.message || 'Не удалось открыть вложение.');
        }
    }

    async function handleCreateEvent(event) {
        event.preventDefault();
        if (!eventForm.title.trim()) {
            setError('Введите название события.');
            return;
        }

        try {
            setSavingEvent(true);
            setError('');
            const createdEvent = await createCalendarEvent({
                campId,
                sessionId,
                eventDate: eventForm.eventDate,
                title: eventForm.title,
                description: eventForm.description,
                visibleForParents: eventForm.visibleForParents
            });
            setEvents((prev) => [createdEvent, ...prev]);
            pushToast('Событие добавлено в календарь.');
            setShowEventModal(false);
            resetEventForm();
        } catch (e) {
            setError(e.message || 'Не удалось создать событие.');
        } finally {
            setSavingEvent(false);
        }
    }

    async function handleCreateNotice(event) {
        event.preventDefault();
        if (!noticeForm.title.trim() || !noticeForm.body.trim()) {
            setError('Заполните заголовок и текст общей информации.');
            return;
        }

        try {
            setError('');
            const createdNotice = await createSeniorNotice({
                campId,
                sessionId,
                scope: 'GENERAL',
                title: noticeForm.title.trim(),
                body: noticeForm.body.trim()
            });
            setSessionNotices((prev) => [createdNotice, ...prev]);
            pushToast('Общая информация добавлена.');
            setShowNoticeModal(false);
            setNoticeForm({ title: '', body: '' });
        } catch (e) {
            setError(e.message || 'Не удалось сохранить общую информацию.');
        }
    }

    function handleOpenCreateTemplate() {
        resetTemplateForm();
        setShowTemplateModal(true);
    }

    function handleOpenEditTemplate(template) {
        setEditingTemplate(template);
        setTemplateForm({ title: template?.title || '', fields: buildTemplateFieldDraft(template?.fieldsSchema) });
        setShowTemplateModal(true);
    }

    async function handleSaveTemplate(event) {
        event.preventDefault();
        const title = templateForm.title.trim();
        const labels = templateForm.fields.map((item) => item.trim()).filter(Boolean);

        if (!title) {
            setError('Введите название шаблона отчета.');
            return;
        }
        if (labels.length === 0) {
            setError('Добавьте хотя бы одно поле в шаблон отчета.');
            return;
        }

        try {
            setSavingTemplate(true);
            setError('');
            if (editingTemplate?.id) {
                await deactivateReportTemplate(editingTemplate.id);
            }
            const createdTemplate = await createReportTemplate(campId, {
                sessionId,
                title,
                fieldsSchema: buildTemplateFieldsSchema(labels)
            });
            setReportTemplates((prev) => {
                if (editingTemplate?.id) {
                    return [createdTemplate, ...prev.filter((item) => item.id !== editingTemplate.id)];
                }
                return [createdTemplate, ...prev];
            });
            pushToast(editingTemplate ? 'Шаблон обновлен.' : 'Шаблон создан.');
            setShowTemplateModal(false);
            resetTemplateForm();
        } catch (e) {
            setError(e.message || 'Не удалось сохранить шаблон отчета.');
        } finally {
            setSavingTemplate(false);
        }
    }

    function handleAddTemplateField() {
        setTemplateForm((prev) => ({ ...prev, fields: [...prev.fields, ''] }));
    }

    function handleTemplateFieldChange(index, value) {
        setTemplateForm((prev) => ({
            ...prev,
            fields: prev.fields.map((field, fieldIndex) => fieldIndex === index ? value : field)
        }));
    }

    function handleRemoveTemplateField(index) {
        setTemplateForm((prev) => ({
            ...prev,
            fields: prev.fields.length === 1 ? [''] : prev.fields.filter((_, fieldIndex) => fieldIndex !== index)
        }));
    }

    function handleOpenReport(report) {
        setSelectedReport(report);
        setShowReportViewModal(true);
    }

    function handleShowCalendarTooltip(event, dayEvent) {
        const rect = event.currentTarget.getBoundingClientRect();
        setCalendarTooltip({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
            title: dayEvent.title || 'Событие',
            description: dayEvent.description || 'Без описания',
            visibility: dayEvent.visibleForParents ? 'Видно родителям' : 'Не видно родителям'
        });
    }

    async function handleDeleteTemplate(templateId) {
        try {
            setError('');
            await deactivateReportTemplate(templateId);
            setReportTemplates((prev) => prev.filter((item) => item.id !== templateId));
            pushToast('Шаблон удален.');
        } catch (e) {
            setError(e.message || 'Не удалось удалить шаблон.');
        }
    }

    async function handleApprovePost(postId) {
        try {
            setModeratingPostId(postId);
            setError('');
            await approvePost(postId);
            setPendingPosts((prev) => prev.filter((item) => item.id !== postId));
            pushToast('Пост опубликован.');
        } catch (e) {
            setError(e.message || 'Не удалось опубликовать пост.');
        } finally {
            setModeratingPostId(null);
        }
    }

    async function handleRejectPost(postId) {
        try {
            setModeratingPostId(postId);
            setError('');
            await rejectPost(postId);
            setPendingPosts((prev) => prev.filter((item) => item.id !== postId));
            pushToast('Пост отклонён.');
        } catch (e) {
            setError(e.message || 'Не удалось отклонить пост.');
        } finally {
            setModeratingPostId(null);
        }
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content senior-dashboard-page">
                    <div className="inline-loading">Загрузка управления сменой...</div>
                </main>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content senior-dashboard-page">
                    <div className="settings-error">{error || 'У вас нет доступа к управлению этой сменой.'}</div>
                    <button className="btn-secondary" onClick={() => navigate(`/camps/${campId}/sessions/${sessionId}/detachments`)}>
                        К отрядам
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content senior-dashboard-page">
                <div className="page-header senior-dashboard-header">
                    <div>
                        <div className="senior-dashboard-kicker">Управлять сменой</div>
                        <h1>{session?.title || 'Смена'}</h1>
                        <p className="page-subtitle">
                            {formatDate(session?.startDate)} - {formatDate(session?.endDate)}
                        </p>
                    </div>
                    <div className="senior-dashboard-actions">
                        <button className="btn-secondary" onClick={() => navigate(`/camps/${campId}/sessions/${sessionId}/detachments`)}>
                            Все отряды
                        </button>
                    </div>
                </div>

                {error && <div className="settings-error">{error}</div>}
                {toastMessages.length > 0 && (
                    <div className="senior-toast-stack">
                        {toastMessages.map((toast) => (
                            <div key={toast.id} className="senior-toast-badge">
                                {toast.message}
                            </div>
                        ))}
                    </div>
                )}

                <div className="senior-dashboard-metrics">
                    <MetricCard label="Вожатые" value={staffRows.length} art={counselorsArt} artClassName="metric-card-art-counselors" />
                    <MetricCard label="Отряды" value={detachments.length} art={detachmentsArt} artClassName="metric-card-art-detachments" />
                    <MetricCard label="Задачи" value={tasks.length} art={tasksArt} artClassName="metric-card-art-tasks" />
                    <MetricCard label="События" value={events.length} art={eventsArt} artClassName="metric-card-art-events" />
                    <MetricCard label="Шаблоны" value={reportTemplates.length} art={templatesArt} artClassName="metric-card-art-templates" />
                    <MetricCard label="Отчеты" value={sessionReports.length} art={reportsArt} artClassName="metric-card-art-reports" />
                    <MetricCard label="На модерации" value={pendingPosts.length} art={moderationArt} artClassName="metric-card-art-moderation" />
                </div>

                <div className="senior-dashboard-grid">
                    <section className="senior-card senior-card-staff">
                        <CardArt src={counselorsArt} alt="" className="senior-card-art-staff" />
                        <div className="senior-card-head">
                            <h2>Вожатые</h2>
                        </div>
                        <div className="senior-staff-list">
                            {staffRows.length === 0 ? (
                                <div className="empty-inline">Назначенных вожатых пока нет.</div>
                            ) : staffRows.map((staff) => (
                                <button key={staff.id} className="senior-list-button" onClick={() => navigate(`/users/${staff.userId}`)}>
                                    <div className="senior-avatar">
                                        {staff.avatarUrl ? <img src={staff.avatarUrl} alt="" /> : <span>{(staff.firstName?.[0] || '') + (staff.lastName?.[0] || '')}</span>}
                                    </div>
                                    <div className="senior-list-content">
                                        <strong>{`${staff.lastName} ${staff.firstName}`.trim() || 'Профиль сотрудника'}</strong>
                                        <span>{staff.detachmentName}</span>
                                    </div>
                                    <div className="senior-list-side">{staff.roleInDetachment || 'COUNSELOR'}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="senior-card senior-card-detachments">
                        <CardArt src={detachmentsArt} alt="" className="senior-card-art-detachments" />
                        <div className="senior-card-head">
                            <h2>Отряды</h2>
                        </div>
                        <div className="senior-detachment-list">
                            {detachments.length === 0 ? (
                                <div className="empty-inline">В этой смене пока нет отрядов.</div>
                            ) : detachments.map((detachment) => (
                                <button
                                    key={detachment.id}
                                    className="senior-list-button senior-detachment-row"
                                    onClick={() => navigate(`/detachments/${detachment.id}`)}
                                >
                                    <div className="senior-list-content">
                                        <strong>{detachment.name}</strong>
                                        <span>{detachment.ageGroup || 'Возрастная группа не указана'}</span>
                                    </div>
                                    <div className={`senior-stage-chip tone-${stageTone(detachment.stage)}`}>{stageLabel(detachment.stage)}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="senior-card senior-card-tasks">
                        <CardArt src={tasksArt} alt="" className="senior-card-art-tasks" />
                        <div className="senior-card-head">
                            <h2>Задачи</h2>
                            <div className="senior-card-head-actions">
                                {sessionContext?.canManageShiftTasks && (
                                    <button className="btn-primary senior-head-button" onClick={() => setShowTaskModal(true)}>
                                        Создать задачу
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="senior-task-list">
                            {sortedTasks.length === 0 ? (
                                <div className="empty-inline">Задачи ещё не созданы.</div>
                            ) : sortedTasks.map((task) => (
                                <div key={task.id} className="senior-task-card">
                                    <div className="senior-task-card-head">
                                        <div className="senior-list-content">
                                            <strong>{task.title}</strong>
                                            <span>{task.description || 'Без описания'}</span>
                                        </div>
                                        <div className="senior-data-meta">
                                            <span>{formatDate(task.targetDate)}</span>
                                            <span>{task.taskType === 'GENERAL' ? 'Общая' : task.detachmentName || detachmentMap[task.detachmentId]?.name || 'Отрядная'}</span>
                                        </div>
                                    </div>
                                    {Array.isArray(task.detachmentProgress) && task.detachmentProgress.length > 0 && (
                                        <div className="senior-task-section">
                                            <div className="senior-task-section-title">Прогресс отрядов</div>
                                            <div className="senior-task-detachment-progress">
                                            {task.detachmentProgress.map((progress) => (
                                                <div key={progress.detachmentId || progress.detachmentName} className="senior-task-detachment-progress-row">
                                                    <div className="senior-task-detachment-progress-main">
                                                        <strong>{progress.detachmentName || 'Отряд'}</strong>
                                                        <span>{progress.completedChecklistItems || 0} / {progress.totalChecklistItems || 0} пунктов</span>
                                                    </div>
                                                    <div className={`senior-task-detachment-status senior-task-detachment-status-${taskProgressTone(progress.completionPercent)}`}>
                                                        {taskProgressLabel(progress)}
                                                    </div>
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    )}
                                    {Array.isArray(task.checklistItems) && task.checklistItems.length > 0 && (
                                        <div className="senior-task-section">
                                            <div className="senior-task-section-title">Пункты задачи</div>
                                            <div className="senior-task-checklist">
                                                {task.checklistItems.map((item) => (
                                                    <div key={item.id || item.title} className="senior-task-check-item">
                                                        {item.required ? <span className="senior-task-required-mark" aria-hidden="true">!</span> : <span className="senior-task-required-spacer" aria-hidden="true" />}
                                                        <strong>{item.title}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                                        <div className="senior-task-attachments">
                                            {task.attachments.map((attachment) => (
                                                <button
                                                    key={attachment.id || attachment.fileId}
                                                    type="button"
                                                    className="senior-task-attachment"
                                                    onClick={() => handleOpenTaskAttachment(attachment.fileId)}
                                                >
                                                    {attachment.originalFileName || 'Вложение'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="senior-card senior-card-calendar">
                        <CardArt src={eventsArt} alt="" className="senior-card-art-calendar" />
                        <div className="senior-card-head">
                            <h2>Календарь</h2>
                            <div className="senior-card-head-actions">
                                {sessionContext?.canManageCalendar && (
                                    <button className="btn-primary senior-head-button" onClick={() => setShowEventModal(true)}>
                                        Создать событие
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="senior-shift-days">
                            {(sessionContext?.shiftDays || []).slice(0, 21).map((day) => {
                                const dayEvents = sortedEvents.filter((event) => event.eventDate === day.date);
                                return (
                                    <div key={day.date} className={`senior-day-chip ${day.today ? 'today' : ''}`}>
                                        <span>День {day.dayNumber}</span>
                                        <div className="senior-day-events">
                                            {dayEvents.length === 0 ? (
                                                <div className="senior-day-empty">Без событий</div>
                                            ) : dayEvents.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className={`senior-day-event ${event.visibleForParents ? 'parent-visible' : 'private'}`}
                                                    onMouseEnter={(mouseEvent) => handleShowCalendarTooltip(mouseEvent, event)}
                                                    onMouseLeave={() => setCalendarTooltip(null)}
                                                >
                                                    {event.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="senior-card senior-card-templates">
                        <CardArt src={templatesArt} alt="" className="senior-card-art-templates" />
                        <div className="senior-card-head">
                            <h2>Шаблоны отчетов</h2>
                            <div className="senior-card-head-actions">
                                <button className="btn-primary senior-head-button" onClick={handleOpenCreateTemplate}>
                                    Создать шаблон
                                </button>
                            </div>
                        </div>
                        <div className="senior-template-list">
                            {reportTemplates.length === 0 ? (
                                <div className="empty-inline">Шаблоны ещё не созданы.</div>
                            ) : reportTemplates.map((template) => {
                                const fields = parseTemplateFields(template.fieldsSchema);
                                return (
                                    <div key={template.id} className="senior-template-card">
                                        <div className="senior-template-main">
                                            <strong>{template.title}</strong>
                                            <div className="senior-template-meta">
                                                <span>Полей: {fields.length}</span>
                                                <span>{formatDate(template.updatedAt || template.createdAt)}</span>
                                            </div>
                                            <div className="senior-template-tags">
                                                {fields.slice(0, 4).map((field) => (
                                                    <span key={field.id} className="senior-template-tag">{field.label}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="senior-template-actions">
                                            <button className="btn-secondary senior-template-action-btn" onClick={() => handleOpenEditTemplate(template)}>
                                                Изменить
                                            </button>
                                            <button className="btn-danger senior-template-action-btn" onClick={() => handleDeleteTemplate(template.id)}>
                                                Удалить
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="senior-card senior-card-reports">
                        <CardArt src={reportsArt} alt="" className="senior-card-art-reports" />
                        <div className="senior-card-head">
                            <h2>Отчеты от вожатых</h2>
                        </div>
                        <div className="senior-report-list">
                            {sessionReports.length === 0 ? (
                                <div className="empty-inline">Отчётов пока нет.</div>
                            ) : sessionReports.map((report) => {
                                const detachment = detachmentMap[report.detachmentId];
                                return (
                                    <button key={report.id} className="senior-report-card senior-report-compact" onClick={() => handleOpenReport(report)}>
                                        <strong>{detachment?.name || 'Отряд'}</strong>
                                        <span>{formatDate(report.reportDate)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="senior-card senior-card-notices">
                        <CardArt src={infoArt} alt="" className="senior-card-art-notices" />
                        <div className="senior-card-head">
                            <h2>Общая информация для отрядов</h2>
                            <div className="senior-card-head-actions">
                                <button className="btn-primary senior-head-button" onClick={() => setShowNoticeModal(true)}>
                                    Добавить информацию
                                </button>
                            </div>
                        </div>
                        <div className="senior-template-list">
                            {sessionNotices.length === 0 ? (
                                <div className="empty-inline">Пока ничего не добавлено.</div>
                            ) : sessionNotices.map((notice) => (
                                <div key={notice.id} className="senior-template-card senior-notice-card">
                                    <div className="senior-template-main">
                                        <strong>{notice.title}</strong>
                                        <div className="senior-template-meta">
                                            <span>{formatDate(notice.createdAt)}</span>
                                        </div>
                                        <div className="senior-notice-body">{notice.body}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="senior-card senior-card-moderation">
                            <CardArt src={moderationArt} alt="" className="senior-card-art-moderation" />
                            <div className="senior-card-head">
                                <h2>Посты на модерации</h2>
                            </div>
                            {pendingPosts.length === 0 ? (
                                <div className="empty-inline">Очередь модерации пуста.</div>
                            ) : (
                                <div className="senior-moderation-list">
                                    {pendingPosts.map((post) => (
                                        <div key={post.id} className="senior-moderation-item">
                                            <div className="senior-moderation-preview">
                                                <Post
                                                    post={post}
                                                    onUpdate={loadDashboard}
                                                    onDelete={() => {}}
                                                    onLike={() => {}}
                                                    forceCanEdit
                                                    hideDeleteAction
                                                />
                                            </div>
                                            <div className="senior-moderation-actions">
                                                <button
                                                    className="btn-secondary"
                                                    disabled={moderatingPostId === post.id}
                                                    onClick={() => handleRejectPost(post.id)}
                                                >
                                                    Отклонить
                                                </button>
                                                <button
                                                    className="btn-primary"
                                                    disabled={moderatingPostId === post.id}
                                                    onClick={() => handleApprovePost(post.id)}
                                                >
                                                    Опубликовать
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                </div>

                {calendarTooltip && (
                    <div
                        className="senior-calendar-tooltip"
                        style={{ top: `${calendarTooltip.top}px`, left: `${calendarTooltip.left}px` }}
                    >
                        <strong>{calendarTooltip.title}</strong>
                        <span>{calendarTooltip.description}</span>
                        <em>{calendarTooltip.visibility}</em>
                    </div>
                )}

                {showTaskModal && (
                    <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
                        <div className="modal-content senior-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать задачу</h2>
                                <button className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleCreateTask}>
                                <div className="form-group">
                                    <label>Название *</label>
                                    <input type="text" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Описание</label>
                                    <textarea rows="3" value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Дата *</label>
                                        <input type="date" value={taskForm.targetDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, targetDate: event.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Тип</label>
                                        <select value={taskForm.taskType} onChange={(event) => setTaskForm((prev) => ({ ...prev, taskType: event.target.value }))}>
                                            <option value="GENERAL">Общая</option>
                                            <option value="DETACHMENT">Для отряда</option>
                                        </select>
                                    </div>
                                </div>
                                {taskForm.taskType === 'DETACHMENT' && (
                                    <div className="form-group">
                                        <label>Отряд</label>
                                        <select value={taskForm.detachmentId} onChange={(event) => setTaskForm((prev) => ({ ...prev, detachmentId: event.target.value }))}>
                                            <option value="">Выберите отряд</option>
                                            {detachments.map((detachment) => (
                                                <option key={detachment.id} value={detachment.id}>{detachment.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <div className="senior-form-section-head">
                                        <label>Чек-лист задачи</label>
                                        <button type="button" className="btn-secondary senior-inline-add-btn" onClick={handleAddTaskChecklistItem}>
                                            +
                                        </button>
                                    </div>
                                    <div className="senior-task-form-stack">
                                        {taskForm.checklistItems.map((item, index) => (
                                            <div key={index} className="senior-task-form-row">
                                                <input
                                                    type="text"
                                                    placeholder="Что нужно сделать"
                                                    value={item.title}
                                                    onChange={(event) => handleTaskChecklistChange(index, 'title', event.target.value)}
                                                />
                                                <label className="senior-check-toggle">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.required !== false}
                                                        onChange={(event) => handleTaskChecklistChange(index, 'required', event.target.checked)}
                                                        aria-label="Обязательный пункт"
                                                        title="Обязательный пункт"
                                                    />
                                                    <span className="senior-check-toggle-box" />
                                                </label>
                                                <button type="button" className="btn-danger senior-inline-remove-btn" onClick={() => handleRemoveTaskChecklistItem(index)}>
                                                    −
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <div className="senior-form-section-head">
                                        <label>Вложения</label>
                                        <label className="btn-secondary senior-upload-btn">
                                            {uploadingTaskAttachment ? 'Загрузка...' : 'Добавить файл'}
                                            <input type="file" multiple onChange={handleTaskAttachmentUpload} hidden />
                                        </label>
                                    </div>
                                    {taskForm.attachments.length === 0 ? (
                                        <div className="senior-upload-empty">Файлы пока не добавлены.</div>
                                    ) : (
                                        <div className="senior-upload-list">
                                            {taskForm.attachments.map((attachment) => (
                                                <div key={attachment.fileId} className="senior-upload-item">
                                                    <button type="button" className="senior-upload-link" onClick={() => handleOpenTaskAttachment(attachment.fileId)}>
                                                        {attachment.originalFileName}
                                                    </button>
                                                    <button type="button" className="btn-danger senior-inline-remove-btn" onClick={() => handleRemoveTaskAttachment(attachment.fileId)}>
                                                        Убрать
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={savingTask || uploadingTaskAttachment}>
                                        {uploadingTaskAttachment ? 'Загрузка файлов...' : savingTask ? 'Создание...' : 'Создать задачу'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEventModal && (
                    <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
                        <div className="modal-content senior-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать событие</h2>
                                <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleCreateEvent}>
                                <div className="form-group">
                                    <label>Название *</label>
                                    <input type="text" value={eventForm.title} onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Описание</label>
                                    <textarea rows="3" value={eventForm.description} onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Дата *</label>
                                    <input type="date" value={eventForm.eventDate} onChange={(event) => setEventForm((prev) => ({ ...prev, eventDate: event.target.value }))} required />
                                </div>
                                <label className="senior-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={eventForm.visibleForParents}
                                        onChange={(event) => setEventForm((prev) => ({ ...prev, visibleForParents: event.target.checked }))}
                                    />
                                    <span className="senior-checkbox-box" />
                                    <span>Видно родителям</span>
                                </label>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowEventModal(false)}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={savingEvent}>
                                        {savingEvent ? 'Создание...' : 'Создать событие'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showTemplateModal && (
                    <div className="modal-overlay" onClick={() => { setShowTemplateModal(false); resetTemplateForm(); }}>
                        <div className="modal-content senior-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingTemplate ? 'Изменить шаблон' : 'Создать шаблон отчета'}</h2>
                                <button className="modal-close" onClick={() => { setShowTemplateModal(false); resetTemplateForm(); }}>×</button>
                            </div>
                            <form onSubmit={handleSaveTemplate}>
                                <div className="form-group">
                                    <label>Название *</label>
                                    <input type="text" value={templateForm.title} onChange={(event) => setTemplateForm((prev) => ({ ...prev, title: event.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <div className="senior-template-fields-head">
                                        <label>Поля шаблона *</label>
                                        <button type="button" className="btn-primary senior-field-add" onClick={handleAddTemplateField}>+</button>
                                    </div>
                                    <div className="senior-template-fields">
                                        {templateForm.fields.map((field, index) => (
                                            <div key={index} className="senior-template-field-row">
                                                <input
                                                    type="text"
                                                    value={field}
                                                    onChange={(event) => handleTemplateFieldChange(index, event.target.value)}
                                                    placeholder="Название поля отчета"
                                                    className="senior-template-editor"
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-danger senior-field-remove"
                                                    onClick={() => handleRemoveTemplateField(index)}
                                                >
                                                    −
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => { setShowTemplateModal(false); resetTemplateForm(); }}>
                                        Отмена
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={savingTemplate}>
                                        {savingTemplate ? 'Сохранение...' : editingTemplate ? 'Сохранить' : 'Создать шаблон'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showReportViewModal && selectedReport && (
                    <div className="modal-overlay" onClick={() => { setShowReportViewModal(false); setSelectedReport(null); }}>
                        <div className="modal-content senior-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{selectedReport.reportTemplateTitle || 'Отчет'}</h2>
                                <button className="modal-close" onClick={() => { setShowReportViewModal(false); setSelectedReport(null); }}>×</button>
                            </div>
                            <div className="senior-report-modal-body">
                                <div className="senior-report-modal-meta">
                                    <span className="senior-report-modal-detachment">
                                        {detachmentMap[selectedReport.detachmentId]?.name || 'Отряд'}
                                    </span>
                                    <span className="senior-report-modal-date">{formatDate(selectedReport.reportDate)}</span>
                                    <span className={`senior-status-badge ${getReportStatusClass(selectedReport.status)}`}>
                                        {getReportStatusLabel(selectedReport.status)}
                                    </span>
                                </div>
                                <div className="senior-report-preview">
                                    {Object.entries(parseReportData(selectedReport.dataJson)).map(([key, value]) => (
                                        <div key={key} className="senior-report-row">
                                            <span className="senior-report-row-label">{key}</span>
                                            <div className="senior-report-row-value">{String(value || '—')}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showNoticeModal && (
                    <div className="modal-overlay" onClick={() => setShowNoticeModal(false)}>
                        <div className="modal-content senior-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Добавить общую информацию</h2>
                                <button className="modal-close" onClick={() => setShowNoticeModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleCreateNotice}>
                                <div className="form-group">
                                    <label>Заголовок *</label>
                                    <input
                                        type="text"
                                        value={noticeForm.title}
                                        onChange={(event) => setNoticeForm((prev) => ({ ...prev, title: event.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Текст *</label>
                                    <textarea
                                        rows="5"
                                        value={noticeForm.body}
                                        onChange={(event) => setNoticeForm((prev) => ({ ...prev, body: event.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowNoticeModal(false)}>
                                        Отмена
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Сохранить
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function MetricCard({ label, value, art, artClassName = '' }) {
    return (
        <div className="metric-card">
            {art ? (
                <span
                    aria-hidden="true"
                    className={`metric-card-art ${artClassName}`.trim()}
                    style={{
                        WebkitMaskImage: `url(${art})`,
                        maskImage: `url(${art})`
                    }}
                />
            ) : null}
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
        </div>
    );
}

function CardArt({ src, alt, className = '' }) {
    return <img src={src} alt={alt} aria-hidden="true" className={`senior-card-art ${className}`.trim()} />;
}
