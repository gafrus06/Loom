import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { logout as doLogout } from "../services/auth";
import { useSession } from "../state/sessionStore";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";
import "./Sidebar.css";
import homeIcon from "../assets/sidebar/home.png";
import campIcon from "../assets/sidebar/camp.png";
import usersIcon from "../assets/sidebar/users.png";
import exitIcon from "../assets/sidebar/exit.png";
import chartIcon from "../assets/sidebar/chart.png";
import buyIcon from "../assets/sidebar/buy.png";
import smsIcon from "../assets/sidebar/sms.png";

const NavItem = ({ to, iconSrc, label, badge }) => {
    const { pathname } = useLocation();
    const active = pathname === to || (to !== "/" && pathname.startsWith(to));
    return (
        <Link to={to} className={`side-item ${active ? "active" : ""}`}>
            <img src={iconSrc} alt="" className="side-img-icon" />
            <span className="side-label">{label}</span>
            {badge > 0 && <span className="side-badge">{badge > 99 ? "99+" : badge}</span>}
        </Link>
    );
};

function hasRole(roles, role) {
    return (roles || []).some((rawRole) => {
        const value = String(rawRole).toLowerCase();
        return value === role || value === `role_${role}`;
    });
}

export default function Sidebar() {
    const navigate = useNavigate();
    const session = useSession();
    const me = session.user;
    const { data: profile } = useCurrentUserProfile();
    const { data: unreadCount = 0 } = useUnreadNotificationsCount();

    const displayName = useMemo(() => profile?.firstName || "Мой профиль", [profile]);
    const avatarUrl = profile?.avatarUrl || "/user.png";

    const isAdmin = hasRole(me?.roles, "admin");
    const isCounselor = hasRole(me?.roles, "counselor");
    const isSuperAdmin = hasRole(me?.roles, "super_admin");
    const isUser = hasRole(me?.roles, "user");

    const showCamps = Boolean(me) || isAdmin || isCounselor || isSuperAdmin || isUser;
    const showAnalytics = isAdmin || isSuperAdmin;

    const handleLogout = async () => {
        await doLogout();
        navigate("/auth/login");
    };

    return (
        <aside className="sidebar">
            <div className="side-brand">
                <span className="brand-script brand-big">Loom</span>
            </div>

            <nav className="side-nav">
                <NavItem to="/" iconSrc={homeIcon} label="Посты" />

                {showCamps && (
                    <NavItem to="/camps" iconSrc={campIcon} label="Лагеря" />
                )}

                {me && (
                    <NavItem to="/users" iconSrc={usersIcon} label="Все пользователи" />
                )}

                <NavItem to="/inbox" iconSrc={smsIcon} label="Уведомления" badge={unreadCount} />

                {showAnalytics && (
                    <NavItem to="/statistics" iconSrc={chartIcon} label="Аналитика" />
                )}

                <NavItem to="/subscription" iconSrc={buyIcon} label="Подписка" />
            </nav>

            <div className="side-bottom">
                <Link to="/profile" className="me">
                    <img
                        className="me-avatar"
                        src={avatarUrl}
                        onError={(event) => {
                            event.currentTarget.src = "/user.png";
                        }}
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
