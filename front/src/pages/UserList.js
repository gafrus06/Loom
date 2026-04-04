import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch, getCurrentUser } from "../services/auth";
import { API_BASE } from "../config/api";
import Sidebar from "../layouts/Sidebar";
import "./UserList.css";


const ROLE_LABELS = {
    admin:     "Администратор",
    counselor: "Вожатый",
    parent:    "Родитель",
    user:      "Пользователь",
};
const ROLE_ICONS = { admin: "👑", counselor: "🏕️", parent: "👨‍👧", user: "👤" };
const ROLE_PRIORITY = ["admin", "counselor", "parent", "user"];
const FILTERS = [
    { key: "all",      label: "Все",            icon: "🌐", chipClass: "chip-all"      },
    { key: "admin",    label: "Администраторы", icon: "👑", chipClass: "chip-admin"    },
    { key: "counselor",label: "Вожатые",        icon: "🏕️", chipClass: "chip-counselor"},
    { key: "parent",   label: "Родители",       icon: "👨‍👧", chipClass: "chip-parent"   },
    { key: "user",     label: "Пользователи",   icon: "👤", chipClass: "chip-user"     },
];

function normalizeRoleKey(raw) {
    if (!raw) return "";
    const s = String(raw).trim();
    return s.startsWith("ROLE_") ? s.slice(5).toLowerCase() : s.toLowerCase();
}
function pickHighestRole(roles) {

    if (!Array.isArray(roles) || !roles.length) return "user";
    const normalized = roles.map(r =>
        String(r ?? "").trim().replace(/^ROLE_/i, "").toLowerCase()
    );
    return ROLE_PRIORITY.find(key => normalized.includes(key)) ?? "user";
}

const PAGE_SIZE = 20;

