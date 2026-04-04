import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { updateCounselorProfile, updateParentProfile, updateUserProfile } from "../services/files";
import Sidebar from "../layouts/Sidebar";
import AvatarUpload from "../components/AvatarUpload";
import EducationDocsUpload from "../components/EducationDocsUpload";
import CampMembershipWidget from "../components/CampMembershipWidget";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { useSession } from "../state/sessionStore";
import { queryKeys } from "../state/queryKeys";
import "./Profile.css";

const ROLE_LABELS = {
    admin: "Администратор",
    user: "Пользователь",
    parent: "Родитель",
    counselor: "Вожатый",
};

const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const ALLOWED_PHONE_CHARS = /^[+\d()\s-]+$/;

function normalizeRoleKey(rawRole) {
    if (!rawRole) return "";
    const role = String(rawRole);
    return (role.startsWith("ROLE_") ? role.slice(5) : role).toLowerCase();
}

function toHumanRoles(roles) {
    return (Array.isArray(roles) ? roles : [])
        .map(normalizeRoleKey)
        .filter(Boolean)
        .map((roleKey) => ({
            key: roleKey,
            label: ROLE_LABELS[roleKey] || roleKey,
            className: `role-badge role-${roleKey}`,
        }));
}

function normalizePhone(value) {
    return (value ?? "").replace(/[^\d+]/g, "");
}

function validatePhone(value) {
    if (!value) return "";
    if (!ALLOWED_PHONE_CHARS.test(value)) {
        return "Допустимы только цифры, +, пробелы, скобки и дефис.";
    }

    const normalized = normalizePhone(value);
    return E164_REGEX.test(normalized) ? "" : "Телефон должен быть в формате E.164.";
}

function buildDisplayName(source) {
    if (!source) return "";
    const parts = [source.secondName, source.firstName, source.thirdName].filter(Boolean);
    return parts.join(" ").trim() || source.email || "—";
}

