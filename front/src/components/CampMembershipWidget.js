// src/components/CampMembershipWidget.js
import React, { useState, useEffect } from 'react';
import {
    getUserCampInfo,
    leaveCamp,
    assignCounselorToCamp,
    removeCounselorFromCamp
} from '../api/campMembers';
import { getMyCamps } from '../api/camps';
import { getSessionsByCamp } from '../api/sessions';
import { authFetch } from '../api/auth';
import { getSession } from '../api/sessions';
import ConfirmModal from './ConfirmModal';
import '../styles/camp-membership.css';
// Загружает и показывает названия смен по их ID
function SessionNames({ sessionIds }) {
    const [names, setNames] = React.useState({});
    React.useEffect(() => {
        sessionIds.forEach(async (id) => {
            try {
                const s = await getSession(id);
                setNames(prev => ({ ...prev, [id]: s.title || s.name || `Смена` }));
            } catch {
                setNames(prev => ({ ...prev, [id]: `Смена ${id.slice(0, 6)}…` }));
            }
        });
    }, [sessionIds.join(',')]);

    return (
        <div className="membership-sessions">
            <span className="sessions-label">Смены:</span>
            <div className="sessions-chips">
                {sessionIds.map(sid => (
                    <span key={sid} className="session-chip">
                        {names[sid] || '...'}
                    </span>
                ))}
            </div>
        </div>
    );
}


const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:12717/api';

