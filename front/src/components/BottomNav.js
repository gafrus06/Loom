import { NavLink } from "react-router-dom";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { useSession } from "../state/sessionStore";
import homeIcon from "../assets/sidebar/home.png";
import campIcon from "../assets/sidebar/camp.png";
import usersIcon from "../assets/sidebar/users.png";
import chartIcon from "../assets/sidebar/chart.png";
import buyIcon from "../assets/sidebar/buy.png";

function hasRole(roles, role) {
    return (roles || []).some((rawRole) => {
        const value = String(rawRole).toLowerCase();
        return value === role || value === `role_${role}`;
    });
}

export default function BottomNav() {
    const session = useSession();
    const { data: profile } = useCurrentUserProfile();
    const roles = session.user?.roles || [];
    const isAdmin = hasRole(roles, "admin");
    const avatarUrl = profile?.avatarUrl || "/user.png";

    return (
        <nav className="bottom-nav" role="navigation" aria-label="Навигация">
            <NavLink to="/" end className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
                <img src={homeIcon} alt="" className="bn-ico" />
                <span className="bn-label">Главная</span>
            </NavLink>

            <NavLink to="/camps" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
                <img src={campIcon} alt="" className="bn-ico" />
                <span className="bn-label">Лагеря</span>
            </NavLink>

            <NavLink to="/users" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
                <img src={usersIcon} alt="" className="bn-ico" />
                <span className="bn-label">Пользователи</span>
            </NavLink>

            <NavLink to="/subscription" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
                <img src={buyIcon} alt="" className="bn-ico" />
                <span className="bn-label">Подписка</span>
            </NavLink>

            {isAdmin && (
                <NavLink to="/statistics" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
                    <img src={chartIcon} alt="" className="bn-ico" />
                    <span className="bn-label">Статистика</span>
                </NavLink>
            )}

            <NavLink to="/profile" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
                <img
                    src={avatarUrl}
                    alt=""
                    className="bn-ico bn-avatar"
                    onError={(event) => {
                        event.currentTarget.src = "/user.png";
                    }}
                />
                <span className="bn-label">Профиль</span>
            </NavLink>
        </nav>
    );
}
