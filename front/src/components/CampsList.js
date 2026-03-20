import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, refreshTokens } from '../api/auth';
import { getMyAccessibleCamps, createCamp } from '../api/camps';
import { getSessionsByCamp } from '../api/sessions';
import { applyInviteCode, createChildApplication, generateInviteCode, getInviteCodes, deactivateInviteCode } from '../api/applications';
import AccessDeniedModal from './AccessDeniedModal';
import Sidebar from './Sidebar';
import '../styles/badges.css';
import '../styles/camps.css';

const GENDER_OPTIONS = [
    { value: 'MALE', label: 'Мальчик' },
    { value: 'FEMALE', label: 'Девочка' },
];

const RELATION_OPTIONS = ['Мама', 'Папа', 'Опекун'];

const EMPTY_APPLICATION = {
    firstName: '', lastName: '', birthDate: '',
    gender: 'MALE', homeCity: '', medicalNotes: '',
    allergies: '', specialNeeds: '', behavioralNotes: '',
    relation: 'Мама',
};

export default function CampsList() {
    const navigate = useNavigate();
    const [camps, setCamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({ name: '', location: '', description: '' });

    // Флоу заявки родителя
    const [step, setStep] = useState(null); // null | 'code' | 'application' | 'success'
    const [inviteCode, setInviteCode] = useState('');
    const [linkedCampId, setLinkedCampId] = useState(null);
    const [appForm, setAppForm] = useState(EMPTY_APPLICATION);
    const [submitting, setSubmitting] = useState(false);
    const [stepError, setStepError] = useState('');

    // Коды приглашений для администратора
    const [campCodes, setCampCodes] = useState({});
    const [loadingCodes, setLoadingCodes] = useState({});
    const [copiedCode, setCopiedCode] = useState(null);

    // Модалка выбора смены для генерации кода
    const [showSessionPicker, setShowSessionPicker] = useState(false);
    const [pickerCampId, setPickerCampId] = useState(null);
    const [pickerSessions, setPickerSessions] = useState([]);
    const [loadingPickerSessions, setLoadingPickerSessions] = useState(false);
    const [pickerError, setPickerError] = useState('');

    const currentUser = getCurrentUser();
    const roles = currentUser?.roles || [];
    const isAdmin    = roles.some(r => { const s = String(r).toLowerCase(); return s === 'role_admin' || s === 'admin'; });
    const isCounselor= roles.some(r => { const s = String(r).toLowerCase(); return s === 'role_counselor' || s === 'counselor'; });
    const isParent   = roles.some(r => { const s = String(r).toLowerCase(); return s === 'role_parent' || s === 'parent'; });
    const isRegularUser = !isAdmin && !isCounselor && !isParent;

    useEffect(() => { loadCamps(); }, []);

    async function loadCamps() {
        try {
            setLoading(true);
            setError('');
            const data = await getMyAccessibleCamps();
            setCamps(Array.isArray(data) ? data : []);
        } catch {
            if (!isRegularUser) setError('Не удалось загрузить лагеря');
            setCamps([]);
        } finally {
            setLoading(false);
        }
    }

    // ── Флоу заявки родителя ────────────────────────────────────────────
    async function handleUseCode() {
        if (!inviteCode.trim()) { setStepError('Введите код приглашения'); return; }
        try {
            setSubmitting(true);
            setStepError('');
            const res = await applyInviteCode(inviteCode.trim().toUpperCase());
            setLinkedCampId(res.id);
            try { await refreshTokens(); } catch (_) {}
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

    function handleAddAnother() { setAppForm(EMPTY_APPLICATION); setStepError(''); setStep('application'); }

    function handleCloseModal() {
        setStep(null); setInviteCode(''); setLinkedCampId(null);
        setAppForm(EMPTY_APPLICATION); setStepError('');
        loadCamps();
    }

    // ── Коды приглашений (ADMIN) ────────────────────────────────────────
    async function loadCampCodes(campId) {
        try {
            setLoadingCodes(prev => ({ ...prev, [campId]: true }));
            const codes = await getInviteCodes(campId);
            setCampCodes(prev => ({ ...prev, [campId]: codes }));
        } catch { /* silent */ }
        finally { setLoadingCodes(prev => ({ ...prev, [campId]: false })); }
    }

    // Открыть выбор смены перед генерацией кода
    async function handleGenerateCode(campId, e) {
        e.stopPropagation();
        setPickerCampId(campId);
        setPickerSessions([]);
        setPickerError('');
        setShowSessionPicker(true);
        setLoadingPickerSessions(true);
        try {
            const sessions = await getSessionsByCamp(campId);
            setPickerSessions(Array.isArray(sessions) ? sessions : []);
        } catch {
            setPickerError('Не удалось загрузить смены лагеря');
        } finally {
            setLoadingPickerSessions(false);
        }
    }

    // Генерация кода после выбора смены
    async function handlePickSession(sessionId) {
        setShowSessionPicker(false);
        try {
            await generateInviteCode(pickerCampId, sessionId);
            await loadCampCodes(pickerCampId);
        } catch (err) {
            alert('Не удалось создать код: ' + err.message);
        }
    }

    async function handleDeactivateCode(campId, codeId, e) {
        e.stopPropagation();
        if (!window.confirm('Деактивировать этот код?')) return;
        try {
            await deactivateInviteCode(codeId);
            await loadCampCodes(campId);
        } catch (err) { alert('Ошибка: ' + err.message); }
    }

    function handleCopyCode(code, codeId, e) {
        e.stopPropagation();
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(codeId);
            setTimeout(() => setCopiedCode(null), 2000);
        });
    }

    function handleCampClick(camp) {
        if (isAdmin && !campCodes[camp.id]) loadCampCodes(camp.id);
        navigate(`/camps/${camp.id}/sessions`);
    }

    function handleCreateCamp() {
        if (!isAdmin) { setShowAccessDenied(true); return; }
        setShowCreateModal(true);
    }

    async function handleSubmitCreate(e) {
        e.preventDefault();
        if (!formData.name.trim()) { alert('Введите название лагеря'); return; }
        try {
            setCreating(true);
            await createCamp(formData);
            setShowCreateModal(false);
            setFormData({ name: '', location: '', description: '' });
            loadCamps();
        } catch (err) { alert('Не удалось создать лагерь: ' + err.message); }
        finally { setCreating(false); }
    }

    function getAccessTypeBadge(camp) {
        if (camp.accessType === 'OWNER') return <span className="badge badge-owner">👑 Мой лагерь</span>;
        if (camp.accessType === 'COUNSELOR') return <span className="badge badge-counselor">🎓 Вожатый</span>;
        if (camp.accessType === 'OWNER_AND_COUNSELOR') return (
            <><span className="badge badge-owner">👑 Мой лагерь</span><span className="badge badge-counselor">🎓 Вожатый</span></>
        );
        if (camp.accessType === 'PARENT') return <span className="badge badge-parent">👨‍👩‍👧 Ребёнок здесь</span>;
        return null;
    }

    function getEmptyStateText() {
        if (isAdmin) return 'Создайте свой первый лагерь чтобы начать работу';
        if (isCounselor) return 'Администратор должен назначить вас вожатым в лагерь';
        if (isParent) return 'Ваши дети появятся здесь когда их добавят в отряд';
        return 'Получите код приглашения от организатора и подайте заявку на участие ребёнка';
    }

    function formatDate(d) {
        if (!d) return '';
        return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    if (loading) return (
        <div className="layout"><Sidebar />
            <main className="main-content">
                <div className="loading-spinner"><div className="spinner"></div><p>Загрузка...</p></div>
            </main>
        </div>
    );

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Лагеря</h1>
                        <p className="page-subtitle">
                            {camps.length > 0
                                ? isParent
                                    ? `Лагерей с вашими детьми: ${camps.length}`
                                    : `Найдено лагерей: ${camps.length}`
                                : isRegularUser || isParent
                                    ? 'Подайте заявку по коду от организатора'
                                    : 'У вас пока нет доступных лагерей'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {(isRegularUser || isParent) && (
                            <button className="btn-primary" onClick={() => { setStep('code'); setStepError(''); }}>
                                📋 Оставить заявку
                            </button>
                        )}
                        {isAdmin && (
                            <button className="btn-primary" onClick={handleCreateCamp}>➕ Создать лагерь</button>
                        )}
                    </div>
                </div>

                {error && <div className="error-message"><span>⚠️</span><span>{error}</span></div>}

                {camps.length === 0 && !error ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏕️</div>
                        <h2>{isRegularUser ? 'Добро пожаловать!' : 'Нет доступных лагерей'}</h2>
                        <p>{getEmptyStateText()}</p>
                        {isAdmin && <button className="btn-primary" onClick={handleCreateCamp}>Создать первый лагерь</button>}
                        {(isRegularUser || isParent) && (
                            <button className="btn-primary" onClick={() => { setStep('code'); setStepError(''); }}>
                                📋 Оставить заявку
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="camps-grid">
                        {camps.map(camp => (
                            <div key={camp.id} className="camp-card" onClick={() => handleCampClick(camp)}>
                                <div className="camp-header">
                                    <h3>{camp.name}</h3>
                                    <div className="badges">{getAccessTypeBadge(camp)}</div>
                                </div>
                                {camp.location && (
                                    <div className="camp-location">
                                        <span className="icon">📍</span><span>{camp.location}</span>
                                    </div>
                                )}
                                {camp.description && <p className="camp-description">{camp.description}</p>}

                                {/* Коды приглашений — только для ADMIN */}
                                {isAdmin && (
                                    <div
                                        className="camp-invite-section"
                                        onClick={e => { e.stopPropagation(); if (!campCodes[camp.id]) loadCampCodes(camp.id); }}
                                        style={{ marginTop:'12px', padding:'12px', background:'rgba(255,255,255,0.04)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.07)' }}
                                    >
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                                            <span style={{ fontSize:'12px', color:'var(--text-secondary)', fontWeight:'600' }}>
                                                🔑 Коды для родителей
                                            </span>
                                            <button
                                                onClick={e => handleGenerateCode(camp.id, e)}
                                                style={{ padding:'3px 10px', fontSize:'11px', border:'1px solid rgba(33,150,243,0.4)', borderRadius:'5px', background:'rgba(33,150,243,0.15)', color:'#3C8DFF', cursor:'pointer', fontWeight:'600' }}
                                            >
                                                + Новый код
                                            </button>
                                        </div>

                                        {loadingCodes[camp.id] ? (
                                            <div style={{ fontSize:'12px', color:'var(--text-secondary)', textAlign:'center', padding:'4px' }}>Загрузка...</div>
                                        ) : !campCodes[camp.id] ? (
                                            <div style={{ fontSize:'12px', color:'var(--text-secondary)', textAlign:'center', padding:'4px', cursor:'pointer' }}
                                                 onClick={e => { e.stopPropagation(); loadCampCodes(camp.id); }}>
                                                Нажмите чтобы загрузить коды
                                            </div>
                                        ) : campCodes[camp.id].length === 0 ? (
                                            <div style={{ fontSize:'12px', color:'var(--text-secondary)', textAlign:'center', padding:'4px' }}>
                                                Нет активных кодов
                                            </div>
                                        ) : (
                                            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                                {campCodes[camp.id].map(c => (
                                                    <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.2)', borderRadius:'6px', padding:'6px 10px' }}>
                                                        <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                                                            <span style={{ fontFamily:'monospace', fontSize:'15px', fontWeight:'700', letterSpacing:'2px', color:'#fff' }}>
                                                                {c.code}
                                                            </span>
                                                            {c.sessionId && (
                                                                <span style={{ fontSize:'11px', color:'var(--text-secondary)' }}>
                                                                    Смена: {c.sessionId.slice(0, 8)}…
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display:'flex', gap:'6px' }}>
                                                            <button
                                                                onClick={e => handleCopyCode(c.code, c.id, e)}
                                                                title="Скопировать"
                                                                style={{ padding:'4px 10px', fontSize:'11px', cursor:'pointer', border:'1px solid rgba(76,175,80,0.4)', borderRadius:'5px', background: copiedCode === c.id ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.15)', color: copiedCode === c.id ? '#4CAF50' : '#81C784', transition:'all 0.2s', fontWeight:'600' }}
                                                            >
                                                                {copiedCode === c.id ? '✓ Скопировано' : '📋 Копировать'}
                                                            </button>
                                                            <button
                                                                onClick={e => handleDeactivateCode(camp.id, c.id, e)}
                                                                title="Деактивировать"
                                                                style={{ padding:'4px 8px', fontSize:'12px', cursor:'pointer', border:'1px solid rgba(244,67,54,0.3)', borderRadius:'5px', background:'rgba(244,67,54,0.1)', color:'#ef5350' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="camp-footer">
                                    <button className="btn-secondary btn-sm" onClick={e => { e.stopPropagation(); handleCampClick(camp); }}>
                                        Смотреть смены →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── МОДАЛКА: Выбор смены для кода ── */}
                {showSessionPicker && (
                    <div className="modal-overlay" onClick={() => setShowSessionPicker(false)}>
                        <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>🔑 Выберите смену для кода</h2>
                                <button className="modal-close" onClick={() => setShowSessionPicker(false)}>✕</button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <p style={{ color:'var(--text-secondary)', marginBottom:'16px', fontSize:'14px' }}>
                                    Код будет привязан к конкретной смене. Родитель, использовавший этот код, получит доступ к выбранной смене.
                                </p>

                                {loadingPickerSessions ? (
                                    <div style={{ textAlign:'center', padding:'20px', color:'var(--text-secondary)' }}>
                                        Загрузка смен...
                                    </div>
                                ) : pickerError ? (
                                    <div style={{ color:'var(--error)', padding:'12px', textAlign:'center' }}>
                                        ⚠️ {pickerError}
                                    </div>
                                ) : pickerSessions.length === 0 ? (
                                    <div style={{ textAlign:'center', padding:'20px', color:'var(--text-secondary)' }}>
                                        В этом лагере нет смен. Сначала создайте смену.
                                    </div>
                                ) : (
                                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                                        {pickerSessions.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => handlePickSession(s.id)}
                                                style={{
                                                    display:'flex', flexDirection:'column', alignItems:'flex-start',
                                                    padding:'12px 16px', background:'rgba(255,255,255,0.04)',
                                                    border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px',
                                                    cursor:'pointer', transition:'all 0.2s', textAlign:'left', width:'100%',
                                                    color:'var(--text)'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background='rgba(91,46,255,0.15)'; e.currentTarget.style.borderColor='rgba(91,46,255,0.4)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
                                            >
                                                <span style={{ fontWeight:'600', fontSize:'15px' }}>{s.title || s.name}</span>
                                                {(s.startDate || s.endDate) && (
                                                    <span style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'3px' }}>
                                                        {formatDate(s.startDate)} — {formatDate(s.endDate)}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setShowSessionPicker(false)}>Отмена</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── МОДАЛКА: ШАГ 1 — КОД ── */}
                {step === 'code' && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>📋 Заявка на участие</h2>
                                <button className="modal-close" onClick={handleCloseModal}>✕</button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                                    Введите код приглашения, который вы получили от организатора лагеря на родительском собрании.
                                </p>
                                <div className="form-group">
                                    <label>Код приглашения</label>
                                    <input type="text" value={inviteCode}
                                           onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                           placeholder="Например: CAMP-A3F7K2"
                                           style={{ textTransform:'uppercase', letterSpacing:'2px', fontSize:'18px', textAlign:'center' }}
                                           onKeyDown={e => e.key === 'Enter' && handleUseCode()}
                                           autoFocus />
                                </div>
                                {stepError && <p style={{ color:'var(--error)', marginBottom:'12px' }}>⚠️ {stepError}</p>}
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

                {/* ── МОДАЛКА: ШАГ 2 — АНКЕТА ── */}
                {step === 'application' && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-content modal-content--wide" onClick={e => e.stopPropagation()}
                             style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal-header">
                                <h2>👦 Данные ребёнка</h2>
                                <button className="modal-close" onClick={handleCloseModal}>✕</button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <p style={{ color:'var(--text-secondary)', marginBottom:'20px' }}>
                                    Заполните информацию о ребёнке. Вожатый проверит данные и добавит ребёнка в отряд.
                                </p>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                                    <div className="form-group">
                                        <label>Имя *</label>
                                        <input type="text" value={appForm.firstName}
                                               onChange={e => setAppForm({ ...appForm, firstName: e.target.value })} placeholder="Иван" />
                                    </div>
                                    <div className="form-group">
                                        <label>Фамилия *</label>
                                        <input type="text" value={appForm.lastName}
                                               onChange={e => setAppForm({ ...appForm, lastName: e.target.value })} placeholder="Иванов" />
                                    </div>
                                    <div className="form-group">
                                        <label>Дата рождения *</label>
                                        <input type="date" value={appForm.birthDate}
                                               onChange={e => setAppForm({ ...appForm, birthDate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Пол</label>
                                        <select value={appForm.gender} onChange={e => setAppForm({ ...appForm, gender: e.target.value })}>
                                            {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Город</label>
                                        <input type="text" value={appForm.homeCity}
                                               onChange={e => setAppForm({ ...appForm, homeCity: e.target.value })} placeholder="Москва" />
                                    </div>
                                    <div className="form-group">
                                        <label>Вы приходитесь</label>
                                        <select value={appForm.relation} onChange={e => setAppForm({ ...appForm, relation: e.target.value })}>
                                            {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop:'8px' }}>
                                    <label>Аллергии</label>
                                    <input type="text" value={appForm.allergies}
                                           onChange={e => setAppForm({ ...appForm, allergies: e.target.value })}
                                           placeholder="Например: пыльца, орехи, нет" />
                                </div>
                                <div className="form-group">
                                    <label>Медицинские особенности</label>
                                    <textarea value={appForm.medicalNotes} rows={2}
                                              onChange={e => setAppForm({ ...appForm, medicalNotes: e.target.value })}
                                              placeholder="Хронические заболевания, принимаемые препараты..." />
                                </div>
                                <div className="form-group">
                                    <label>Особые потребности</label>
                                    <textarea value={appForm.specialNeeds} rows={2}
                                              onChange={e => setAppForm({ ...appForm, specialNeeds: e.target.value })}
                                              placeholder="Диета, физические ограничения..." />
                                </div>
                                <div className="form-group">
                                    <label>Поведенческие особенности</label>
                                    <textarea value={appForm.behavioralNotes} rows={2}
                                              onChange={e => setAppForm({ ...appForm, behavioralNotes: e.target.value })}
                                              placeholder="Что важно знать вожатому..." />
                                </div>
                                {stepError && <p style={{ color:'var(--error)', marginTop:'8px' }}>⚠️ {stepError}</p>}
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

                {/* ── МОДАЛКА: ШАГ 3 — УСПЕХ ── */}
                {step === 'success' && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div style={{ padding:'40px', textAlign:'center' }}>
                                <div style={{ fontSize:'64px', marginBottom:'16px' }}>✅</div>
                                <h2 style={{ marginBottom:'12px' }}>Заявка отправлена!</h2>
                                <p style={{ color:'var(--text-secondary)', marginBottom:'28px' }}>
                                    Вожатый рассмотрит заявку и добавит ребёнка в отряд.
                                </p>
                                <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
                                    <button className="btn-secondary" onClick={handleAddAnother}>➕ Добавить ещё ребёнка</button>
                                    <button className="btn-primary" onClick={handleCloseModal}>Готово</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── МОДАЛКА: Создание лагеря ── */}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать новый лагерь</h2>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSubmitCreate}>
                                <div style={{ padding:'24px' }}>
                                    <div className="form-group">
                                        <label htmlFor="name">Название лагеря *</label>
                                        <input id="name" type="text" value={formData.name}
                                               onChange={e => setFormData({ ...formData, name: e.target.value })}
                                               placeholder="Например: Летний лагерь 2026" required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="location">Местоположение</label>
                                        <input id="location" type="text" value={formData.location}
                                               onChange={e => setFormData({ ...formData, location: e.target.value })}
                                               placeholder="Например: Москва, Подмосковье" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="description">Описание</label>
                                        <textarea id="description" value={formData.description}
                                                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                  placeholder="Краткое описание лагеря..." rows="4" />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary"
                                            onClick={() => setShowCreateModal(false)} disabled={creating}>Отмена</button>
                                    <button type="submit" className="btn-primary" disabled={creating}>
                                        {creating ? 'Создание...' : 'Создать лагерь'}
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