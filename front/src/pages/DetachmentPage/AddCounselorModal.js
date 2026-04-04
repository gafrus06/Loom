import React from 'react';

export default function AddCounselorModal({
                                              counselorUuid, counselorRole, assigningCounselor,
                                              onUuidChange, onRoleChange, onSubmit, onClose
                                          }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-styled" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-gradient"
                     style={{ background: 'linear-gradient(135deg, #4CAF50, #2196F3)' }}>
                    <h2>Добавить вожатого к отряду</h2>
                </div>

                <form onSubmit={onSubmit} className="counselor-form">
                    <div className="form-group-compact">
                        <label>UUID вожатого *</label>
                        <input
                            type="text"
                            required
                            value={counselorUuid}
                            onChange={(e) => onUuidChange(e.target.value)}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            className="counselor-uuid-input"
                        />
                        <small className="input-hint">
                            Вожатый должен быть назначен в этот лагерь и смену администратором
                        </small>
                    </div>

                    <div className="form-group-compact">
                        <label>Роль в отряде</label>
                        <select
                            value={counselorRole}
                            onChange={(e) => onRoleChange(e.target.value)}
                            className="counselor-role-select"
                        >
                            <option value="ASSISTANT">🤝 Помощник вожатого</option>
                        </select>
                        <small className="input-hint">
                            Главный вожатый назначается автоматически при создании отряда
                        </small>
                    </div>

                    <div className="modal-actions-compact">
                        <button
                            type="button"
                            className="btn-modal-cancel"
                            onClick={onClose}
                            disabled={assigningCounselor}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="btn-modal-submit"
                            disabled={assigningCounselor || !counselorUuid.trim()}
                        >
                            {assigningCounselor ? 'Добавление...' : 'Добавить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}