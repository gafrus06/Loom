// src/components/Statistics.js
import { useEffect, useState, useCallback, useRef } from "react";
import { authFetch, getCurrentUser } from "../api/auth";
import Sidebar from "./Sidebar";
import "../styles/statistics.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:12717/api";

function normalizeRoles(roles) {
    return (roles || []).map((r) =>
        String(r).startsWith("ROLE_") ? String(r).slice(5).toLowerCase() : String(r).toLowerCase()
    );
}

const STAGE_LABELS = {
    NEW: "Новый",
    ORGANIZATIONAL: "Организационный",
    BUSINESS: "Деловой",
    CONSTRUCTIVE: "Конструктивный",
    FINAL: "Заключительный",
    COMPLETED: "Завершён",
};
const STAGE_ORDER = ["NEW", "ORGANIZATIONAL", "BUSINESS", "CONSTRUCTIVE", "FINAL", "COMPLETED"];

const ACTION_LABELS = {
    CREATE_DETACHMENT: "Создан отряд",
    UPDATE_DETACHMENT: "Обновлён отряд",
    CHANGE_STAGE: "Смена этапа",
    ADD_CHILD: "Добавлен ребёнок",
    CREATE_CHILD: "Создан ребёнок",
    REMOVE_CHILD: "Удалён ребёнок",
    ASSIGN_COUNSELOR: "Назначен вожатый",
    UNASSIGN_COUNSELOR: "Вожатый откреплён",
    CREATE_MEMBERSHIP: "Вступление в отряд",
    CLOSE_MEMBERSHIP: "Выход из отряда",
    CREATE_CAMP: "Создан лагерь",
    CREATE_SESSION: "Создана смена",
};

function labelAction(a) { return ACTION_LABELS[a] || a; }
function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function calcAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date(), bd = new Date(birthDate);
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age;
}

async function fetchChildrenBatch(memberships) {
    const ids = [...new Set(memberships.map((m) => m.childId).filter(Boolean))];
    const map = {};
    const BATCH = 6;
    for (let i = 0; i < ids.length; i += BATCH) {
        const slice = ids.slice(i, i + BATCH);
        const results = await Promise.allSettled(
            slice.map((id) =>
                authFetch(`${API_BASE}/children/${id}`)
                    .then((r) => (r.ok ? r.json() : null))
                    .catch(() => null)
            )
        );
        results.forEach((r, j) => { if (r.status === "fulfilled" && r.value) map[slice[j]] = r.value; });
    }
    return map;
}

