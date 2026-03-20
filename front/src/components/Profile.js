import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, logout } from "../api/auth";
import {
    getUserProfile,
    updateUserProfile,
    updateParentProfile,
    updateCounselorProfile,
} from "../api/files";
import { LS_KEYS, EVENTS } from "../config/api";
import Sidebar from "./Sidebar";
import AvatarUpload from "./AvatarUpload";
import EducationDocsUpload from "./EducationDocsUpload";
import CampMembershipWidget from "./CampMembershipWidget";
import "../styles/profile.css";

const ROLE_LABELS = {
    admin: "Администратор",
    user: "Пользователь",
    parent: "Родитель",
    counselor: "Вожатый",
};

const normalizeRoleKey = (raw) =>
    raw
        ? (String(raw).startsWith("ROLE_") ? String(raw).slice(5) : String(raw)).toLowerCase()
        : "";

const toHumanRoles = (roles) =>
    (Array.isArray(roles) ? roles : [])
        .map(normalizeRoleKey)
        .filter(Boolean)
        .map((k) => ({
            key: k,
            label: ROLE_LABELS[k] || k,
            className: `role-badge role-${k}`,
        }));

/** ===== Локальная валидация телефона (без HTML pattern) ===== */
const E164_REGEX = /^\+[1-9]\d{1,10}$/;           // + и до 15 цифр
const ALLOWED_CHARS = /^[+\d()\s-]+$/;             // разрешённые символы в поле
const normalizePhone = (val) => (val ?? "").replace(/[^\d+]/g, "");
const validatePhone = (val) => {
    if (!val) return "";                              // пустое не ругаем — обязательность решает бэкенд
    if (!ALLOWED_CHARS.test(val)) return "Допустимы только цифры, +, пробелы, ( ) и -";
    const normalized = normalizePhone(val);
    return E164_REGEX.test(normalized) ? "" : "Телефон должен быть в формате E.164";
};

