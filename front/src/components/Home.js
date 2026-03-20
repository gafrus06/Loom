// src/components/Home.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import NewsFeed from './NewsFeed';
import { getCurrentUser } from '../api/auth';
import * as campsAPI from '../api/camps';
import { getMyCamp } from '../api/campMembers';
import '../styles/home.css';

export default function Home() {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const [currentCamp, setCurrentCamp] = useState(null);
    const [currentSession, setCurrentSession] = useState(null);
    const [currentDetachment, setCurrentDetachment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableCamps, setAvailableCamps] = useState([]);
    const [availableDetachments, setAvailableDetachments] = useState([]);
    const [showCampSelector, setShowCampSelector] = useState(false);
    const [showDetachmentSelector, setShowDetachmentSelector] = useState(false);

    useEffect(() => {
        loadUserContext();
    }, []);

    const loadUserContext = async () => {
        try {
            setCurrentCamp(null);
            setCurrentSession(null);
            setCurrentDetachment(null);
            setAvailableCamps([]);
            setAvailableDetachments([]);


            const roles = currentUser?.roles || [];
            const isParent = roles.some(r => r === 'PARENT' || r === 'ROLE_PARENT');
            const isCounselor = roles.some(r => r === 'COUNSELOR' || r === 'ROLE_COUNSELOR');
            const isAdmin = roles.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');


            // Родитель
            if (isParent) {
                await loadParentContext();
            }
            // Вожатый
            else if (isCounselor) {
                await loadCounselorContext();
            }
            // Админ
            else if (isAdmin) {
                await loadAdminContext();
            }

        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const loadParentContext = async () => {
        try {
            const children = await campsAPI.getMyChildren();

            if (children.length > 0) {
                const child = children[0];
                const childId = child.childId || child.id;

                let detachment = null;

                // Сначала пробуем активное членство (более надёжный эндпоинт)
                try {
                    const activeMembership = await campsAPI.getActiveMembership(childId);
                    if (activeMembership?.detachmentId) {
                        detachment = await campsAPI.getDetachment(activeMembership.detachmentId);
                    }
                } catch (e) {
                    // Fallback: пробуем список членств
                    try {
                        const memberships = await campsAPI.getChildMemberships(childId);
                        if (memberships.length > 0) {
                            detachment = await campsAPI.getDetachment(memberships[0].detachmentId);
                        }
                    } catch (e2) {
                    }
                }

                if (detachment) {
                    // Батчим все обновления состояния вместе
                    setCurrentDetachment(detachment);
                    setCurrentSession({
                        id: detachment.sessionId,
                        title: detachment.sessionName || 'Смена'
                    });
                    setCurrentCamp({
                        id: detachment.campId,
                        name: detachment.campName || 'Лагерь'
                    });
                }
            }
        } catch (err) {
        }
    };

    // В функции loadCounselorContext, добавьте проверку на актуальность:

    const loadCounselorContext = async () => {
        try {

            setCurrentDetachment(null);
            setCurrentSession(null);
            setCurrentCamp(null);
            setAvailableDetachments([]);

            const assignments = await campsAPI.getMyActiveAssignments();

            const activeAssignments = (assignments || []).filter(a => a.active === true);

            if (activeAssignments.length === 0) {
                // Нет назначений на отряд — пробуем получить лагерь напрямую
                try {
                    const campMembership = await getMyCamp();
                    if (campMembership?.campId) {
                        setCurrentCamp({ id: campMembership.campId, name: campMembership.campName || 'Лагерь' });
                    }
                } catch (e) {}
                return;
            }

            // Берём самое последнее назначение по assignedAt
            const sortedAssignments = [...activeAssignments].sort((a, b) => {
                if (a.assignedAt && b.assignedAt) {
                    return new Date(b.assignedAt) - new Date(a.assignedAt);
                }
                return 0;
            });

            const assignment = sortedAssignments[0];

            // Используем данные прямо из назначения — без лишнего запроса
            setCurrentDetachment({
                id: assignment.detachmentId,
                name: assignment.detachmentName,
                sessionId: assignment.sessionId,
                sessionName: assignment.sessionName,
                campId: assignment.campId,
                campName: assignment.campName,
            });
            setCurrentSession({
                id: assignment.sessionId,
                title: assignment.sessionName || 'Смена'
            });
            setCurrentCamp({
                id: assignment.campId,
                name: assignment.campName || 'Лагерь'
            });
        } catch (err) {
        }
    };

    const loadAdminContext = async () => {
        try {

            const camps = await campsAPI.getMyAccessibleCamps();
            setAvailableCamps(camps);

            if (camps.length > 0) {
                // Пытаемся загрузить последний выбранный лагерь из localStorage
                const lastCampId = localStorage.getItem('lastSelectedCamp');

                let selectedCamp = null;

                if (lastCampId) {
                    selectedCamp = camps.find(c => c.id === lastCampId);
                }

                if (!selectedCamp && camps.length > 0) {
                    selectedCamp = camps[0];
                }

                if (selectedCamp) {
                    setCurrentCamp(selectedCamp);
                    setCurrentSession(null);
                    setCurrentDetachment(null);
                }
            }
        } catch (err) {
        }
    };

    const handleCampChange = async (campId) => {
        try {
            const selectedCamp = availableCamps.find(c => c.id === campId);
            if (!selectedCamp) return;

            setCurrentCamp(selectedCamp);
            setCurrentSession(null);
            setCurrentDetachment(null);
            localStorage.setItem('lastSelectedCamp', campId);
            setShowCampSelector(false);
        } catch (err) {
        }
    };

    const handleDetachmentChange = async (detachmentId) => {
        try {
            const selectedDetachment = availableDetachments.find(d => d.id === detachmentId);
            if (!selectedDetachment) return;

            setCurrentDetachment(selectedDetachment);
            setCurrentSession({
                id: selectedDetachment.sessionId,
                title: selectedDetachment.sessionName || 'Смена'
            });
            setCurrentCamp({
                id: selectedDetachment.campId,
                name: selectedDetachment.campName || 'Лагерь'
            });
            setShowDetachmentSelector(false);
        } catch (err) {
        }
    };

    const isParent = currentUser?.roles?.some(r => r === 'PARENT' || r === 'ROLE_PARENT');
    const isCounselor = currentUser?.roles?.some(r => r === 'COUNSELOR' || r === 'ROLE_COUNSELOR');
    const isAdmin = currentUser?.roles?.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');
    const canCreatePost = isCounselor || isAdmin;

    if (loading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main">
                    <div className="dashboard single-col">
                        <section className="col-main">
                            <div className="card feed-card">
                                {[1,2,3].map(i => (
                                    <article className="feed-item" key={i}>
                                        <div className="avatar skeleton shimmer" />
                                        <div className="feed-body">
                                            <div className="skeleton shimmer line title" />
                                            <div className="skeleton shimmer line text" />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main">
                <div className="dashboard single-col">
                    {/* Лента новостей — на всю ширину */}
                    <section className="col-main col-full">
                        <NewsFeed
                            campId={currentCamp?.id}
                            sessionId={currentSession?.id}
                            detachmentId={currentDetachment?.id}
                        />
                    </section>
                </div>
            </main>
        </div>
    );
}