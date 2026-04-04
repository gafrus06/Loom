import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken, logout, refreshTokens } from "../services/auth";
import { getProfileCompletionStatus } from "../services/files";

export default function RequireProfileComplete({ children }) {
    const [ready, setReady] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let cancelled = false;

        const goLogin = () => {
            navigate("/auth/login", { replace: true, state: { from: location } });
        };

        const goOnboarding = (missing) => {
            navigate("/onboarding", {
                replace: true,
                state: { missing: missing || [], from: location.pathname },
            });
        };

        (async () => {
            try {
                const token = getAccessToken();
                if (!token) {
                    goLogin();
                    return;
                }

                let status;
                try {
                    status = await getProfileCompletionStatus();
                } catch (error) {
                    const httpStatus = error?.status || error?.response?.status;
                    if (httpStatus === 401) {
                        const refreshed = await refreshTokens();
                        if (!refreshed) {
                            await logout();
                            goLogin();
                            return;
                        }
                        status = await getProfileCompletionStatus();
                    } else {
                        throw error;
                    }
                }

                if (cancelled) return;

                if (status?.complete) {
                    setReady(true);
                } else {
                    goOnboarding(status?.missingFields);
                }
            } catch {
                await logout();
                goLogin();
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [location, navigate]);

    if (!ready) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    color: "#A9B3C7",
                    background: "radial-gradient(circle 510px at 67% 100%, rgb(28, 11, 53) 6%, rgb(27, 17, 58) 20%, #0a0a0f 100%)",
                    fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif',
                }}
            />
        );
    }

    return children;
}
