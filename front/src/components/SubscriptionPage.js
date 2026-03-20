import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createSubscriptionPayment, getSubscriptionStatus, getCurrentUser, refreshTokens } from "../api/auth";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import "../styles/subscription.css";

/* ─────────────────────────────────────────────
   Конфетти на canvas
───────────────────────────────────────────── */
function Confetti({ active }) {
    const canvasRef = useRef(null);
    const rafRef    = useRef(null);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const COLORS = ["#5b2eff","#3c8dff","#10b981","#f59e0b","#ec4899","#a78bfa"];
        const pieces = Array.from({ length: 90 }, () => ({
            x:     Math.random() * canvas.width,
            y:     Math.random() * -canvas.height * 0.5,
            w:     6 + Math.random() * 9,
            h:     3 + Math.random() * 5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rot:   Math.random() * Math.PI * 2,
            speed: 1.5 + Math.random() * 3,
            spin:  (Math.random() - 0.5) * 0.15,
            drift: (Math.random() - 0.5) * 0.8,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
                p.y += p.speed;
                p.x += p.drift;
                p.rot += p.spin;
                if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
            });
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(rafRef.current);
    }, [active]);

    return <canvas ref={canvasRef} className="sub-confetti" />;
}

/* ─────────────────────────────────────────────
   Модалка успешной оплаты
───────────────────────────────────────────── */
function SuccessModal({ onClose }) {
    return (
        <div className="sub-overlay" onClick={onClose}>
            <div className="sub-success-card" onClick={e => e.stopPropagation()}>
                <Confetti active />
                <div className="sub-success-inner">
                    <div className="sub-success-emoji">👑</div>
                    <h2 className="sub-success-title">Подписка активирована!</h2>
                    <p className="sub-success-text">
                        Роль <strong>Администратор</strong> уже добавлена.<br />
                        Через ~минуту токен обновится автоматически.
                    </p>
                    <div className="sub-success-chips">
                        <span className="sub-chip">📅 30 дней доступа</span>
                        <span className="sub-chip">🔄 Авто-снятие по истечении</span>
                    </div>
                    <button className="sub-ok-btn" onClick={onClose}>Отлично!</button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Основная страница
───────────────────────────────────────────── */
export default function SubscriptionPage() {
    const [status,      setStatus]      = useState(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [paying,      setPaying]      = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error,       setError]       = useState("");

    const navigate  = useNavigate();
    const [params]  = useSearchParams();

    useEffect(() => {
        if (params.get("payment") === "success") {
            setShowSuccess(true);
            window.history.replaceState({}, "", "/subscription");
        }
    }, [params]);

    useEffect(() => {
        getSubscriptionStatus()
            .then(setStatus)
            .catch(() => setStatus({ active: false }))
            .finally(() => setLoadingPage(false));
    }, []);

    const handleBuy = async () => {
        setPaying(true);
        setError("");
        try {
            const { confirmationUrl } = await createSubscriptionPayment();
            window.location.href = confirmationUrl;
        } catch (e) {
            setError(e.message || "Не удалось создать платёж. Попробуйте позже.");
            setPaying(false);
        }
    };

    const handleCloseSuccess = async () => {
        setShowSuccess(false);
        // Сразу обновляем токен — роль ADMIN появится немедленно
        try { await refreshTokens(); } catch (_) {}
        getSubscriptionStatus().then(setStatus);
    };

    const fmtDate = (iso) => iso
        ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
        : "";

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

                {loadingPage ? (
                    <div className="sub-loader">
                        <div className="sub-dots"><span/><span/><span/></div>
                    </div>
                ) : (
                    <div className="sub-body">

                        {/* ── Статус ── */}
                        <div className={`sub-status ${status?.active ? "active" : "inactive"}`}>
                            <span className={`sub-status-dot ${status?.active ? "active" : "inactive"}`} />
                            <div>
                                <div className="sub-status-label">
                                    {status?.active ? "Подписка активна" : "Подписка не активна"}
                                </div>
                                <div className="sub-status-meta">
                                    {status?.active
                                        ? <>Осталось <strong>{status.daysLeft}</strong> дн. · до {fmtDate(status.expiresAt)}</>
                                        : "Купите подписку, чтобы получить роль Администратора"}
                                </div>
                            </div>
                        </div>

                        {/* ── Тариф ── */}
                        <div className="sub-plan">
                            <div className="sub-plan-stripe" />
                            <div className="sub-plan-top">
                                <div>
                                    <div className="sub-plan-name">Администратор</div>
                                    <div className="sub-plan-period">30 дней</div>
                                </div>
                                <div className="sub-plan-price">
                                    <span className="sub-price-num">4 999</span>
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
                                ].map(([icon, text], i) => (
                                    <li key={i} className="sub-feature">
                                        <span className="sub-fi">{icon}</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>

                            {error && <div className="sub-error">{error}</div>}

                            <button className="sub-buy-btn" onClick={handleBuy} disabled={paying}>
                                {paying
                                    ? <span className="sub-btn-inner"><span className="sub-spin"/>Перенаправление…</span>
                                    : status?.active ? "Продлить — 4 999 ₽" : "Купить — 4 999 ₽"
                                }
                            </button>

                            <p className="sub-disclaimer">
                                Оплата через ЮKassa · Безопасно · Автопродление не подключается
                            </p>
                        </div>

                        {/* ── Как работает ── */}
                        <div className="sub-how">
                            <h4 className="sub-how-title">Как это работает</h4>
                            <ol className="sub-how-list">
                                <li>После оплаты система добавляет роль <strong>Администратор</strong> автоматически</li>
                                <li>Через 30 дней роль снимается — без дополнительных действий</li>
                                <li>Токен живёт 1 минуту, при следующем обновлении UI обновится сам</li>
                                <li>Продлить можно в любой момент — срок суммируется</li>
                            </ol>
                        </div>

                    </div>
                )}

                {showSuccess && <SuccessModal onClose={handleCloseSuccess} />}
            </main>
            <BottomNav />
        </div>
    );
}