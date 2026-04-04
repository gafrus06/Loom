import React from 'react';

function formatChatMessage(content) {
    if (!content) return '';
    return content.split('\n').map((line, index) => {
        if (line.trim().startsWith('**') && line.trim().endsWith('**'))
            return <strong key={index}>{line.replace(/\*\*/g, '')}</strong>;
        if (line.trim().match(/^\d+\./))
            return <div key={index} className="chat-list-item">{line}</div>;
        if (line.trim().startsWith('-'))
            return <div key={index} className="chat-bullet">• {line.substring(1)}</div>;
        if (line.trim() === '')
            return <br key={index} />;
        return <p key={index}>{line}</p>;
    });
}

export default function AiChatPanel({ chatMessages, aiMessage, isAnalyzing, onMessageChange, onSend, onSuggestion }) {
    return (
        <div className="ai-chat-panel">
            <div className="ai-chat-header">
                <div className="ai-chat-title">
                    <span className="ai-icon">🤖</span>
                    <span>AI вожатый</span>
                </div>
                <span className="ai-status">{isAnalyzing ? 'печатает...' : 'онлайн'}</span>
            </div>

            <div className="ai-chat-messages">
                {chatMessages.length === 0 ? (
                    <div className="ai-chat-placeholder">
                        <p>👋 Задайте вопрос о составе отряда, играх или рекомендациях!</p>
                    </div>
                ) : (
                    chatMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`chat-message ${msg.role === 'user' ? 'user-message' : 'ai-message'} ${msg.isError ? 'error-message' : ''}`}
                        >
                            {msg.role === 'assistant' && <div className="message-avatar">🤖</div>}
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="message-author">{msg.role === 'user' ? 'Вы' : 'AI'}</span>
                                    <span className="message-time">{msg.timestamp}</span>
                                </div>
                                <div className="message-text">
                                    {msg.isLoading ? (
                                        <div className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </div>
                                    ) : (
                                        formatChatMessage(msg.content)
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="ai-chat-input">
                <input
                    type="text"
                    placeholder="Напишите сообщение..."
                    value={aiMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAnalyzing && aiMessage.trim() && onSend()}
                    disabled={isAnalyzing}
                />
                <button
                    onClick={onSend}
                    disabled={isAnalyzing || !aiMessage.trim()}
                    className={aiMessage.trim() ? 'active' : ''}
                >
                    {isAnalyzing ? '⏳' : '➤'}
                </button>
            </div>

            <div className="ai-chat-footer">
                <span>💡 Подсказки: </span>
                <button className="prompt-suggestion" onClick={() => onSuggestion("Проанализируй состав отряда и дай рекомендации")}>
                    📊 Анализ отряда
                </button>
                <button className="prompt-suggestion" onClick={() => onSuggestion("Какие игры подойдут для нашего отряда?")}>
                    🎮 Игры
                </button>
                <button className="prompt-suggestion" onClick={() => onSuggestion("Есть ли медицинские особенности для учёта?")}>
                    🏥 Здоровье
                </button>
            </div>
        </div>
    );
}