export default function Profile() {
    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState(null);
    const [avatarLoaded, setAvatarLoaded] = useState(false);

    const [editingParent, setEditingParent] = useState(false);
    const [parentDraft, setParentDraft] = useState(null);
    const [savingParent, setSavingParent] = useState(false);

    const [editingCouns, setEditingCouns] = useState(false);
    const [counsDraft, setCounsDraft] = useState(null);
    const [savingCouns, setSavingCouns] = useState(false);

    const [phoneError, setPhoneError] = useState("");
    const [phoneTouched, setPhoneTouched] = useState(false);

    const copyRef = useRef(null);

    const jwtUser = getCurrentUser();
    if (!jwtUser) {
        localStorage.removeItem(LS_KEYS.AVATAR_URL);
        logout();
        window.location.href = "/auth/login";
    }
    const myJwtRoles = jwtUser?.roles ?? [];
    const humanRoles = toHumanRoles(myJwtRoles);
    const mainRole = humanRoles[0] || { label: "Пользователь", className: "role-badge role-user" };
    const extraRolesCount = Math.max(humanRoles.length - 1, 0);

    const isParent = myJwtRoles.map(String).some((r) => /(^|_)parent$/i.test(r));
    const isCounselor = myJwtRoles.map(String).some((r) => /(^|_)counselor$/i.test(r));

    // загрузка профиля
    useEffect(() => {
        (async () => {
            try {
                const p = await getUserProfile();
                setUser(p);
                setDraft(p);
                setPhoneError(validatePhone(p?.phone || ""));

                if (p?.avatarUrl) localStorage.setItem(LS_KEYS.AVATAR_URL, p.avatarUrl);
                else localStorage.removeItem(LS_KEYS.AVATAR_URL);
                setAvatarLoaded(false);
            } catch {
                localStorage.removeItem(LS_KEYS.AVATAR_URL);
                logout();
                window.location.href = "/auth/login";
            }
        })();
    }, []);

    // синхронизация аватара
    useEffect(() => {
        const onAvatarUpdated = (e) => {
            const url = e.detail || null;
            setUser((u) => (u ? { ...u, avatarUrl: url || null } : u));
            setDraft((d) => (d ? { ...d, avatarUrl: url || null } : d));
        };
        const onStorage = (e) => {
            if (e.key === LS_KEYS.AVATAR_URL) {
                const url = e.newValue || null;
                setUser((u) => (u ? { ...u, avatarUrl: url || null } : u));
                setDraft((d) => (d ? { ...d, avatarUrl: url || null } : d));
            }
        };
        window.addEventListener(EVENTS.AVATAR_UPDATED, onAvatarUpdated);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener(EVENTS.AVATAR_UPDATED, onAvatarUpdated);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const fullName = useMemo(() => {
        const src = editing ? draft : user;
        if (!src) return "";
        const parts = [src.secondName, src.firstName, src.thirdName].filter(Boolean);
        return parts.join(" ").trim() || src.email || "—";
    }, [user, draft, editing]);

    // предотвращаем случайный submit по Enter (если выше по дереву есть <form>)
    const preventEnterSubmit = (e) => {
        if (e.key === "Enter") e.preventDefault();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDraft((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (e) => {
        const { value } = e.target;
        setDraft((prev) => ({ ...prev, phone: value }));
        setPhoneError(validatePhone(value));
        if (!phoneTouched) setPhoneTouched(true);
    };

    const startEdit = () => {
        setDraft(user);
        setEditing(true);
        setPhoneError(validatePhone(user?.phone || ""));
        setPhoneTouched(false);
    };

    const cancelEdit = () => {
        setDraft(user);
        setEditing(false);
        setPhoneTouched(false);
    };

    const handleSave = async () => {
        if (!draft) return;

        const err = validatePhone(draft.phone || "");
        setPhoneError(err);
        setPhoneTouched(true);
        if (err) return;

        setSaving(true);
        try {
            const { id, email, roles, avatarUrl, parent, counselor, ...payload } = draft;
            if (payload.phone) payload.phone = normalizePhone(payload.phone.trim());

            const saved = await updateUserProfile(payload);
            setUser(saved);
            setDraft(saved);

            if (saved?.avatarUrl) localStorage.setItem(LS_KEYS.AVATAR_URL, saved.avatarUrl);
            else localStorage.removeItem(LS_KEYS.AVATAR_URL);

            window.dispatchEvent(new CustomEvent(EVENTS.AVATAR_UPDATED, { detail: saved?.avatarUrl || null }));
            setEditing(false);
            setAvatarLoaded(false);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = (newUrl) => {
        setDraft((p) => ({ ...p, avatarUrl: newUrl }));
        setUser((p) => ({ ...p, avatarUrl: newUrl }));
        if (newUrl) localStorage.setItem(LS_KEYS.AVATAR_URL, newUrl);
        else localStorage.removeItem(LS_KEYS.AVATAR_URL);
        window.dispatchEvent(new CustomEvent(EVENTS.AVATAR_UPDATED, { detail: newUrl || null }));
        setAvatarLoaded(false);
    };

    const copyId = async () => {
        const value = user?.id || "";
        try {
            await navigator.clipboard.writeText(value);
            if (copyRef.current) {
                copyRef.current.classList.add("show");
                setTimeout(() => copyRef.current.classList.remove("show"), 900);
            }
        } catch {
            alert("ID: " + value);
        }
    };

    const saveParent = async () => {
        setSavingParent(true);
        try {
            const saved = await updateParentProfile(parentDraft || {});
            setUser(saved);
            setParentDraft(saved.parent || {});
            setEditingParent(false);

            if (saved?.avatarUrl) localStorage.setItem(LS_KEYS.AVATAR_URL, saved.avatarUrl);
            else localStorage.removeItem(LS_KEYS.AVATAR_URL);
            window.dispatchEvent(new CustomEvent(EVENTS.AVATAR_UPDATED, { detail: saved?.avatarUrl || null }));
        } finally {
            setSavingParent(false);
        }
    };

    const saveCouns = async () => {
        setSavingCouns(true);
        try {
            const saved = await updateCounselorProfile(counsDraft || {});
            setUser(saved);
            setCounsDraft(saved.counselor || {});
            setEditingCouns(false);

            if (saved?.avatarUrl) localStorage.setItem(LS_KEYS.AVATAR_URL, saved.avatarUrl);
            else localStorage.removeItem(LS_KEYS.AVATAR_URL);
            window.dispatchEvent(new CustomEvent(EVENTS.AVATAR_UPDATED, { detail: saved?.avatarUrl || null }));
        } finally {
            setSavingCouns(false);
        }
    };

    const fixedTextarea = { resize: "none", height: 112, overflow: "auto" };

    if (!user || !draft) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main">
                    <section className="card profile-head">
                        <div className="avatar-wrap">
                            <div className="avatar-xl skeleton shimmer" />
                        </div>
                        <div className="head-info">
                            <div className="skeleton shimmer line title" style={{ width: "60%" }} />
                            <div className="skeleton shimmer line text" style={{ width: "30%" }} />
                        </div>
                    </section>
                    <section className="card details">
                        <div className="title-row">
                            <div className="section-title">Личные данные</div>
                        </div>
                        <div className="grid grid-2">
                            {[...Array(6)].map((_, i) => (
                                <div className="field" key={i}>
                                    <div className="skeleton shimmer line tiny" style={{ width: "20%" }} />
                                    <div className="skeleton shimmer line" />
                                </div>
                            ))}
                            <div className="field col-2">
                                <div className="skeleton shimmer line tiny" style={{ width: "10%" }} />
                                <div className="skeleton shimmer line" />
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main" onKeyDown={preventEnterSubmit}>
                <section className="card profile-head">
                    <div className="avatar-wrap">
                        {!editing ? (
                            <div style={{ position: "relative", width: "150px", height: "150px" }}>
                                {!avatarLoaded && user.avatarUrl && (
                                    <div className="avatar-xl skeleton shimmer" style={{ position: "absolute", inset: 0 }} />
                                )}
                                <img
                                    className="avatar-xl"
                                    src={user.avatarUrl || "/user.png"}
                                    alt=""
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                        opacity: avatarLoaded || !user.avatarUrl ? 1 : 0,
                                        transition: "opacity .3s ease",
                                    }}
                                    onLoad={() => setAvatarLoaded(true)}
                                    onError={() => setAvatarLoaded(true)}
                                />
                            </div>
                        ) : (
                            <AvatarUpload
                                currentAvatarUrl={draft.avatarUrl || "/user.png"}
                                onAvatarChange={handleAvatarChange}
                                disabled={!editing}
                            />
                        )}
                    </div>

                    <div className="head-info">
                        <h1 className="display-name">{fullName}</h1>
                        <div className="subtitle">
                            <span className={mainRole.className}>{mainRole.label}</span>
                            {extraRolesCount > 0 && <span className="role-count">+{extraRolesCount}</span>}
                        </div>
                    </div>
                </section>

                {/* Виджет членства в лагере - для вожатых */}
                {isCounselor && (
                    <CampMembershipWidget
                        user={user}
                        isOwnProfile={true}
                        currentUser={jwtUser}
                    />
                )}

                <section className="card details">
                    <div className="title-row">
                        <h3 className="section-title">Личные данные</h3>
                        {!editing ? (
                            <button className="btn-icon" type="button" title="Редактировать" onClick={startEdit}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                    <path
                                        d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Z"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinejoin="round"
                                    />
                                    <path d="M14.75 4.19 19 8.44" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                            </button>
                        ) : (
                            <div className="edit-actions">
                                <button className="btn-ghost sm" type="button" onClick={cancelEdit}>
                                    Отмена
                                </button>
                                <button
                                    className="btn-primary sm"
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || (!!(editing && phoneError))}
                                    title={phoneError || ""}
                                >
                                    {saving ? "Сохраняем..." : "Сохранить"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-2">
                        <div className="field">
                            <label>ID</label>
                            <div className="input-with-action">
                                <input className="input" value={user.id || ""} readOnly />
                                <button
                                    type="button"
                                    className="btn-icon xs"
                                    title="Скопировать ID"
                                    onClick={copyId}
                                    aria-label="Скопировать ID"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                                        <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                                        <rect x="4" y="4" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                                    </svg>
                                </button>
                                <span ref={copyRef} className="copy-badge">Скопировано</span>
                            </div>
                        </div>

                        <div className="field">
                            <label>Email</label>
                            <input className="input" value={user.email || ""} readOnly />
                        </div>

                        <div className="field">
                            <label>Фамилия</label>
                            <input
                                className="input"
                                name="secondName"
                                value={(editing ? draft.secondName : user.secondName) || ""}
                                onChange={handleChange}
                                placeholder="Фамилия"
                                readOnly={!editing}
                            />
                        </div>
                        <div className="field">
                            <label>Имя</label>
                            <input
                                className="input"
                                name="firstName"
                                value={(editing ? draft.firstName : user.firstName) || ""}
                                onChange={handleChange}
                                placeholder="Имя"
                                readOnly={!editing}
                            />
                        </div>
                        <div className="field">
                            <label>Отчество</label>
                            <input
                                className="input"
                                name="thirdName"
                                value={(editing ? draft.thirdName : user.thirdName) || ""}
                                onChange={handleChange}
                                placeholder="Отчество"
                                readOnly={!editing}
                            />
                        </div>

                        {/* Телефон с подсветкой ошибки и подсказкой — БЕЗ pattern */}
                        <div className="field posrel">
                            <label>Телефон</label>
                            <input
                                className={`input ${editing && phoneError ? "invalid" : ""}`}
                                name="phone"
                                value={(editing ? draft.phone : user.phone) || ""}
                                onChange={handlePhoneChange}
                                onBlur={() => setPhoneTouched(true)}
                                placeholder="+7 999 000-00-00"
                                readOnly={!editing}
                                inputMode="tel"
                                aria-invalid={!!(editing && phoneError)}
                                aria-describedby="phone-tip"
                                autoComplete="tel"
                            />
                            <div
                                id="phone-tip"
                                className={`tip-bubble ${
                                    editing && (phoneTouched || (draft?.phone?.length ?? 0) > 0) && phoneError ? "show" : ""
                                }`}
                                role="alert"
                            >
                                {phoneError || " "}
                            </div>
                        </div>

                        <div className="field col-2">
                            <label>Роли</label>
                            <div className="chips">
                                {humanRoles.length ? (
                                    humanRoles.map(({ key, label, className }, i) => (
                                        <span key={`${key}-${i}`} className={className}>{label}</span>
                                    ))
                                ) : (
                                    <span className="muted">Нет ролей</span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {isParent && (
                    <section className="card details">
                        <div className="title-row">
                            <h3 className="section-title">Данные родителя</h3>
                            {!editingParent ? (
                                <button
                                    className="btn-icon"
                                    onClick={() => {
                                        setEditingParent(true);
                                        setParentDraft(user.parent || {});
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                        <path
                                            d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Z"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinejoin="round"
                                        />
                                        <path d="M14.75 4.19 19 8.44" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="edit-actions">
                                    <button className="btn-ghost sm" onClick={() => setEditingParent(false)}>
                                        Отмена
                                    </button>
                                    <button className="btn-primary sm" onClick={saveParent} disabled={savingParent}>
                                        {savingParent ? "Сохраняем..." : "Сохранить"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-2" style={{ marginTop: 16 }}>
                            <div className="field">
                                <label>Экстренный контакт (ФИО)</label>
                                <input
                                    className="input"
                                    readOnly={!editingParent}
                                    value={(editingParent ? parentDraft?.emergencyContactName : user.parent?.emergencyContactName) || ""}
                                    onChange={(e) => setParentDraft((p) => ({ ...p, emergencyContactName: e.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label>Телефон экстренного контакта</label>
                                <input
                                    className="input"
                                    readOnly={!editingParent}
                                    value={(editingParent ? parentDraft?.emergencyContactPhone : user.parent?.emergencyContactPhone) || ""}
                                    onChange={(e) => setParentDraft((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                                    placeholder="+7 999 000-00-00"
                                    inputMode="tel"
                                    autoComplete="tel"
                                />
                            </div>
                            <div className="field col-2">
                                <label>Адрес</label>
                                <input
                                    className="input"
                                    readOnly={!editingParent}
                                    value={(editingParent ? parentDraft?.address : user.parent?.address) || ""}
                                    onChange={(e) => setParentDraft((p) => ({ ...p, address: e.target.value }))}
                                />
                            </div>
                            <div className="field col-2">
                                <label>Заметки</label>
                                <textarea
                                    className="input"
                                    rows={4}
                                    style={fixedTextarea}
                                    readOnly={!editingParent}
                                    value={(editingParent ? parentDraft?.notes : user.parent?.notes) || ""}
                                    onChange={(e) => setParentDraft((p) => ({ ...p, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {isCounselor && (
                    <section className="card details">
                        <div className="title-row">
                            <h3 className="section-title">Данные вожатого</h3>
                            {!editingCouns ? (
                                <button
                                    className="btn-icon"
                                    onClick={() => {
                                        setEditingCouns(true);
                                        setCounsDraft(user.counselor || {});
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                        <path
                                            d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Z"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinejoin="round"
                                        />
                                        <path d="M14.75 4.19 19 8.44" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="edit-actions">
                                    <button className="btn-ghost sm" onClick={() => setEditingCouns(false)}>
                                        Отмена
                                    </button>
                                    <button className="btn-primary sm" onClick={saveCouns} disabled={savingCouns}>
                                        {savingCouns ? "Сохраняем..." : "Сохранить"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-2" style={{ marginTop: 16 }}>
                            <div className="field">
                                <label>Специализация</label>
                                <input
                                    className="input"
                                    readOnly={!editingCouns}
                                    value={(editingCouns ? counsDraft?.specialization : user.counselor?.specialization) || ""}
                                    onChange={(e) => setCounsDraft((p) => ({ ...p, specialization: e.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label>Опыт (лет)</label>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    readOnly={!editingCouns}
                                    value={editingCouns ? (counsDraft?.experienceYears ?? "") : (user.counselor?.experienceYears ?? "")}
                                    onChange={(e) =>
                                        setCounsDraft((p) => ({
                                            ...p,
                                            experienceYears: e.target.value ? Number(e.target.value) : null,
                                        }))
                                    }
                                />
                            </div>
                            <div className="field col-2">
                                <label>О себе</label>
                                <textarea
                                    className="input"
                                    rows={4}
                                    style={{ resize: "none", height: 112, overflow: "auto" }}
                                    readOnly={!editingCouns}
                                    value={(editingCouns ? counsDraft?.bio : user.counselor?.bio) || ""}
                                    onChange={(e) => setCounsDraft((p) => ({ ...p, bio: e.target.value }))}
                                />
                            </div>
                            <div className="field col-2">
                                <label>Документ об образовании</label>
                                <EducationDocsUpload
                                    fileIds={(editingCouns ? counsDraft?.educationDocumentIds : user.counselor?.educationDocumentIds) || ""}
                                    readOnly={!editingCouns}
                                    onChange={(newIds) => setCounsDraft((p) => ({ ...p, educationDocumentIds: newIds }))}
                                />
                            </div>
                            <div className="field">
                                <label>Telegram</label>
                                <input
                                    className="input"
                                    readOnly={!editingCouns}
                                    value={(editingCouns ? counsDraft?.telegram : user.counselor?.telegram) || ""}
                                    onChange={(e) => setCounsDraft((p) => ({ ...p, telegram: e.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label>Предпочтительные смены</label>
                                <input
                                    className="input"
                                    readOnly={!editingCouns}
                                    value={(editingCouns ? counsDraft?.shiftPreference : user.counselor?.shiftPreference) || ""}
                                    onChange={(e) => setCounsDraft((p) => ({ ...p, shiftPreference: e.target.value }))}
                                />
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}