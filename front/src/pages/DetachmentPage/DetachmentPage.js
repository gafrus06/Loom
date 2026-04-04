import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MethodologyPanel from '../../components/MethodologyPanel';
import { analyzeDetachmentWithAI } from '../../services/aitunnel-analysis';
import {
    getDetachment, changeDetachmentStage,
    getDetachmentCounselors, assignCounselor, unassignCounselor
} from '../../services/detachments';
import { getMembershipsByDetachment } from '../../services/memberships';
import { getChildParents, unlinkParent, linkParent, getMyChildren } from '../../services/parent-links';
import { getChild, createChild, updateChild, deleteChild } from '../../services/children';
import { getUserProfile } from '../../services/users';
import { getTasksForToday } from '../../services/shiftTasks';
import { upsertTaskCompletion } from '../../services/shiftTasks';
import { getNoticesForDetachment, getNoticesForSession } from '../../services/seniorNotices';
import { getReportTemplates, getDetachmentReports, upsertDailyReport } from '../../services/shiftReports';
import { getJournals, getJournalsParentView, upsertJournal } from '../../services/detachmentJournals';
import { getFileDownloadUrl } from '../../services/files';
import {
    parseTemplateFields,
    parseReportData,
    buildReportDataJson,
    getReportStatusLabel,
    getReportStatusClass
} from '../../utils/shiftReports';
import Sidebar from '../../layouts/Sidebar';
import AccessDeniedModal from '../../components/AccessDeniedModal';
import ConfirmModal from '../../components/ConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import { useAppModal } from '../../components/AppModalProvider';
import DetachmentHeader from './DetachmentHeader';
import ChildrenPanel from './ChildrenPanel';
import CounselorsPanel from './CounselorsPanel';
import StagePanel from './StagePanel';
import AiChatPanel from './AiChatPanel';
import StageTestModal from './StageTestModal';
import AddChildModal from './AddChildModal';
import ChildViewModal from './ChildViewModal';
import AddCounselorModal from './AddCounselorModal';
import CounselorsListModal from './CounselorsListModal';
import { useSession } from '../../state/sessionStore';
import './DetachmentPage.css';

const STAGES = [
    { id: 'NEW', name: 'Новый', color: '#FF6B6B' },
    { id: 'ORGANIZATIONAL', name: 'Организационный', color: '#FFA500' },
    { id: 'BUSINESS', name: 'Деловой', color: '#FFD700' },
    { id: 'CONSTRUCTIVE', name: 'Конструктивный', color: '#4CAF50' },
    { id: 'FINAL', name: 'Заключительный', color: '#2196F3' },
    { id: 'COMPLETED', name: 'Завершён', color: '#9C27B0' }
];

const STAGE_CONTENT = {
    NEW: {
        test: [
            'Все дети познакомились друг с другом',
            'Проведена экскурсия по территории',
            'Установлены базовые правила отряда',
            'Дети знают имена вожатых',
            'Созданы первые микрогруппы'
        ]
    },
    ORGANIZATIONAL: {
        test: [
            'Выбран актив отряда',
            'Распределены роли и обязанности',
            'Составлен план смены',
            'Оформлен отрядный уголок',
            'Придуман девиз и название'
        ]
    },
    BUSINESS: {
        test: [
            'Проведено минимум 3 крупных мероприятия',
            'Дети активно участвуют в жизни отряда',
            'Работают все органы самоуправления',
            'Налажено взаимодействие между детьми',
            'Реализуются творческие проекты'
        ]
    },
    CONSTRUCTIVE: {
        test: [
            'Отряд работает как единый организм',
            'Дети сами инициируют мероприятия',
            'Минимальное вмешательство вожатых',
            'Конфликты решаются внутри отряда',
            'Высокая творческая активность'
        ]
    },
    FINAL: {
        test: [
            'Проведён прощальный огонёк',
            'Каждый ребёнок поделился впечатлениями',
            'Собраны контакты для связи',
            'Вручены грамоты и награды',
            'Проведена итоговая фотосессия'
        ]
    },
    COMPLETED: { test: [] }
};

function parseTaskChecklistSelection(comment) {
    if (!comment) return [];
    try {
        const parsed = JSON.parse(comment);
        return Array.isArray(parsed?.checkedItemIds) ? parsed.checkedItemIds.map(String) : [];
    } catch {
        return [];
    }
}

function buildTaskChecklistComment(checkedItemIds) {
    return JSON.stringify({ checkedItemIds });
}