export default function UserList() {
    const [users, setUsers]         = useState([]);
    const [page, setPage]           = useState(0);
    const [loading, setLoading]     = useState(false);
    const [hasMore, setHasMore]     = useState(true);
    const [error, setError]         = useState("");
    const [search, setSearch]       = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [view, setView]           = useState("table"); // "table" | "cards"
    const observerRef = useRef(null);
    const me = getCurrentUser();

    const loadUsers = async (pageNum) => {

        if (loading || !hasMore) return;
        setLoading(true); setError("");
        try {
            const res  = await authFetch(`${API_BASE}/users/all?page=${pageNum}&size=${PAGE_SIZE}`);
            if (!res.ok) throw new Error("Ошибка загрузки");
            const data = await res.json();
            console.log("first user:", JSON.stringify(data.users?.[2], null, 2));// посмотри что реально приходит с бэкенда
            setUsers(prev => {
                const seen = new Set(prev.map(u => u.id));
                return [...prev, ...(data.users || []).filter(u => !seen.has(u.id))];
            });
            setPage((data.currentPage ?? pageNum) + 1);
            setHasMore(((data.currentPage ?? 0) + 1) < (data.totalPages ?? 0));
        } catch (e) {
            setError(e?.message || "Ошибка");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadUsers(0); }, []); // eslint-disable-line

    useEffect(() => {
        if (!users.length && !loading) return;
        const obs = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loading && hasMore) loadUsers(page);
        });
        const node = observerRef.current;
        if (node) obs.observe(node);
        return () => obs.disconnect();
    }, [page, loading, hasMore, users.length]); // eslint-disable-line

    const filtered = users.filter(u => {
        if (roleFilter !== "all" && pickHighestRole(u.roles) !== roleFilter) return false;
        if (!search.trim()) return true;
        const t = search.toLowerCase();
        return u.id.toLowerCase().includes(t)
            || u.email.toLowerCase().includes(t)
            || (u.firstName  && u.firstName.toLowerCase().includes(t))
            || (u.secondName && u.secondName.toLowerCase().includes(t));
    });

    // счётчики по ролям
    const counts = { all: users.length };
    users.forEach(u => {
        const k = pickHighestRole(u.roles);
        counts[k] = (counts[k] || 0) + 1;
    });

    return (
        <div className="layout">
            <Sidebar />
            <main className="ul-main">

                {/* ── Шапка ── */}
                <div className="ul-page-header">
                    <div>
                        <h1 className="ul-page-title">Пользователи</h1>
                        <p className="ul-page-sub">{users.length} загружено</p>
                    </div>
                    {/* Переключатель вида */}
                    <div className="ul-view-toggle">
                        <button
                            className={`ul-toggle-btn${view === "table" ? " active" : ""}`}
                            onClick={() => setView("table")}
                            title="Таблица"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="5" rx="1"/><rect x="3" y="10" width="18" height="5" rx="1"/><rect x="3" y="17" width="18" height="5" rx="1"/>
                            </svg>
                        </button>
                        <button
                            className={`ul-toggle-btn${view === "cards" ? " active" : ""}`}
                            onClick={() => setView("cards")}
                            title="Карточки"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Фильтры по ролям ── */}
                <div className="ul-role-strip">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            className={`ul-role-chip ${f.chipClass}${roleFilter === f.key ? " active" : ""}`}
                            onClick={() => setRoleFilter(f.key)}
                        >
                            <span className="chip-icon">{f.icon}</span>
                            <span className="chip-label">{f.label}</span>
                            <span className="chip-count">{counts[f.key] || 0}</span>
                        </button>
                    ))}
                </div>

                {/* ── Поиск ── */}
                <div className="ul-search-row">
                    <div className="ul-search-wrap">
                        <svg className="ul-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            className="ul-search"
                            type="text"
                            placeholder="Поиск по имени, email, ID…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="ul-search-clear" onClick={() => setSearch("")}>×</button>
                        )}
                    </div>
                    <span className="ul-results-count">{filtered.length} результатов</span>
                </div>

                {/* ── Таблица ── */}
                {view === "table" && (
                    <div className="ul-table-wrap">
                        <table className="ul-table">
                            <thead>
                            <tr>
                                <th style={{width:48}}>№</th>
                                <th>Пользователь</th>
                                <th className="col-email">Email</th>
                                <th className="col-role-desktop" style={{width:160}}>Роль</th>
                                <th style={{width:110}}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((u, i) => {
                                const rk   = pickHighestRole(u.roles);
                                const isMe = me && me.id === u.id;
                                return (
                                    <tr key={u.id} className={isMe ? "ul-row-me" : ""}>
                                        <td className="ul-td-num">{i + 1}</td>
                                        <td>
                                            <div className="ul-td-user">
                                                <img
                                                    src={u.avatarUrl || "/user.png"}
                                                    alt=""
                                                    className="ul-td-avatar"
                                                    onError={e => e.currentTarget.src = "/user.png"}
                                                />
                                                <div>
                                                    <p className="ul-td-name">
                                                        {u.firstName || ""} {u.secondName || ""}
                                                        {isMe && <span className="ul-td-me-tag">вы</span>}
                                                    </p>
                                                    {/* email под именем — только мобилка */}
                                                    <p className="ul-td-email ul-td-email-mobile">{u.email}</p>
                                                    {/* роль под email — только мобилка */}
                                                    <span className={`ul-role-badge role-${rk} ul-td-role-mobile`}>
                                                        {ROLE_LABELS[rk]}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Email — отдельная колонка на десктопе */}
                                        <td className="col-email">
                                            <span className="ul-td-email">{u.email}</span>
                                        </td>
                                        <td className="col-role-desktop">
                                            <span className={`ul-role-badge role-${rk}`}>
                                                {ROLE_LABELS[rk]}
                                            </span>
                                        </td>
                                        <td>
                                            <Link
                                                to={isMe ? "/profile" : `/users/${u.id}`}
                                                className="ul-goto-btn"
                                            >
                                                {isMe ? "Профиль" : "Открыть"}
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Карточки ── */}
                {view === "cards" && (
                    <div className="ul-cards-grid">
                        {filtered.map((u, i) => {
                            const rk   = pickHighestRole(u.roles);
                            const isMe = me && me.id === u.id;
                            return (
                                <Link
                                    key={u.id}
                                    to={isMe ? "/profile" : `/users/${u.id}`}
                                    className={`ul-card${isMe ? " ul-card-me" : ""}`}
                                >
                                    <div className={`ul-card-accent accent-${rk}`} />
                                    <div className="ul-card-top">
                                        <div className="ul-card-avatar-wrap">
                                            <img
                                                src={u.avatarUrl || "/user.png"}
                                                alt=""
                                                className="ul-card-avatar"
                                                onError={e => e.currentTarget.src = "/user.png"}
                                            />
                                            {isMe && <span className="ul-card-me-dot" />}
                                        </div>
                                        <span className={`ul-role-badge role-${rk}`}>
                                        {ROLE_LABELS[rk]}
                                    </span>
                                    </div>
                                    <div className="ul-card-body">
                                        <p className="ul-card-name">
                                            {u.firstName || ""} {u.secondName || ""}
                                        </p>
                                        <p className="ul-card-email">{u.email}</p>
                                    </div>
                                    <div className="ul-card-footer">
                                        <span className="ul-card-num">#{i + 1}</span>
                                        <span className="ul-card-arrow">→</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* ── Состояния ── */}
                {filtered.length === 0 && !loading && (
                    <div className="ul-empty">
                        <span className="ul-empty-icon">🔍</span>
                        <p>Ничего не найдено</p>
                        {(search || roleFilter !== "all") && (
                            <button className="ul-empty-reset" onClick={() => { setSearch(""); setRoleFilter("all"); }}>
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                )}

                <div ref={observerRef} style={{ height: "1px" }} />

                {/* Скелетон при первой загрузке — строки внутри таблицы */}
                {loading && users.length === 0 && view === "table" && (
                    <div className="ul-table-wrap" style={{marginTop: 0}}>
                        <table className="ul-table">
                            <tbody>
                            {[...Array(8)].map((_, i) => (
                                <tr key={i}>
                                    <td className="ul-td-num"><div className="ul-skel" style={{width:24,height:18}}/></td>
                                    <td>
                                        <div className="ul-td-user">
                                            <div className="ul-skel" style={{width:55,height:55,borderRadius:'50%',flexShrink:0}}/>
                                            <div>
                                                <div className="ul-skel" style={{width:140,height:18,marginBottom:6}}/>
                                                <div className="ul-skel" style={{width:90,height:14}}/>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="col-email"><div className="ul-skel" style={{width:180,height:16}}/></td>
                                    <td className="col-role-desktop"><div className="ul-skel" style={{width:100,height:24,borderRadius:20}}/></td>
                                    <td><div className="ul-skel" style={{width:72,height:32,borderRadius:8,marginLeft:'auto'}}/></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Dots-лоадер при подгрузке следующих страниц */}
                {loading && users.length > 0 && (
                    <div className="ul-loading">
                        <div className="ul-loading-dots">
                            <span/><span/><span/>
                        </div>
                        Загрузка…
                    </div>
                )}
                {error && <div className="ul-error">{error}</div>}
                {!hasMore && users.length > 0 && (
                    <p className="ul-end">✓ Все пользователи загружены</p>
                )}

            </main>
        </div>
    );
}
