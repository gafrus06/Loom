import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import { login, register } from "../services/auth";
import "./Auth.css";

export default function Auth() {
    const { mode: modeParam } = useParams();
    const navigate = useNavigate();

    const mode = modeParam === "register" ? "register" : "login";
    const isRegister = mode === "register";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const confirmRef = useRef(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setError("");
        setSuccess("");
        if (!isRegister) setConfirm("");
    }, [isRegister]);

    const submitText = loading
        ? isRegister ? "Регистрация..." : "Вход..."
        : isRegister ? "Зарегистрироваться" : "Войти";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (isRegister && password !== confirm) {
            setError("Пароли не совпадают");
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                await register(email, password);
                setSuccess("Регистрация успешна!");
                setTimeout(() => navigate("/auth/login"), 900);
            } else {
                await login(email, password);
                navigate("/decide");
            }
        } catch {
            setError(isRegister ? "Ошибка регистрации" : "Неверный email или пароль");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <main className="right-panel">
                <div className="auth-center-wrap">
                    <div className="brand brand--centered">
                        <span className="brand__logo">Loom</span>
                    </div>

                    <div className="auth-card" role="region" aria-label={isRegister ? "Регистрация" : "Вход"}>
                        <div className="tabs">
                            <Link to="/auth/login" className={`tab ${!isRegister ? "active" : ""}`}>Вход</Link>
                            <Link to="/auth/register" className={`tab ${isRegister ? "active" : ""}`}>Регистрация</Link>
                        </div>

                        <h2>{isRegister ? "Создание аккаунта" : "Вход в аккаунт"}</h2>

                        <form className="form" onSubmit={handleSubmit} noValidate>
                            <label className="label" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                placeholder="Введите email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />

                            <label className="label" htmlFor="password">Пароль</label>
                            <input
                                id="password"
                                type="password"
                                className="input"
                                placeholder={isRegister ? "Придумайте пароль" : "Введите пароль"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete={isRegister ? "new-password" : "current-password"}
                            />

                            <CSSTransition
                                in={isRegister}
                                timeout={{ enter: 220, exit: 140 }}
                                classNames="field-fade"
                                unmountOnExit
                                nodeRef={confirmRef}
                            >
                                <div ref={confirmRef} className="auth-field-group">
                                    <label className="label" htmlFor="confirm">Повторите пароль</label>
                                    <input
                                        id="confirm"
                                        type="password"
                                        className="input"
                                        placeholder="Повторите пароль"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required={isRegister}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </CSSTransition>

                            <div className="feedback-slot" aria-live="polite">
                                {error && <p className="form-error">{error}</p>}
                                {success && <p className="form-success">{success}</p>}
                            </div>

                            <button type="submit" className="btn-grad" disabled={loading} aria-busy={loading ? "true" : undefined}>
                                {submitText}
                            </button>

                            <div className="alt-links">
                                {!isRegister
                                    ? <span>Нет аккаунта? <Link to="/auth/register" className="link-like">Зарегистрируйтесь</Link></span>
                                    : <span>Уже с нами? <Link to="/auth/login" className="link-like">Войдите</Link></span>
                                }
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