export default function DetachmentPage() {
    const { detachmentId } = useParams();
    const navigate = useNavigate();
    const { confirm } = useAppModal();

    // ── Основные данные ──────────────────────────────────────────────────────
    const [detachment, setDetachment] = useState(null);
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── AI чат ───────────────────────────────────────────────────────────────
    const [chatMessages, setChatMessages] = useState([]);
    const [aiMessage, setAiMessage] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ── Переход этапа ────────────────────────────────────────────────────────
    const [showStageTest, setShowStageTest] = useState(false);
    const [testAnswers, setTestAnswers] = useState([]);

    // ── Добавление ребёнка ───────────────────────────────────────────────────
    const [showAddChild, setShowAddChild] = useState(false);
    const [childForm, setChildForm] = useState({ firstName: '', lastName: '', gender: 'MALE', birthDate: '' });
    const [parentUuid, setParentUuid] = useState('');
    const [parentRelation, setParentRelation] = useState('PARENT');
    const [linkingParent, setLinkingParent] = useState(false);

    // ── Просмотр / редактирование ребёнка ───────────────────────────────────
    const [viewingChild, setViewingChild] = useState(null);
    const [viewingChildParents, setViewingChildParents] = useState([]);
    const [loadingChildParents, setLoadingChildParents] = useState(false);
    const [editingChild, setEditingChild] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [savingChild, setSavingChild] = useState(false);
    const [deletingChild, setDeletingChild] = useState(false);
    const [childToDelete, setChildToDelete] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ── Привязка родителя к ребёнку ──────────────────────────────────────────
    const [linkParentUuid, setLinkParentUuid] = useState('');
    const [linkParentRelation, setLinkParentRelation] = useState('PARENT');
    const [linkingNewParent, setLinkingNewParent] = useState(false);
    const [linkSuccess, setLinkSuccess] = useState(false);

    // ── Вожатые ──────────────────────────────────────────────────────────────
    const [showAddCounselor, setShowAddCounselor] = useState(false);
    const [counselorUuid, setCounselorUuid] = useState('');
    const [counselorRole, setCounselorRole] = useState('ASSISTANT');
    const [assigningCounselor, setAssigningCounselor] = useState(false);
    const [detachmentCounselors, setDetachmentCounselors] = useState([]);
    const [counselorProfiles, setCounselorProfiles] = useState({});
    const [loadingCounselors, setLoadingCounselors] = useState(false);
    const [showCounselorsList, setShowCounselorsList] = useState(false);
    const [detachmentTasks, setDetachmentTasks] = useState([]);
    const [detachmentNotices, setDetachmentNotices] = useState([]);
    const [reportTemplates, setReportTemplates] = useState([]);
    const [detachmentReports, setDetachmentReports] = useState([]);
    const [detachmentJournals, setDetachmentJournals] = useState([]);
    const [loadingExtras, setLoadingExtras] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [savingReport, setSavingReport] = useState(false);
    const [savingJournal, setSavingJournal] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState(null);
    const [reportForm, setReportForm] = useState({
        reportTemplateId: '',
        reportDate: new Date().toISOString().split('T')[0],
        values: {}
    });
    const [journalForm, setJournalForm] = useState({
        journalDate: new Date().toISOString().split('T')[0],
        activityLevel: '',
        visibleForParentsVersion: '',
        participationInfo: '',
        adaptationInfo: '',
        conflictInfo: '',
        successInfo: '',
        notes: ''
    });

    // ── Модальные окна ───────────────────────────────────────────────────────
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [accessDeniedTitle, setAccessDeniedTitle] = useState('');
    const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
    const [showAccess, setShowAccess] = useState(false);
    const [accessTitle, setAccessTitle] = useState('');
    const [accessMessage, setAccessMessage] = useState('');

    // ── Роли ─────────────────────────────────────────────────────────────────
    const [myChildrenIds, setMyChildrenIds] = useState([]);
    const [myChildrenLoaded, setMyChildrenLoaded] = useState(false);
    const { user: currentUser } = useSession();

    const isAdmin = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_admin' || s === 'admin';
    });
    const isParent = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_parent' || s === 'parent';
    });
    // Является ли текущий пользователь вожатым ЭТОГО отряда
    const [isDetachmentMember, setIsDetachmentMember] = useState(false);
    // Является ли LEAD (главным) этого отряда
    const [isDetachmentLead, setIsDetachmentLead] = useState(false);

    // Может ли пользователь изменять отряд:
    // - ADMIN всегда
    // - Вожатый — только если является участником этого отряда
    const canModifyDetachment = isAdmin || isDetachmentMember;

    // Может ли добавлять/удалять вожатых:
    // - ADMIN: да
    // - LEAD отряда: да (добавить ASSISTANT, удалить ASSISTANT)
    const canManageCounselors = isAdmin || isDetachmentLead;

    // Может ли удалить конкретного вожатого
    const canRemoveCounselor = (counselor) => {
        if (isAdmin) return true;
        // LEAD может удалить только ASSISTANT
        if (isDetachmentLead && counselor.roleInDetachment === 'ASSISTANT') return true;
        return false;
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const showErrorModal = (title, message) => {
        setAccessDeniedTitle(title);
        setAccessDeniedMessage(message);
        setShowAccessDenied(true);
    };
    const showSuccessModal = (title, message) => {
        setAccessTitle(title);
        setAccessMessage(message);
        setShowAccess(true);
    };

    const loadDetachment = useCallback(async () => {
        if (!detachmentId) {
            setError('ID отряда не указан');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const detachmentData = await getDetachment(detachmentId);
            setDetachment(detachmentData);

            const membershipsData = await getMembershipsByDetachment(detachmentId);
            const membershipsWithChildren = await Promise.all(
                membershipsData.map(async (membership) => {
                    try {
                        const child = await getChild(membership.childId);
                        return { ...membership, child };
                    } catch {
                        return { ...membership, child: null };
                    }
                }),
            );

            setMemberships(membershipsWithChildren);
        } catch {
            setError('Не удалось загрузить данные отряда');
        } finally {
            setLoading(false);
        }
    }, [detachmentId]);

    const loadDetachmentCounselors = useCallback(async () => {
        try {
            setLoadingCounselors(true);

            const counselors = await getDetachmentCounselors(detachmentId);
            setDetachmentCounselors(counselors);

            const counselorProfilesEntries = await Promise.all(
                counselors
                    .filter((counselor) => counselor.userId)
                    .map(async (counselor) => {
                        try {
                            const profile = await getUserProfile(counselor.userId);
                            return [
                                counselor.userId,
                                {
                                    firstName: profile.firstName || '',
                                    secondName: profile.secondName || '',
                                    avatarUrl: profile.avatarUrl || null,
                                },
                            ];
                        } catch {
                            return [
                                counselor.userId,
                                {
                                    firstName: 'Неизвестно',
                                    secondName: '',
                                    avatarUrl: null,
                                },
                            ];
                        }
                    }),
            );

            setCounselorProfiles((prev) => ({
                ...prev,
                ...Object.fromEntries(counselorProfilesEntries),
            }));
        } catch {
            showErrorModal('Ошибка загрузки', 'Не удалось загрузить список вожатых отряда');
        } finally {
            setLoadingCounselors(false);
        }
    }, [detachmentId]);

    const loadMyChildrenIds = useCallback(async () => {
        try {
            const links = await getMyChildren();
            setMyChildrenIds(links.map((link) => link.childId));
        } catch {
            setMyChildrenIds([]);
            showErrorModal('Ошибка загрузки', 'Не удалось загрузить список ваших детей.');
        } finally {
            setMyChildrenLoaded(true);
        }
    }, []);

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        loadDetachment();
        if (isParent) loadMyChildrenIds();
        loadDetachmentCounselors();
    }, [detachmentId, isParent, loadDetachment, loadDetachmentCounselors, loadMyChildrenIds]);

    // После загрузки вожатых — определяем роль текущего пользователя в отряде
    useEffect(() => {
        if (!currentUser?.id || detachmentCounselors.length === 0) {
            setIsDetachmentMember(false);
            setIsDetachmentLead(false);
            return;
        }
        const myAssignment = detachmentCounselors.find(
            c => c.userId === currentUser.id && c.active
        );
        setIsDetachmentMember(!!myAssignment);
        setIsDetachmentLead(myAssignment?.roleInDetachment === 'LEAD');
    }, [detachmentCounselors, currentUser?.id]);

    const loadDetachmentExtras = useCallback(async () => {
        if (!detachment?.sessionId || !detachment?.campId) return;

        try {
            setLoadingExtras(true);
            const journalRequest = isParent
                ? getJournalsParentView(detachmentId).catch(() => [])
                : getJournals(detachmentId).catch(() => []);

            const [tasksData, sessionNoticesData, detachmentNoticesData, templatesData, reportsData, journalsData] = await Promise.all([
                getTasksForToday(detachment.sessionId, undefined, detachmentId).catch(() => []),
                getNoticesForSession(detachment.sessionId).catch(() => []),
                getNoticesForDetachment(detachment.sessionId, detachmentId).catch(() => []),
                getReportTemplates(detachment.campId, detachment.sessionId).catch(() => []),
                getDetachmentReports(detachmentId).catch(() => []),
                journalRequest
            ]);

            const scopedTasks = Array.isArray(tasksData)
                ? tasksData.filter((task) => task.taskType === 'GENERAL' || task.detachmentId === detachmentId)
                : [];

            const activeTemplates = Array.isArray(templatesData)
                ? templatesData.filter((item) => item?.active !== false)
                : [];
            const sortedReports = Array.isArray(reportsData)
                ? [...reportsData].sort((a, b) => String(b.reportDate || '').localeCompare(String(a.reportDate || '')))
                : [];
            const sortedJournals = Array.isArray(journalsData)
                ? [...journalsData].sort((a, b) => String(b.journalDate || '').localeCompare(String(a.journalDate || '')))
                : [];

            const mergedNotices = [
                ...(Array.isArray(sessionNoticesData) ? sessionNoticesData : []),
                ...(Array.isArray(detachmentNoticesData) ? detachmentNoticesData : [])
            ];
            const uniqueNotices = Array.from(
                new Map(mergedNotices.map((notice) => [notice.id, notice])).values()
            ).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

            setDetachmentTasks(scopedTasks);
            setDetachmentNotices(uniqueNotices);
            setReportTemplates(activeTemplates);
            setDetachmentReports(sortedReports);
            setDetachmentJournals(sortedJournals);
        } catch {
            setDetachmentTasks([]);
            setDetachmentNotices([]);
            setReportTemplates([]);
            setDetachmentReports([]);
            setDetachmentJournals([]);
        } finally {
            setLoadingExtras(false);
        }
    }, [detachment?.campId, detachment?.sessionId, detachmentId, isParent]);

    useEffect(() => {
        if (!detachment?.id || !detachment?.sessionId || !detachment?.campId) return;
        loadDetachmentExtras();
    }, [detachment?.id, detachment?.sessionId, detachment?.campId, loadDetachmentExtras]);

    const handleOpenReportModal = useCallback(() => {
        const firstTemplate = reportTemplates[0];
        const initialFields = firstTemplate ? parseTemplateFields(firstTemplate.fieldsSchema) : [];
        const initialValues = Object.fromEntries(initialFields.map((field) => [field.label, '']));

        setReportForm({
            reportTemplateId: firstTemplate?.id || '',
            reportDate: new Date().toISOString().split('T')[0],
            values: initialValues
        });
        setShowReportModal(true);
    }, [reportTemplates]);

    const handleOpenJournalModal = useCallback((journal = null) => {
        setJournalForm({
            journalDate: journal?.journalDate || new Date().toISOString().split('T')[0],
            activityLevel: journal?.activityLevel || '',
            visibleForParentsVersion: journal?.visibleForParentsVersion || '',
            participationInfo: journal?.participationInfo || '',
            adaptationInfo: journal?.adaptationInfo || '',
            conflictInfo: journal?.conflictInfo || '',
            successInfo: journal?.successInfo || '',
            notes: journal?.notes || ''
        });
        setShowJournalModal(true);
    }, []);

    const handleReportTemplateChange = useCallback((templateId) => {
        const selectedTemplate = reportTemplates.find((template) => template.id === templateId);
        const fields = selectedTemplate ? parseTemplateFields(selectedTemplate.fieldsSchema) : [];
        setReportForm((prev) => ({
            ...prev,
            reportTemplateId: templateId,
            values: Object.fromEntries(fields.map((field) => [field.label, prev.values[field.label] || '']))
        }));
    }, [reportTemplates]);

    const handleReportValueChange = useCallback((fieldLabel, value) => {
        setReportForm((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [fieldLabel]: value
            }
        }));
    }, []);

    const handleSubmitReport = useCallback(async (event) => {
        event.preventDefault();
        if (!reportForm.reportTemplateId) {
            showErrorModal('Ошибка', 'Выберите шаблон отчета.');
            return;
        }

        try {
            setSavingReport(true);
            await upsertDailyReport(detachmentId, {
                reportTemplateId: reportForm.reportTemplateId,
                reportDate: reportForm.reportDate,
                dataJson: buildReportDataJson(reportForm.values),
                status: 'SUBMITTED'
            });
            setShowReportModal(false);
            showSuccessModal('Успешно', 'Отчет сохранен и отправлен.');
            await loadDetachmentExtras();
        } catch (err) {
            showErrorModal('Ошибка отчета', err.message || 'Не удалось сохранить отчет.');
        } finally {
            setSavingReport(false);
        }
    }, [detachmentId, loadDetachmentExtras, reportForm]);

    const handleJournalFieldChange = useCallback((field, value) => {
        setJournalForm((prev) => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleSubmitJournal = useCallback(async (event) => {
        event.preventDefault();
        if (!journalForm.journalDate) {
            showErrorModal('Ошибка', 'Укажите дату журнала.');
            return;
        }

        try {
            setSavingJournal(true);
            await upsertJournal(detachmentId, journalForm);
            setShowJournalModal(false);
            showSuccessModal('Успешно', 'Журнал отряда сохранен.');
            await loadDetachmentExtras();
        } catch (err) {
            showErrorModal('Ошибка журнала', err.message || 'Не удалось сохранить журнал отряда.');
        } finally {
            setSavingJournal(false);
        }
    }, [detachmentId, journalForm, loadDetachmentExtras]);

    const handleOpenTaskAttachment = useCallback(async (fileId) => {
        try {
            const { downloadUrl } = await getFileDownloadUrl(fileId);
            window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            showErrorModal('Ошибка файла', err.message || 'Не удалось открыть вложение задачи.');
        }
    }, []);

    const handleToggleTaskChecklistItem = useCallback(async (task, checklistItemId) => {
        try {
            setCompletingTaskId(task.id);
            const selectedIds = new Set(parseTaskChecklistSelection(task.currentUserCompletionComment));
            const normalizedId = String(checklistItemId);
            if (selectedIds.has(normalizedId)) {
                selectedIds.delete(normalizedId);
            } else {
                selectedIds.add(normalizedId);
            }
            const nextCheckedIds = Array.from(selectedIds);
            const totalItems = Array.isArray(task.checklistItems) ? task.checklistItems.length : 0;
            const nextCompleted = totalItems > 0 && nextCheckedIds.length === totalItems;
            await upsertTaskCompletion({
                taskId: task.id,
                detachmentId,
                completed: nextCompleted,
                comment: buildTaskChecklistComment(nextCheckedIds)
            });
            setDetachmentTasks((prev) => prev.map((item) => {
                if (item.id !== task.id) return item;
                const totalItemsCount = Math.max(1, Array.isArray(item.checklistItems) && item.checklistItems.length > 0 ? item.checklistItems.length : 1);
                const totalCompleted = Array.isArray(item.checklistItems) && item.checklistItems.length > 0
                    ? nextCheckedIds.length
                    : Math.max(0, (item.totalCompleted || 0) + (nextCompleted ? 1 : -1));
                return {
                    ...item,
                    completedByCurrentUser: nextCompleted,
                    currentUserCompletedAt: nextCompleted ? new Date().toISOString() : null,
                    currentUserCompletionComment: buildTaskChecklistComment(nextCheckedIds),
                    totalCompleted,
                    totalExpected: totalItemsCount,
                    completionPercent: (totalCompleted * 100) / totalItemsCount
                };
            }));
        } catch (err) {
            showErrorModal('Ошибка задачи', err.message || 'Не удалось обновить выполнение задачи.');
        } finally {
            setCompletingTaskId(null);
        }
    }, [detachmentId]);

    // ── Вожатые ───────────────────────────────────────────────────────────────
    async function handleAssignCounselor(e) {
        e.preventDefault();
        if (!canManageCounselors) {
            showErrorModal('Доступ запрещён', 'Добавлять вожатых может только Главный вожатый или администратор лагеря.');
            return;
        }
        if (!counselorUuid.trim()) { showErrorModal('Ошибка', 'UUID вожатого не указан'); return; }
        setAssigningCounselor(true);
        try {
            const trimmed = counselorUuid.trim();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(trimmed)) throw new Error('Неправильный формат UUID вожатого');
            await assignCounselor(detachmentId, trimmed, counselorRole);
            await loadDetachmentCounselors();
            setShowAddCounselor(false);
            setCounselorUuid('');
            setCounselorRole('ASSISTANT');
            showSuccessModal('Успешно', 'Вожатый успешно добавлен к отряду');
        } catch (err) {
            showErrorModal('Ошибка добавления', `Не удалось добавить вожатого: ${err.message || 'Неизвестная ошибка'}`);
        } finally { setAssigningCounselor(false); }
    }

    async function handleUnassignCounselor(assignmentId) {
        const counselor = detachmentCounselors.find(c => c.id === assignmentId);
        if (counselor && !canRemoveCounselor(counselor)) {
            showErrorModal(
                'Доступ запрещён',
                'Помощники не могут исключать вожатых. Главный вожатый может исключать только помощников.'
            );
            return;
        }
        const approved = await confirm({
            title: 'Открепить вожатого?',
            message: 'Вы уверены, что хотите открепить этого вожатого от отряда?',
            confirmLabel: 'Открепить',
            cancelLabel: 'Отмена',
            danger: true
        });
        if (!approved) return;
        try {
            await unassignCounselor(assignmentId);
            await loadDetachmentCounselors();
            showSuccessModal('Успешно', 'Вожатый успешно откреплён от отряда');
        } catch (err) {
            showErrorModal('Ошибка открепления', `Не удалось открепить вожатого: ${err.message || 'Неизвестная ошибка'}`);
        }
    }

    // ── Переход этапа ─────────────────────────────────────────────────────────
    function handleNextStage() {
        if (!canModifyDetachment) {
            showErrorModal('Доступ запрещён', 'Изменять этап могут только вожатые этого отряда или администратор лагеря.');
            return;
        }
        const stage = detachment?.stage || 'NEW';
        const idx = STAGES.findIndex(s => s.id === stage);
        if (idx === -1 || idx === STAGES.length - 1) return;
        const questions = STAGE_CONTENT[stage]?.test || [];
        if (questions.length > 0) {
            setTestAnswers(new Array(questions.length).fill(false));
            setShowStageTest(true);
        }
    }

    function canProceedToNextStage() {
        if (testAnswers.length === 0) return false;
        return testAnswers.slice(1).every(Boolean);
    }

    async function proceedToNextStage() {
        const stage = detachment?.stage || 'NEW';
        const idx = STAGES.findIndex(s => s.id === stage);
        const next = STAGES[idx + 1];
        if (!next) return;
        try {
            await changeDetachmentStage(detachmentId, next.id);
            setDetachment({ ...detachment, stage: next.id });
            setShowStageTest(false);
            setTestAnswers([]);
        } catch { showErrorModal('Ошибка изменения', 'Не удалось изменить этап отряда.'); }
    }

    // ── Дети ──────────────────────────────────────────────────────────────────
    async function handleCreateChild(e) {
        e.preventDefault();
        if (!canModifyDetachment) {
            showErrorModal('Доступ запрещён', 'Добавлять детей могут только вожатые этого отряда или администратор лагеря.');
            return;
        }
        if (!childForm.firstName.trim()) { showErrorModal('Ошибка заполнения', 'Имя обязательно'); return; }
        if (!childForm.lastName.trim()) { showErrorModal('Ошибка заполнения', 'Фамилия обязательна'); return; }
        if (!childForm.birthDate) { showErrorModal('Ошибка заполнения', 'Дата рождения обязательна'); return; }
        try {
            const newChild = await createChild({
                firstName: childForm.firstName.trim(),
                lastName: childForm.lastName.trim(),
                birthDate: childForm.birthDate,
                gender: childForm.gender,
                homeCity: null,
                detachmentId
            });
            if (parentUuid.trim()) await linkParentToChild(newChild.id);
            setShowAddChild(false);
            setChildForm({ firstName: '', lastName: '', gender: 'MALE', birthDate: '' });
            setParentUuid('');
            setParentRelation('PARENT');
            loadDetachment();
        } catch (err) {
            showErrorModal('Ошибка добавления', `Не удалось добавить ребёнка: ${err.message || 'Неизвестная ошибка'}`);
        }
    }

    async function linkParentToChild(childId) {
        setLinkingParent(true);
        try {
            const trimmed = parentUuid.trim();
            if (!trimmed) throw new Error('UUID родителя не указан');
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(trimmed)) throw new Error('Неправильный формат UUID родителя');
            await linkParent(childId, trimmed, parentRelation);
            showSuccessModal('', 'Родитель успешно привязан к ребёнку');
        } catch (err) {
            showErrorModal('Ошибка привязки', `Не удалось привязать родителя: ${err.message}`);
        } finally { setLinkingParent(false); }
    }

    async function handleViewChild(childId) {
        // Родитель не может открыть карточку чужого ребёнка
        if (isParent && !myChildrenIds.includes(childId)) {
            showErrorModal('Доступ ограничен', 'Вы можете просматривать только карточку своего ребёнка.');
            return;
        }
        try {
            const child = await getChild(childId);
            setViewingChild(child);
            setViewingChildParents([]);
            setEditingChild(false);
            setEditForm({
                firstName: child.firstName || '', lastName: child.lastName || '',
                gender: child.gender || 'MALE', birthDate: child.birthDate || '',
                homeCity: child.homeCity || '', medicalNotes: child.medicalNotes || '',
                allergies: child.allergies || '', specialNeeds: child.specialNeeds || '',
                behavioralNotes: child.behavioralNotes || ''
            });
            setLinkParentUuid('');
            setLinkParentRelation('PARENT');
            setLinkSuccess(false);
            loadChildParentsForView(childId);
        } catch (err) {
            showErrorModal('Ошибка загрузки', `Не удалось загрузить данные ребёнка: ${err.message || 'Неизвестная ошибка'}`);
        }
    }

    const loadChildParentsForView = useCallback(async (childId) => {
        setLoadingChildParents(true);
        try {
            const links = await getChildParents(childId);
            const withInfo = await Promise.all(links.map(async (link) => {
                try {
                    const info = await getUserProfile(link.parentUserId);
                    return { ...link, parentInfo: { id: info.id, firstName: info.firstName, lastName: info.secondName, avatarUrl: info.avatarUrl } };
                } catch { return { ...link, parentInfo: null }; }
            }));
            setViewingChildParents(withInfo);
        } catch {
            setViewingChildParents([]);
            showErrorModal('Ошибка загрузки', 'Не удалось загрузить информацию о родителях');
        } finally { setLoadingChildParents(false); }
    }, []);

    async function handleSaveChild(e) {
        e.preventDefault();
        if (!viewingChild) return;
        setSavingChild(true);
        try {
            const updated = await updateChild(viewingChild.id, editForm);
            setViewingChild(updated);
            setEditingChild(false);
            loadDetachment();
            showSuccessModal('', 'Данные успешно сохранены');
        } catch (err) {
            showErrorModal('Ошибка сохранения', `Не удалось сохранить изменения: ${err.message || 'Неизвестная ошибка'}`);
        } finally { setSavingChild(false); }
    }

    function handleCloseChildView() {
        setViewingChild(null);
        setViewingChildParents([]);
        setEditingChild(false);
        setEditForm(null);
        setLoadingChildParents(false);
        setLinkParentUuid('');
        setLinkParentRelation('PARENT');
        setLinkSuccess(false);
    }

    const handleDeleteClick = useCallback((childId) => {
        if (!canModifyDetachment) {
            showErrorModal('Доступ запрещён', 'Только вожатый этого отряда или администратор может удалять детей');
            return;
        }
        setChildToDelete(childId);
        setShowDeleteConfirm(true);
    }, [canModifyDetachment]);

    const handleConfirmDelete = useCallback(async () => {
        if (!childToDelete) return;
        try {
            setDeletingChild(true);
            const linkedParents = await getChildParents(childToDelete).catch(() => []);

            if (Array.isArray(linkedParents) && linkedParents.length > 0) {
                await Promise.all(
                    linkedParents
                        .filter((parent) => parent?.parentUserId)
                        .map((parent) => unlinkParent(childToDelete, parent.parentUserId))
                );
            }

            await deleteChild(childToDelete);
            if (viewingChild?.id === childToDelete) handleCloseChildView();
            await loadDetachment();
            setShowDeleteConfirm(false);
            setChildToDelete(null);
            showSuccessModal('Успешно', 'Ребёнок успешно удалён из отряда');
        } catch (err) {
            showErrorModal('Ошибка удаления', `Не удалось удалить ребёнка: ${err.message || 'Неизвестная ошибка'}`);
        } finally { setDeletingChild(false); }
    }, [childToDelete, loadDetachment, viewingChild]);

    const handleUnlinkParent = useCallback(async (childId, parentUserId, e) => {
        e?.stopPropagation();
        if (!canModifyDetachment) {
            showErrorModal('Доступ запрещён', 'Только вожатый этого отряда может отвязывать родителей');
            return;
        }
        const approved = await confirm({
            title: 'Отвязать родителя?',
            message: 'Вы уверены, что хотите отвязать этого родителя от ребёнка?',
            confirmLabel: 'Отвязать',
            cancelLabel: 'Отмена',
            danger: true
        });
        if (!approved) return;
        try {
            await unlinkParent(childId, parentUserId);
            setViewingChildParents(prev => prev.filter(p => p.parentUserId !== parentUserId));
            showSuccessModal('Успешно', 'Родитель успешно отвязан от ребёнка');
        } catch (err) {
            showErrorModal('Ошибка отвязки', `Не удалось отвязать родителя: ${err.message || 'Неизвестная ошибка'}`);
        }
    }, [canModifyDetachment, confirm]);

    const handleLinkNewParent = useCallback(async (e) => {
        e?.preventDefault();
        if (!viewingChild?.id) { showErrorModal('Ошибка', 'Ребёнок не выбран'); return; }
        setLinkingNewParent(true);
        setLinkSuccess(false);
        try {
            const trimmed = linkParentUuid.trim();
            if (!trimmed) throw new Error('UUID родителя не указан');
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(trimmed)) throw new Error('Неправильный формат UUID родителя');
            await linkParent(viewingChild.id, trimmed, linkParentRelation);
            setLinkSuccess(true);
            setLinkParentUuid('');
            setLinkParentRelation('PARENT');
            await loadChildParentsForView(viewingChild.id);
            showSuccessModal('Успешно', 'Родитель успешно привязан к ребёнку');
        } catch (err) {
            showErrorModal('Ошибка привязки', `Не удалось привязать родителя: ${err.message || 'Неизвестная ошибка'}`);
        } finally { setLinkingNewParent(false); }
    }, [viewingChild, linkParentUuid, linkParentRelation, loadChildParentsForView]);

    // ── AI чат ────────────────────────────────────────────────────────────────
    async function handleSendMessage() {
        if (!aiMessage.trim()) { showErrorModal('Ошибка', 'Введите сообщение'); return; }
        if (!process.env.REACT_APP_AITUNNEL_API_KEY) {
            showErrorModal('API ключ не найден', 'Добавьте REACT_APP_AITUNNEL_API_KEY в .env.local файл');
            return;
        }
        const userMsg = {
            id: Date.now(), role: 'user', content: aiMessage,
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, userMsg]);
        const text = aiMessage;
        setAiMessage('');
        setIsAnalyzing(true);
        const aiMsgId = Date.now() + 1;
        setChatMessages(prev => [...prev, {
            id: aiMsgId, role: 'assistant', content: '', isLoading: true,
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        }]);
        try {
            const response = await analyzeDetachmentWithAI(
                { detachment, memberships: memberships.filter(m => m.child), counselors: detachmentCounselors },
                text
            );
            setChatMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: response, isLoading: false } : m
            ));
            setTimeout(() => {
                const el = document.querySelector('.ai-chat-messages');
                if (el) el.scrollTop = el.scrollHeight;
            }, 100);
        } catch (err) {
            setChatMessages(prev => prev.map(m =>
                m.id === aiMsgId ? {
                    ...m,
                    content: `❌ Ошибка: ${err.message || 'Не удалось получить ответ от AI'}\n\nПопробуйте позже.`,
                    isLoading: false, isError: true
                } : m
            ));
        } finally { setIsAnalyzing(false); }
    }

    // ── Render guards ─────────────────────────────────────────────────────────
    const currentStage = detachment?.stage || 'NEW';
    const stageContent = STAGE_CONTENT[currentStage] || STAGE_CONTENT.NEW;
    const selectedReportTemplate = reportTemplates.find((template) => template.id === reportForm.reportTemplateId) || null;
    const selectedReportFields = selectedReportTemplate ? parseTemplateFields(selectedReportTemplate.fieldsSchema) : [];

    if (loading) return (
        <div className="layout"><Sidebar />
            <main className="main-content">
                <div className="loading-spinner"><div className="spinner"></div><p>Загрузка...</p></div>
            </main>
        </div>
    );

    if (error || !detachment) return (
        <div className="layout"><Sidebar />
            <main className="main-content">
                <div className="error-message"><span>⚠️</span><span>{error || 'Отряд не найден'}</span></div>
                <button className="btn-secondary" onClick={() => navigate(-1)}>← Назад</button>
            </main>
        </div>
    );

    // canEdit для карточки ребёнка:
    // - Вожатый отряда или ADMIN: полное редактирование
    // - Родитель своего ребёнка: только свои поля (медицина, аллергии и т.д.)
    const getChildCanEdit = (childId) => {
        if (canModifyDetachment) return true;
        if (isParent && myChildrenIds.includes(childId)) return true;
        return false;
    };

    const parentHasDetachmentAccess = !isParent
        || !myChildrenLoaded
        || memberships.some((membership) => membership.child?.id && myChildrenIds.includes(membership.child.id));

    if (isParent && myChildrenLoaded && !parentHasDetachmentAccess) return (
        <div className="layout"><Sidebar />
            <main className="main-content">
                <div className="error-message"><span>⚠️</span><span>У вас нет доступа к этому отряду.</span></div>
                <button className="btn-secondary" onClick={() => navigate(-1)}>← Назад</button>
            </main>
        </div>
    );

    return (
        <div className="layout">
            <Sidebar />
            <main className="detachment-page-fullscreen">
                <DetachmentHeader
                    detachment={detachment}
                    memberships={memberships}
                    detachmentCounselors={detachmentCounselors}
                    isCounselor={canModifyDetachment}
                    onBack={() => navigate(-1)}
                />

                <div className="detachment-content-grid">
                    {/* ── Левая колонка: дети ── */}
                    <div className="left-section">
                        <ChildrenPanel
                            memberships={memberships}
                            isCounselor={canModifyDetachment}
                            isParent={isParent}
                            myChildrenIds={myChildrenIds}
                            onAddChild={() => setShowAddChild(true)}
                            onViewChild={handleViewChild}
                            onAccessDenied={showErrorModal}
                        />

                        <div className={`detachment-secondary-stack ${isParent ? 'journals-only' : 'with-journals'}`}>
                            <section className="detachment-mini-panel">
                                <div className="detachment-mini-head">
                                    <h3>{isParent ? '📝 Журнал отряда' : '📝 Журналы отряда'}</h3>
                                    {!isParent && canModifyDetachment ? (
                                        <button
                                            className="btn-add-child detachment-mini-action"
                                            onClick={() => handleOpenJournalModal()}
                                        >
                                            Заполнить
                                        </button>
                                    ) : (
                                        <span>{detachmentJournals.length}</span>
                                    )}
                                </div>
                                <div className="detachment-mini-body">
                                    {loadingExtras ? (
                                        <div className="detachment-mini-empty">Загрузка...</div>
                                    ) : detachmentJournals.length === 0 ? (
                                        <div className="detachment-mini-empty">
                                            {isParent ? 'Для родителей записей пока нет.' : 'Журналов пока нет.'}
                                        </div>
                                    ) : (
                                        <div className="detachment-mini-list">
                                            {detachmentJournals.map((journal) => (
                                                <button
                                                    key={journal.id || journal.journalDate}
                                                    type="button"
                                                    className={`detachment-journal-card ${isParent ? 'parent' : 'editable'}`}
                                                    onClick={!isParent ? () => handleOpenJournalModal(journal) : undefined}
                                                >
                                                    <div className="detachment-journal-head">
                                                        <strong>{new Date(journal.journalDate).toLocaleDateString('ru-RU')}</strong>
                                                        {journal.activityLevel ? (
                                                            <span className="detachment-journal-level">{journal.activityLevel}</span>
                                                        ) : null}
                                                    </div>
                                                    {isParent ? (
                                                        <>
                                                            <span className="detachment-journal-text">
                                                                {journal.visibleForParentsVersion || 'Пока нет заметки для родителей.'}
                                                            </span>
                                                            <div className="detachment-journal-meta">
                                                                {typeof journal.childrenCount === 'number' ? <span>Детей: {journal.childrenCount}</span> : null}
                                                                {journal.updatedAt ? <span>Обновлено {new Date(journal.updatedAt).toLocaleDateString('ru-RU')}</span> : null}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="detachment-journal-sections">
                                                            {journal.visibleForParentsVersion ? (
                                                                <div className="detachment-journal-row">
                                                                    <span>Для родителей</span>
                                                                    <strong>{journal.visibleForParentsVersion}</strong>
                                                                </div>
                                                            ) : null}
                                                            {journal.successInfo ? (
                                                                <div className="detachment-journal-row">
                                                                    <span>Успехи</span>
                                                                    <strong>{journal.successInfo}</strong>
                                                                </div>
                                                            ) : null}
                                                            {journal.notes ? (
                                                                <div className="detachment-journal-row">
                                                                    <span>Заметки</span>
                                                                    <strong>{journal.notes}</strong>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {!isParent && (
                                <>
                                    <section className="detachment-mini-panel">
                                        <div className="detachment-mini-head">
                                            <h3>📊 Отчеты отряда</h3>
                                            {canModifyDetachment && (
                                                <button
                                                    className="btn-add-child detachment-mini-action"
                                                    onClick={handleOpenReportModal}
                                                    disabled={reportTemplates.length === 0}
                                                    title={reportTemplates.length === 0 ? 'Старший вожатый еще не создал шаблон' : 'Создать отчет'}
                                                >
                                                    Создать отчет
                                                </button>
                                            )}
                                        </div>
                                        <div className="detachment-mini-body">
                                            {loadingExtras ? (
                                                <div className="detachment-mini-empty">Загрузка...</div>
                                            ) : detachmentReports.length === 0 ? (
                                                <div className="detachment-mini-empty">Отчетов пока нет.</div>
                                            ) : (
                                                <div className="detachment-mini-list">
                                                    {detachmentReports.map((report) => {
                                                        const values = parseReportData(report.dataJson);
                                                        return (
                                                            <div key={report.id} className="detachment-report-card">
                                                                <div className="detachment-report-head">
                                                                    <strong>{report.reportTemplateTitle || 'Отчет'}</strong>
                                                                    <span className={`detachment-status-badge ${getReportStatusClass(report.status)}`}>
                                                                        {getReportStatusLabel(report.status)}
                                                                    </span>
                                                                </div>
                                                                <div className="detachment-report-date">
                                                                    {new Date(report.reportDate).toLocaleDateString('ru-RU')}
                                                                </div>
                                                                <div className="detachment-report-preview">
                                                                    {Object.entries(values).slice(0, 3).map(([key, value]) => (
                                                                        <div key={key} className="detachment-report-row">
                                                                            <span>{key}</span>
                                                                            <strong>{String(value || '—')}</strong>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </section>


                                    <section className="detachment-mini-panel">
                                        <div className="detachment-mini-head">
                                            <h3>📢 Информация от ст. вожатого</h3>
                                        </div>
                                        <div className="detachment-mini-body">
                                            {loadingExtras ? (
                                                <div className="detachment-mini-empty">Загрузка...</div>
                                            ) : detachmentNotices.length === 0 ? (
                                                <div className="detachment-mini-empty">Сообщений пока нет.</div>
                                            ) : (
                                                <div className="detachment-mini-list">
                                                    {detachmentNotices.map((notice) => (
                                                        <div key={notice.id} className="detachment-notice-card">
                                                            <strong>{notice.title}</strong>
                                                            <span>{notice.body}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Правая колонка ── */}
                    <div className="right-section">
                        <div className="detachment-top-row">
                            {(canModifyDetachment || isParent) && (
                                <CounselorsPanel
                                    detachmentCounselors={detachmentCounselors}
                                    counselorProfiles={counselorProfiles}
                                    loadingCounselors={loadingCounselors}
                                    isCounselor={canManageCounselors}
                                    onAddCounselor={() => setShowAddCounselor(true)}
                                    onUnassign={handleUnassignCounselor}
                                    onCounselorClick={(id) => navigate(`/users/${id}`)}
                                    onShowAll={() => setShowCounselorsList(true)}
                                    canRemoveCounselor={canRemoveCounselor}
                                />
                            )}

                            {!isParent && (
                                    <section className="detachment-mini-panel">
                                        <div className="detachment-mini-head">
                                            <h3>✅ Задачи на сегодня</h3>
                                        </div>
                                        <div className="detachment-mini-body">
                                            {loadingExtras ? (
                                                <div className="detachment-mini-empty">Загрузка...</div>
                                            ) : detachmentTasks.length === 0 ? (
                                                <div className="detachment-mini-empty">На сегодня задач нет.</div>
                                            ) : (
                                                <div className="detachment-mini-list">
                                                    {detachmentTasks.map((task) => {
                                                        const checkedItemIds = new Set(parseTaskChecklistSelection(task.currentUserCompletionComment));
                                                        const checklistItems = Array.isArray(task.checklistItems) ? task.checklistItems : [];
                                                        const totalChecklistItems = checklistItems.length;
                                                        const completionValue = totalChecklistItems > 0
                                                            ? Math.round((checkedItemIds.size * 100) / totalChecklistItems)
                                                            : Math.round(task.completionPercent || 0);
                                                        return (
                                                        <div
                                                            key={task.id}
                                                            className={`detachment-task-card detachment-task-button ${totalChecklistItems > 0 && checkedItemIds.size === totalChecklistItems ? 'completed' : ''}`}
                                                        >
                                                            <div className="detachment-task-content">
                                                                <div className="detachment-task-topline">
                                                                    <strong>{task.title}</strong>
                                                                    <span className="detachment-task-date">
                                                                        {new Date(task.targetDate).toLocaleDateString('ru-RU')}
                                                                    </span>
                                                                </div>
                                                                <span>{task.description || 'Без описания'}</span>
                                                                <div className="detachment-task-progress">
                                                                    <div className="detachment-task-progress-bar">
                                                                        <div
                                                                            className="detachment-task-progress-fill"
                                                                            style={{ width: `${Math.max(0, Math.min(100, completionValue))}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="detachment-task-progress-meta">
                                                                        <span>{totalChecklistItems > 0 ? checkedItemIds.size : (task.totalCompleted || 0)} / {totalChecklistItems > 0 ? totalChecklistItems : (task.totalExpected || 0)}</span>
                                                                        <strong>{completionValue}%</strong>
                                                                    </div>
                                                                </div>
                                                                {checklistItems.length > 0 && (
                                                                    <div className="detachment-task-checklist">
                                                                        {checklistItems.map((item) => (
                                                                            <div key={item.id || item.title} className="detachment-task-checklist-item">
                                                                                <button
                                                                                    type="button"
                                                                                    className="detachment-task-item-toggle"
                                                                                    onClick={() => handleToggleTaskChecklistItem(task, item.id || item.title)}
                                                                                    disabled={completingTaskId === task.id}
                                                                                >
                                                                                    <span className={`detachment-task-item-check ${checkedItemIds.has(String(item.id || item.title)) ? 'checked' : ''}`}>
                                                                                        {checkedItemIds.has(String(item.id || item.title)) ? '✓' : ''}
                                                                                    </span>
                                                                                </button>
                                                                                <span className={`detachment-task-pill ${item.required ? 'required' : 'optional'}`}>
                                                                                    {item.required ? 'Обязательно' : 'Опционально'}
                                                                                </span>
                                                                                <strong>{item.title}</strong>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                                                                    <div className="detachment-task-attachments">
                                                                        {task.attachments.map((attachment) => (
                                                                            <button
                                                                                key={attachment.id || attachment.fileId}
                                                                                type="button"
                                                                                className="detachment-task-file"
                                                                                onClick={() => handleOpenTaskAttachment(attachment.fileId)}
                                                                            >
                                                                                {attachment.originalFileName || 'Вложение'}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                            )}
                        </div>

                        {/* Этап: родитель видит только шкалу, без кнопки перехода */}
                        <StagePanel
                            currentStage={currentStage}
                            isCounselor={canModifyDetachment}
                            onNextStage={handleNextStage}
                        />

                        {/* Методология и AI — только для вожатых и ADMIN, не для родителей */}
                        {!isParent && (
                            <>
                                <MethodologyPanel
                                    detachmentId={detachmentId}
                                    currentStage={currentStage}
                                    ageGroup={detachment?.ageGroup}
                                />

                                <AiChatPanel
                                    chatMessages={chatMessages}
                                    aiMessage={aiMessage}
                                    isAnalyzing={isAnalyzing}
                                    onMessageChange={setAiMessage}
                                    onSend={handleSendMessage}
                                    onSuggestion={setAiMessage}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* ── Модальные окна ── */}
                {showStageTest && (
                    <StageTestModal
                        questions={stageContent.test}
                        answers={testAnswers}
                        onAnswer={(i, v) => { const a = [...testAnswers]; a[i] = v; setTestAnswers(a); }}
                        canProceed={canProceedToNextStage()}
                        onCancel={() => setShowStageTest(false)}
                        onProceed={proceedToNextStage}
                    />
                )}

                {showAddChild && (
                    <AddChildModal
                        detachmentId={detachmentId}
                        campId={detachment?.campId}
                        childForm={childForm}
                        parentUuid={parentUuid}
                        parentRelation={parentRelation}
                        linkingParent={linkingParent}
                        onChange={setChildForm}
                        onParentUuidChange={setParentUuid}
                        onParentRelationChange={setParentRelation}
                        onSubmit={handleCreateChild}
                        onClose={() => { setShowAddChild(false); setParentUuid(''); setParentRelation('PARENT'); }}
                        onApplicationConfirmed={() => { loadDetachment(); }}
                    />
                )}

                {viewingChild && (
                    <ChildViewModal
                        child={viewingChild}
                        editingChild={editingChild}
                        editForm={editForm}
                        savingChild={savingChild}
                        deletingChild={deletingChild}
                        viewingChildParents={viewingChildParents}
                        loadingChildParents={loadingChildParents}
                        linkParentUuid={linkParentUuid}
                        linkParentRelation={linkParentRelation}
                        linkingNewParent={linkingNewParent}
                        linkSuccess={linkSuccess}
                        isCounselor={canModifyDetachment}
                        canEdit={getChildCanEdit(viewingChild.id)}
                        isParent={isParent}
                        isMyChild={isParent && myChildrenIds.includes(viewingChild.id)}
                        onClose={handleCloseChildView}
                        onStartEdit={() => setEditingChild(true)}
                        onCancelEdit={() => {
                            setEditingChild(false);
                            if (viewingChild) setEditForm({
                                firstName: viewingChild.firstName || '', lastName: viewingChild.lastName || '',
                                gender: viewingChild.gender || 'MALE', birthDate: viewingChild.birthDate || '',
                                homeCity: viewingChild.homeCity || '', medicalNotes: viewingChild.medicalNotes || '',
                                allergies: viewingChild.allergies || '', specialNeeds: viewingChild.specialNeeds || '',
                                behavioralNotes: viewingChild.behavioralNotes || ''
                            });
                        }}
                        onSaveChild={handleSaveChild}
                        onEditFormChange={setEditForm}
                        onDeleteClick={handleDeleteClick}
                        onParentClick={(uid) => navigate(`/users/${uid}`)}
                        onUnlinkParent={handleUnlinkParent}
                        onLinkParentUuidChange={setLinkParentUuid}
                        onLinkParentRelationChange={setLinkParentRelation}
                        onLinkNewParent={handleLinkNewParent}
                    />
                )}

                {showAddCounselor && (
                    <AddCounselorModal
                        counselorUuid={counselorUuid}
                        counselorRole={counselorRole}
                        assigningCounselor={assigningCounselor}
                        onUuidChange={setCounselorUuid}
                        onRoleChange={setCounselorRole}
                        onSubmit={handleAssignCounselor}
                        onClose={() => { setShowAddCounselor(false); setCounselorUuid(''); setCounselorRole('ASSISTANT'); }}
                    />
                )}

                {showCounselorsList && (
                    <CounselorsListModal
                        detachmentCounselors={detachmentCounselors}
                        counselorProfiles={counselorProfiles}
                        loadingCounselors={loadingCounselors}
                        isCounselor={canManageCounselors}
                        canRemoveCounselor={canRemoveCounselor}
                        onCounselorClick={(id) => navigate(`/users/${id}`)}
                        onUnassign={handleUnassignCounselor}
                        onClose={() => setShowCounselorsList(false)}
                    />
                )}

                {showJournalModal && (
                    <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
                        <div className="modal-content detachment-report-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>📝 Журнал отряда</h2>
                                <button className="modal-close" onClick={() => setShowJournalModal(false)}>×</button>
                            </div>
                            <form className="detachment-report-form" onSubmit={handleSubmitJournal}>
                                <div className="form-group-compact">
                                    <label>Дата *</label>
                                    <input
                                        type="date"
                                        value={journalForm.journalDate}
                                        onChange={(event) => handleJournalFieldChange('journalDate', event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Активность отряда</label>
                                    <input
                                        type="text"
                                        value={journalForm.activityLevel}
                                        onChange={(event) => handleJournalFieldChange('activityLevel', event.target.value)}
                                        placeholder="Например: высокая, спокойная, насыщенная"
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Версия для родителей</label>
                                    <textarea
                                        rows="3"
                                        value={journalForm.visibleForParentsVersion}
                                        onChange={(event) => handleJournalFieldChange('visibleForParentsVersion', event.target.value)}
                                        placeholder="Короткая заметка, которую увидят родители"
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Участие детей</label>
                                    <textarea
                                        rows="3"
                                        value={journalForm.participationInfo}
                                        onChange={(event) => handleJournalFieldChange('participationInfo', event.target.value)}
                                        placeholder="Кто был вовлечен, как шла работа в отряде"
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Адаптация</label>
                                    <textarea
                                        rows="3"
                                        value={journalForm.adaptationInfo}
                                        onChange={(event) => handleJournalFieldChange('adaptationInfo', event.target.value)}
                                        placeholder="Как дети адаптируются в отряде"
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Конфликты и трудности</label>
                                    <textarea
                                        rows="3"
                                        value={journalForm.conflictInfo}
                                        onChange={(event) => handleJournalFieldChange('conflictInfo', event.target.value)}
                                        placeholder="Что было сложным за день"
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Успехи и достижения</label>
                                    <textarea
                                        rows="3"
                                        value={journalForm.successInfo}
                                        onChange={(event) => handleJournalFieldChange('successInfo', event.target.value)}
                                        placeholder="Что получилось хорошо"
                                    />
                                </div>
                                <div className="form-group-compact">
                                    <label>Внутренние заметки</label>
                                    <textarea
                                        rows="4"
                                        value={journalForm.notes}
                                        onChange={(event) => handleJournalFieldChange('notes', event.target.value)}
                                        placeholder="Любые дополнительные наблюдения"
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-modal-cancel" onClick={() => setShowJournalModal(false)}>
                                        Отмена
                                    </button>
                                    <button type="submit" className="btn-modal-submit" disabled={savingJournal}>
                                        {savingJournal ? 'Сохранение...' : 'Сохранить журнал'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showReportModal && (
                    <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                        <div className="modal-content detachment-report-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>📊 Создать отчет</h2>
                                <button className="modal-close" onClick={() => setShowReportModal(false)}>×</button>
                            </div>
                            <form className="detachment-report-form" onSubmit={handleSubmitReport}>
                                <div className="form-group-compact">
                                    <label>Шаблон *</label>
                                    <select value={reportForm.reportTemplateId} onChange={(event) => handleReportTemplateChange(event.target.value)} required>
                                        <option value="">Выберите шаблон</option>
                                        {reportTemplates.map((template) => (
                                            <option key={template.id} value={template.id}>{template.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group-compact">
                                    <label>Дата *</label>
                                    <input
                                        type="date"
                                        value={reportForm.reportDate}
                                        onChange={(event) => setReportForm((prev) => ({ ...prev, reportDate: event.target.value }))}
                                        required
                                    />
                                </div>

                                {selectedReportFields.map((field) => (
                                    <div key={field.id} className="form-group-compact">
                                        <label>{field.label}</label>
                                        <textarea
                                            rows="3"
                                            value={reportForm.values[field.label] || ''}
                                            onChange={(event) => handleReportValueChange(field.label, event.target.value)}
                                            placeholder={`Заполните поле "${field.label}"`}
                                        />
                                    </div>
                                ))}

                                <div className="modal-actions">
                                    <button type="button" className="btn-modal-cancel" onClick={() => setShowReportModal(false)}>
                                        Отмена
                                    </button>
                                    <button type="submit" className="btn-modal-submit" disabled={savingReport || !reportForm.reportTemplateId}>
                                        {savingReport ? 'Сохранение...' : 'Отправить отчет'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    open={showDeleteConfirm}
                    title="Удалить ребёнка?"
                    message="Это действие невозможно отменить. Все данные о ребёнке будут удалены."
                    confirmLabel={deletingChild ? 'Удаление...' : 'Да, удалить'}
                    cancelLabel="Отмена"
                    danger
                    onConfirm={handleConfirmDelete}
                    onCancel={() => { setShowDeleteConfirm(false); setChildToDelete(null); }}
                />

                <AccessDeniedModal
                    isOpen={showAccessDenied}
                    onClose={() => { setShowAccessDenied(false); setAccessDeniedMessage(''); setAccessDeniedTitle(''); }}
                    title={accessDeniedTitle}
                    message={accessDeniedMessage}
                />

                <SuccessModal
                    isOpen={showAccess}
                    onClose={() => { setShowAccess(false); setAccessMessage(''); setAccessTitle(''); }}
                    title={accessTitle}
                    message={accessMessage}
                />
            </main>
        </div>
    );
}