export default function Profile() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const session = useSession();
    const profileQuery = useCurrentUserProfile();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState(null);
    const [avatarLoaded, setAvatarLoaded] = useState(false);

    const [editingParent, setEditingParent] = useState(false);
    const [parentDraft, setParentDraft] = useState(null);
    const [savingParent, setSavingParent] = useState(false);

    const [editingCounselor, setEditingCounselor] = useState(false);
    const [counselorDraft, setCounselorDraft] = useState(null);
    const [savingCounselor, setSavingCounselor] = useState(false);

    const [phoneError, setPhoneError] = useState("");
    const [phoneTouched, setPhoneTouched] = useState(false);
    const copyRef = useRef(null);

    const user = profileQuery.data || null;
    const roles = session.user?.roles || [];
    const humanRoles = toHumanRoles(roles);
    const mainRole = humanRoles[0] || { label: "Пользователь", className: "role-badge role-user" };
    const extraRolesCount = Math.max(humanRoles.length - 1, 0);
    const isParent = roles.some((role) => /(^|_)parent$/i.test(String(role)));
    const isCounselor = roles.some((role) => /(^|_)counselor$/i.test(String(role)));

    useEffect(() => {
        if (session.isAuthenticated) return;
        logout().finally(() => navigate("/auth/login", { replace: true }));
    }, [navigate, session.isAuthenticated]);

    useEffect(() => {
        if (!user || editing) return;
        setDraft(user);
        setPhoneError(validatePhone(user.phone || ""));
    }, [user, editing]);

    useEffect(() => {
        if (!user || editingParent) return;
        setParentDraft(user.parent || {});
    }, [editingParent, user]);

    useEffect(() => {
        if (!user || editingCounselor) return;
        setCounselorDraft(user.counselor || {});
    }, [editingCounselor, user]);

    useEffect(() => {
        setAvatarLoaded(false);
    }, [user?.avatarUrl]);

    const fullName = useMemo(
        () => buildDisplayName(editing && draft ? draft : user),
        [draft, editing, user]
    );

    const updateProfileCache = (nextProfile) => {
        queryClient.setQueryData(queryKeys.me, nextProfile);
        setDraft(nextProfile);
        setParentDraft(nextProfile?.parent || {});
        setCounselorDraft(nextProfile?.counselor || {});
    };

    const preventEnterSubmit = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setDraft((previous) => ({ ...previous, [name]: value }));
    };

    const handlePhoneChange = (event) => {
        const { value } = event.target;
        setDraft((previous) => ({ ...previous, phone: value }));
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

        const nextPhoneError = validatePhone(draft.phone || "");
        setPhoneError(nextPhoneError);
        setPhoneTouched(true);
        if (nextPhoneError) return;

        setSaving(true);
        try {
            const { id, email, roles: ignoredRoles, avatarUrl, parent, counselor, ...payload } = draft;
            if (payload.phone) {
                payload.phone = normalizePhone(payload.phone.trim());
            }

            const saved = await updateUserProfile(payload);
            updateProfileCache(saved);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = (newUrl) => {
        setDraft((previous) => (previous ? { ...previous, avatarUrl: newUrl || null } : previous));
        queryClient.setQueryData(queryKeys.me, (current) =>
            current ? { ...current, avatarUrl: newUrl || null } : current
        );
        setAvatarLoaded(false);
    };

    const copyId = async () => {
        const value = user?.id || "";
        try {
            await navigator.clipboard.writeText(value);
            if (copyRef.current) {
                copyRef.current.classList.add("show");
                setTimeout(() => copyRef.current?.classList.remove("show"), 900);
            }
        } catch {
            alert(`ID: ${value}`);
        }
    };

    const saveParent = async () => {
        setSavingParent(true);
        try {
            const saved = await updateParentProfile(parentDraft || {});
            updateProfileCache(saved);
            setEditingParent(false);
        } finally {
            setSavingParent(false);
        }
    };

    const saveCounselor = async () => {
        setSavingCounselor(true);
        try {
            const saved = await updateCounselorProfile(counselorDraft || {});
            updateProfileCache(saved);
            setEditingCounselor(false);
        } finally {
            setSavingCounselor(false);
        }
    };

    const fixedTextarea = { resize: "none", height: 112, overflow: "auto" };

    if (profileQuery.isLoading || !user || !draft) {
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
                            {[...Array(6)].map((_, index) => (
                                <div className="field" key={index}>
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

    if (profileQuery.isError) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main">
                    <section className="card details">
                        <div className="title-row">
                            <h3 className="section-title">Профиль временно недоступен</h3>
                        </div>
                        <p className="muted">Не удалось загрузить ваши данные. Попробуйте ещё раз.</p>
                        <div className="edit-actions" style={{ marginTop: 16 }}>
                            <button
                                className="btn-primary sm"
                                type="button"
                                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.me })}
                            >
                                Повторить
                            </button>
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
                                    alt={fullName}
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

                {isCounselor && (
                    <CampMembershipWidget user={user} isOwnProfile currentUser={session.user} />
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
                                    disabled={saving || Boolean(phoneError)}
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
                                aria-invalid={Boolean(editing && phoneError)}
                                aria-describedby="phone-tip"
                                autoComplete="tel"
                            />
                            <div
                                id="phone-tip"
                                className={`tip-bubble ${editing && (phoneTouched || (draft?.phone?.length ?? 0) > 0) && phoneError ? "show" : ""}`}
                                role="alert"
                            >
                                {phoneError || " "}
                            </div>
                        </div>

                        <div className="field col-2">
                            <label>Роли</label>
                            <div className="chips">
                                {humanRoles.length ? (
                                    humanRoles.map(({ key, label, className }, index) => (
                                        <span key={`${key}-${index}`} className={className}>{label}</span>
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
                                    type="button"
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
                                    <button className="btn-ghost sm" type="button" onClick={() => setEditingParent(false)}>
                                        Отмена
                                    </button>
                                    <button className="btn-primary sm" type="button" onClick={saveParent} disabled={savingParent}>
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
                                    onChange={(event) => setParentDraft((previous) => ({ ...previous, emergencyContactName: event.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label>Телефон экстренного контакта</label>
                                <input
                                    className="input"
                                    readOnly={!editingParent}
                                    value={(editingParent ? parentDraft?.emergencyContactPhone : user.parent?.emergencyContactPhone) || ""}
                                    onChange={(event) => setParentDraft((previous) => ({ ...previous, emergencyContactPhone: event.target.value }))}
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
                                    onChange={(event) => setParentDraft((previous) => ({ ...previous, address: event.target.value }))}
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
                                    onChange={(event) => setParentDraft((previous) => ({ ...previous, notes: event.target.value }))}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {isCounselor && (
                    <section className="card details">
                        <div className="title-row">
                            <h3 className="section-title">Данные вожатого</h3>
                            {!editingCounselor ? (
                                <button
                                    className="btn-icon"
                                    type="button"
                                    onClick={() => {
                                        setEditingCounselor(true);
                                        setCounselorDraft(user.counselor || {});
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
                                    <button className="btn-ghost sm" type="button" onClick={() => setEditingCounselor(false)}>
                                        Отмена
                                    </button>
                                    <button className="btn-primary sm" type="button" onClick={saveCounselor} disabled={savingCounselor}>
                                        {savingCounselor ? "Сохраняем..." : "Сохранить"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-2" style={{ marginTop: 16 }}>
                            <div className="field">
                                <label>Специализация</label>
                                <input
                                    className="input"
                                    readOnly={!editingCounselor}
                                    value={(editingCounselor ? counselorDraft?.specialization : user.counselor?.specialization) || ""}
                                    onChange={(event) => setCounselorDraft((previous) => ({ ...previous, specialization: event.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label>Опыт (лет)</label>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    readOnly={!editingCounselor}
                                    value={editingCounselor ? (counselorDraft?.experienceYears ?? "") : (user.counselor?.experienceYears ?? "")}
                                    onChange={(event) =>
                                        setCounselorDraft((previous) => ({
                                            ...previous,
                                            experienceYears: event.target.value ? Number(event.target.value) : null,
                                        }))
                                    }
                                />
                            </div>
                            <div className="field col-2">
                                <label>О себе</label>
                                <textarea
                                    className="input"
                                    rows={4}
                                    style={fixedTextarea}
                                    readOnly={!editingCounselor}
                                    value={(editingCounselor ? counselorDraft?.bio : user.counselor?.bio) || ""}
                                    onChange={(event) => setCounselorDraft((previous) => ({ ...previous, bio: event.target.value }))}
                                />
                            </div>
                            <div className="field col-2">
                                <label>Документ об образовании</label>
                                <EducationDocsUpload
                                    fileIds={(editingCounselor ? counselorDraft?.educationDocumentIds : user.counselor?.educationDocumentIds) || ""}
                                    readOnly={!editingCounselor}
                                    onChange={(newIds) => setCounselorDraft((previous) => ({ ...previous, educationDocumentIds: newIds }))}
                                />
                            </div>
                            <div className="field">
                                <label>Telegram</label>
                                <input
                                    className="input"
                                    readOnly={!editingCounselor}
                                    value={(editingCounselor ? counselorDraft?.telegram : user.counselor?.telegram) || ""}
                                    onChange={(event) => setCounselorDraft((previous) => ({ ...previous, telegram: event.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label>Предпочтительные смены</label>
                                <input
                                    className="input"
                                    readOnly={!editingCounselor}
                                    value={(editingCounselor ? counselorDraft?.shiftPreference : user.counselor?.shiftPreference) || ""}
                                    onChange={(event) => setCounselorDraft((previous) => ({ ...previous, shiftPreference: event.target.value }))}
                                />
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
