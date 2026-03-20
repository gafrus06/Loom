import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession } from '../api/sessions';
import Sidebar from './Sidebar';

export default function SessionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSession();
    }, [id]);

    async function loadSession() {
        try {
            const data = await getSession(id);
            setSession(data);
        } catch (err) {
            console.error('Failed to load session:', err);
        } finally {
            setLoading(false);
        }
    }

    // Аналогичная структура как в CampPage
    // ...
    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Загрузка...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="error-message">
                        <span>⚠️</span>
                        <span>Лагерь не найден</span>
                    </div>
                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/camps')}
                    >
                        ← Назад к списку
                    </button>
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
                        <h1>{session.name}</h1>
                        <p className="page-subtitle">{session.location}</p>
                    </div>
                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/camps')}
                    >
                        ← Назад
                    </button>
                </div>

                {session.description && (
                    <div className="camp-card">
                        <h2>Описание</h2>
                        <p>{session.description}</p>
                    </div>
                )}

                <div className="camp-card">
                    <h2>Смены</h2>
                    <p>Список смен появится здесь...</p>
                </div>
            </main>
        </div>
    );
}