import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUser, getUserProfileById, assignRole, revokeRole } from "../services/auth";
import Sidebar from "../layouts/Sidebar";
import CampMembershipWidget from "../components/CampMembershipWidget";
import EducationDocsUpload from "../components/EducationDocsUpload";
import "./UserProfile.css";

const ROLE_LABELS = {
    admin: "Администратор",
    user: "Пользователь",
    parent: "Родитель",
    counselor: "Вожатый",
};

const ROLE_SERVER = {
    parent: "ROLE_PARENT",
    counselor: "ROLE_COUNSELOR",
    admin: "ROLE_ADMIN",
    user: "ROLE_USER",
};

const normalizeRoleKey = (raw) =>
    raw ? (String(raw).startsWith("ROLE_") ? String(raw).slice(5) : String(raw)).toLowerCase() : "";

const toHumanRoles = (roles) =>
    (Array.isArray(roles) ? roles : [])
        .map(normalizeRoleKey)
        .filter(Boolean)
        .map((k) => ({
            key: k,
            label: ROLE_LABELS[k] || k,
            className: `role-badge role-${k}`,
        }));

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [viewUser, setViewUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [avatarLoaded, setAvatarLoaded] = useState(false);
    const [addingOpen, setAddingOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const dropdownRef = useRef(null);
    const rolesCardRef = useRef(null);

    const me = useMemo(() => getCurrentUser(), []);
    const myRoles = useMemo(() => (me?.roles || []).map(normalizeRoleKey), [me]);
    const canAdmin = myRoles.includes("admin");
    const canCounselor = myRoles.includes("counselor");
    const canEditRoles = canAdmin || canCounselor;

    useEffect(() => {
        if (me?.id && id && me.id === id) {
            navigate("/profile", { replace: true });
        }
    }, [id, me, navigate]);

    useEffect(() => {
        if (me?.id && id && me.id === id) return;
        let alive = true;
        setLoading(true);
        setAvatarLoaded(false);
        getUserProfileById(id)
            .then((u) => { if (alive) setViewUser(u); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [id, me]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (!addingOpen) return;
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setAddingOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [addingOpen]);

    useEffect(() => {
        const el = rolesCardRef.current;
        if (!el) return;
        if (addingOpen) {
            el.style.position = "relative";
            el.style.zIndex = "50";
        } else {
            el.style.zIndex = "";
            el.style.position = "";
        }
    }, [addingOpen]);

    if (loading || !viewUser) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main">
                    <section className="card profile-head">
                        <div className="avatar-wrap"><div className="avatar-xl skeleton shimmer" /></div>
                        <div className="head-info">
                            <div className="skeleton shimmer line title" style={{ width: "60%" }} />
                            <div className="skeleton shimmer line text" style={{ width: "30%" }} />
                        </div>
                    </section>
                    <section className="card details">
                        <div className="title-row"><div className="section-title">Профиль участника</div></div>
                        <div className="grid grid-2" style={{ marginTop: 16 }}>
                            {[...Array(6)].map((_, i) => (
                                <div className="field" key={i}>
                                    <div className="skeleton shimmer line tiny" style={{ width: "20%" }} />
                                    <div className="skeleton shimmer line" />
                                </div>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    const humanRoles = toHumanRoles(viewUser.roles || []);
    const mainRole = humanRoles[0] || { label: "Пользователь", className: "role-badge role-user" };
    const extraRolesCount = Math.max(humanRoles.length - 1, 0);

    const allowedToAddRaw = canAdmin ? ["parent", "counselor"] : canCounselor ? ["parent"] : [];
    const already = new Set((viewUser.roles || []).map(normalizeRoleKey));
    const addOptions = allowedToAddRaw.filter((r) => !already.has(r));

    const onPickRole = async (roleKey) => {
        if (!viewUser || !roleKey || busy) return;
        setBusy(true);
        try {
            await assignRole(viewUser.id, ROLE_SERVER[roleKey]);
            setViewUser((prev) => ({ ...prev, roles: [...(prev.roles || []), ROLE_SERVER[roleKey]] }));
            setAddingOpen(false);
        } catch (e) {
            alert(e.message || "Не удалось назначить роль");
        } finally {
            setBusy(false);
        }
    };

    const onRemoveRole = async (roleKey) => {
        if (!viewUser || !roleKey || busy) return;
        if (roleKey === "user") return;
        setBusy(true);
        try {
            await revokeRole(viewUser.id, ROLE_SERVER[roleKey]);
            setViewUser((prev) => ({
                ...prev,
                roles: (prev.roles || []).filter(r => r !== ROLE_SERVER[roleKey])
            }));
        } catch (e) {
            alert(e.message || "Не удалось удалить роль");
        } finally {
            setBusy(false);
        }
    };

    const hasParentRole = (viewUser.roles || []).map(normalizeRoleKey).includes("parent");
    const hasCounselorRole = (viewUser.roles || []).map(normalizeRoleKey).includes("counselor");
    const isOwnProfile = me?.id === viewUser?.id;

    return (
        <div className="layout">
            <Sidebar />
            <main className="main">
                <section className="card profile-head">
                    <div className="avatar-wrap">
                        <div style={{ position: "relative", width: 150, height: 150 }}>
                            {!avatarLoaded && viewUser.avatarUrl && (
                                <div className="avatar-xl skeleton shimmer" style={{ position: "absolute", inset: 0 }} />
                            )}
                            <img
                                className="avatar-xl"
                                src={viewUser.avatarUrl || "/user.png"}
                                alt=""
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", opacity: avatarLoaded || !viewUser.avatarUrl ? 1 : 0, transition: "opacity .3s ease" }}
                                onLoad={() => setAvatarLoaded(true)}
                                onError={(e) => { e.currentTarget.src = "/user.png"; setAvatarLoaded(true); }}
                            />
                        </div>
                    </div>

                    <div className="head-info">
                        <h1 className="display-name">
                            {[viewUser.secondName, viewUser.firstName, viewUser.thirdName].filter(Boolean).join(" ") || viewUser.email || "—"}
                        </h1>
                        <div className="subtitle">
                            <span className={mainRole.className}>{mainRole.label}</span>
                            {extraRolesCount > 0 && <span className="role-count">+{extraRolesCount}</span>}
                        </div>
                    </div>
                </section>

                {hasCounselorRole && (
                    <CampMembershipWidget
                        user={viewUser}
                        isOwnProfile={isOwnProfile}
                        currentUser={me}
                    />
                )}

                <section className="card details" ref={rolesCardRef}>
                    <div className="title-row spaced"><h3 className="section-title">Профиль участника</h3></div>

                    <div className="grid grid-2" ref={dropdownRef} style={{ marginTop: 16 }}>
                        <div className="field">
                            <label>Идентификатор</label>
                            <input className="input" readOnly value={viewUser.id || ""} />
                        </div>
                        <div className="field">
                            <label>Email</label>
                            <input className="input" readOnly value={viewUser.email || ""} />
                        </div>
                        <div className="field">
                            <label>Фамилия</label>
                            <input className="input" readOnly value={viewUser.secondName || ""} />
                        </div>
                        <div className="field">
                            <label>Имя</label>
                            <input className="input" readOnly value={viewUser.firstName || ""} />
                        </div>
                        <div className="field">
                            <label>Отчество</label>
                            <input className="input" readOnly value={viewUser.thirdName || ""} />
                        </div>
                        <div className="field">
                            <label>Телефон</label>
                            <input className="input" readOnly value={viewUser.phone || ""} />
                        </div>

                        <div className="field col-2">
                            <label>Роли</label>
                            <div className="chips roles-inline">
                                {humanRoles.length ? (
                                    humanRoles.map(({ key, label, className }, i) => (
                                        <span key={`${key}-${i}`} className={`${className} role-chip`}>
                                            {label}
                                            {canAdmin && key !== "user" && (
                                                <button
                                                    type="button"
                                                    className="role-chip-remove"
                                                    onClick={() => onRemoveRole(key)}
                                                    disabled={busy}
                                                    title="Снять роль"
                                                >X</button>
                                            )}
                                        </span>
                                    ))
                                ) : (
                                    <span className="muted">Нет ролей</span>
                                )}

                                {canEditRoles && (
                                    <div className="roles-adder" style={{ position: "relative", zIndex: addingOpen ? 100 : "auto" }}>
                                        <button type="button" className="btn-icon xs" onClick={() => setAddingOpen((v) => !v)} aria-label="Добавить роль">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                                        </button>

                                        {addingOpen && (
                                            <ul className="roles-menu" style={{ zIndex: 1000 }}>
                                                {addOptions.length ? (
                                                    addOptions.map((r) => (
                                                        <li key={r} className={`roles-item ${busy ? "disabled" : ""}`} onClick={() => !busy && onPickRole(r)}>
                                                            {ROLE_LABELS[r]}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="roles-empty">Нет доступных ролей</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {(hasParentRole || viewUser.parent) && (
                    <section className="card details">
                        <div className="title-row"><h3 className="section-title">Данные родителя</h3></div>
                        <div className="grid grid-2" style={{ marginTop: 16 }}>
                            <div className="field">
                                <label>Экстренный контакт (ФИО)</label>
                                <input className="input" readOnly value={viewUser.parent?.emergencyContactName || ""} />
                            </div>
                            <div className="field">
                                <label>Телефон экстренного контакта</label>
                                <input className="input" readOnly value={viewUser.parent?.emergencyContactPhone || ""} />
                            </div>
                            <div className="field col-2">
                                <label>Адрес вашего проживания</label>
                                <input className="input" readOnly value={viewUser.parent?.address || ""} />
                            </div>
                            <div className="field col-2">
                                <label>Заметки</label>
                                <textarea className="input" rows={4} readOnly style={{ resize: "none", height: 112, overflow: "auto" }} value={viewUser.parent?.notes || ""} />
                            </div>
                        </div>
                    </section>
                )}

                {(hasCounselorRole || viewUser.counselor) && (
                    <section className="card details">
                        <div className="title-row"><h3 className="section-title">Данные вожатого</h3></div>
                        <div className="grid grid-2" style={{ marginTop: 16 }}>
                            <div className="field">
                                <label>Специализация</label>
                                <input className="input" readOnly value={viewUser.counselor?.specialization || ""} />
                            </div>
                            <div className="field">
                                <label>Опыт (лет)</label>
                                <input className="input" readOnly value={viewUser.counselor?.experienceYears ?? ""} />
                            </div>
                            <div className="field col-2">
                                <label>О себе</label>
                                <textarea className="input" rows={4} readOnly style={{ resize: "none", height: 112, overflow: "auto" }} value={viewUser.counselor?.bio || ""} />
                            </div>
                            <div className="field col-2">
                                <label>Документ об образовании</label>
                                <EducationDocsUpload
                                    fileIds={viewUser.counselor?.educationDocumentIds || ""}
                                    readOnly={true}
                                />
                            </div>
                            <div className="field">
                                <label>Telegram</label>
                                <input className="input" readOnly value={viewUser.counselor?.telegram || ""} />
                            </div>
                            <div className="field">
                                <label>Предпочтительные смены</label>
                                <input className="input" readOnly value={viewUser.counselor?.shiftPreference || ""} />
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}