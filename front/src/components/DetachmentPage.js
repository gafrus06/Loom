import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MethodologyPanel from './MethodologyPanel';
import { getCurrentUser } from '../api/auth';
import { analyzeDetachmentWithAI } from '../api/aitunnel-analysis';
import {
    getDetachment, changeDetachmentStage,
    getDetachmentCounselors, assignCounselor, unassignCounselor
} from '../api/detachments';
import { getMembershipsByDetachment } from '../api/memberships';
import { getChildParents, unlinkParent, linkParent } from '../api/parent-links';
import { getChild, createChild, updateChild, deleteChild } from '../api/children';
import { getUserProfile } from '../api/users';
import Sidebar from './Sidebar';
import AccessDeniedModal from './AccessDeniedModal';
import ConfirmModal from './ConfirmModal';
import SuccessModal from './SuccessModal';
import DetachmentHeader from './detachment/DetachmentHeader';
import ChildrenPanel from './detachment/ChildrenPanel';
import CounselorsPanel from './detachment/CounselorsPanel';
import StagePanel from './detachment/StagePanel';
import AiChatPanel from './detachment/AiChatPanel';
import StageTestModal from './detachment/StageTestModal';
import AddChildModal from './detachment/AddChildModal';
import ChildViewModal from './detachment/ChildViewModal';
import AddCounselorModal from './detachment/AddCounselorModal';
import CounselorsListModal from './detachment/CounselorsListModal';
import '../styles/detachment-page.css';

const STAGES = [
    { id: 'NEW', name: 'Новый', color: '#FF6B6B' },
    { id: 'ORGANIZATIONAL', name: 'Организационный', color: '#FFA500' },
    { id: 'BUSINESS', name: 'Деловой', color: '#FFD700' },
    { id: 'CONSTRUCTIVE', name: 'Конструктивный', color: '#4CAF50' },
    { id: 'FINAL', name: 'Заключительный', color: '#2196F3' },
    { id: 'COMPLETED', name: 'Завершён', color: '#9C27B0' }
];

const STAGE_CONTENT = {
    NEW: { test: ['Все дети познакомились друг с другом', 'Проведена экскурсия по территории', 'Установлены базовые правила отряда', 'Дети знают имена вожатых', 'Созданы первые микрогруппы'] },
    ORGANIZATIONAL: { test: ['Выбран актив отряда', 'Распределены роли и обязанности', 'Составлен план смены', 'Оформлен отрядный уголок', 'Придуман девиз и название'] },
    BUSINESS: { test: ['Проведено минимум 3 крупных мероприятия', 'Дети активно участвуют в жизни отряда', 'Работают все органы самоуправления', 'Налажено взаимодействие между детьми', 'Реализуются творческие проекты'] },
    CONSTRUCTIVE: { test: ['Отряд работает как единый организм', 'Дети сами инициируют мероприятия', 'Минимальное вмешательство вожатых', 'Конфликты решаются внутри отряда', 'Высокая творческая активность'] },
    FINAL: { test: ['Проведен прощальный огонек', 'Каждый ребенок поделился впечатлениями', 'Собраны контакты для связи', 'Вручены грамоты и награды', 'Проведена итоговая фотосессия'] },
    COMPLETED: { test: [] }
};

