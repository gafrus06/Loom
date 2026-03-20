// src/components/Sidebar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, logout as doLogout } from "../api/auth";
import { getUserProfile } from "../api/files";
import { LS_KEYS, EVENTS } from "../config/api";
import "../styles/sidebar.css";
import homeIcon  from "../assets/home.png";
import campIcon  from "../assets/camp.png";
import usersIcon from "../assets/users.png";
import exitIcon  from "../assets/exit.png";
import chartIcon from "../assets/chart.png";
import buyIcon   from "../assets/buy.png";

const NavItem = ({ to, iconSrc, label }) => {
    const { pathname } = useLocation();
    const active = pathname === to || (to !== "/" && pathname.startsWith(to));
    return (
        <Link to={to} className={`side-item ${active ? "active" : ""}`}>
            <img src={iconSrc} alt="" className="side-img-icon" />
            <span className="side-label">{label}</span>
        </Link>
    );
};

export default function Sidebar() {
    const navigate = useNavigate();
    const [me, setMe] = useState(null);
    const [profile, setProfile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(
        () => localStorage.getItem(LS_KEYS.AVATAR_URL) || "/user.png"
    );
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        const u = getCurrentUser();
        setMe(u || null);

        (async () => {
            try {
                const p = await getUserProfile();
                if (!mountedRef.current) return;
                setProfile(p || null);

                const url = p?.avatarUrl || null;
                if (url) {
                    localStorage.setItem(LS_KEYS.AVATAR_URL, url);
                    setAvatarUrl(url);
                } else {
                    localStorage.removeItem(LS_KEYS.AVATAR_URL);
                    setAvatarUrl("/user.png");
                }
            } catch {
                if (!mountedRef.current) return;
                setProfile(null);
                localStorage.removeItem(LS_KEYS.AVATAR_URL);
                setAvatarUrl("/user.png");
            }
        })();

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // реакция на изменения localStorage (другие вкладки)
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === LS_KEYS.AVATAR_URL) {
                setAvatarUrl(e.newValue || "/user.png");
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // реакция на кастомное событие из Profile/Onboarding/AvatarUpload
    useEffect(() => {
        const onAvatarUpdated = (e) => {
            const url = e.detail || null;
            if (url) {
                localStorage.setItem(LS_KEYS.AVATAR_URL, url);
                setAvatarUrl(url);
            } else {
                localStorage.removeItem(LS_KEYS.AVATAR_URL);
                setAvatarUrl("/user.png");
            }
        };
        window.addEventListener(EVENTS.AVATAR_UPDATED, onAvatarUpdated);
        return () => window.removeEventListener(EVENTS.AVATAR_UPDATED, onAvatarUpdated);
    }, []);

    const handleLogout = () => {
        doLogout();
        localStorage.removeItem(LS_KEYS.AVATAR_URL);
        setAvatarUrl("/user.png");
        navigate("/auth/login");
    };

    const displayName = useMemo(() => {
        const parts = [profile?.firstName].filter(Boolean);
        if (parts.length) return parts.join(" ");
        if (profile?.firstName) return profile.firstName;
        return "Мой профиль";
    }, [profile]);

    const isAdmin = useMemo(() => {
        if (!me?.roles) return false;
        return me.roles.some(r => {
            const s = String(r).toLowerCase();
            return s === "role_admin" || s === "admin";
        });
    }, [me]);

    return (
        <aside className="sidebar">
            <div className="side-brand">
                <span className="brand-script brand-big">Loom</span>
            </div>

            <nav className="side-nav">
                <NavItem to="/" iconSrc={homeIcon} label="Главная" />
                <NavItem to="/camps" iconSrc={campIcon} label="Лагеря" />
                <NavItem to="/users" iconSrc={usersIcon} label="Все пользователи" />
                <NavItem to="/subscription" iconSrc={buyIcon} label="Подписка" />

                {isAdmin && (
                    <NavItem to="/statistics" iconSrc={chartIcon} label="Аналитика" />
                )}
            </nav>

            <div className="side-bottom">
                <Link to="/profile" className="me">
                    <img
                        className="me-avatar"
                        src={avatarUrl || "/user.png"}
                        onError={(e) => (e.currentTarget.src = "/user.png")}
                        alt="avatar"
                    />
                    <div className="me-info">
                        <span className="me-name">{displayName}</span>
                        <span className="me-link">Открыть профиль</span>
                    </div>
                </Link>

                <button type="button" className="logout-btn" onClick={handleLogout}>
                    <img src={exitIcon} alt="" className="side-img-icon" />
                    <span>Выйти</span>
                </button>
            </div>
        </aside>
    );
}