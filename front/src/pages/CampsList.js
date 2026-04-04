import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, refreshTokens } from '../services/auth';
import { getMyAccessibleCamps, createCamp, getMyChildren, getActiveMembership, updateCamp } from '../services/camps';
import { getDetachment } from '../services/detachments';
import { applyInviteCode, createChildApplication, getMyApplications } from '../services/applications';
import { resolveCampPhotoUrl, uploadCampPhoto } from '../services/campPhotos';
import AccessDeniedModal from '../components/AccessDeniedModal';
import { useAppModal } from '../components/AppModalProvider';
import Sidebar from '../layouts/Sidebar';
import './CampsList.css';

const GENDER_OPTIONS = [
    { value: 'MALE', label: 'Мальчик' },
    { value: 'FEMALE', label: 'Девочка' },
];

const RELATION_OPTIONS = ['Мама', 'Папа', 'Опекун'];

const EMPTY_APPLICATION = {
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'MALE',
    homeCity: '',
    medicalNotes: '',
    allergies: '',
    specialNeeds: '',
    behavioralNotes: '',
    relation: 'Мама',
};

const STATUS_LABELS = {
    PENDING: 'На рассмотрении',
    CONFIRMED: 'Принята',
    REJECTED: 'Отклонена',
};

function createEmptyCampForm() {
    return { name: '', location: '', description: '', photoFile: null, photoPreviewUrl: '', photoFileName: '' };
}

