import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken, refreshTokens, logout } from "../api/auth";
import { getProfileCompletionStatus } from "../api/files";

export default function RouteDecider() {
    const navigate = useNavigate();
    const [msg, setMsg] = useState("Проверяем профиль...");

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const token = getAccessToken();
                if (!token) return navigate("/auth/login", { replace: true });
                await refreshTokens().catch(() => null);

                const status = await getProfileCompletionStatus();
                if (!alive) return;
                if (status.complete) navigate("/", { replace: true });
                else navigate("/onboarding", { replace: true, state: { missing: status.missingFields } });
            } catch {
                logout();
                navigate("/auth/login", { replace: true });
            }
        })();
        return () => { alive = false; };
    }, [navigate]);

    return (
        <div style={{
            minHeight: "100vh", display: "grid", placeItems: "center",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        }}>
            <div style={{ textAlign: "center", opacity: .8 }}>{msg}</div>
        </div>
    );
}
