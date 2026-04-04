import React, { useCallback, useEffect, useState } from 'react';
import {
    getUserCampInfo,
    leaveCamp,
    assignCounselorToCamp,
    removeCounselorFromCamp
} from '../services/campMembers';
import { getCamp, getMyCamps } from '../services/camps';
import { getSessionsByCamp, getSession } from '../services/sessions';
import ConfirmModal from './ConfirmModal';
import './CampMembershipWidget.css';

function SessionNames({ sessionIds }) {
    const [names, setNames] = useState({});
    const sessionIdsKey = Array.isArray(sessionIds) ? sessionIds.join(',') : '';

    useEffect(() => {
        let cancelled = false;

        async function loadNames() {
            const entries = await Promise.all(
                sessionIds.map(async (id) => {
                    try {
                        const session = await getSession(id);
                        return [id, session.title || session.name || 'Смена'];
                    } catch {
                        return [id, `Смена ${id.slice(0, 6)}...`];
                    }
                })
            );

            if (!cancelled) {
                setNames(Object.fromEntries(entries));
            }
        }

        loadNames();

        return () => {
            cancelled = true;
        };
    }, [sessionIds, sessionIdsKey]);

    return (
        <div className="membership-sessions">
            <span className="sessions-label">Смены:</span>
            <div className="sessions-chips">
                {sessionIds.map((sid) => (
                    <span key={sid} className="session-chip">
                        {names[sid] || '...'}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function CampMembershipWidget({ user, isOwnProfile, currentUser }) {
    const [campMembership, setCampMembership] = useState(null);
    const [canRemoveCounselor, setCanRemoveCounselor] = useState(false);
    const [myCamps, setMyCamps] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedCamp, setSelectedCamp] = useState('');
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const isAdmin = currentUser?.roles?.some((role) => {
        const normalized = String(role).toLowerCase();
        return normalized === 'role_admin' || normalized === 'admin';
    });

    const isCounselor = user?.roles?.some((role) => {
        const normalized = String(role).toLowerCase();
        return normalized === 'role_counselor' || normalized === 'counselor';
    });

    const resetAssignForm = useCallback(() => {
        setSelectedCamp('');
        setSelectedSessions([]);
        setSessions([]);
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            if (isCounselor) {
                const membership = await getUserCampInfo(user.id);
                const counselorMembership = membership?.role === 'COUNSELOR' ? membership : null;
                setCampMembership(counselorMembership);

                if (isAdmin && counselorMembership?.campId && currentUser?.id) {
                    const camp = await getCamp(counselorMembership.campId).catch(() => null);
                    setCanRemoveCounselor(Boolean(camp?.ownerId && camp.ownerId === currentUser.id));
                } else {
                    setCanRemoveCounselor(false);
                }
            } else {
                setCampMembership(null);
                setCanRemoveCounselor(false);
            }

            if (isAdmin && !isOwnProfile && isCounselor) {
                const camps = await getMyCamps();
                setMyCamps(camps || []);
            } else {
                setMyCamps([]);
            }
        } catch {
            setError('Не удалось загрузить данные о лагере и членстве.');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, isAdmin, isCounselor, isOwnProfile, user.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleCampChange(campId) {
        setSelectedCamp(campId);
        setSelectedSessions([]);
        setSessions([]);

        if (!campId) {
            return;
        }

        setLoadingSessions(true);
        try {
            const data = await getSessionsByCamp(campId);
            setSessions(data || []);
        } catch {
            setError('Не удалось загрузить смены лагеря.');
        } finally {
            setLoadingSessions(false);
        }
    }

    function toggleSession(sessionId) {
        setSelectedSessions((prev) =>
            prev.includes(sessionId)
                ? prev.filter((id) => id !== sessionId)
                : [...prev, sessionId]
        );
    }

    async function handleLeaveCamp() {
        setConfirmLeave(false);
        try {
            await leaveCamp();
            setCampMembership(null);
            setSuccessMessage('');
            await loadData();
        } catch {
            setError('Не удалось выйти из лагеря.');
        }
    }

    async function handleRemoveCounselor() {
        setConfirmRemove(false);

        if (!campMembership?.campId) {
            setError('Не удалось определить лагерь для удаления.');
            return;
        }

        try {
            await removeCounselorFromCamp(campMembership.campId, user.id);
            setCampMembership(null);
            setSuccessMessage('');
            await loadData();
        } catch {
            setError('Не удалось выгнать вожатого из лагеря.');
        }
    }

    async function handleAssignToCamp(event) {
        event.preventDefault();

        if (!selectedCamp) {
            setError('Выберите лагерь.');
            return;
        }

        if (selectedSessions.length === 0) {
            setError('Выберите хотя бы одну смену.');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccessMessage('');

        try {
            await assignCounselorToCamp(selectedCamp, user.id, selectedSessions);
            setShowAssignModal(false);
            resetAssignForm();
            setSuccessMessage('');
            await loadData();
        } catch (err) {
            setError(err.message || 'Не удалось назначить вожатого.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="camp-membership-widget loading">Загрузка...</div>;
    }

    if (!isCounselor) {
        return null;
    }

    return (
        <div className="camp-membership-widget">
            <h3>Членство в лагере</h3>

            {error && <div className="error-message">{error}</div>}

            {successMessage && (
                <div
                    className="membership-card"
                    style={{ marginBottom: '16px', borderColor: '#2e7d32', background: '#f1fff3' }}
                >
                    {successMessage}
                </div>
            )}

            {campMembership ? (
                <div className="membership-info">
                    <div className="membership-card">
                        <div className="membership-badge">Прикреплен к лагерю</div>
                        <h4>{campMembership.campName}</h4>
                        <p className="membership-role">Вожатый</p>
                        {campMembership.sessionIds?.length > 0 && (
                            <SessionNames sessionIds={campMembership.sessionIds} />
                        )}
                    </div>

                    {isOwnProfile && (
                        <button className="btn-danger" onClick={() => setConfirmLeave(true)}>
                            Выйти из лагеря
                        </button>
                    )}

                    {canRemoveCounselor && (
                        <button className="btn-danger" onClick={() => setConfirmRemove(true)}>
                            Выгнать из лагеря
                        </button>
                    )}
                </div>
            ) : (
                <div className="no-membership">
                    <p className="warning-text">Вожатый не прикреплен к лагерю</p>
                    <p className="hint-text">
                        Решение по приглашению принимается во вкладке уведомлений.
                    </p>

                    {isAdmin && (
                        <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
                            Отправить приглашение
                        </button>
                    )}
                </div>
            )}

            {showAssignModal && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content-styled cm-assign-modal" onClick={(e) => e.stopPropagation()}>
                        <div
                            className="modal-header-gradient"
                            style={{ background: 'linear-gradient(135deg, #5B2EFF, #3C8DFF)' }}
                        >
                            <h2>Пригласить вожатого в лагерь</h2>
                            <button className="modal-close-btn" onClick={() => setShowAssignModal(false)}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleAssignToCamp} className="cm-assign-form">
                            <div className="form-group-compact">
                                <label>Лагерь *</label>
                                <select
                                    value={selectedCamp}
                                    onChange={(e) => handleCampChange(e.target.value)}
                                    required
                                >
                                    <option value="">Выберите лагерь</option>
                                    {myCamps.map((camp) => (
                                        <option key={camp.id} value={camp.id}>
                                            {camp.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedCamp && (
                                <div className="form-group-compact">
                                    <label>Смены * (можно выбрать несколько)</label>

                                    {loadingSessions ? (
                                        <div className="cm-sessions-loading">Загрузка смен...</div>
                                    ) : sessions.length === 0 ? (
                                        <div className="cm-sessions-empty">В этом лагере пока нет смен</div>
                                    ) : (
                                        <div className="cm-sessions-list">
                                            {sessions.map((session) => (
                                                <label key={session.id} className="cm-session-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSessions.includes(session.id)}
                                                        onChange={() => toggleSession(session.id)}
                                                    />
                                                    <span className="cm-session-name">
                                                        {session.title}
                                                        <span className="cm-session-dates">
                                                            {session.startDate} - {session.endDate}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    <span className="cm-hint">
                                        Вожатому придет уведомление, и он вступит в лагерь только после подтверждения.
                                    </span>
                                </div>
                            )}

                            {error && <div className="error-message">{error}</div>}

                            <div className="modal-actions-compact">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        resetAssignForm();
                                    }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-submit"
                                    disabled={submitting || !selectedCamp || selectedSessions.length === 0}
                                >
                                    {submitting ? 'Отправка...' : 'Отправить приглашение'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirmLeave}
                title="Выйти из лагеря?"
                message="Вы больше не будете прикреплены к лагерю и потеряете доступ к связанным данным."
                confirmLabel="Выйти"
                cancelLabel="Отмена"
                danger
                onConfirm={handleLeaveCamp}
                onCancel={() => setConfirmLeave(false)}
            />

            <ConfirmModal
                open={confirmRemove}
                title="Выгнать вожатого из лагеря?"
                message="Вожатый будет удален из лагеря и потеряет доступ к связанным данным."
                confirmLabel="Выгнать"
                cancelLabel="Отмена"
                danger
                onConfirm={handleRemoveCounselor}
                onCancel={() => setConfirmRemove(false)}
            />
        </div>
    );
}
