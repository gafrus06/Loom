import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { methodologyAPI } from '../services/methodology';
import './MethodologyPanel.css';

const TABS = [
    { id: 'games', label: 'Игры', emoji: '🎮', icon: '🎲' },
    { id: 'campfires', label: 'Огоньки', emoji: '🔥', icon: '🕯️' },
    { id: 'exercises', label: 'Упражнения', emoji: '🤸', icon: '⚽' },
    { id: 'physiological', label: 'Физиология', emoji: '🧬', icon: '❤️' },
];

const TYPE_MAPPING = {
    games: 'GAME',
    campfires: 'CAMPFIRE',
    exercises: 'EXERCISE',
    physiological: 'PHYSIOLOGICAL',
};

const RECOMMENDATION_TAB_MAPPING = {
    game: 'games',
    campfire: 'campfires',
    exercise: 'exercises',
    physiological: 'physiological',
};

function buildReadStorageKey(detachmentId) {
    return `methodology_read_${detachmentId}`;
}

function parseStoredReadMaterials(detachmentId) {
    if (!detachmentId) {
        return {};
    }

    try {
        const saved = localStorage.getItem(buildReadStorageKey(detachmentId));
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function mapAgeGroup(ageGroup) {
    if (!ageGroup) return '8-10';

    const numbers = String(ageGroup).match(/\d+/g);
    if (!numbers?.length) return '8-10';

    const age = Number.parseInt(numbers[0], 10);
    if (Number.isNaN(age)) return '8-10';
    if (age <= 7) return '5-7';
    if (age <= 10) return '8-10';
    if (age <= 13) return '11-13';
    return '14-17';
}

function getRecommendationTab(type) {
    return RECOMMENDATION_TAB_MAPPING[type] || 'games';
}

function getMaterialKey(tabId, materialId) {
    return `${tabId}_${materialId}`;
}

export default function MethodologyPanel({ detachmentId, currentStage, ageGroup }) {
    const [activeTab, setActiveTab] = useState('games');
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [readMaterials, setReadMaterials] = useState(() => parseStoredReadMaterials(detachmentId));
    const [favorites, setFavorites] = useState([]);
    const [pendingMaterialId, setPendingMaterialId] = useState(null);

    const favoritesByTab = useMemo(
        () => TABS.filter((tab) => favorites.some((favorite) => favorite.tab === tab.id)),
        [favorites],
    );

    useEffect(() => {
        setReadMaterials(parseStoredReadMaterials(detachmentId));
    }, [detachmentId]);

    useEffect(() => {
        if (!detachmentId) return;
        localStorage.setItem(buildReadStorageKey(detachmentId), JSON.stringify(readMaterials));
    }, [detachmentId, readMaterials]);

    const loadMaterials = useCallback(async () => {
        if (!detachmentId || !currentStage) {
            setMaterials([]);
            return;
        }

        setLoading(true);
        setError('');

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
                    data = await methodologyAPI.getPhysiologicalFeatures(mapAgeGroup(ageGroup));
                    break;
                default:
                    data = [];
            }

            setMaterials(Array.isArray(data) ? data : []);

            if (Array.isArray(data) && data.some((item) => item?.isUsed !== undefined)) {
                const nextReadState = {};
                data.forEach((item) => {
                    if (item?.isUsed) {
                        nextReadState[getMaterialKey(activeTab, item.id)] = {
                            id: item.id,
                            title: item.title,
                            type: activeTab,
                            readAt: item.lastUsedAt || new Date().toISOString(),
                            stage: currentStage,
                        };
                    }
                });
                setReadMaterials((prev) => ({ ...prev, ...nextReadState }));
            }
        } catch {
            setMaterials([]);
            setError('Не удалось загрузить материалы.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, ageGroup, currentStage, detachmentId]);

    const loadRecommendations = useCallback(async () => {
        if (!detachmentId || !currentStage) {
            setRecommendations([]);
            return;
        }

        setRecommendationsLoading(true);
        try {
            const data = await methodologyAPI.getRecommendedForStage(detachmentId, currentStage);
            setRecommendations(Array.isArray(data) ? data : []);
        } catch {
            setRecommendations([]);
        } finally {
            setRecommendationsLoading(false);
        }
    }, [currentStage, detachmentId]);

    const loadFavorites = useCallback(async () => {
        if (!detachmentId) {
            setFavorites([]);
            return;
        }

        try {
            const results = await Promise.all(
                Object.keys(TYPE_MAPPING).map(async (tabId) => {
                    try {
                        const items = await methodologyAPI.getFavorites(detachmentId, TYPE_MAPPING[tabId]);
                        return (Array.isArray(items) ? items : []).map((item) => ({
                            key: getMaterialKey(tabId, item.id),
                            tab: tabId,
                            ...item,
                        }));
                    } catch {
                        return [];
                    }
                }),
            );

            setFavorites(results.flat());
        } catch {
            setFavorites([]);
        }
    }, [detachmentId]);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    useEffect(() => {
        if (!pendingMaterialId || materials.length === 0) return;

        const targetMaterial = materials.find((material) => material.id === pendingMaterialId);
        if (targetMaterial) {
            setSelectedMaterial(targetMaterial);
            setPendingMaterialId(null);
        }
    }, [materials, pendingMaterialId]);

    const isMaterialRead = useCallback((material, tabId = activeTab) => {
        if (material?.isUsed !== undefined) {
            return material.isUsed;
        }

        return Boolean(readMaterials[getMaterialKey(tabId, material.id)]);
    }, [activeTab, readMaterials]);

    const isFavorite = useCallback((material, tabId = activeTab) => (
        favorites.some((favorite) => favorite.key === getMaterialKey(tabId, material.id))
    ), [activeTab, favorites]);

    const readCount = useMemo(() => Object.keys(readMaterials).length, [readMaterials]);

    const handleCloseDetails = useCallback(() => {
        setSelectedMaterial(null);
    }, []);

    const handleMaterialClick = useCallback((material) => {
        setSelectedMaterial(material);
    }, []);

    const toggleReadStatus = useCallback(async (material, event) => {
        event?.stopPropagation();

        const materialKey = getMaterialKey(activeTab, material.id);
        const isCurrentlyRead = Boolean(readMaterials[materialKey]);

        try {
            if (!isCurrentlyRead) {
                await methodologyAPI.markAsUsed(
                    detachmentId,
                    material.id,
                    TYPE_MAPPING[activeTab],
                    currentStage,
                    'Отмечено как прочитанное',
                );
            }

            setReadMaterials((prev) => {
                const nextState = { ...prev };
                if (isCurrentlyRead) {
                    delete nextState[materialKey];
                } else {
                    nextState[materialKey] = {
                        id: material.id,
                        title: material.title,
                        type: activeTab,
                        readAt: new Date().toISOString(),
                        stage: currentStage,
                    };
                }
                return nextState;
            });

            setMaterials((prev) => prev.map((item) => (
                item.id === material.id && item.isUsed !== undefined
                    ? { ...item, isUsed: !isCurrentlyRead }
                    : item
            )));
        } catch {
            // backend already stays the source of truth; UI keeps previous state on failure
        }
    }, [activeTab, currentStage, detachmentId, readMaterials]);

    const toggleFavorite = useCallback(async (material, event) => {
        event?.stopPropagation();

        const materialKey = getMaterialKey(activeTab, material.id);
        const alreadyFavorite = favorites.some((favorite) => favorite.key === materialKey);

        try {
            if (alreadyFavorite) {
                await methodologyAPI.removeFromFavorites(detachmentId, material.id, TYPE_MAPPING[activeTab]);
                setFavorites((prev) => prev.filter((favorite) => favorite.key !== materialKey));
            } else {
                await methodologyAPI.addToFavorites(detachmentId, material.id, TYPE_MAPPING[activeTab]);
                setFavorites((prev) => [
                    ...prev,
                    { key: materialKey, tab: activeTab, ...material },
                ]);
            }
        } catch {
            // intentionally silent to avoid noisy UX on transient failures
        }
    }, [activeTab, detachmentId, favorites]);

    const clearAllFavorites = useCallback(async () => {
        const currentFavorites = [...favorites];
        setFavorites([]);

        await Promise.allSettled(
            currentFavorites.map((favorite) => methodologyAPI.removeFromFavorites(
                detachmentId,
                favorite.id,
                TYPE_MAPPING[favorite.tab],
            )),
        );
    }, [detachmentId, favorites]);

    const handleRecommendationClick = useCallback((recommendation) => {
        const nextTab = getRecommendationTab(recommendation.type);
        setActiveTab(nextTab);
        setPendingMaterialId(recommendation.id);
    }, []);

    const getTabEmoji = useCallback((tabId) => {
        const tab = TABS.find((item) => item.id === tabId);
        return tab?.emoji || '📁';
    }, []);

    const renderMaterialCard = useCallback((material) => {
        const favorite = isFavorite(material);
        const read = isMaterialRead(material);

        return (
            <div
                key={material.id}
                className={`methodology-card ${read ? 'read' : ''}`}
                onClick={() => handleMaterialClick(material)}
            >
                <div className="card-header">
                    <h4>{material.title}</h4>
                    <div className="card-actions">
                        {read && <span className="read-badge" title="Прочитано">✓</span>}
                        <button
                            className={`favorite-btn ${favorite ? 'active' : ''}`}
                            onClick={(event) => toggleFavorite(material, event)}
                            title={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                        >
                            {favorite ? '★' : '☆'}
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
                        <span className={`meta-item difficulty-${String(material.difficulty || '').toLowerCase()}`}>
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
    }, [activeTab, handleMaterialClick, isFavorite, isMaterialRead, toggleFavorite]);

    const renderDetailsBlock = useCallback((material) => {
        if (activeTab === 'games') {
            return (
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
            );
        }

        if (activeTab === 'campfires') {
            return (
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
            );
        }

        if (activeTab === 'exercises') {
            return (
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
            );
        }

        return (
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
        );
    }, [activeTab]);

    const renderMaterialDetails = () => {
        if (!selectedMaterial) return null;

        const read = isMaterialRead(selectedMaterial);
        const favorite = isFavorite(selectedMaterial);

        return (
            <div className="material-details-overlay" onClick={handleCloseDetails}>
                <div className="material-details-modal" onClick={(event) => event.stopPropagation()}>
                    <button className="close-btn" onClick={handleCloseDetails}>✕</button>

                    <div className="details-header">
                        <span className="details-emoji">{getTabEmoji(activeTab)}</span>
                        <h2>{selectedMaterial.title}</h2>
                        {read && <span className="read-badge-large">Прочитано ✓</span>}
                    </div>

                    <div className="details-content">
                        {renderDetailsBlock(selectedMaterial)}

                        {selectedMaterial.lastUsedAt && (
                            <div className="details-section usage-info">
                                <h3>📊 Статистика использования</h3>
                                <p>
                                    <strong>Последнее использование:</strong>{' '}
                                    {new Date(selectedMaterial.lastUsedAt).toLocaleDateString('ru-RU')}
                                </p>
                                <p>
                                    <strong>Всего использований:</strong>{' '}
                                    {selectedMaterial.usageCount || 1}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="details-actions">
                        <button
                            className={`action-btn ${read ? 'secondary' : 'primary'}`}
                            onClick={(event) => toggleReadStatus(selectedMaterial, event)}
                        >
                            {read ? '✓ Отметить как непрочитанное' : '✓ Отметить как прочитанное'}
                        </button>
                        <button
                            className="action-btn secondary"
                            onClick={(event) => toggleFavorite(selectedMaterial, event)}
                        >
                            {favorite ? '★ В избранном' : '☆ В избранное'}
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
                    {readCount > 0 && <span className="read-count">Прочитано: {readCount}</span>}
                </div>

                {recommendationsLoading ? (
                    <div className="stage-recommendations">
                        <span className="rec-label">Подбираем рекомендации для текущего этапа…</span>
                    </div>
                ) : recommendations.length > 0 ? (
                    <div className="stage-recommendations">
                        <span className="rec-label">Рекомендуем для текущего этапа:</span>
                        <div className="rec-chips">
                            {recommendations.map((recommendation) => (
                                <span
                                    key={`${recommendation.type}_${recommendation.id}`}
                                    className="rec-chip"
                                    onClick={() => handleRecommendationClick(recommendation)}
                                >
                                    {recommendation.type === 'game' && '🎮'}
                                    {recommendation.type === 'campfire' && '🔥'}
                                    {recommendation.type === 'exercise' && '🤸'}
                                    {recommendation.type === 'physiological' && '🧬'}
                                    {recommendation.title}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="methodology-tabs">
                {TABS.map((tab) => (
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
                        <p>Загрузка материалов…</p>
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
                        <p>Для этого раздела пока нет материалов</p>
                    </div>
                ) : (
                    <div className="materials-grid">
                        {materials.map((material) => renderMaterialCard(material))}
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

                    {favoritesByTab.map((tab) => (
                        <div key={tab.id} className="favorites-group">
                            <div className="favorites-group-label">{tab.emoji} {tab.label}</div>
                            <div className="favorites-list">
                                {favorites
                                    .filter((favorite) => favorite.tab === tab.id)
                                    .map((favorite) => (
                                        <div
                                            key={favorite.key}
                                            className={`favorite-item${favorite.tab === activeTab ? ' favorite-item-active' : ''}`}
                                            onClick={() => {
                                                setActiveTab(favorite.tab);
                                                setSelectedMaterial(favorite);
                                            }}
                                        >
                                            <span className="fav-title">{favorite.title}</span>
                                            <button
                                                className="fav-remove"
                                                onClick={(event) => toggleFavorite(favorite, event)}
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
}
