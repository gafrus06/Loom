import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../layouts/Sidebar';
import { useAppModal } from '../components/AppModalProvider';
import { getUserProfileById } from '../services/auth';
import { generateInviteCode, getInviteCodes, deactivateInviteCode } from '../services/applications';
import { getCamp, getMyAccessibleCamps, updateCamp } from '../services/camps';
import { getCampCounselors, removeCounselorFromCamp, updateCampStaffSubRole } from '../services/campMembers';
import { getCampSettings, upsertCampSettings } from '../services/campSettings';
import { getSessionsByCamp } from '../services/sessions';
import { resolveCampPhotoUrl, uploadCampPhoto } from '../services/campPhotos';
import { useSession } from '../state/sessionStore';
import './CampSettingsPage.css';

const DEFAULT_FORM = {
    postingMode: 'MODERATED',
    calendarEnabled: false,
    calendarVisibleForParents: false,
};

const POSTING_MODE_OPTIONS = [
    { value: 'FREE', title: 'Свободная публикация', description: 'Сотрудники лагеря публикуют посты сразу без дополнительной проверки.' },
    { value: 'MODERATED', title: 'С премодерацией', description: 'Посты сначала проверяет старший вожатый или администратор лагеря.' },
    { value: 'ONLY_SENIOR_AND_ADMIN', title: 'Только старший и админ', description: 'Публикации могут создавать только старший вожатый и администратор.' },
    { value: 'ONLY_ADMIN', title: 'Только администратор', description: 'Публикации доступны только администратору лагеря.' },
];

const SUB_ROLE_OPTIONS = [
    { value: 'COUNSELOR', label: 'Вожатый' },
    { value: 'SENIOR_COUNSELOR', label: 'Старший вожатый' },
    { value: 'MEDICAL_WORKER', label: 'Медработник' },
];

function createCampProfileForm(camp, photoUrl = '') {
    return {
        name: camp?.name || '',
        location: camp?.location || '',
        description: camp?.description || '',
        photoFileId: camp?.photoFileId || null,
        photoUrl,
        photoFile: null,
        photoFileName: '',
    };
}

function normalizeStaff(membership, profile) {
    const assignments = Array.isArray(membership?.sessionAssignments) ? membership.sessionAssignments : [];
    const activeAssignments = assignments.filter((item) => item.active !== false);
    const firstAssignment = activeAssignments[0] || assignments[0] || null;
    const subRole = firstAssignment?.subRole || 'COUNSELOR';

    return {
        id: membership.userId,
        profile,
        subRole,
        sessionIds: activeAssignments.map((item) => item.sessionId).filter(Boolean),
        sessionTitles: activeAssignments.map((item) => item.sessionTitle).filter(Boolean),
        displayName: [profile?.secondName, profile?.firstName, profile?.thirdName].filter(Boolean).join(' ') || profile?.email || membership.userId,
        email: profile?.email || '—',
        avatarUrl: profile?.avatarUrl || '/user.png',
    };
}

