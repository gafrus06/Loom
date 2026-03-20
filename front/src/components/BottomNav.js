import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { getCurrentUser } from "../api/auth";
import { LS_KEYS } from "../config/api";
import homeIcon  from "../assets/home.png";
import campIcon  from "../assets/camp.png";
import usersIcon from "../assets/users.png";
import chartIcon from "../assets/chart.png";
import buyIcon   from "../assets/buy.png";

export default function BottomNav() {
    const avatarUrl = localStorage.getItem(LS_KEYS?.AVATAR_URL) || "/user.png";

    const isAdmin = useMemo(() => {
        const me = getCurrentUser();
        if (!me?.roles) return false;
        return me.roles.some(r => {
            const s = String(r).toLowerCase();
            return s === "role_admin" || s === "admin";
        });
    }, []);

    return (
        <nav className="bottom-nav" role="navigation" aria-label="Навигация">

            <NavLink to="/" end className={({ isActive }) => "bn-item" + (isActive ? " active" : "")}>
                <img src={homeIcon} alt="" className="bn-ico" />
                <span className="bn-label">Главная</span>
            </NavLink>

            <NavLink to="/camps" className={({ isActive }) => "bn-item" + (isActive ? " active" : "")}>
                <img src={campIcon} alt="" className="bn-ico" />
                <span className="bn-label">Лагеря</span>
            </NavLink>

            <NavLink to="/users" className={({ isActive }) => "bn-item" + (isActive ? " active" : "")}>
                <img src={usersIcon} alt="" className="bn-ico" />
                <span className="bn-label">Пользователи</span>
            </NavLink>

            <NavLink to="/subscription" className={({ isActive }) => "bn-item" + (isActive ? " active" : "")}>
                <img src={buyIcon} alt="" className="bn-ico" />
                <span className="bn-label">Подписка</span>
            </NavLink>

            {isAdmin && (
                <NavLink to="/statistics" className={({ isActive }) => "bn-item" + (isActive ? " active" : "")}>
                    <img src={chartIcon} alt="" className="bn-ico" />
                    <span className="bn-label">Статистика</span>
                </NavLink>
            )}

            <NavLink to="/profile" className={({ isActive }) => "bn-item" + (isActive ? " active" : "")}>
                <img
                    src={avatarUrl}
                    alt=""
                    className="bn-ico bn-avatar"
                    onError={e => { e.currentTarget.src = "/user.png"; }}
                />
                <span className="bn-label">Профиль</span>
            </NavLink>

        </nav>
    );
}