function DonutChart({ data, size = 180, thickness = 34, centerLabel = "всего" }) {
    const total = data.reduce((s, d) => s + d.value, 0);

    if (!total) {
        return (
            <div className="donut-empty-wrap">
                <span className="donut-empty-icon">○</span>
                <span>Нет данных</span>
            </div>
        );
    }

    const cx = size / 2, cy = size / 2;
    const r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    let cumLen = 0;
    const slices = data.map((d) => {
        const pct = d.value / total;
        const segLen = pct * circ;
        const offset = circ - cumLen;
        cumLen += segLen;
        return { ...d, pct, segLen, offset };
    });

    return (
        <div className="donut-wrap">
            <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {slices.map((s, i) => (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                                stroke={s.color} strokeWidth={thickness}
                                strokeDasharray={`${s.segLen} ${circ - s.segLen}`}
                                strokeDashoffset={s.offset}
                                style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: "stroke-dasharray 0.5s ease" }}>
                            <title>{s.label}: {s.value} ({Math.round(s.pct * 100)}%)</title>
                        </circle>
                    ))}
                    <text x={cx} y={cy - 7} textAnchor="middle" fill="#eaeff7" fontSize="22" fontWeight="700" fontFamily="inherit">{total}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fill="#6c7a9c" fontSize="11" fontFamily="inherit">{centerLabel}</text>
                </svg>
            </div>
            <div className="donut-legend">
                {slices.map((s, i) => (
                    <div key={i} className="donut-legend-row">
                        <span className="donut-legend-dot" style={{ background: s.color }} />
                        <span className="donut-legend-label">{s.label}</span>
                        <span className="donut-legend-pct">{Math.round(s.pct * 100)}%</span>
                        <span className="donut-legend-val">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BarChart({ data }) {
    if (!data?.length) return <div className="stat-chart-empty">Нет данных</div>;
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div className="bar-chart">
            {data.map((d, i) => (
                <div key={i} className="bar-row">
                    <div className="bar-label">{d.label}</div>
                    <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
                        <span className="bar-inline-val">{d.value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function KPICard({ icon, value, label, sub, color }) {
    return (
        <div className={`kpi-card kpi-${color}`}>
            <div className="kpi-icon">{icon}</div>
            <div className="kpi-body">
                <div className="kpi-value">{value}</div>
                <div className="kpi-label">{label}</div>
                {sub && <div className="kpi-sub">{sub}</div>}
            </div>
        </div>
    );
}

export default function Statistics() {
    const me = getCurrentUser();
    const isAdmin = normalizeRoles(me?.roles).includes("admin");

    const [camps, setCamps] = useState([]);
    const [selectedCamp, setSelectedCamp] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);

    const [detachments, setDetachments] = useState([]);
    const [membershipsMap, setMembershipsMap] = useState({});
    const [counselorsMap, setCounselorsMap] = useState({});
    const [childrenMap, setChildrenMap] = useState({});
    const [auditLog, setAuditLog] = useState([]);

    const [loadingCamps, setLoadingCamps] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingAudit, setLoadingAudit] = useState(false);

    const abortToken = useRef(0);

    // camps
    useEffect(() => {
        setLoadingCamps(true);
        authFetch(`${API_BASE}/camps/my-accessible`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                const list = Array.isArray(data) ? data : (data.camps || []);
                setCamps(list);
                if (list.length > 0) setSelectedCamp(list[0]);
            })
            .catch(() => setCamps([]))
            .finally(() => setLoadingCamps(false));
    }, []);

    // sessions
    useEffect(() => {
        if (!selectedCamp) return;
        setLoadingSessions(true);
        setSessions([]); setSelectedSession(null);
        setDetachments([]); setMembershipsMap({}); setCounselorsMap({}); setChildrenMap({}); setAuditLog([]);

        authFetch(`${API_BASE}/sessions/camp/${selectedCamp.id}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                setSessions(list);
                if (list.length > 0) setSelectedSession(list[0]);
            })
            .catch(() => setSessions([]))
            .finally(() => setLoadingSessions(false));
    }, [selectedCamp]);

    const loadStats = useCallback(async (sessionId) => {
        if (!sessionId) return;
        const token = ++abortToken.current;
        setLoadingStats(true);
        setDetachments([]); setMembershipsMap({}); setCounselorsMap({}); setChildrenMap({});

        try {
            const dets = await authFetch(`${API_BASE}/detachments/session/${sessionId}`)
                .then((r) => (r.ok ? r.json() : []));
            if (abortToken.current !== token) return;
            const detList = Array.isArray(dets) ? dets : [];
            setDetachments(detList);

            const [memRes, couRes] = await Promise.all([
                Promise.allSettled(detList.map((d) =>
                    authFetch(`${API_BASE}/memberships/detachment/${d.id}`)
                        .then((r) => (r.ok ? r.json() : []))
                        .then((data) => ({ id: d.id, data: Array.isArray(data) ? data : [] }))
                )),
                Promise.allSettled(detList.map((d) =>
                    authFetch(`${API_BASE}/counselor-assignments/by-detachment?detachmentId=${d.id}`)
                        .then((r) => (r.ok ? r.json() : []))
                        .then((data) => ({ id: d.id, data: Array.isArray(data) ? data : [] }))
                )),
            ]);
            if (abortToken.current !== token) return;

            const newMem = {}, newCou = {};
            memRes.forEach((r) => { if (r.status === "fulfilled") newMem[r.value.id] = r.value.data; });
            couRes.forEach((r) => { if (r.status === "fulfilled") newCou[r.value.id] = r.value.data; });
            setMembershipsMap(newMem);
            setCounselorsMap(newCou);

            const activeMems = Object.values(newMem).flat().filter((m) => m.active !== false);
            if (activeMems.length > 0) {
                const kids = await fetchChildrenBatch(activeMems);
                if (abortToken.current !== token) return;
                setChildrenMap(kids);
            }
        } catch (e) {
            console.error("loadStats error", e);
        } finally {
            if (abortToken.current === token) setLoadingStats(false);
        }
    }, []);

    useEffect(() => { if (selectedSession) loadStats(selectedSession.id); }, [selectedSession, loadStats]);

    useEffect(() => {
        if (!selectedSession || !detachments.length) return;
        setLoadingAudit(true); setAuditLog([]);
        Promise.allSettled(
            detachments.map((d) =>
                authFetch(`${API_BASE}/audit/entity?entityType=DETACHMENT&entityId=${d.id}&limit=50`)
                    .then((r) => (r.ok ? r.json() : []))
                    .catch(() => [])
            )
        )
            .then((results) => {
                const all = results
                    .filter((r) => r.status === "fulfilled")
                    .flatMap((r) => r.value)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setAuditLog(all);
            })
            .finally(() => setLoadingAudit(false));
    }, [selectedSession, detachments]);

    const allMemberships = Object.values(membershipsMap).flat();
    const activeMemberships = allMemberships.filter((m) => m.active !== false);
    const allCounselors = Object.values(counselorsMap).flat();
    const activeCounselors = allCounselors.filter((c) => c.active !== false);

    const genderCounts = activeMemberships.reduce((acc, m) => {
        const g = String(childrenMap[m.childId]?.gender || "").toUpperCase();
        if (g === "MALE") acc.male++;
        else if (g === "FEMALE") acc.female++;
        return acc;
    }, { male: 0, female: 0 });

    const stageCounts = detachments.reduce((acc, d) => {
        acc[d.stage || "NEW"] = (acc[d.stage || "NEW"] || 0) + 1; return acc;
    }, {});

    const ageBuckets = { "до 8": 0, "8–10": 0, "11–12": 0, "13–14": 0, "15+": 0 };
    activeMemberships.forEach((m) => {
        const child = childrenMap[m.childId]; if (!child) return;
        const age = child.age ?? calcAge(child.birthDate); if (age == null) return;
        if (age < 8) ageBuckets["до 8"]++;
        else if (age <= 10) ageBuckets["8–10"]++;
        else if (age <= 12) ageBuckets["11–12"]++;
        else if (age <= 14) ageBuckets["13–14"]++;
        else ageBuckets["15+"]++;
    });

    const PALETTE = ["#5B2EFF", "#3C8DFF", "#06B6D4", "#10B981", "#F59E0B", "#EC4899"];

    const genderData = [
        { label: "Мальчики", value: genderCounts.male, color: "#3C8DFF" },
        { label: "Девочки", value: genderCounts.female, color: "#FF6B9D" },
    ].filter((d) => d.value > 0);

    const stageData = STAGE_ORDER.filter((s) => stageCounts[s] > 0)
        .map((s, i) => ({ label: STAGE_LABELS[s], value: stageCounts[s], color: PALETTE[i % PALETTE.length] }));

    const ageData = Object.entries(ageBuckets).filter(([, v]) => v > 0)
        .map(([label, value], i) => ({ label, value, color: PALETTE[(i + 2) % PALETTE.length] }));

    const loadedKids = Object.keys(childrenMap).length;
    const expectedKids = [...new Set(activeMemberships.map((m) => m.childId).filter(Boolean))].length;
    const kidsLoading = loadingStats || (expectedKids > 0 && loadedKids < expectedKids);

    if (!isAdmin) return (
        <div className="layout"><Sidebar />
            <main className="stats-main">
                <div className="stats-access-denied">
                    <span className="stats-lock">🔒</span>
                    <h2>Доступ запрещён</h2>
                    <p>Раздел статистики доступен только администраторам.</p>
                </div>
            </main>
        </div>
    );

    return (
        <div className="layout">
            <Sidebar />
            <main className="stats-main">

                <div className="stats-header">
                    <div className="stats-header-left">
                        <h1 className="stats-title">Аналитика</h1>
                        <p className="stats-subtitle">Аналитика по лагерям и сменам</p>
                    </div>
                    <div className="stats-selectors">
                        <div className="stats-select-group">
                            <label className="stats-select-label">Лагерь</label>
                            <select className="stats-select" value={selectedCamp?.id || ""}
                                    onChange={(e) => setSelectedCamp(camps.find((x) => x.id === e.target.value) || null)}
                                    disabled={loadingCamps}>
                                {loadingCamps && <option>Загрузка...</option>}
                                {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                {!loadingCamps && !camps.length && <option value="">Нет лагерей</option>}
                            </select>
                        </div>
                        <div className="stats-select-group">
                            <label className="stats-select-label">Смена</label>
                            <select className="stats-select" value={selectedSession?.id || ""}
                                    onChange={(e) => setSelectedSession(sessions.find((x) => x.id === e.target.value) || null)}
                                    disabled={loadingSessions || !sessions.length}>
                                {loadingSessions && <option>Загрузка...</option>}
                                {sessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title || s.name || `Смена ${s.id.slice(0, 6)}`}
                                        {s.startDate ? ` · ${fmtDate(s.startDate)}` : ""}
                                    </option>
                                ))}
                                {!loadingSessions && !sessions.length && <option value="">Нет смен</option>}
                            </select>
                        </div>
                    </div>
                </div>

                {loadingStats && <div className="stats-loading-bar"><div className="stats-loading-fill" /></div>}

                {!selectedSession && !loadingSessions && (
                    <div className="stats-empty-state">
                        <span className="stats-empty-icon">📋</span>
                        <p>Выберите лагерь и смену для просмотра статистики</p>
                    </div>
                )}

                {selectedSession && !loadingStats && (<>

                    <div className="stats-kpi-row">
                        <KPICard icon="👶" value={activeMemberships.length} label="Детей в смене" sub={`всего записей: ${allMemberships.length}`} color="blue" />
                        <KPICard icon="🏕️" value={detachments.length} label="Отрядов" sub={`завершено: ${stageCounts["COMPLETED"] || 0}`} color="purple" />
                        <KPICard icon="👤" value={activeCounselors.length} label="Вожатых" sub={`назначений: ${allCounselors.length}`} color="teal" />
                        <KPICard icon="⚖️" value={activeMemberships.length > 0 ? Math.round(activeMemberships.length / Math.max(detachments.length, 1)) : 0} label="Детей на отряд" sub="среднее" color="amber" />
                    </div>

                    <div className="stats-charts-row">
                        <div className="stats-card">
                            <div className="stats-card-header">
                                <h3>По полу</h3>
                                {kidsLoading && <span className="stats-spinner" />}
                            </div>
                            <DonutChart data={genderData} size={180} thickness={34} centerLabel="детей" />
                        </div>

                        <div className="stats-card">
                            <div className="stats-card-header"><h3>Этапы отрядов</h3></div>
                            <DonutChart data={stageData} size={180} thickness={34} centerLabel="отрядов" />
                        </div>

                        <div className="stats-card">
                            <div className="stats-card-header">
                                <h3>Возраст детей</h3>
                                {kidsLoading && <span className="stats-spinner" />}
                            </div>
                            {ageData.length > 0
                                ? <BarChart data={ageData} />
                                : <div className="stat-chart-empty">{kidsLoading ? "Загружаем..." : "Нет данных"}</div>
                            }
                        </div>
                    </div>

                    <div className="stats-card stats-card-wide">
                        <div className="stats-card-header">
                            <h3>Отряды смены</h3>
                            <span className="stats-badge">{detachments.length}</span>
                        </div>
                        {detachments.length === 0
                            ? <div className="stat-chart-empty">Отрядов нет</div>
                            : (
                                <div className="stats-table-wrap">
                                    <table className="stats-table">
                                        <thead><tr>
                                            <th>Название</th><th>Возр. группа</th><th>Этап</th>
                                            <th>Детей</th><th>Вожатых</th><th>Создан</th>
                                        </tr></thead>
                                        <tbody>
                                        {detachments.map((d) => {
                                            const mems = (membershipsMap[d.id] || []).filter((m) => m.active !== false);
                                            const cous = (counselorsMap[d.id] || []).filter((c) => c.active !== false);
                                            return (
                                                <tr key={d.id}>
                                                    <td className="det-name">{d.name}</td>
                                                    <td>{d.ageGroup || "—"}</td>
                                                    <td><span className={`stage-pill stage-${(d.stage || "NEW").toLowerCase()}`}>{STAGE_LABELS[d.stage] || d.stage || "Новый"}</span></td>
                                                    <td className="num-cell">{mems.length}</td>
                                                    <td className="num-cell">{cous.length}</td>
                                                    <td className="date-cell">{fmtDate(d.createdAt)}</td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </div>

                    <div className="stats-card stats-card-wide">
                        <div className="stats-card-header">
                            <h3>Лента активности</h3>
                            {loadingAudit && <span className="stats-spinner" />}
                            {!loadingAudit && <span className="stats-badge">{auditLog.length}</span>}
                        </div>
                        {!loadingAudit && auditLog.length === 0 && <div className="stat-chart-empty">Нет событий</div>}
                        {auditLog.length > 0 && (
                            <div className="audit-log">
                                {auditLog.map((ev) => (
                                    <div key={ev.id} className="audit-row">
                                        <div className="audit-dot" />
                                        <div className="audit-content">
                                            <span className="audit-action">{labelAction(ev.action)}</span>
                                            <span className="audit-entity">{ev.entityType} · {String(ev.entityId || "").slice(0, 8)}</span>
                                        </div>
                                        <div className="audit-time">
                                            <span>{fmtDate(ev.timestamp)}</span>
                                            <span className="audit-clock">{fmtTime(ev.timestamp)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </>)}
            </main>
        </div>
    );
}