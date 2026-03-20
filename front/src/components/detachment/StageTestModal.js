import React from 'react';

export default function StageTestModal({ questions, answers, onAnswer, canProceed, onCancel, onProceed }) {
    return (
        <div className="test-overlay">
            <div className="test-modal">
                <h4>Проверка готовности</h4>
                <p className="test-description">Все кроме первого обязательны:</p>

                <div className="test-questions">
                    {questions.map((question, idx) => (
                        <label key={idx} className="test-question">
                            <input
                                type="checkbox"
                                checked={answers[idx] || false}
                                onChange={(e) => onAnswer(idx, e.target.checked)}
                            />
                            <span className={idx === 0 ? 'optional' : 'required'}>
                                {question}
                                {idx === 0 && <span className="optional-badge">необязательно</span>}
                            </span>
                        </label>
                    ))}
                </div>

                <div className="test-actions">
                    <button className="btn-cancel" onClick={onCancel}>Отмена</button>
                    <button className="btn-proceed" disabled={!canProceed} onClick={onProceed}>Перейти</button>
                </div>
            </div>
        </div>
    );
}