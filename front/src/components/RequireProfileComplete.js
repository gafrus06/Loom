// src/guards/RequireProfileComplete.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAccessToken, refreshTokens, logout } from "../api/auth";
import { getProfileCompletionStatus } from "../api/files";

export default function RequireProfileComplete({ children }) {
    const [ready, setReady] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let cancelled = false;

        const goLogin = () =>
            navigate("/auth/login", { replace: true, state: { from: location } });

        const goOnboarding = (missing) =>
            navigate("/onboarding", {
                replace: true,
                state: { missing: missing || [], from: location.pathname },
            });

        (async () => {
            try {
                const token = getAccessToken();
                if (!token) {
                    goLogin();
                    return;
                }

                // 1) Пытаемся получить статус БЕЗ проактивного refresh
                let status;
                try {
                    status = await getProfileCompletionStatus();
                } catch (err) {
                    // если API-обёртка возвращает объект — адаптируй эту проверку
                    const httpStatus = err?.status || err?.response?.status;
                    if (httpStatus === 401) {
                        // 2) Ленивая попытка обновить токен и повторить запрос
                        const refreshed = await refreshTokens();
                        if (!refreshed) {
                            logout();
                            goLogin();
                            return;
                        }
                        status = await getProfileCompletionStatus();
                    } else {
                        throw err;
                    }
                }

                if (cancelled) return;

                if (status?.complete) {
                    setReady(true); // всё ок — рендерим children
                } else {
                    goOnboarding(status?.missingFields);
                }
            } catch (e) {
                // Любая иная ошибка — уводим на логин
                logout();
                goLogin();
            }
        })();

        return () => {
            cancelled = true;
        };
        // зависим только от path, чтобы не триггерить эффект на любые мелкие изменения объекта location
    }, [navigate, location.pathname]);

    if (!ready) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    color: "#A9B3C7",
                    background:
                        "radial-gradient(circle 510px at 67% 100%, rgb(28, 11, 53) 6%, rgb(27, 17, 58) 20%, #0a0a0f 100%)",
                    fontFamily:
                        'ui-sans-serif, system-ui, "Segoe UI", Roboto, Inter, Arial, sans-serif',
                }}
            >

            </div>
        );
    }

    return children;
}
