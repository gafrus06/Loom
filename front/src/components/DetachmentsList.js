import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { getSession } from '../api/sessions';
import { getDetachmentsBySession, createDetachment, deleteDetachment } from '../api/detachments';
import Sidebar from './Sidebar';
import SuccessModal from './SuccessModal'; // Импортируем существующий компонент
import AccessDeniedModal from './AccessDeniedModal'; // Импортируем существующий компонент
import '../styles/badges.css';
import '../styles/detachments.css';
import ConfirmModal from './ConfirmModal';

export default function DetachmentsList() {
    const { campId, sessionId } = useParams();
    const navigate = useNavigate();
    const [detachments, setDetachments] = useState([]);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);

    // Состояния для удаления
    const [deletingDetachmentId, setDeletingDetachmentId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Состояния для алертов
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showAccessDeniedAlert, setShowAccessDeniedAlert] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        sessionId: sessionId,
        ageGroup: ''
    });

    const currentUser = getCurrentUser();
    const isCounselor = currentUser?.roles?.some(r =>
        r === 'ROLE_COUNSELOR' || r.toLowerCase() === 'counselor' ||
        r === 'ROLE_ADMIN' || r.toLowerCase() === 'admin'
    );

    // Функции для показа алертов
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

    const closeSuccessAlert = () => {
        setShowSuccessAlert(false);
        setAlertTitle('');
        setAlertMessage('');
    };

    const closeAccessDeniedAlert = () => {
        setShowAccessDeniedAlert(false);
        setAlertTitle('');
        setAlertMessage('');
    };

    useEffect(() => {
        loadData();
    }, [sessionId]);

    async function loadData() {
        try {
            setLoading(true);
            setError('');

            // Загружаем информацию о смене
            const sessionData = await getSession(sessionId);
            setSession(sessionData);

            // Загружаем отряды этой смены
            const detachmentsData = await getDetachmentsBySession(sessionId);
            setDetachments(Array.isArray(detachmentsData) ? detachmentsData : []);
        } catch (err) {
            console.error('Failed to load data:', err);
            showAccessDeniedMessage('Ошибка загрузки', 'Не удалось загрузить отряды');
            setError('Не удалось загрузить отряды');
            setDetachments([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitCreate(e) {
        e.preventDefault();

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
            setFormData({ name: '', sessionId: sessionId, ageGroup: '' });

            showSuccessMessage('Отряд создан', 'Отряд успешно создан');
            loadData();
        } catch (err) {
            console.error('Failed to create detachment:', err);
            showAccessDeniedMessage('Ошибка создания', `Не удалось создать отряд: ${err.message}`);
        } finally {
            setCreating(false);
        }
    }

    // Функции для удаления отряда
    const handleDeleteClick = (detachmentId, e) => {
        e?.stopPropagation();

        if (!isCounselor) {
            showAccessDeniedMessage(
                'Доступ запрещен',
                'Только вожатый или администратор может удалять отряды'
            );
            return;
        }

        setDeletingDetachmentId(detachmentId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingDetachmentId) return;

        try {
            await deleteDetachment(deletingDetachmentId);

            // Удаляем отряд из списка
            setDetachments(prev => prev.filter(d => d.id !== deletingDetachmentId));

            setShowDeleteConfirm(false);
            setDeletingDetachmentId(null);

            showSuccessMessage('Отряд удален', 'Отряд успешно удалён');
        } catch (err) {
            console.error('Failed to delete detachment:', err);
            showAccessDeniedMessage(
                'Ошибка удаления',
                `Не удалось удалить отряд: ${err.message}`
            );
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeletingDetachmentId(null);
    };

    function handleDetachmentClick(detachment) {
        navigate(`/detachments/${detachment.id}`);
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
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
                        <h1>Отряды {session && `— ${session.title || session.name}`}</h1>
                        <p className="page-subtitle">
                            {detachments.length > 0
                                ? `Найдено отрядов: ${detachments.length}`
                                : 'В этой смене пока нет отрядов'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => navigate(`/camps/${campId}/sessions`)}
                        >
                            Назад к сменам
                        </button>
                        {isCounselor && (
                            <button
                                className="btn-primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                ➕ Создать отряд
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <span>⚠️</span>
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
                                : 'Отряды появятся когда вожатый их создаст'}
                        </p>
                        {isCounselor && (
                            <button
                                className="btn-primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                Создать первый отряд
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="detachments-grid">
                        {detachments.map(detachment => (
                            <div
                                key={detachment.id}
                                className="detachment-card"
                                onClick={() => handleDetachmentClick(detachment)}
                            >
                                {isCounselor && (
                                    <button
                                        className="detachment-delete-btn"
                                        onClick={(e) => handleDeleteClick(detachment.id, e)}
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
                                    <p className="detachment-description">
                                        {detachment.description}
                                    </p>
                                )}

                                <div className="detachment-footer">
                                    <button
                                        className="btn-secondary btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
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

                {/* Модальное окно создания отряда */}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать отряд</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCreate}>
                                <div className="form-group">
                                    <label htmlFor="name">Название отряда *</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Например: Солнышко, Орлята"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="ageGroup">Возрастная группа *</label>
                                    <input
                                        id="ageGroup"
                                        type="text"
                                        value={formData.ageGroup}
                                        onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                                        placeholder="Например: 7-9, 10-12, 13-15"
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
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={creating}
                                    >
                                        {creating ? 'Создание...' : 'Создать отряд'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Подтверждение удаления отряда */}
                <ConfirmModal
                    open={showDeleteConfirm}
                    title="Удалить отряд?"
                    message="Это действие невозможно отменить. Все данные отряда будут удалены."
                    confirmLabel="Да, удалить"
                    cancelLabel="Отмена"
                    danger
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                />

                {/* Кастомные алерты */}
                <SuccessModal
                    isOpen={showSuccessAlert}
                    onClose={closeSuccessAlert}
                    title={alertTitle}
                    message={alertMessage}
                />

                <AccessDeniedModal
                    isOpen={showAccessDeniedAlert}
                    onClose={closeAccessDeniedAlert}
                    title={alertTitle}
                    message={alertMessage}
                />
            </main>
        </div>
    );
}