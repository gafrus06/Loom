import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { getSession, getSessionContext } from '../services/sessions';
import { getDetachmentsBySession, createDetachment, deleteDetachment } from '../services/detachments';
import Sidebar from '../layouts/Sidebar';
import SuccessModal from '../components/SuccessModal';
import AccessDeniedModal from '../components/AccessDeniedModal';
import ConfirmModal from '../components/ConfirmModal';
import './DetachmentsList.css';

export default function DetachmentsList() {
    const { campId, sessionId } = useParams();
    const navigate = useNavigate();
    const [detachments, setDetachments] = useState([]);
    const [session, setSession] = useState(null);
    const [sessionContext, setSessionContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deletingDetachmentId, setDeletingDetachmentId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showAccessDeniedAlert, setShowAccessDeniedAlert] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        sessionId,
        ageGroup: ''
    });

    const currentUser = getCurrentUser();
    const isCounselor = currentUser?.roles?.some((role) => {
        const value = String(role).toLowerCase();
        return ['role_counselor', 'counselor', 'role_admin', 'admin'].includes(value);
    });

    const canOpenManageShift = Boolean(sessionContext?.canAccessSeniorDashboard);
    const canOpenCampSettings = Boolean(sessionContext?.canOpenCampSettings);

    const showSuccessMessage = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setShowSuccessAlert(true);
    };

    const showAccessDeniedMessage = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setShowAccessDeniedAlert(true);
    };

    useEffect(() => {
        loadData();
    }, [sessionId]);

    async function loadData() {
        try {
            setLoading(true);
            setError('');

            const [sessionData, contextData, detachmentsData] = await Promise.all([
                getSession(sessionId),
                getSessionContext(sessionId).catch(() => null),
                getDetachmentsBySession(sessionId)
            ]);

            setSession(sessionData);
            setSessionContext(contextData);
            setDetachments(Array.isArray(detachmentsData) ? detachmentsData : []);
        } catch (err) {
            console.error('Failed to load detachments:', err);
            showAccessDeniedMessage('Ошибка загрузки', 'Не удалось загрузить отряды');
            setError('Не удалось загрузить отряды');
            setDetachments([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitCreate(event) {
        event.preventDefault();

        if (!formData.name.trim()) {
            showAccessDeniedMessage('Ошибка заполнения', 'Введите название отряда');
            return;
        }

        if (!formData.ageGroup.trim()) {
            showAccessDeniedMessage('Ошибка заполнения', 'Укажите возрастную группу');
            return;
        }

        try {
            setCreating(true);
            await createDetachment(formData);
            setShowCreateModal(false);
            setFormData({ name: '', sessionId, ageGroup: '' });
            showSuccessMessage('Отряд создан', 'Отряд успешно создан');
            loadData();
        } catch (err) {
            console.error('Failed to create detachment:', err);
            showAccessDeniedMessage('Ошибка создания', `Не удалось создать отряд: ${err.message}`);
        } finally {
            setCreating(false);
        }
    }

    function handleDeleteClick(detachmentId, event) {
        event?.stopPropagation();

        if (!isCounselor) {
            showAccessDeniedMessage(
                'Доступ запрещён',
                'Только вожатый или администратор может удалять отряды'
            );
            return;
        }

        setDeletingDetachmentId(detachmentId);
        setShowDeleteConfirm(true);
    }

    async function handleConfirmDelete() {
        if (!deletingDetachmentId) {
            return;
        }

        try {
            await deleteDetachment(deletingDetachmentId);
            setDetachments((prev) => prev.filter((item) => item.id !== deletingDetachmentId));
            setShowDeleteConfirm(false);
            setDeletingDetachmentId(null);
            showSuccessMessage('Отряд удалён', 'Отряд успешно удалён');
        } catch (err) {
            console.error('Failed to delete detachment:', err);
            showAccessDeniedMessage('Ошибка удаления', `Не удалось удалить отряд: ${err.message}`);
        }
    }

    function handleDetachmentClick(detachment) {
        navigate(`/detachments/${detachment.id}`);
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-spinner">
                        <div className="spinner" />
                        <p>Загрузка отрядов...</p>
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
                        <h1>Отряды {session ? `— ${session.title || session.name}` : ''}</h1>
                        <p className="page-subtitle">
                            {detachments.length > 0
                                ? `Найдено отрядов: ${detachments.length}`
                                : 'В этой смене пока нет отрядов'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button className="btn-secondary" onClick={() => navigate(`/camps/${campId}/sessions`)}>
                            Назад к сменам
                        </button>
                        {canOpenCampSettings && (
                            <button className="btn-secondary" onClick={() => navigate(`/camps/${campId}/settings`)}>
                                Настройки лагеря
                            </button>
                        )}
                        {canOpenManageShift && (
                            <button
                                className="btn-secondary"
                                onClick={() => navigate(`/camps/${campId}/sessions/${sessionId}/dashboard`)}
                            >
                                Управлять сменой
                            </button>
                        )}
                        {isCounselor && (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                Создать отряд
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                    </div>
                )}

                {detachments.length === 0 && !error ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h2>Нет отрядов</h2>
                        <p>
                            {isCounselor
                                ? 'Создайте первый отряд для этой смены'
                                : 'Отряды появятся, когда вожатый или администратор их создаст'}
                        </p>
                        {isCounselor && (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                Создать первый отряд
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="detachments-grid">
                        {detachments.map((detachment) => (
                            <div
                                key={detachment.id}
                                className="detachment-card"
                                onClick={() => handleDetachmentClick(detachment)}
                            >
                                {isCounselor && (
                                    <button
                                        className="detachment-delete-btn"
                                        onClick={(event) => handleDeleteClick(detachment.id, event)}
                                        title="Удалить отряд"
                                    >
                                        X
                                    </button>
                                )}

                                <div className="detachment-header">
                                    <h3>{detachment.name}</h3>
                                </div>

                                <div className="detachment-info">
                                    <div className="info-item">
                                        <span className="icon">👶</span>
                                        <span className="info-label">Возраст:</span>
                                        <span className="info-value">{detachment.ageGroup}</span>
                                    </div>

                                    {session && (
                                        <div className="info-item">
                                            <span className="icon">📅</span>
                                            <span className="info-label">Смена:</span>
                                            <span className="info-value">{session.title || session.name}</span>
                                        </div>
                                    )}
                                </div>

                                {detachment.description && (
                                    <p className="detachment-description">{detachment.description}</p>
                                )}

                                <div className="detachment-footer">
                                    <button
                                        className="btn-secondary btn-sm"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleDetachmentClick(detachment);
                                        }}
                                    >
                                        Подробнее →
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
                                <h2>Создать отряд</h2>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCreate}>
                                <div className="form-group">
                                    <label htmlFor="name">Название отряда *</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                        placeholder="Например: Орлята"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="ageGroup">Возрастная группа *</label>
                                    <input
                                        id="ageGroup"
                                        type="text"
                                        value={formData.ageGroup}
                                        onChange={(event) => setFormData({ ...formData, ageGroup: event.target.value })}
                                        placeholder="Например: 10-12"
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
                                        {creating ? 'Создание...' : 'Создать отряд'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    open={showDeleteConfirm}
                    title="Удалить отряд?"
                    message="Это действие нельзя отменить. Все данные отряда будут удалены."
                    confirmLabel="Да, удалить"
                    cancelLabel="Отмена"
                    danger
                    onConfirm={handleConfirmDelete}
                    onCancel={() => {
                        setShowDeleteConfirm(false);
                        setDeletingDetachmentId(null);
                    }}
                />

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