export default function CampMembershipWidget({ user, isOwnProfile, currentUser }) {
    const [campMembership, setCampMembership] = useState(null);
    const [myCamps, setMyCamps] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedCamp, setSelectedCamp] = useState('');
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const isAdmin = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_admin' || s === 'admin';
    });
    const isCounselor = user?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_counselor' || s === 'counselor';
    });
    const isCurrentUserCounselor = currentUser?.roles?.some(r => {
        const s = String(r).toLowerCase();
        return s === 'role_counselor' || s === 'counselor';
    });

    useEffect(() => { loadData(); }, [user.id]);

    async function loadData() {
        try {
            setLoading(true);
            if (isCounselor) {
                const membership = await getUserCampInfo(user.id);
                setCampMembership(membership?.role === 'COUNSELOR' ? membership : null);
            }
            if (isAdmin && !isOwnProfile && isCounselor) {
                const camps = await getMyCamps();
                setMyCamps(camps);
            }
        } catch {
            setError('Не удалось загрузить данные о членстве');
        } finally {
            setLoading(false);
        }
    }

    // При выборе лагеря — загружаем его смены
    async function handleCampChange(campId) {
        setSelectedCamp(campId);
        setSelectedSessions([]);
        setSessions([]);
        if (!campId) return;
        setLoadingSessions(true);
        try {
            const data = await getSessionsByCamp(campId);
            setSessions(data || []);
        } catch {
            setError('Не удалось загрузить смены лагеря');
        } finally {
            setLoadingSessions(false);
        }
    }

    function toggleSession(sessionId) {
        setSelectedSessions(prev =>
            prev.includes(sessionId)
                ? prev.filter(id => id !== sessionId)
                : [...prev, sessionId]
        );
    }

    async function handleLeaveCamp() {
        setConfirmLeave(false);
        try {
            await leaveCamp();
            setCampMembership(null);
            setError('');
            await loadData();
        } catch { setError('Не удалось выйти из лагеря'); }
    }

    async function handleRemoveCounselor() {
        setConfirmRemove(false);
        if (!campMembership?.campId) { setError('Нет информации о членстве'); return; }
        try {
            await removeCounselorFromCamp(campMembership.campId, user.id);
            setCampMembership(null);
            setError('');
            await loadData();
        } catch { setError('Не удалось выгнать вожатого'); }
    }

    async function handleAssignToCamp(e) {
        e.preventDefault();
        if (!selectedCamp) { setError('Выберите лагерь'); return; }
        if (selectedSessions.length === 0) { setError('Выберите хотя бы одну смену'); return; }
        setSubmitting(true);
        setError('');
        try {
            // Новый эндпоинт принимает campId + userId + sessionIds[]
            const res = await authFetch(`${API_BASE}/camp-members/assign`, {
                method: 'POST',
                body: JSON.stringify({
                    campId: selectedCamp,
                    userId: user.id,
                    sessionIds: selectedSessions
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Не удалось назначить вожатого');
            }
            const membership = await res.json();
            setCampMembership(membership);
            setShowAssignModal(false);
            setSelectedCamp('');
            setSelectedSessions([]);
            setSessions([]);
            await loadData();
        } catch (err) {
            setError(err.message || 'Не удалось назначить вожатого');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="camp-membership-widget loading">Загрузка...</div>;
    if (!isCounselor) return null;

    return (
        <div className="camp-membership-widget">
            <h3>Членство в лагере</h3>
            {error && <div className="error-message">{error}</div>}

            {campMembership ? (
                <div className="membership-info">
                    <div className="membership-card">
                        <div className="membership-badge">✓ Прикреплён к лагерю</div>
                        <h4>{campMembership.campName}</h4>
                        <p className="membership-role">Вожатый</p>
                        {/* Смены вожатого */}
                        {campMembership.sessionIds?.length > 0 && (
                            <SessionNames sessionIds={campMembership.sessionIds} />
                        )}
                    </div>
                    {isOwnProfile && isCurrentUserCounselor && (
                        <button className="btn-danger" onClick={() => setConfirmLeave(true)}>
                            Выйти из лагеря
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn-danger" onClick={() => setConfirmRemove(true)}>
                            Выгнать из лагеря
                        </button>
                    )}
                </div>
            ) : (
                <div className="no-membership">
                    <p className="warning-text">⚠️ Вожатый не прикреплён к лагерю</p>
                    <p className="hint-text">Без прикрепления к лагерю невозможно создавать отряды</p>
                    {isAdmin && (
                        <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
                            Назначить в лагерь
                        </button>
                    )}
                </div>
            )}

            {/* ── Модалка назначения (лагерь + смены) ── */}
            {showAssignModal && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content-styled cm-assign-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-gradient"
                             style={{ background: 'linear-gradient(135deg, #5B2EFF, #3C8DFF)' }}>
                            <h2>Назначить вожатого в лагерь</h2>
                            <button className="modal-close-btn" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAssignToCamp} className="cm-assign-form">
                            {/* Выбор лагеря */}
                            <div className="form-group-compact">
                                <label>Лагерь *</label>
                                <select
                                    value={selectedCamp}
                                    onChange={e => handleCampChange(e.target.value)}
                                    required
                                >
                                    <option value="">— выберите лагерь —</option>
                                    {myCamps.map(camp => (
                                        <option key={camp.id} value={camp.id}>{camp.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Выбор смен */}
                            {selectedCamp && (
                                <div className="form-group-compact">
                                    <label>Смены * (можно выбрать несколько)</label>
                                    {loadingSessions ? (
                                        <div className="cm-sessions-loading">Загрузка смен...</div>
                                    ) : sessions.length === 0 ? (
                                        <div className="cm-sessions-empty">В этом лагере нет смен</div>
                                    ) : (
                                        <div className="cm-sessions-list">
                                            {sessions.map(s => (
                                                <label key={s.id} className="cm-session-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSessions.includes(s.id)}
                                                        onChange={() => toggleSession(s.id)}
                                                    />
                                                    <span className="cm-session-name">
                                                        {s.title}
                                                        <span className="cm-session-dates">
                                                            {s.startDate} — {s.endDate}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    <span className="cm-hint">
                                        Вожатый будет иметь доступ только к выбранным сменам
                                    </span>
                                </div>
                            )}

                            {error && <div className="error-message">{error}</div>}

                            <div className="modal-actions-compact">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => { setShowAssignModal(false); setSelectedCamp(''); setSelectedSessions([]); setSessions([]); }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    disabled={submitting || !selectedCamp || selectedSessions.length === 0}
                                >
                                    {submitting ? 'Назначение...' : 'Назначить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirmLeave}
                title="Выйти из лагеря?"
                message="Вы будете откреплены от лагеря и сняты со всех отрядов."
                confirmLabel="Выйти"
                cancelLabel="Отмена"
                danger
                onConfirm={handleLeaveCamp}
                onCancel={() => setConfirmLeave(false)}
            />

            <ConfirmModal
                open={confirmRemove}
                title="Выгнать вожатого?"
                message="Вожатый будет удалён из лагеря и снят со всех отрядов."
                confirmLabel="Выгнать"
                cancelLabel="Отмена"
                danger
                onConfirm={handleRemoveCounselor}
                onCancel={() => setConfirmRemove(false)}
            />
        </div>
    );
}