export default function DetachmentPage() {
    const { detachmentId } = useParams();
    const navigate = useNavigate();

    // ── Основные данные ──────────────────────────────────────────────
    const [detachment, setDetachment] = useState(null);
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── AI чат ───────────────────────────────────────────────────────
    const [chatMessages, setChatMessages] = useState([]);
    const [aiMessage, setAiMessage] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ── Переход этапа ────────────────────────────────────────────────
    const [showStageTest, setShowStageTest] = useState(false);
    const [testAnswers, setTestAnswers] = useState([]);

    // ── Добавление ребёнка ───────────────────────────────────────────
    const [showAddChild, setShowAddChild] = useState(false);
    const [childForm, setChildForm] = useState({ firstName: '', lastName: '', gender: 'MALE', birthDate: '' });
    const [parentUuid, setParentUuid] = useState('');
    const [parentRelation, setParentRelation] = useState('PARENT');
    const [linkingParent, setLinkingParent] = useState(false);

    // ── Просмотр / редактирование ребёнка ───────────────────────────
    const [viewingChild, setViewingChild] = useState(null);
    const [viewingChildParents, setViewingChildParents] = useState([]);
    const [loadingChildParents, setLoadingChildParents] = useState(false);
    const [editingChild, setEditingChild] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [savingChild, setSavingChild] = useState(false);
    const [deletingChild, setDeletingChild] = useState(false);
    const [childToDelete, setChildToDelete] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ── Привязка родителя к ребёнку ──────────────────────────────────
    const [linkParentUuid, setLinkParentUuid] = useState('');
    const [linkParentRelation, setLinkParentRelation] = useState('PARENT');
    const [linkingNewParent, setLinkingNewParent] = useState(false);
    const [linkSuccess, setLinkSuccess] = useState(false);

    // ── Вожатые ──────────────────────────────────────────────────────
    const [showAddCounselor, setShowAddCounselor] = useState(false);
    const [counselorUuid, setCounselorUuid] = useState('');
    const [counselorRole, setCounselorRole] = useState('ASSISTANT');
    const [assigningCounselor, setAssigningCounselor] = useState(false);
    const [detachmentCounselors, setDetachmentCounselors] = useState([]);
    const [counselorProfiles, setCounselorProfiles] = useState({});
    const [loadingCounselors, setLoadingCounselors] = useState(false);
    const [showCounselorsList, setShowCounselorsList] = useState(false);

    // ── Модальные окна ───────────────────────────────────────────────
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [accessDeniedTitle, setAccessDeniedTitle] = useState('');
    const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
    const [showAccess, setShowAccess] = useState(false);
    const [accessTitle, setAccessTitle] = useState('');
    const [accessMessage, setAccessMessage] = useState('');

    // ── Роли ─────────────────────────────────────────────────────────
    const [myChildrenIds, setMyChildrenIds] = useState([]);
    const currentUser = getCurrentUser();

    const isAdmin = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_admin' || s === 'admin';
    });
    const isParent = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_parent' || s === 'parent';
    });
    const isCounselorRole = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_counselor' || s === 'counselor';
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

    // ── Helpers ──────────────────────────────────────────────────────
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

    // ── Effects ──────────────────────────────────────────────────────
    useEffect(() => {
        loadDetachment();
        if (isParent) loadMyChildrenIds();
        loadDetachmentCounselors();
    }, [detachmentId]);

    // После загрузки вожатых — определяем роль текущего пользователя в отряде
    useEffect(() => {
        if (!currentUser?.id || detachmentCounselors.length === 0) return;
        const myAssignment = detachmentCounselors.find(
            c => c.userId === currentUser.id && c.active
        );
        setIsDetachmentMember(!!myAssignment);
        setIsDetachmentLead(myAssignment?.roleInDetachment === 'LEAD');
    }, [detachmentCounselors, currentUser?.id]);

    // ── Загрузка данных ──────────────────────────────────────────────
    async function loadDetachment() {
        if (!detachmentId) { setError('ID отряда не указан'); setLoading(false); return; }
        try {
            setLoading(true);
            setError('');
            const detachmentData = await getDetachment(detachmentId);
            setDetachment(detachmentData);
            const membershipsData = await getMembershipsByDetachment(detachmentId);
            const membershipsWithChildren = await Promise.all(
                membershipsData.map(async (m) => {
                    try { const child = await getChild(m.childId); return { ...m, child }; }
                    catch { return { ...m, child: null }; }
                })
            );
            setMemberships(membershipsWithChildren);
        } catch { setError('Не удалось загрузить данные отряда'); }
        finally { setLoading(false); }
    }

    async function loadDetachmentCounselors() {
        try {
            setLoadingCounselors(true);
            const counselors = await getDetachmentCounselors(detachmentId);
            setDetachmentCounselors(counselors);
            const profiles = {};
            for (const c of counselors) {
                if (c.userId) {
                    try {
                        const p = await getUserProfile(c.userId);
                        profiles[c.userId] = {
                            firstName: p.firstName || '',
                            secondName: p.secondName || '',
                            avatarUrl: p.avatarUrl || null
                        };
                    } catch {
                        profiles[c.userId] = { firstName: 'Неизвестно', secondName: '', avatarUrl: null };
                    }
                }
            }
            setCounselorProfiles(prev => ({ ...prev, ...profiles }));
        } catch { showErrorModal('Ошибка загрузки', 'Не удалось загрузить список вожатых отряда'); }
        finally { setLoadingCounselors(false); }
    }

    async function loadMyChildrenIds() {
        try {
            const { getMyChildren } = await import('../api/parent-links');
            const links = await getMyChildren();
            setMyChildrenIds(links.map(l => l.childId));
        } catch { showErrorModal('Ошибка загрузки', 'Не удалось загрузить список ваших детей.'); }
    }

    // ── Вожатые ──────────────────────────────────────────────────────
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
        if (!window.confirm('Вы уверены, что хотите открепить этого вожатого от отряда?')) return;
        try {
            await unassignCounselor(assignmentId);
            await loadDetachmentCounselors();
            showSuccessModal('Успешно', 'Вожатый успешно откреплён от отряда');
        } catch (err) {
            showErrorModal('Ошибка открепления', `Не удалось открепить вожатого: ${err.message || 'Неизвестная ошибка'}`);
        }
    }

    // ── Переход этапа ────────────────────────────────────────────────
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

    // ── Дети ─────────────────────────────────────────────────────────
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
            // Родитель — только через /parent endpoint, вожатый/ADMIN — через /counselor
            const updated = isParent
                ? await updateChild(viewingChild.id, editForm)   // parent endpoint
                : await updateChild(viewingChild.id, editForm);
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
            await deleteChild(childToDelete);
            if (viewingChild?.id === childToDelete) handleCloseChildView();
            await loadDetachment();
            setShowDeleteConfirm(false);
            setChildToDelete(null);
            showSuccessModal('Успешно', 'Ребёнок успешно удалён из отряда');
        } catch (err) {
            showErrorModal('Ошибка удаления', `Не удалось удалить ребёнка: ${err.message || 'Неизвестная ошибка'}`);
        } finally { setDeletingChild(false); }
    }, [childToDelete, viewingChild]);

    const handleUnlinkParent = useCallback(async (childId, parentUserId, e) => {
        e?.stopPropagation();
        if (!canModifyDetachment) {
            showErrorModal('Доступ запрещён', 'Только вожатый этого отряда может отвязывать родителей');
            return;
        }
        if (!window.confirm('Вы уверены, что хотите отвязать этого родителя от ребёнка?')) return;
        try {
            await unlinkParent(childId, parentUserId);
            setViewingChildParents(prev => prev.filter(p => p.parentUserId !== parentUserId));
            showSuccessModal('Успешно', 'Родитель успешно отвязан от ребёнка');
        } catch (err) {
            showErrorModal('Ошибка отвязки', `Не удалось отвязать родителя: ${err.message || 'Неизвестная ошибка'}`);
        }
    }, [canModifyDetachment]);

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

    // ── AI чат ───────────────────────────────────────────────────────
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

    // ── Render guards ────────────────────────────────────────────────
    const currentStage = detachment?.stage || 'NEW';
    const stageContent = STAGE_CONTENT[currentStage] || STAGE_CONTENT.NEW;

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
                            // Родитель не видит кнопку "Добавить"
                            isCounselor={canModifyDetachment}
                            isParent={isParent}
                            myChildrenIds={myChildrenIds}
                            onAddChild={() => setShowAddChild(true)}
                            onViewChild={handleViewChild}
                            onAccessDenied={showErrorModal}
                        />
                    </div>

                    {/* ── Правая колонка ── */}
                    <div className="right-section">
                        {/* Вожатые: видят все, у кого есть доступ к отряду */}
                        {(canModifyDetachment || isParent) && (
                            <CounselorsPanel
                                detachmentCounselors={detachmentCounselors}
                                counselorProfiles={counselorProfiles}
                                loadingCounselors={loadingCounselors}
                                // Кнопка "Добавить" — только LEAD и ADMIN
                                isCounselor={canManageCounselors}
                                onAddCounselor={() => setShowAddCounselor(true)}
                                onUnassign={handleUnassignCounselor}
                                onCounselorClick={(id) => navigate(`/user/${id}`)}
                                onShowAll={() => setShowCounselorsList(true)}
                                // Показывать ли кнопку "Открепить" для конкретного вожатого
                                canRemoveCounselor={canRemoveCounselor}
                            />
                        )}

                        {/* Этап: родитель видит только шкалу, без кнопки перехода */}
                        <StagePanel
                            currentStage={currentStage}
                            // false для родителя — скрывает кнопку "Перейти на следующий этап"
                            isCounselor={canModifyDetachment}
                            onNextStage={handleNextStage}
                        />

                        {/* Методология и AI — только для вожатых и ADMIN, не для родителя */}
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
                        onParentClick={(uid) => navigate(`/user/${uid}`)}
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
                        onCounselorClick={(id) => navigate(`/user/${id}`)}
                        onUnassign={handleUnassignCounselor}
                        onClose={() => setShowCounselorsList(false)}
                    />
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