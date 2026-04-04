import React, { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "../layouts/Sidebar";
import AccessDeniedModal from "../components/AccessDeniedModal";
import SuccessModal from "../components/SuccessModal";
import { queryKeys } from "../state/queryKeys";
import {
    getMyNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../services/notifications";
import {
    acceptSessionAssignment,
    rejectSessionAssignment,
} from "../services/campMembers";
import "./InboxPage.css";

const PAGE_SIZE = 20;

function notificationTypeLabel(type) {
    const labels = {
        CAMP_JOB_INVITATION: "Приглашение",
    };
    return labels[type] || "Уведомление";
}

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function isDecisionRequired(notification) {
    return notification?.type === "CAMP_JOB_INVITATION"
        && notification?.metadata?.assignmentId
        && String(notification?.metadata?.decisionRequired).toLowerCase() === "true";
}

function updateNotificationsPages(data, updater) {
    if (!data?.pages) return data;
    return {
        ...data,
        pages: data.pages.map((page) => (
            Array.isArray(page) ? page.map(updater) : page
        )),
    };
}

export default function InboxPage() {
    const [filter, setFilter] = useState("all");
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [error, setError] = useState({ open: false, title: "", msg: "" });
    const [success, setSuccess] = useState({ open: false, title: "", msg: "" });
    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useInfiniteQuery({
        queryKey: queryKeys.notifications(PAGE_SIZE),
        queryFn: ({ pageParam = 0 }) => getMyNotifications({ page: pageParam, size: PAGE_SIZE }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => (
            Array.isArray(lastPage) && lastPage.length === PAGE_SIZE ? allPages.length : undefined
        ),
        staleTime: 15_000,
    });

    const notifications = useMemo(() => {
        const items = (data?.pages || []).flatMap((page) => Array.isArray(page) ? page : []);
        return items.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [data]);

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.readAt).length,
        [notifications]
    );

    const displayed = useMemo(() => (
        filter === "unread"
            ? notifications.filter((item) => !item.readAt)
            : notifications
    ), [filter, notifications]);

    const markReadMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: (_, notificationId) => {
            const readAt = new Date().toISOString();
            queryClient.setQueryData(queryKeys.notifications(PAGE_SIZE), (current) => updateNotificationsPages(
                current,
                (item) => item.id === notificationId ? { ...item, readAt } : item
            ));
            queryClient.setQueryData(queryKeys.unreadNotifications, (count = 0) => Math.max(0, count - 1));
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => {
            const readAt = new Date().toISOString();
            queryClient.setQueryData(queryKeys.notifications(PAGE_SIZE), (current) => updateNotificationsPages(
                current,
                (item) => item.readAt ? item : { ...item, readAt }
            ));
            queryClient.setQueryData(queryKeys.unreadNotifications, 0);
        },
        onError: (requestError) => {
            setError({
                open: true,
                title: "Ошибка",
                msg: requestError.message || "Не удалось отметить уведомления прочитанными",
            });
        },
    });

    async function openNotification(notification) {
        setSelectedNotification(notification);
        if (!notification.readAt) {
            try {
                await markReadMutation.mutateAsync(notification.id);
            } catch {
                // Не мешаем открытию уведомления.
            }
        }
    }

    async function handleDecision(decision) {
        if (!selectedNotification?.metadata?.assignmentId) {
            setError({
                open: true,
                title: "Ошибка",
                msg: "Не найден assignmentId в уведомлении",
            });
            return;
        }

        try {
            if (decision === "accept") {
                await acceptSessionAssignment(selectedNotification.metadata.assignmentId);
            } else {
                await rejectSessionAssignment(selectedNotification.metadata.assignmentId);
            }

            const decisionStatus = decision === "accept" ? "ACCEPTED" : "REJECTED";
            const readAt = new Date().toISOString();

            queryClient.setQueryData(queryKeys.notifications(PAGE_SIZE), (current) => updateNotificationsPages(
                current,
                (item) => item.id === selectedNotification.id
                    ? {
                        ...item,
                        readAt: item.readAt || readAt,
                        metadata: {
                            ...(item.metadata || {}),
                            decisionRequired: "false",
                            decisionStatus,
                        },
                    }
                    : item
            ));
            queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications });

            setSelectedNotification((current) => (
                current
                    ? {
                        ...current,
                        readAt: current.readAt || readAt,
                        metadata: {
                            ...(current.metadata || {}),
                            decisionRequired: "false",
                            decisionStatus,
                        },
                    }
                    : null
            ));
            setSuccess({
                open: true,
                title: decision === "accept" ? "Приглашение принято" : "Приглашение отклонено",
                msg: decision === "accept"
                    ? "Вы подтверждены на работу в лагере."
                    : "Приглашение было отклонено.",
            });
        } catch (requestError) {
            setError({
                open: true,
                title: "Ошибка",
                msg: requestError.message || "Не удалось обработать приглашение",
            });
        }
    }

    if (isLoading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-spinner">
                        <div className="spinner" />
                        <p>Загрузка уведомлений...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content" style={{ padding: "24px" }}>
                <div className="page-header">
                    <div>
                        <h1>Уведомления</h1>
                        <p className="page-subtitle">
                            {unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все уведомления прочитаны"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="btn-secondary"
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending}
                        >
                            Прочитать все
                        </button>
                    )}
                </div>

                <div className="inbox-filters">
                    <button
                        className={`session-tab ${filter === "all" ? "active" : ""}`}
                        onClick={() => setFilter("all")}
                    >
                        Все ({notifications.length})
                    </button>
                    <button
                        className={`session-tab ${filter === "unread" ? "active" : ""}`}
                        onClick={() => setFilter("unread")}
                    >
                        Непрочитанные ({unreadCount})
                    </button>
                </div>

                {displayed.length === 0 ? (
                    <div className="inbox-empty-state">
                        <div className="inbox-empty-icon">💬</div>
                        <h3>{filter === "unread" ? "Нет непрочитанных уведомлений" : "Нет уведомлений"}</h3>
                    </div>
                ) : (
                    <>
                        <div className="inbox-notification-list">
                            {displayed.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    className={`inbox-notification-card ${notification.readAt ? "" : "unread"} ${isDecisionRequired(notification) ? "decision-required" : ""}`}
                                    onClick={() => openNotification(notification)}
                                >
                                    <span className="inbox-notification-accent" />
                                    <div className="inbox-notification-content">
                                        <div className="inbox-notification-top">
                                            <span className="inbox-notification-tag">
                                                {notificationTypeLabel(notification.type)}
                                            </span>
                                            <span className="inbox-notification-date">
                                                {formatDate(notification.createdAt)}
                                            </span>
                                        </div>
                                        <div className="inbox-notification-title-row">
                                            <h3>{notification.title || "Уведомление"}</h3>
                                            {!notification.readAt && <span className="inbox-notification-dot" />}
                                        </div>
                                        <p>{notification.body}</p>
                                        {isDecisionRequired(notification) && (
                                            <span className="inbox-notification-action-hint">
                                                Нажмите, чтобы принять или отклонить приглашение
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {hasNextPage && (
                            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? "Загрузка..." : "Показать ещё"}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {selectedNotification && (
                    <div className="modal-overlay" onClick={() => setSelectedNotification(null)}>
                        <div
                            className="modal-content-styled inbox-notification-modal"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="modal-header-gradient">
                                <div>
                                    <h2>{selectedNotification.title || "Уведомление"}</h2>
                                    <p>{notificationTypeLabel(selectedNotification.type)}</p>
                                </div>
                                <button
                                    className="modal-close-btn"
                                    onClick={() => setSelectedNotification(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="inbox-notification-modal__body">
                                <p className="inbox-notification-modal__date">
                                    {formatDate(selectedNotification.createdAt)}
                                </p>
                                <p className="inbox-notification-modal__text">
                                    {selectedNotification.body}
                                </p>

                                {isDecisionRequired(selectedNotification) && (
                                    <div className="inbox-notification-modal__actions">
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => handleDecision("reject")}
                                        >
                                            Отклонить
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => handleDecision("accept")}
                                        >
                                            Принять
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <AccessDeniedModal
                    isOpen={error.open}
                    title={error.title}
                    message={error.msg}
                    onClose={() => setError({ open: false, title: "", msg: "" })}
                />

                <SuccessModal
                    isOpen={success.open}
                    title={success.title}
                    message={success.msg}
                    onClose={() => {
                        setSuccess({ open: false, title: "", msg: "" });
                        refetch();
                    }}
                />
            </main>
        </div>
    );
}
