import React from 'react';

const STAGES = [
    { id: 'NEW', name: 'Новый', color: '#FF6B6B' },
    { id: 'ORGANIZATIONAL', name: 'Организационный', color: '#FFA500' },
    { id: 'BUSINESS', name: 'Деловой', color: '#FFD700' },
    { id: 'CONSTRUCTIVE', name: 'Конструктивный', color: '#4CAF50' },
    { id: 'FINAL', name: 'Заключительный', color: '#2196F3' },
    { id: 'COMPLETED', name: 'Завершён', color: '#9C27B0' }
];

export default function StagePanel({ currentStage, isCounselor, onNextStage }) {
    const currentStageIndex = STAGES.findIndex(s => s.id === currentStage);
    const isLastStage = currentStageIndex === STAGES.length - 1;

    return (
        <div className="stages-panel-compact">
            <h3>🏅 Этап развития отряда</h3>

            <div className="stages-progress-wrapper">
                <div className="stages-progress-bar">
                    {STAGES.map((stage, idx) => {
                        const isActive = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        return (
                            <div
                                key={stage.id}
                                className={`stage-segment ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                                style={{
                                    background: isActive
                                        ? `linear-gradient(135deg, ${stage.color}, ${stage.color}dd)`
                                        : 'rgba(255, 255, 255, 0.03)'
                                }}
                            />
                        );
                    })}
                </div>
                <div className="stages-labels">
                    {STAGES.map((stage, idx) => (
                        <span
                            key={stage.id}
                            className={`stage-label ${idx === currentStageIndex ? 'current' : ''}`}
                        >
                            {stage.name}
                        </span>
                    ))}
                </div>
            </div>

            <p className="current-stage-name">
                Текущий этап: <strong>{STAGES[currentStageIndex]?.name}</strong>
            </p>

            {isCounselor && !isLastStage && (
                <button className="btn-next-stage" onClick={onNextStage}>
                    Перейти на следующий этап →
                </button>
            )}
        </div>
    );
}