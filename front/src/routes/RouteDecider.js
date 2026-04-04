import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken, logout, refreshTokens } from "../services/auth";
import { getProfileCompletionStatus } from "../services/files";

export default function RouteDecider() {
    const navigate = useNavigate();
    const [message] = useState("Проверяем профиль...");

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const token = getAccessToken();
                if (!token) {
                    navigate("/auth/login", { replace: true });
                    return;
                }

                await refreshTokens().catch(() => null);
                const status = await getProfileCompletionStatus();
                if (!alive) return;

                if (status.complete) {
                    navigate("/", { replace: true });
                } else {
                    navigate("/onboarding", {
                        replace: true,
                        state: { missing: status.missingFields },
                    });
                }
            } catch {
                await logout();
                navigate("/auth/login", { replace: true });
            }
        })();

        return () => {
            alive = false;
        };
    }, [navigate]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            }}
        >
            <div style={{ textAlign: "center", opacity: 0.8 }}>{message}</div>
        </div>
    );
}
