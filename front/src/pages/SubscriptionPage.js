import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSubscriptionPayment, getSubscriptionStatus, refreshTokens } from "../services/auth";
import Sidebar from "../layouts/Sidebar";
import { queryKeys } from "../state/queryKeys";
import "./SubscriptionPage.css";

function Confetti({ active }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!active) return undefined;

        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const context = canvas.getContext("2d");
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const colors = ["#5b2eff", "#3c8dff", "#10b981", "#f59e0b", "#ec4899", "#a78bfa"];
        const pieces = Array.from({ length: 90 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height * 0.5,
            w: 6 + Math.random() * 9,
            h: 3 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * Math.PI * 2,
            speed: 1.5 + Math.random() * 3,
            spin: (Math.random() - 0.5) * 0.15,
            drift: (Math.random() - 0.5) * 0.8,
        }));

        const draw = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach((piece) => {
                context.save();
                context.translate(piece.x, piece.y);
                context.rotate(piece.rot);
                context.fillStyle = piece.color;
                context.globalAlpha = 0.85;
                context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
                context.restore();
                piece.y += piece.speed;
                piece.x += piece.drift;
                piece.rot += piece.spin;
                if (piece.y > canvas.height + 20) {
                    piece.y = -20;
                    piece.x = Math.random() * canvas.width;
                }
            });
            rafRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(rafRef.current);
    }, [active]);

    return <canvas ref={canvasRef} className="sub-confetti" />;
}

function SuccessModal({ onClose }) {
    return (
        <div className="sub-overlay" onClick={onClose}>
            <div className="sub-success-card" onClick={(event) => event.stopPropagation()}>
                <Confetti active />
                <div className="sub-success-inner">
                    <div className="sub-success-emoji">👑</div>
                    <h2 className="sub-success-title">Подписка активирована!</h2>
                    <p className="sub-success-text">
                        Роль <strong>Администратор</strong> уже добавлена.<br />
                        Интерфейс обновится сразу после обновления сессии.
                    </p>
                    <div className="sub-success-chips">
                        <span className="sub-chip">📅 30 дней доступа</span>
                        <span className="sub-chip">🔄 Автоснятие по истечении</span>
                    </div>
                    <button className="sub-ok-btn" onClick={onClose}>Отлично!</button>
                </div>
            </div>
        </div>
    );
}

export default function SubscriptionPage() {
    const [paying, setPaying] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState("");
    const queryClient = useQueryClient();
    const [params] = useSearchParams();

    const { data: status, isLoading } = useQuery({
        queryKey: queryKeys.subscriptionStatus,
        queryFn: getSubscriptionStatus,
        staleTime: 15_000,
    });

    useEffect(() => {
        if (params.get("payment") === "success") {
            setShowSuccess(true);
            window.history.replaceState({}, "", "/subscription");
        }
    }, [params]);

    const handleBuy = async () => {
        setPaying(true);
        setError("");
        try {
            const { confirmationUrl } = await createSubscriptionPayment();
            window.location.href = confirmationUrl;
        } catch (requestError) {
            setError(requestError.message || "Не удалось создать платёж. Попробуйте позже.");
            setPaying(false);
        }
    };

    const handleCloseSuccess = async () => {
        setShowSuccess(false);
        try {
            await refreshTokens();
        } catch {
            // Статус всё равно обновим запросом ниже.
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionStatus });
    };

    const formatDate = (isoString) => (
        isoString
            ? new Date(isoString).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
            : ""
    );

    return (
        <div className="layout">
            <Sidebar />
            <main className="sub-main">
                <div className="sub-page-head">
                    <div className="sub-head-crown">👑</div>
                    <div>
                        <h1 className="sub-page-title">Подписка Администратор</h1>
                        <p className="sub-page-sub">Полный контроль над лагерем</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="sub-loader">
                        <div className="sub-dots"><span /><span /><span /></div>
                    </div>
                ) : (
                    <div className="sub-body">
                        <div className={`sub-status ${status?.active ? "active" : "inactive"}`}>
                            <span className={`sub-status-dot ${status?.active ? "active" : "inactive"}`} />
                            <div>
                                <div className="sub-status-label">
                                    {status?.active ? "Подписка активна" : "Подписка не активна"}
                                </div>
                                <div className="sub-status-meta">
                                    {status?.active
                                        ? <>Осталось <strong>{status.daysLeft}</strong> дн. · до {formatDate(status.expiresAt)}</>
                                        : "Купите подписку, чтобы получить роль Администратора"}
                                </div>
                            </div>
                        </div>

                        <div className="sub-plan">
                            <div className="sub-plan-stripe" />
                            <div className="sub-plan-top">
                                <div>
                                    <div className="sub-plan-name">Администратор</div>
                                    <div className="sub-plan-period">30 дней</div>
                                </div>
                                <div className="sub-plan-price">
                                    <span className="sub-price-num">4 999</span>
                                    <span className="sub-price-cur">₽</span>
                                </div>
                            </div>

                            <ul className="sub-features">
                                {[
                                    ["🏕️", "Полный доступ к управлению лагерем"],
                                    ["👥", "Назначение и снятие ролей Вожатый / Родитель"],
                                    ["📊", "Статистика, аудит, отчёты по сессиям"],
                                    ["🔒", "Управление всеми отрядами и сессиями"],
                                    ["⏱️", "Автоматическое снятие роли по истечении срока"],
                                ].map(([icon, text], index) => (
                                    <li key={index} className="sub-feature">
                                        <span className="sub-fi">{icon}</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>

                            {error && <div className="sub-error">{error}</div>}

                            <button className="sub-buy-btn" onClick={handleBuy} disabled={paying}>
                                {paying
                                    ? <span className="sub-btn-inner"><span className="sub-spin" />Переадресация…</span>
                                    : status?.active ? "Продлить — 4 999 ₽" : "Купить — 4 999 ₽"}
                            </button>

                            <p className="sub-disclaimer">
                                Оплата через ЮKassa · Безопасно · Автопродление не подключается
                            </p>
                        </div>

                        <div className="sub-how">
                            <h4 className="sub-how-title">Как это работает</h4>
                            <ol className="sub-how-list">
                                <li>После оплаты система автоматически добавляет роль <strong>Администратор</strong></li>
                                <li>Через 30 дней роль снимается без дополнительных действий</li>
                                <li>После обновления сессии интерфейс сразу подхватывает новые права</li>
                                <li>Продлить подписку можно в любой момент — срок суммируется</li>
                            </ol>
                        </div>
                    </div>
                )}

                {showSuccess && <SuccessModal onClose={handleCloseSuccess} />}
            </main>
        </div>
    );
}
