import React, { useState, useEffect } from 'react';
import '../styles/MethodologyPanel.css';
import { methodologyAPI } from '../api/methodology';

const MethodologyPanel = ({ detachmentId, currentStage, ageGroup }) => {
    const [activeTab, setActiveTab] = useState('games');
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    // Состояния для локального кэширования (как fallback, если бэкенд не поддерживает)
    const [readMaterials, setReadMaterials] = useState(() => {
        const saved = localStorage.getItem(`methodology_read_${detachmentId}`);
        return saved ? JSON.parse(saved) : {};
    });

    const [favorites, setFavorites] = useState([]);

    // Маппинг типов для бэкенда
    const typeMapping = {
        'games': 'GAME',
        'campfires': 'CAMPFIRE',
        'exercises': 'EXERCISE',
        'physiological': 'PHYSIOLOGICAL'
    };

    const tabs = [
        { id: 'games', label: 'Игры', emoji: '🎮', icon: '🎲' },
        { id: 'campfires', label: 'Огоньки', emoji: '🔥', icon: '🕯️' },
        { id: 'exercises', label: 'Упражнения', emoji: '🤸', icon: '⚽' },
        { id: 'physiological', label: 'Физиология', emoji: '🧬', icon: '❤️' }
    ];

    // Загрузка материалов при смене вкладки или этапа
    useEffect(() => {
        loadMaterials();
    }, [activeTab, currentStage, detachmentId]);

    // Загрузка рекомендаций при смене этапа
    useEffect(() => {
        loadRecommendations();
    }, [currentStage, detachmentId]);

    // Сохранение локального кэша (только как fallback)
    useEffect(() => {
        localStorage.setItem(`methodology_read_${detachmentId}`, JSON.stringify(readMaterials));
    }, [readMaterials, detachmentId]);

    const loadMaterials = async () => {
        setLoading(true);
        setError(null);

        try {
            let data = [];


            switch (activeTab) {
                case 'games':
                    data = await methodologyAPI.getGames(detachmentId, currentStage);
                    break;
                case 'campfires':
                    data = await methodologyAPI.getCampfires(detachmentId, currentStage);
                    break;
                case 'exercises':
                    data = await methodologyAPI.getExercises(detachmentId, currentStage);
                    break;
                case 'physiological':
                    // Преобразуем возрастную группу в формат для БД
                    const mappedAgeGroup = mapAgeGroup(ageGroup);
                    data = await methodologyAPI.getPhysiologicalFeatures(mappedAgeGroup);
                    break;
                default:
                    data = [];
            }

            setMaterials(data);

            // Если данные пришли с бэкенда, обновляем локальный кэш прочитанных
            if (data.length > 0 && data[0].isUsed !== undefined) {
                const readState = {};
                data.forEach(m => {
                    if (m.isUsed) {
                        readState[`${activeTab}_${m.id}`] = {
                            id: m.id,
                            title: m.title,
                            type: activeTab,
                            readAt: m.lastUsedAt || new Date().toISOString(),
                            stage: currentStage
                        };
                    }
                });
                setReadMaterials(prev => ({ ...prev, ...readState }));
            }
        } catch (err) {
            setError('Не удалось загрузить материалы.');
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    };

// Функция для маппинга возрастной группы
    const mapAgeGroup = (ageGroup) => {
        if (!ageGroup) return '8-10'; // значение по умолчанию

        // Если приходит строка вида "12-14" или "12"

        // Пробуем извлечь числа из строки
        const numbers = ageGroup.match(/\d+/g);
        if (!numbers || numbers.length === 0) return '8-10';

        const age = parseInt(numbers[0]);

        // Маппинг возраста в группы
        if (age <= 7) return '5-7';
        if (age <= 10) return '8-10';
        if (age <= 13) return '11-13';
        if (age >= 14) return '14-17';

        return '8-10'; // значение по умолчанию
    };

    const loadRecommendations = async () => {
        setLoadingRecommendations(true);
        try {
            const data = await methodologyAPI.getRecommendedForStage(detachmentId, currentStage);
            setRecommendations(data);
        } catch (err) {
            // Не показываем ошибку пользователю для рекомендаций
        } finally {
            setLoadingRecommendations(false);
        }
    };

    const handleMaterialClick = (material) => {
        setSelectedMaterial(material);
    };

    const handleCloseDetails = () => {
        setSelectedMaterial(null);
    };

    const toggleReadStatus = async (material, e) => {
        e?.stopPropagation();

        const materialKey = `${activeTab}_${material.id}`;
        const isCurrentlyRead = !!readMaterials[materialKey];

        try {
            if (!isCurrentlyRead) {
                // Отмечаем как прочитанное на бэкенде
                await methodologyAPI.markAsUsed(
                    detachmentId,
                    material.id,
                    typeMapping[activeTab],
                    currentStage,
                    'Отмечено как прочитанное'
                );
            }

            // Обновляем локальное состояние
            setReadMaterials(prev => {
                const newState = { ...prev };
                if (isCurrentlyRead) {
                    delete newState[materialKey];
                } else {
                    newState[materialKey] = {
                        id: material.id,
                        title: material.title,
                        type: activeTab,
                        readAt: new Date().toISOString(),
                        stage: currentStage
                    };
                }
                return newState;
            });

            // Обновляем материал в списке (если пришел с бэкенда с флагом used)
            if (material.isUsed !== undefined) {
                setMaterials(prev =>
                    prev.map(m =>
                        m.id === material.id
                            ? { ...m, isUsed: !isCurrentlyRead }
                            : m
                    )
                );
            }
        } catch (err) { }
    };

    const isMaterialRead = (material) => {
        // Сначала проверяем флаг с бэкенда, если есть
        if (material.isUsed !== undefined) {
            return material.isUsed;
        }
        // Иначе проверяем локальный кэш
        return !!readMaterials[`${activeTab}_${material.id}`];
    };

    const getReadCount = () => {
        return Object.keys(readMaterials).length;
    };

    const handleRecommendationClick = (rec) => {
        setActiveTab(rec.type === 'game' ? 'games' :
            rec.type === 'campfire' ? 'campfires' :
                rec.type === 'exercise' ? 'exercises' : activeTab);

        // Загружаем полную информацию о материале
        loadMaterialDetails(rec.id);
    };

    const loadMaterialDetails = async (materialId) => {
        try {
            // Здесь нужно будет добавить эндпоинт для получения материала по ID
            // Пока используем то, что есть в списке
            const material = materials.find(m => m.id === materialId);
            if (material) {
                setSelectedMaterial(material);
            }
        } catch (err) { }
    };

    const clearAllFavorites = async () => {
        const toDelete = [...favorites];
        setFavorites([]); // оптимистичное обновление
        await Promise.allSettled(
            toDelete.map(fav =>
                methodologyAPI.removeFromFavorites(detachmentId, fav.id, typeMapping[fav.tab])
                    .catch(() => {})
            )
        );
    };

    const toggleFavorite = async (material, e) => {
        e.stopPropagation();
        const materialKey = `${activeTab}_${material.id}`;
        const isFav = favorites.some(fav => fav.key === materialKey);

        try {
            if (isFav) {
                await methodologyAPI.removeFromFavorites(
                    detachmentId,
                    material.id,
                    typeMapping[activeTab]
                );
            } else {
                await methodologyAPI.addToFavorites(
                    detachmentId,
                    material.id,
                    typeMapping[activeTab]
                );
            }

            setFavorites(prev => {
                if (isFav) {
                    return prev.filter(fav => fav.key !== materialKey);
                } else {
                    return [...prev, { key: materialKey, tab: activeTab, ...material }];
                }
            });
        } catch (err) { }
    };

    const loadFavorites = async () => {
        try {
            const allTabs = ['games', 'campfires', 'exercises', 'physiological'];
            const results = await Promise.all(
                allTabs.map(tab =>
                    methodologyAPI.getFavorites(detachmentId, typeMapping[tab])
                        .then(favs => favs.map(f => ({ key: `${tab}_${f.id}`, tab, ...f })))
                        .catch(() => [])
                )
            );
            setFavorites(results.flat());
        } catch (err) { }
    };

    // Загружаем избранное при монтировании
    useEffect(() => {
        if (detachmentId) loadFavorites();
    }, [detachmentId]);

    const isFavorite = (material) => {
        return favorites.some(fav => fav.key === `${activeTab}_${material.id}`);
    };

    const getTabIcon = (tabId) => {
        const tab = tabs.find(t => t.id === tabId);
        return tab ? tab.emoji : '📁';
    };

    const renderMaterialCard = (material) => {
        const isFav = isFavorite(material);
        const isRead = isMaterialRead(material);

        return (
            <div
                key={material.id}
                className={`methodology-card ${isRead ? 'read' : ''}`}
                onClick={() => handleMaterialClick(material)}
            >
                <div className="card-header">
                    <h4>{material.title}</h4>
                    <div className="card-actions">
                        {isRead && <span className="read-badge" title="Прочитано">✓</span>}
                        <button
                            className={`favorite-btn ${isFav ? 'active' : ''}`}
                            onClick={(e) => toggleFavorite(material, e)}
                            title={isFav ? 'Удалить из избранного' : 'Добавить в избранное'}
                        >
                            {isFav ? '★' : '☆'}
                        </button>
                    </div>
                </div>

                {activeTab === 'games' && (
                    <div className="card-meta">
                        <span className="meta-item">⏱️ {material.duration}</span>
                        <span className="meta-item">👥 {material.players}</span>
                    </div>
                )}

                {activeTab === 'campfires' && (
                    <div className="card-meta">
                        <span className="meta-item">⏱️ {material.duration}</span>
                        <span className="meta-item">🎭 {material.form}</span>
                    </div>
                )}

                {activeTab === 'exercises' && (
                    <div className="card-meta">
                        <span className="meta-item">⏱️ {material.duration}</span>
                        <span className={`meta-item difficulty-${material.difficulty?.toLowerCase()}`}>
                            {material.difficulty}
                        </span>
                    </div>
                )}

                <p className="card-description">{material.description}</p>

                {activeTab === 'physiological' && material.recommendations && (
                    <p className="card-recommendations">
                        <strong>Рекомендации:</strong> {material.recommendations}
                    </p>
                )}
            </div>
        );
    };

    const renderMaterialDetails = () => {
        if (!selectedMaterial) return null;

        const material = selectedMaterial;
        const currentTab = activeTab;
        const isRead = isMaterialRead(material);
        const isFav = isFavorite(material);

        return (
            <div className="material-details-overlay" onClick={handleCloseDetails}>
                <div className="material-details-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-btn" onClick={handleCloseDetails}>✕</button>

                    <div className="details-header">
                        <span className="details-emoji">{getTabIcon(currentTab)}</span>
                        <h2>{material.title}</h2>
                        {isRead && <span className="read-badge-large">Прочитано ✓</span>}
                    </div>

                    <div className="details-content">
                        {currentTab === 'games' && (
                            <>
                                <div className="details-section">
                                    <h3>Описание</h3>
                                    <p>{material.description}</p>
                                </div>

                                <div className="details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">⏱️ Время:</span>
                                        <span className="detail-value">{material.duration}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">👥 Участников:</span>
                                        <span className="detail-value">{material.players}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">🎯 Цель:</span>
                                        <span className="detail-value">{material.purpose}</span>
                                    </div>
                                    <div className="detail-item full-width">
                                        <span className="detail-label">📦 Материалы:</span>
                                        <span className="detail-value">{material.materials}</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {currentTab === 'campfires' && (
                            <>
                                <div className="details-section">
                                    <h3>Описание</h3>
                                    <p>{material.description}</p>
                                </div>

                                <div className="details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">⏱️ Время:</span>
                                        <span className="detail-value">{material.duration}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">🎭 Форма:</span>
                                        <span className="detail-value">{material.form}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">✨ Атмосфера:</span>
                                        <span className="detail-value">{material.atmosphere}</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {currentTab === 'exercises' && (
                            <>
                                <div className="details-section">
                                    <h3>Описание</h3>
                                    <p>{material.description}</p>
                                </div>

                                <div className="details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">⏱️ Время:</span>
                                        <span className="detail-value">{material.duration}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">📊 Сложность:</span>
                                        <span className="detail-value">{material.difficulty}</span>
                                    </div>
                                    <div className="detail-item full-width">
                                        <span className="detail-label">💪 Эффект:</span>
                                        <span className="detail-value">{material.effect}</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {currentTab === 'physiological' && (
                            <>
                                <div className="details-section">
                                    <h3>Описание</h3>
                                    <p>{material.description}</p>
                                </div>

                                <div className="details-section">
                                    <h3>Рекомендации</h3>
                                    <p>{material.recommendations}</p>
                                </div>
                            </>
                        )}

                        {/* Информация об использовании с бэкенда */}
                        {material.lastUsedAt && (
                            <div className="details-section usage-info">
                                <h3>📊 Статистика использования</h3>
                                <p>
                                    <strong>Последнее использование:</strong>{' '}
                                    {new Date(material.lastUsedAt).toLocaleDateString('ru-RU')}
                                </p>
                                <p>
                                    <strong>Всего использований:</strong>{' '}
                                    {material.usageCount || 1}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="details-actions">
                        <button
                            className={`action-btn ${isRead ? 'secondary' : 'primary'}`}
                            onClick={(e) => toggleReadStatus(material, e)}
                        >
                            {isRead ? '✓ Отметить как непрочитанное' : '✓ Отметить как прочитанное'}
                        </button>
                        <button
                            className="action-btn secondary"
                            onClick={(e) => toggleFavorite(material, e)}
                        >
                            {isFav ? '★ В избранном' : '☆ В избранное'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="methodology-panel-enhanced">
            <div className="methodology-header">
                <div className="header-title">
                    <h3>📚 Методические материалы</h3>
                    {getReadCount() > 0 && (
                        <span className="read-count">Прочитано: {getReadCount()}</span>
                    )}
                </div>

                {recommendations.length > 0 && (
                    <div className="stage-recommendations">
                        <span className="rec-label">✨ Рекомендовано для этапа:</span>
                        <div className="rec-chips">
                            {recommendations.slice(0, 3).map(rec => (
                                <span
                                    key={`${rec.type}_${rec.id}`}
                                    className="rec-chip"
                                    onClick={() => handleRecommendationClick(rec)}
                                >
                                    {rec.type === 'game' && '🎮'}
                                    {rec.type === 'campfire' && '🔥'}
                                    {rec.type === 'exercise' && '🤸'}
                                    {rec.title}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="methodology-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-emoji">{tab.emoji}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="methodology-content">
                {loading ? (
                    <div className="methodology-loading">
                        <div className="loading-spinner-small"></div>
                        <p>Загрузка материалов...</p>
                    </div>
                ) : error ? (
                    <div className="methodology-error">
                        <span className="error-icon">⚠️</span>
                        <p>{error}</p>
                        <button onClick={loadMaterials} className="retry-btn">
                            Повторить
                        </button>
                    </div>
                ) : materials.length === 0 ? (
                    <div className="methodology-empty">
                        <span className="empty-emoji">📭</span>
                        <p>Нет материалов для этого раздела</p>
                    </div>
                ) : (
                    <div className="materials-grid">
                        {materials.map(material => renderMaterialCard(material))}
                    </div>
                )}
            </div>

            {favorites.length > 0 && (
                <div className="favorites-section">
                    <div className="favorites-header">
                        <h4>⭐ Избранное</h4>
                        <button
                            className="clear-favorites"
                            onClick={clearAllFavorites}
                            title="Очистить всё избранное"
                        >
                            Очистить всё
                        </button>
                    </div>
                    {tabs.filter(tab => favorites.some(f => f.tab === tab.id)).map(tab => (
                        <div key={tab.id} className="favorites-group">
                            <div className="favorites-group-label">{tab.emoji} {tab.label}</div>
                            <div className="favorites-list">
                                {favorites
                                    .filter(fav => fav.tab === tab.id)
                                    .map(fav => (
                                        <div
                                            key={fav.key}
                                            className={`favorite-item${fav.tab === activeTab ? ' favorite-item-active' : ''}`}
                                            onClick={() => { setActiveTab(fav.tab); handleMaterialClick(fav); }}
                                        >
                                            <span className="fav-title">{fav.title}</span>
                                            <button
                                                className="fav-remove"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(fav, e);
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {renderMaterialDetails()}
        </div>
    );
};

export default MethodologyPanel;