export default function CampsList() {
    const navigate = useNavigate();
    const { showError } = useAppModal();

    const [camps, setCamps] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingApplications, setLoadingApplications] = useState(false);
    const [error, setError] = useState('');
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [uploadingCreatePhoto, setUploadingCreatePhoto] = useState(false);
    const [formData, setFormData] = useState(createEmptyCampForm);

    const [step, setStep] = useState(null); // null | 'code' | 'application' | 'success'
    const [inviteCode, setInviteCode] = useState('');
    const [linkedCampId, setLinkedCampId] = useState(null);
    const [appForm, setAppForm] = useState(EMPTY_APPLICATION);
    const [submitting, setSubmitting] = useState(false);
    const [stepError, setStepError] = useState('');

    const currentUser = getCurrentUser();
    const roles = currentUser?.roles || [];
    const hasRole = (role) => roles.some((item) => {
        const value = String(item).toLowerCase();
        return value === `role_${role}` || value === role;
    });

    const isAdmin = hasRole('admin');
    const isCounselor = hasRole('counselor');
    const isParent = hasRole('parent');
    const isUser = hasRole('user');
    const isApplicant = !isAdmin && !isCounselor && (isUser || isParent);

    useEffect(() => {
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const hasApplications = applications.length > 0;
    const canShowApplicantLayout = isApplicant;

    const applicationsByStatus = useMemo(() => ({
        pending: applications.filter((item) => item.status === 'PENDING').length,
        confirmed: applications.filter((item) => item.status === 'CONFIRMED').length,
        rejected: applications.filter((item) => item.status === 'REJECTED').length,
    }), [applications]);

    function startApplicationFlow() {
        setStep('code');
        setStepError('');
    }

    async function enrichCampPhotos(campList) {
        const items = Array.isArray(campList) ? campList : [];
        const resolved = await Promise.all(items.map(async (camp) => ({
            ...camp,
            photoUrl: camp?.photoFileId ? await resolveCampPhotoUrl(camp.photoFileId) : null,
        })));
        return resolved;
    }

    async function loadApplicantActiveCamps() {
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

        const uniqueCamps = new Map();
        detachmentResponses
            .filter(Boolean)
            .forEach((detachment) => {
                if (!uniqueCamps.has(detachment.campId)) {
                    uniqueCamps.set(detachment.campId, {
                        id: detachment.campId,
                        name: detachment.campName || 'Лагерь',
                        accessType: 'PARENT',
                    });
                }
            });

        return Array.from(uniqueCamps.values());
    }

    async function loadData() {
        try {
            setLoading(true);
            setError('');

            if (isApplicant) {
                const [applicationSourceCamps, activeApplicantCamps] = await Promise.all([
                    getMyAccessibleCamps().catch(() => []),
                    loadApplicantActiveCamps(),
                ]);

                const sourceCamps = Array.isArray(applicationSourceCamps) ? applicationSourceCamps : [];
                const activeCamps = Array.isArray(activeApplicantCamps) ? activeApplicantCamps : [];
                const sourceCampMap = new Map(sourceCamps.map((camp) => [camp.id, camp]));
                const mergedApplicantCamps = activeCamps.map((camp) => ({ ...sourceCampMap.get(camp.id), ...camp, photoFileId: sourceCampMap.get(camp.id)?.photoFileId || null }));
                setCamps(await enrichCampPhotos(mergedApplicantCamps));
                await loadApplications(sourceCamps);
            } else {
                const data = await getMyAccessibleCamps();
                const campList = Array.isArray(data) ? data : [];
                setCamps(await enrichCampPhotos(campList));
                setApplications([]);
            }
        } catch (e) {
            if (!isApplicant) {
                setError('Не удалось загрузить лагеря');
            }
            setCamps([]);
            if (isApplicant) {
                setApplications([]);
            }
        } finally {
            setLoading(false);
        }
    }

    async function loadApplications(campList = camps) {
        try {
            setLoadingApplications(true);

            const targetCamps = Array.isArray(campList) ? campList : [];
            const responses = await Promise.all(
                targetCamps.map(async (camp) => {
                    try {
                        const items = await getMyApplications(camp.id);
                        return (Array.isArray(items) ? items : []).map((item) => ({
                            ...item,
                            campName: camp.name,
                        }));
                    } catch {
                        return [];
                    }
                })
            );

            setApplications(
                responses
                    .flat()
                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            );
        } finally {
            setLoadingApplications(false);
        }
    }

    async function handleUseCode() {
        if (!inviteCode.trim()) {
            setStepError('Введите код приглашения');
            return;
        }

        try {
            setSubmitting(true);
            setStepError('');
            const res = await applyInviteCode(inviteCode.trim().toUpperCase());
            setLinkedCampId(res.id);
            try {
                await refreshTokens();
            } catch (_) {}
            setStep('application');
        } catch (err) {
            setStepError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmitApplication() {
        if (!appForm.firstName.trim() || !appForm.lastName.trim() || !appForm.birthDate) {
            setStepError('Заполните обязательные поля: имя, фамилия, дата рождения');
            return;
        }

        try {
            setSubmitting(true);
            setStepError('');
            await createChildApplication(linkedCampId, appForm);
            setStep('success');
        } catch (err) {
            setStepError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCloseModal() {
        setStep(null);
        setInviteCode('');
        setLinkedCampId(null);
        setAppForm(EMPTY_APPLICATION);
        setStepError('');
        await loadData();
    }

    function handleAddAnother() {
        setAppForm(EMPTY_APPLICATION);
        setStepError('');
        setStep('application');
    }

    function handleCampClick(camp) {
        navigate(`/camps/${camp.id}/sessions`);
    }

    function handleCreateCamp() {
        if (!isAdmin) {
            setShowAccessDenied(true);
            return;
        }
        setFormData(createEmptyCampForm());
        setShowCreateModal(true);
    }

    function handleCreatePhotoChange(event) {
        const file = event.target.files?.[0] || null;
        if (!file) {
            setFormData((prev) => ({ ...prev, photoFile: null, photoPreviewUrl: '', photoFileName: '' }));
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setFormData((prev) => ({ ...prev, photoFile: file, photoPreviewUrl: previewUrl, photoFileName: file.name }));
    }

    async function handleSubmitCreate(event) {
        event.preventDefault();

        if (!formData.name.trim()) {
            showError('Ошибка заполнения', 'Введите название лагеря');
            return;
        }

        try {
            setCreating(true);
            const createdCamp = await createCamp({
                name: formData.name,
                location: formData.location,
                description: formData.description,
            });
            if (formData.photoFile) {
                setUploadingCreatePhoto(true);
                const photoFileId = await uploadCampPhoto(createdCamp.id, formData.photoFile);
                await updateCamp(createdCamp.id, { photoFileId });
            }
            setShowCreateModal(false);
            setFormData(createEmptyCampForm());
            await loadData();
        } catch (err) {
            showError('Ошибка создания лагеря', `Не удалось создать лагерь: ${err.message}`);
        } finally {
            setCreating(false);
            setUploadingCreatePhoto(false);
        }
    }

    function getAccessTypeBadge(camp) {
        if (camp.accessType === 'OWNER') return <span className="badge badge-owner">Мой лагерь</span>;
        if (camp.accessType === 'COUNSELOR') return <span className="badge badge-counselor">Вожатый</span>;
        if (camp.accessType === 'OWNER_AND_COUNSELOR') {
            return (
                <>
                    <span className="badge badge-owner">Мой лагерь</span>
                    <span className="badge badge-counselor">Вожатый</span>
                </>
            );
        }
        if (camp.accessType === 'PARENT') return <span className="badge badge-parent">Ребёнок в лагере</span>;
        return null;
    }

    function getEmptyStateText() {
        if (isAdmin) return 'Создайте свой первый лагерь, чтобы начать работу';
        if (isCounselor) return 'Администратор должен назначить вас вожатым в лагерь';
        return 'Создайте заявку по коду приглашения и отслеживайте её статус на этой странице';
    }

    function formatDate(value) {
        if (!value) return '—';
        return new Date(value).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    function renderApplicantSidebar() {
        return (
            <aside className="applications-sidebar">
                <div className="applications-sidebar-card">
                    <div className="applications-sidebar-header">
                        <div>
                            <h2>Мои заявки</h2>
                            <p>Статусы обновляются после решения вожатого.</p>
                        </div>
                        <button className="btn-primary btn-sm" onClick={startApplicationFlow}>
                            Создать заявку
                        </button>
                    </div>

                    <div className="applications-stats">
                        <div className="applications-stat">
                            <span>Ожидают</span>
                            <strong>{applicationsByStatus.pending}</strong>
                        </div>
                        <div className="applications-stat">
                            <span>Приняты</span>
                            <strong>{applicationsByStatus.confirmed}</strong>
                        </div>
                        <div className="applications-stat">
                            <span>Отклонены</span>
                            <strong>{applicationsByStatus.rejected}</strong>
                        </div>
                    </div>

                    {loadingApplications ? (
                        <div className="applications-empty">Загрузка заявок...</div>
                    ) : !hasApplications ? (
                        <div className="applications-empty">
                            После отправки анкеты здесь появится карточка с её статусом.
                        </div>
                    ) : (
                        <div className="applications-list-panel">
                            {applications.map((application) => (
                                <div key={application.id} className="application-status-card">
                                    <div className="application-status-top">
                                        <div>
                                            <strong>{application.lastName} {application.firstName}</strong>
                                            <p>{application.campName || 'Лагерь'}</p>
                                        </div>
                                        <span className={`application-status-badge status-${String(application.status || '').toLowerCase()}`}>
                                            {STATUS_LABELS[application.status] || application.status}
                                        </span>
                                    </div>

                                    <div className="application-status-meta">
                                        <span>Дата: {formatDate(application.createdAt)}</span>
                                        <span>Родство: {application.relation || '—'}</span>
                                    </div>

                                    {(application.medicalNotes || application.allergies) && (
                                        <div className="application-status-health">
                                            {application.medicalNotes && <p>Мед. заметки: {application.medicalNotes}</p>}
                                            {application.allergies && <p>Аллергии: {application.allergies}</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        );
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-spinner"><div className="spinner" /><p>Загрузка...</p></div>
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
                        <h1>Лагеря</h1>
                        <p className="page-subtitle">
                            {camps.length > 0
                                ? `Найдено лагерей: ${camps.length}`
                                : isApplicant
                                    ? 'Создайте заявку по коду приглашения'
                                    : 'У вас пока нет доступных лагерей'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {isAdmin && (
                            <button className="btn-primary" onClick={handleCreateCamp}>Создать лагерь</button>
                        )}
                    </div>
                </div>

                {error && <div className="error-message"><span>{error}</span></div>}

                <div className={canShowApplicantLayout ? 'camps-applicant-layout' : ''}>
                    <div className="camps-applicant-main">
                        {camps.length === 0 && !error ? (
                            <div className="empty-state">
                                <div className="empty-icon">🏕️</div>
                                <h2>{isApplicant ? 'Заявки и доступы' : 'Нет доступных лагерей'}</h2>
                                <p>{getEmptyStateText()}</p>
                                {isAdmin && <button className="btn-primary" onClick={handleCreateCamp}>Создать первый лагерь</button>}
                            </div>
                        ) : (
                                <div className="camps-grid">
                                    {camps.map((camp) => (
                                        <div key={camp.id} className="camp-card" onClick={() => handleCampClick(camp)}>
                                            <div className="camp-card-main">
                                                <div className="camp-card-top">
                                                    <div className="camp-card-copy">
                                                        <div className="camp-header">
                                                            <h3>{camp.name}</h3>
                                                        </div>
                                                        {camp.location && (
                                                            <div className="camp-location">
                                                                <span className="icon">📍</span>
                                                                <span>{camp.location}</span>
                                                            </div>
                                                        )}
                                                        {camp.description && <p className="camp-description">{camp.description}</p>}
                                                    </div>
                                                    <div className="camp-card-media" aria-hidden="true">
                                                        {camp.photoUrl ? (
                                                            <div className="camp-card-photo-ring">
                                                                <img src={camp.photoUrl} alt="" className="camp-card-art" />
                                                            </div>
                                                        ) : (
                                                            <div className="camp-card-photo-ring">
                                                                <div className="camp-card-art camp-card-art-placeholder" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                        )}
                    </div>

                    {canShowApplicantLayout && renderApplicantSidebar()}
                </div>

                {step === 'code' && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Заявка на участие</h2>
                                <button className="modal-close" onClick={handleCloseModal}>✕</button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                                    Введите код приглашения, который вы получили от организатора лагеря.
                                </p>
                                <div className="form-group">
                                    <label>Код приглашения</label>
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        placeholder="Например: CAMP-A3F7K2"
                                        style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '18px', textAlign: 'center' }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUseCode()}
                                        autoFocus
                                    />
                                </div>
                                {stepError && <p style={{ color: 'var(--error)', marginBottom: '12px' }}>{stepError}</p>}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={handleCloseModal}>Отмена</button>
                                <button className="btn-primary" onClick={handleUseCode} disabled={submitting}>
                                    {submitting ? 'Проверка...' : 'Далее →'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'application' && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div
                            className="modal-content modal-content--wide"
                            onClick={(event) => event.stopPropagation()}
                            style={{ maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <div className="modal-header">
                                <h2>Анкета ребёнка</h2>
                                <button className="modal-close" onClick={handleCloseModal}>✕</button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Заполните информацию о ребёнке. Вожатый смены увидит анкету и примет решение.
                                </p>

                                <div className="camp-application-grid">
                                    <div className="form-group">
                                        <label>Имя *</label>
                                        <input type="text" value={appForm.firstName} onChange={(e) => setAppForm({ ...appForm, firstName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Фамилия *</label>
                                        <input type="text" value={appForm.lastName} onChange={(e) => setAppForm({ ...appForm, lastName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Дата рождения *</label>
                                        <input type="date" value={appForm.birthDate} onChange={(e) => setAppForm({ ...appForm, birthDate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Пол</label>
                                        <select className="camp-application-select" value={appForm.gender} onChange={(e) => setAppForm({ ...appForm, gender: e.target.value })}>
                                            {GENDER_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Город</label>
                                        <input type="text" value={appForm.homeCity} onChange={(e) => setAppForm({ ...appForm, homeCity: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Кем приходитесь</label>
                                        <select className="camp-application-select" value={appForm.relation} onChange={(e) => setAppForm({ ...appForm, relation: e.target.value })}>
                                            {RELATION_OPTIONS.map((relation) => (
                                                <option key={relation} value={relation}>{relation}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Аллергии</label>
                                    <input type="text" value={appForm.allergies} onChange={(e) => setAppForm({ ...appForm, allergies: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Медицинские особенности</label>
                                    <textarea value={appForm.medicalNotes} rows={2} onChange={(e) => setAppForm({ ...appForm, medicalNotes: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Особые потребности</label>
                                    <textarea value={appForm.specialNeeds} rows={2} onChange={(e) => setAppForm({ ...appForm, specialNeeds: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Поведенческие особенности</label>
                                    <textarea value={appForm.behavioralNotes} rows={2} onChange={(e) => setAppForm({ ...appForm, behavioralNotes: e.target.value })} />
                                </div>
                                {stepError && <p style={{ color: 'var(--error)', marginTop: '8px' }}>{stepError}</p>}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setStep('code')}>← Назад</button>
                                <button className="btn-primary" onClick={handleSubmitApplication} disabled={submitting}>
                                    {submitting ? 'Отправка...' : 'Отправить заявку'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                                <h2 style={{ marginBottom: '12px' }}>Заявка отправлена</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>
                                    Следите за статусом справа на странице лагерей. После принятия появится доступ к сменам и отряду.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button className="btn-secondary" onClick={handleAddAnother}>Добавить ещё ребёнка</button>
                                    <button className="btn-primary" onClick={handleCloseModal}>Готово</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setFormData(createEmptyCampForm()); }}>
                        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать новый лагерь</h2>
                                <button className="modal-close" onClick={() => { setShowCreateModal(false); setFormData(createEmptyCampForm()); }}>✕</button>
                            </div>
                            <form onSubmit={handleSubmitCreate}>
                                <div style={{ padding: '24px' }}>
                                    <div className="form-group">
                                        <label htmlFor="name">Название лагеря *</label>
                                        <input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="location">Местоположение</label>
                                        <input id="location" type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="description">Описание</label>
                                        <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="4" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="camp-photo">Фото лагеря</label>
                                        <label className="camp-photo-upload" htmlFor="camp-photo">
                                            <span>{formData.photoFileName || 'Выбрать фото'}</span>
                                            <input id="camp-photo" type="file" accept="image/*" onChange={handleCreatePhotoChange} hidden />
                                        </label>
                                        {formData.photoPreviewUrl ? (
                                            <div className="camp-photo-preview-card">
                                                <img src={formData.photoPreviewUrl} alt="" className="camp-photo-preview-image" />
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => { setShowCreateModal(false); setFormData(createEmptyCampForm()); }} disabled={creating}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={creating || uploadingCreatePhoto}>
                                        {uploadingCreatePhoto ? 'Загрузка фото...' : creating ? 'Создание...' : 'Создать лагерь'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <AccessDeniedModal
                    isOpen={showAccessDenied}
                    onClose={() => setShowAccessDenied(false)}
                    title="Недостаточно прав"
                    message="Только администраторы могут создавать лагеря."
                />
            </main>
        </div>
    );
}