function CustomToggle({ checked, disabled, title, description, onChange }) {
    return (
        <button
            type="button"
            className={`camp-settings-page__toggle ${checked ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
        >
            <span className={`camp-settings-page__toggle-box ${checked ? 'is-active' : ''}`} aria-hidden="true">
                <span className="camp-settings-page__toggle-knob" />
            </span>
            <span className="camp-settings-page__toggle-copy">
                <span className="camp-settings-page__toggle-title">{title}</span>
                <span className="camp-settings-page__toggle-description">{description}</span>
            </span>
        </button>
    );
}

function formatDateRange(session) {
    if (!session?.startDate || !session?.endDate) {
        return 'Даты не указаны';
    }

    const start = new Date(session.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const end = new Date(session.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} — ${end}`;
}

function formatCodeDate(value) {
    if (!value) {
        return 'Без срока';
    }

    return new Date(value).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function CampSettingsPage() {
    const { campId } = useParams();
    const navigate = useNavigate();
    const { confirm, showError, showSuccess } = useAppModal();
    const { user: currentUser } = useSession();
    const isAdminUser = useMemo(() => {
        const roleList = currentUser?.roles || [];
        return roleList.some((role) => {
            const value = String(role).toLowerCase();
            return value === 'role_admin' || value === 'admin' || value === 'role_super_admin' || value === 'super_admin';
        });
    }, [currentUser?.roles]);

    const [camp, setCamp] = useState(null);
    const [campPhotoUrl, setCampPhotoUrl] = useState('');
    const [campProfileForm, setCampProfileForm] = useState(createCampProfileForm());
    const [showCampProfileEditor, setShowCampProfileEditor] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [staff, setStaff] = useState([]);
    const [sessionFilter, setSessionFilter] = useState('all');
    const [inviteCodes, setInviteCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCampProfile, setSavingCampProfile] = useState(false);
    const campProfileBackdropPressedRef = useRef(false);
    const [staffLoading, setStaffLoading] = useState(false);
    const [codesLoading, setCodesLoading] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState('');
    const [codeActionId, setCodeActionId] = useState('');
    const [copiedCodeId, setCopiedCodeId] = useState('');
    const [showSessionPicker, setShowSessionPicker] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [hasAccess, setHasAccess] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadPage() {
            try {
                setLoading(true);
                setStaffLoading(true);
                setCodesLoading(true);
                setError('');

                if (!isAdminUser) {
                    const accessibleCamps = await getMyAccessibleCamps().catch(() => []);
                    const targetCamp = Array.isArray(accessibleCamps)
                        ? accessibleCamps.find((item) => item.id === campId)
                        : null;
                    const canOpenSettings = targetCamp && ['OWNER', 'OWNER_AND_COUNSELOR'].includes(targetCamp.accessType);

                    if (!canOpenSettings) {
                        setHasAccess(false);
                        setError('У вас нет доступа к настройкам этого лагеря.');
                        return;
                    }
                }

                const [campData, settings, counselors, sessionsData, codes] = await Promise.all([
                    getCamp(campId),
                    getCampSettings(campId).catch(() => null),
                    getCampCounselors(campId).catch(() => []),
                    getSessionsByCamp(campId).catch(() => []),
                    getInviteCodes(campId).catch(() => []),
                ]);

                const counselorList = Array.isArray(counselors) ? counselors : [];
                const profiles = await Promise.all(
                    counselorList.map((item) => getUserProfileById(item.userId).catch(() => null))
                );

                if (!mounted) {
                    return;
                }

                const resolvedCampPhotoUrl = campData?.photoFileId ? await resolveCampPhotoUrl(campData.photoFileId) : '';
                if (!mounted) {
                    return;
                }

                setHasAccess(true);
                setCamp(campData || null);
                setCampPhotoUrl(resolvedCampPhotoUrl || '');
                setCampProfileForm(createCampProfileForm(campData, resolvedCampPhotoUrl || ''));
                setSessions(Array.isArray(sessionsData) ? sessionsData : []);
                setInviteCodes(Array.isArray(codes) ? codes : []);
                setForm({
                    postingMode: settings?.postingMode || DEFAULT_FORM.postingMode,
                    calendarEnabled: Boolean(settings?.calendarEnabled),
                    calendarVisibleForParents: Boolean(settings?.calendarVisibleForParents),
                });
                setStaff(counselorList.map((item, index) => normalizeStaff(item, profiles[index])));
            } catch (e) {
                if (!mounted) {
                    return;
                }
                setError(e.message || 'Не удалось загрузить настройки лагеря');
            } finally {
                if (mounted) {
                    setLoading(false);
                    setStaffLoading(false);
                    setCodesLoading(false);
                }
            }
        }

        loadPage();
        return () => {
            mounted = false;
        };
    }, [campId, isAdminUser]);

    const filteredStaff = useMemo(() => {
        if (sessionFilter === 'all') {
            return staff;
        }
        return staff.filter((item) => item.sessionIds.includes(sessionFilter));
    }, [sessionFilter, staff]);

    const staffCountLabel = useMemo(() => {
        if (!staff.length) {
            return 'Сотрудники ещё не назначены';
        }
        if (sessionFilter === 'all') {
            return `${staff.length} сотрудников в лагере`;
        }
        return `Показано ${filteredStaff.length} из ${staff.length}`;
    }, [filteredStaff.length, sessionFilter, staff.length]);

    async function loadInviteCodes() {
        try {
            setCodesLoading(true);
            const codes = await getInviteCodes(campId);
            setInviteCodes(Array.isArray(codes) ? codes : []);
        } catch (e) {
            showError('Ошибка кодов', e.message || 'Не удалось загрузить коды приглашения');
        } finally {
            setCodesLoading(false);
        }
    }

    function handleCampPhotoChange(event) {
        const file = event.target.files?.[0] || null;
        if (!file) {
            setCampProfileForm((prev) => ({ ...prev, photoFile: null, photoFileName: '' }));
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setCampProfileForm((prev) => ({
            ...prev,
            photoFile: file,
            photoFileName: file.name,
            photoUrl: previewUrl,
        }));
    }

    async function handleSaveCampProfile(event) {
        event.preventDefault();
        try {
            setSavingCampProfile(true);
            let nextPhotoFileId = campProfileForm.photoFileId || null;
            if (campProfileForm.photoFile) {
                nextPhotoFileId = await uploadCampPhoto(campId, campProfileForm.photoFile);
            }

            const updatedCamp = await updateCamp(campId, {
                name: campProfileForm.name,
                location: campProfileForm.location,
                description: campProfileForm.description,
                photoFileId: nextPhotoFileId,
            });

            const resolvedPhotoUrl = nextPhotoFileId ? await resolveCampPhotoUrl(nextPhotoFileId) : '';
            setCamp(updatedCamp);
            setCampPhotoUrl(resolvedPhotoUrl || '');
            setCampProfileForm(createCampProfileForm(updatedCamp, resolvedPhotoUrl || ''));
            setShowCampProfileEditor(false);
            showSuccess('Лагерь обновлён', 'Название, фото, описание и город лагеря сохранены.');
        } catch (e) {
            showError('Ошибка сохранения', e.message || 'Не удалось обновить данные лагеря.');
        } finally {
            setSavingCampProfile(false);
        }
    }

    function handleCampProfileBackdropMouseDown(event) {
        campProfileBackdropPressedRef.current = event.target === event.currentTarget;
    }

    function handleCampProfileBackdropClick(event) {
        if (!savingCampProfile && campProfileBackdropPressedRef.current && event.target === event.currentTarget) {
            setShowCampProfileEditor(false);
        }
        campProfileBackdropPressedRef.current = false;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');

        try {
            await upsertCampSettings({ campId, ...form });
            setMessage('Настройки лагеря сохранены');
        } catch (e) {
            setError(e.message || 'Не удалось сохранить настройки');
        } finally {
            setSaving(false);
        }
    }

    async function handleSubRoleChange(userId, nextSubRole) {
        setUpdatingUserId(userId);
        setError('');
        setMessage('');

        try {
            const updated = await updateCampStaffSubRole(campId, userId, nextSubRole);
            setStaff((prev) => prev.map((item) => (
                item.id === userId ? normalizeStaff(updated, item.profile) : item
            )));
            setMessage('Подроль сотрудника обновлена');
        } catch (e) {
            setError(e.message || 'Не удалось обновить подроль сотрудника');
        } finally {
            setUpdatingUserId('');
        }
    }

    async function handleRemoveStaff(userId) {
        setUpdatingUserId(userId);
        setError('');
        setMessage('');

        try {
            await removeCounselorFromCamp(campId, userId);
            setStaff((prev) => prev.filter((item) => item.id !== userId));
            setMessage('Сотрудник выгнан из лагеря');
        } catch (e) {
            setError(e.message || 'Не удалось выгнать сотрудника из лагеря');
        } finally {
            setUpdatingUserId('');
        }
    }

    function openGenerateCodeModal() {
        if (!sessions.length) {
            showError('Нет смен', 'Сначала создайте хотя бы одну смену, чтобы выпустить код приглашения.');
            return;
        }
        setShowSessionPicker(true);
    }

    async function handlePickSession(sessionId) {
        setCodeActionId(sessionId);
        try {
            await generateInviteCode(campId, sessionId);
            await loadInviteCodes();
            setShowSessionPicker(false);
            showSuccess('Код создан', 'Новый код приглашения успешно создан.');
        } catch (e) {
            showError('Ошибка создания кода', e.message || 'Не удалось создать код приглашения');
        } finally {
            setCodeActionId('');
        }
    }

    async function handleDeactivateCode(codeId) {
        const approved = await confirm({
            title: 'Деактивировать код?',
            message: 'Код перестанет работать для новых заявок.',
            confirmLabel: 'Деактивировать',
            cancelLabel: 'Отмена',
            danger: true,
        });

        if (!approved) {
            return;
        }

        setCodeActionId(codeId);
        try {
            await deactivateInviteCode(codeId);
            await loadInviteCodes();
            showSuccess('Код отключён', 'Код приглашения деактивирован.');
        } catch (e) {
            showError('Ошибка', e.message || 'Не удалось деактивировать код');
        } finally {
            setCodeActionId('');
        }
    }

    async function handleCopyCode(code, codeId) {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCodeId(codeId);
            window.setTimeout(() => setCopiedCodeId((prev) => (prev === codeId ? '' : prev)), 2000);
        } catch (e) {
            showError('Не удалось скопировать', e.message || 'Буфер обмена недоступен');
        }
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content camp-settings-page">
                    <div className="inline-loading">Загрузка настроек...</div>
                </main>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content camp-settings-page">
                    <div className="camp-settings-page__card">
                        <div className="camp-settings-page__error">{error || 'У вас нет доступа к настройкам этого лагеря.'}</div>
                        <div className="camp-settings-page__actions">
                            <button className="btn-secondary" type="button" onClick={() => navigate('/camps')}>
                                Назад к лагерям
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content camp-settings-page">
                <div className="camp-settings-page__header">
                    <div>
                        <h1 className="camp-settings-page__title">Настройки лагеря</h1>
                        <p className="camp-settings-page__camp-name">{camp?.name || 'Лагерь'}</p>
                    </div>
                    <button className="btn-secondary" onClick={() => navigate(`/camps/${campId}/sessions`)}>
                        Назад
                    </button>
                </div>

                <section className="camp-settings-page__card camp-settings-page__camp-profile-card">
                    <div className="camp-settings-page__panel-head">
                        <div>
                            <h2>Профиль лагеря</h2>
                            <p>Название, город, описание и фото лагеря.</p>
                        </div>
                        <button type="button" className="btn-primary btn-sm" onClick={() => setShowCampProfileEditor(true)}>
                            Редактировать
                        </button>
                    </div>

                    <div className="camp-settings-page__camp-profile-preview">
                        <div className="camp-settings-page__camp-photo-frame">
                            {campPhotoUrl ? (
                                <img src={campPhotoUrl} alt="" className="camp-settings-page__camp-photo" />
                            ) : (
                                <div className="camp-settings-page__camp-photo-empty">Фото не добавлено</div>
                            )}
                        </div>
                        <div className="camp-settings-page__camp-profile-copy">
                            <h3>{camp?.name || 'Лагерь'}</h3>
                            <span>{camp?.location || 'Город не указан'}</span>
                            <p>{camp?.description || 'Описание лагеря пока не заполнено.'}</p>
                        </div>
                    </div>
                </section>

                <form className="camp-settings-page__card camp-settings-page__main-card" onSubmit={handleSubmit}>
                    <div className="camp-settings-page__section-head">
                        <div>
                            <h2>Режимы и доступ</h2>
                        </div>
                    </div>

                    <div className="camp-settings-page__field">
                        <label className="camp-settings-page__label">Режим публикации</label>
                        <div className="camp-settings-page__mode-grid">
                            {POSTING_MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`camp-settings-page__mode-card ${form.postingMode === option.value ? 'is-active' : ''}`}
                                    onClick={() => setForm((prev) => ({ ...prev, postingMode: option.value }))}
                                >
                                    <span className="camp-settings-page__mode-radio" aria-hidden="true" />
                                    <span className="camp-settings-page__mode-copy">
                                        <span className="camp-settings-page__mode-title">{option.title}</span>
                                        <span className="camp-settings-page__mode-description">{option.description}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="camp-settings-page__toggle-grid">

                        <CustomToggle
                            checked={form.calendarEnabled}
                            title="Календарь смены"
                            description="Включить события смены и работу календаря для лагеря."
                            onChange={(checked) => setForm((prev) => ({ ...prev, calendarEnabled: checked }))}
                        />
                        <CustomToggle
                            checked={form.calendarVisibleForParents}
                            disabled={!form.calendarEnabled}
                            title="Календарь для родителей"
                            description="Показывать родителям события смены в их интерфейсе."
                            onChange={(checked) => setForm((prev) => ({ ...prev, calendarVisibleForParents: checked }))}
                        />
                    </div>

                    {message && <div className="camp-settings-page__success">{message}</div>}
                    {error && <div className="camp-settings-page__error">{error}</div>}

                    <div className="camp-settings-page__actions">
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>

                <section className="camp-settings-page__card">
                    <div className="camp-settings-page__panel-head">
                        <div>
                            <h2>Коды приглашения</h2>
                            <p>Генерация кодов перенесена сюда из списка лагерей.</p>
                        </div>
                        <button className="btn-primary btn-sm" type="button" onClick={openGenerateCodeModal}>
                            Новый код
                        </button>
                    </div>

                    {codesLoading ? (
                        <div className="camp-settings-page__empty">Загрузка кодов...</div>
                    ) : inviteCodes.length === 0 ? (
                        <div className="camp-settings-page__empty">Пока нет активных кодов приглашения.</div>
                    ) : (
                        <div className="camp-settings-page__codes-list">
                            {inviteCodes.map((codeItem) => (
                                <div key={codeItem.id} className="camp-settings-page__code-card">
                                    <div className="camp-settings-page__code-main">
                                        <div className="camp-settings-page__code-value">{codeItem.code}</div>
                                        <div className="camp-settings-page__code-meta">
                                            <span>Смена: {codeItem.sessionTitle || 'Не указана'}</span>
                                            <span>Действует до: {formatCodeDate(codeItem.expiresAt)}</span>
                                        </div>
                                    </div>
                                    <div className="camp-settings-page__code-actions">
                                        <button
                                            type="button"
                                            className="btn-secondary btn-sm"
                                            onClick={() => handleCopyCode(codeItem.code, codeItem.id)}
                                        >
                                            {copiedCodeId === codeItem.id ? 'Скопировано' : 'Копировать'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-secondary btn-sm camp-settings-page__danger-btn"
                                            disabled={codeActionId === codeItem.id}
                                            onClick={() => handleDeactivateCode(codeItem.id)}
                                        >
                                            Отключить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="camp-settings-page__card">
                    <div className="camp-settings-page__panel-head">
                        <div>
                            <h2>Смены лагеря</h2>
                            <p>{sessions.length > 0 ? `Доступно смен: ${sessions.length}` : 'Смены пока не созданы'}</p>
                        </div>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="camp-settings-page__empty">Здесь появятся смены, которыми можно управлять.</div>
                    ) : (
                        <div className="camp-settings-page__session-list">
                            {sessions.map((session) => (
                                <div key={session.id} className="camp-settings-page__session-card">
                                    <div className="camp-settings-page__session-copy">
                                        <strong>{session.title || session.name}</strong>
                                        <span>{formatDateRange(session)}</span>
                                    </div>
                                    <div className="camp-settings-page__session-actions">
                                        <button
                                            className="btn-secondary btn-sm"
                                            onClick={() => navigate(`/camps/${campId}/sessions/${session.id}/detachments`)}
                                        >
                                            Отряды
                                        </button>
                                        <button
                                            className="btn-primary btn-sm"
                                            onClick={() => navigate(`/camps/${campId}/sessions/${session.id}/dashboard`)}
                                        >
                                            Управлять сменой
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="camp-settings-page__card">
                    <div className="camp-settings-page__panel-head camp-settings-page__panel-head--staff">
                        <div>
                            <h2>Сотрудники лагеря</h2>
                            <p>{staffCountLabel}</p>
                        </div>
                        <div className="camp-settings-page__staff-filter">
                            <label className="camp-settings-page__label" htmlFor="staff-session-filter">Фильтр по смене</label>
                            <div className="camp-settings-page__select-wrap">
                                <select
                                    id="staff-session-filter"
                                    className="camp-settings-page__select"
                                    value={sessionFilter}
                                    onChange={(event) => setSessionFilter(event.target.value)}
                                >
                                    <option value="all">Все смены</option>
                                    {sessions.map((session) => (
                                        <option key={session.id} value={session.id}>
                                            {session.title || session.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {staffLoading ? (
                        <div className="camp-settings-page__empty">Загрузка сотрудников...</div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="camp-settings-page__empty">
                            {staff.length === 0 ? 'В этом лагере пока нет сотрудников.' : 'По выбранной смене сотрудники не найдены.'}
                        </div>
                    ) : (
                        <div className="camp-settings-page__table-wrap">
                            <table className="camp-settings-page__table">
                                <thead>
                                <tr>
                                    <th>Сотрудник</th>
                                    <th>Email</th>
                                    <th>Смены</th>
                                    <th>Подроль</th>
                                    <th>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredStaff.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="camp-settings-page__user-cell">
                                                <img
                                                    src={item.avatarUrl}
                                                    alt=""
                                                    className="camp-settings-page__avatar"
                                                    onError={(event) => { event.currentTarget.src = '/user.png'; }}
                                                />
                                                <div>
                                                    <Link
                                                        to={currentUser?.id === item.id ? '/profile' : `/users/${item.id}`}
                                                        className="camp-settings-page__user-link"
                                                    >
                                                        {item.displayName}
                                                    </Link>
                                                    <div className="camp-settings-page__user-id">{item.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="camp-settings-page__email">{item.email}</td>
                                        <td>
                                            <div className="camp-settings-page__chips">
                                                {item.sessionTitles.length > 0
                                                    ? item.sessionTitles.map((title) => (
                                                        <span key={`${item.id}-${title}`} className="camp-settings-page__chip">{title}</span>
                                                    ))
                                                    : <span className="camp-settings-page__muted">Нет активных смен</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="camp-settings-page__select-wrap">
                                                <select
                                                    className="camp-settings-page__select"
                                                    value={item.subRole}
                                                    disabled={updatingUserId === item.id}
                                                    onChange={(event) => handleSubRoleChange(item.id, event.target.value)}
                                                >
                                                    {SUB_ROLE_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn-secondary btn-sm camp-settings-page__danger-btn"
                                                disabled={updatingUserId === item.id}
                                                onClick={() => handleRemoveStaff(item.id)}
                                            >
                                                Выгнать
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {showCampProfileEditor && (
                    <div
                        className="camp-settings-page__modal-backdrop"
                        onMouseDown={handleCampProfileBackdropMouseDown}
                        onClick={handleCampProfileBackdropClick}
                    >
                        <div className="camp-settings-page__modal camp-settings-page__modal--wide" onMouseDown={(event) => event.stopPropagation()}>
                            <div className="camp-settings-page__modal-head">
                                <h3>Редактирование лагеря</h3>
                                <button
                                    type="button"
                                    className="camp-settings-page__modal-close"
                                    onClick={() => !savingCampProfile && setShowCampProfileEditor(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <form className="camp-settings-page__camp-edit-form" onSubmit={handleSaveCampProfile}>
                                <div className="camp-settings-page__camp-edit-grid">
                                    <div className="camp-settings-page__field">
                                        <label className="camp-settings-page__label">Название лагеря</label>
                                        <input
                                            className="camp-settings-page__input"
                                            type="text"
                                            value={campProfileForm.name}
                                            onChange={(event) => setCampProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="camp-settings-page__field">
                                        <label className="camp-settings-page__label">Город лагеря</label>
                                        <input
                                            className="camp-settings-page__input"
                                            type="text"
                                            value={campProfileForm.location}
                                            onChange={(event) => setCampProfileForm((prev) => ({ ...prev, location: event.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="camp-settings-page__field">
                                    <label className="camp-settings-page__label">Описание</label>
                                    <textarea
                                        className="camp-settings-page__textarea"
                                        rows="5"
                                        value={campProfileForm.description}
                                        onChange={(event) => setCampProfileForm((prev) => ({ ...prev, description: event.target.value }))}
                                    />
                                </div>

                                <div className="camp-settings-page__field">
                                    <label className="camp-settings-page__label">Фото лагеря</label>
                                    <label className="camp-settings-page__upload" htmlFor="camp-settings-photo">
                                        <span>{campProfileForm.photoFileName || 'Выбрать фото'}</span>
                                        <input id="camp-settings-photo" type="file" accept="image/*" hidden onChange={handleCampPhotoChange} />
                                    </label>
                                    <div className="camp-settings-page__camp-photo-frame is-large">
                                        {campProfileForm.photoUrl ? (
                                            <img src={campProfileForm.photoUrl} alt="" className="camp-settings-page__camp-photo" />
                                        ) : (
                                            <div className="camp-settings-page__camp-photo-empty">Фото не добавлено</div>
                                        )}
                                    </div>
                                </div>

                                <div className="camp-settings-page__modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowCampProfileEditor(false)} disabled={savingCampProfile}>
                                        Отмена
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={savingCampProfile}>
                                        {savingCampProfile ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showSessionPicker && (
                    <div className="camp-settings-page__modal-backdrop" onClick={() => setShowSessionPicker(false)}>
                        <div className="camp-settings-page__modal" onClick={(event) => event.stopPropagation()}>
                            <div className="camp-settings-page__modal-head">
                                <h3>Выберите смену для кода</h3>
                                <button
                                    type="button"
                                    className="camp-settings-page__modal-close"
                                    onClick={() => setShowSessionPicker(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <p className="camp-settings-page__modal-text">
                                Код будет привязан к выбранной смене. Родитель, использовавший его, получит доступ именно к ней.
                            </p>
                            <div className="camp-settings-page__modal-list">
                                {sessions.map((session) => (
                                    <button
                                        key={session.id}
                                        type="button"
                                        className="camp-settings-page__modal-option"
                                        disabled={codeActionId === session.id}
                                        onClick={() => handlePickSession(session.id)}
                                    >
                                        <strong>{session.title || session.name}</strong>
                                        <span>{formatDateRange(session)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
