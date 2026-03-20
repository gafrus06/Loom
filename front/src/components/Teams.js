import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { getCurrentUser } from "../api/auth";
import {
    fetchCamps,
    fetchSessionsByCamp,
    fetchDetachmentsBySession,
    fetchMemberships,
    fetchChild,
    changeDetachmentStage,
    askMethodAssistant
} from "../api/camps";
import "../styles/teams.css";

/** Нормализация роли из JWT */
const normalize = (r) => (String(r || "").startsWith("ROLE_") ? String(r).slice(5) : String(r)).toLowerCase();

/** Карта цветов для пола (укладывается в твою палитру) */
const GENDER_STYLES = {
    female: "kid-pill female", // фиолетово-розоватый градиент
    male: "kid-pill male",     // тёмно-синеватый градиент
    unknown: "kid-pill"
};

/** Список этапов в порядке прогресса */
const STAGES = [
    { key: "NEW", label: "Новый" },
    { key: "ORGANIZATIONAL", label: "Орг." },
    { key: "BUSINESS", label: "Деловой" },
    { key: "CONSTRUCTIVE", label: "Конструктивный" },
    { key: "FINAL", label: "Заключительный" },
    { key: "COMPLETED", label: "Завершён" }
];

export default function Teams() {
    const me = getCurrentUser();
    const myRoles = (me?.roles || []).map(normalize);
    const isCounselorOrAdmin = myRoles.includes("counselor") || myRoles.includes("admin");

    const [camps, setCamps] = useState([]);
    const [sessions, setSessions] = useState([]);         // все смены для выбранного лагеря
    const [detachments, setDetachments] = useState([]);   // все отряды для выбранной смены

    const [activeCampId, setActiveCampId] = useState(null);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [activeDetachment, setActiveDetachment] = useState(null);

    // дети активного отряда
    const [kids, setKids] = useState([]);
    const [loadingKids, setLoadingKids] = useState(false);

    // методическая поддержка
    const [stageChanging, setStageChanging] = useState(false);
    const [activeTab, setActiveTab] = useState("games"); // games | fire | exercises | physiology
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [asking, setAsking] = useState(false);

    const tipRef = useRef(null);
    const [tipVisible, setTipVisible] = useState(false);
    const [tipContent, setTipContent] = useState("");
    const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

    // 1) загрузка лагерей
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const cs = await fetchCamps();
                if (!alive) return;
                setCamps(cs || []);
                if (cs?.length) setActiveCampId(cs[0].id);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => { alive = false; };
    }, []);

    // 2) при выборе лагеря — загрузить смены
    useEffect(() => {
        if (!activeCampId) return;
        let alive = true;
        (async () => {
            try {
                const ss = await fetchSessionsByCamp(activeCampId);
                if (!alive) return;
                setSessions(ss || []);
                setActiveSessionId(ss?.[0]?.id || null);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => { alive = false; };
    }, [activeCampId]);

    // 3) при выборе смены — загрузить отряды
    useEffect(() => {
        if (!activeSessionId) { setDetachments([]); setActiveDetachment(null); return; }
        let alive = true;
        (async () => {
            try {
                const ds = await fetchDetachmentsBySession(activeSessionId);
                if (!alive) return;
                setDetachments(ds || []);
                setActiveDetachment(null);
                setKids([]);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => { alive = false; };
    }, [activeSessionId]);

    // 4) загрузка состава отряда → карточки детей
    const loadKids = async (det) => {
        setLoadingKids(true);
        try {
            const memberships = await fetchMemberships(det.id);
            const active = (memberships || []).filter(m => m.active);
            const kidsList = [];
            for (const m of active) {
                try {
                    const kid = await fetchChild(m.childId);
                    kidsList.push(kid);
                } catch {
                    // пропустим сломанных
                }
            }
            setKids(kidsList);
        } finally {
            setLoadingKids(false);
        }
    };

    // ховер-тулип при наведении на чип отряда
    const showTip = (ev, det) => {
        const session = sessions.find(s => s.id === det.sessionId);
        const camp = camps.find(c => c.id === session?.campId);
        const text = `${det.name} • ${camp?.name || "Лагерь"} • ${session?.startDate || "?"} — ${session?.endDate || "?"}`;
        setTipContent(text);
        const rect = ev.currentTarget.getBoundingClientRect();
        setTipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
        setTipVisible(true);
    };
    const hideTip = () => setTipVisible(false);

    const onPickDetachment = (det) => {
        setActiveDetachment(det);
        setAnswer("");
        loadKids(det);
    };

    const currentStageIndex = useMemo(() => {
        if (!activeDetachment) return 0;
        const idx = STAGES.findIndex(s => s.key === String(activeDetachment.stage || "NEW"));
        return idx >= 0 ? idx : 0;
    }, [activeDetachment]);

    const setStage = async (idx) => {
        if (!activeDetachment || !isCounselorOrAdmin) return;
        const newStage = STAGES[idx]?.key;
        if (!newStage || newStage === activeDetachment.stage) return;
        setStageChanging(true);
        try {
            const updated = await changeDetachmentStage(activeDetachment.id, newStage);
            setActiveDetachment(updated);
        } catch (e) {
            alert(e?.message || "Не удалось сменить этап");
        } finally {
            setStageChanging(false);
        }
    };

    const ask = async () => {
        if (!question.trim() || !activeDetachment) return;
        setAsking(true);
        try {
            const r = await askMethodAssistant(activeDetachment.id, question.trim());
            setAnswer(r?.answer || "Нет ответа");
        } catch {
            setAnswer("Ошибка запроса к ассистенту.");
        } finally {
            setAsking(false);
        }
    };

    // утилиты UI
    const detLabel = (det) => {
        const session = sessions.find(s => s.id === det.sessionId);
        const camp = camps.find(c => c.id === session?.campId);
        return camp?.name || det.name;
    };

    const gridKids = kids.map(k => {
        // пол: если бэкенд добавишь поле gender ("MALE","FEMALE"), тут подхватим
        const g = String(k.gender || "").toLowerCase();
        const cls = g === "female" ? GENDER_STYLES.female : g === "male" ? GENDER_STYLES.male : GENDER_STYLES.unknown;
        const full = `${k.lastName || ""} ${k.firstName || ""}`.trim() || "—";
        return { id: k.id, full, cls };
    });

    return (
        <div className="layout">
            <Sidebar />
            <main className="main teams-main">
                {/* Верх: выбор лагеря и смены */}
                <section className="card teams-top">
                    <div className="teams-top-row">
                        <div className="select-wrap">
                            <label>Лагерь</label>
                            <select
                                className="input"
                                value={activeCampId || ""}
                                onChange={(e) => setActiveCampId(e.target.value || null)}
                            >
                                {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="select-wrap">
                            <label>Смена</label>
                            <select
                                className="input"
                                value={activeSessionId || ""}
                                onChange={(e) => setActiveSessionId(e.target.value || null)}
                            >
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.title} ({s.startDate} – {s.endDate})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* «Стек овалов» отрядов */}
                    <div className="det-stack">
                        {detachments.map(det => (
                            <button
                                key={det.id}
                                className={`det-chip ${activeDetachment?.id === det.id ? "active" : ""}`}
                                onMouseEnter={(e) => showTip(e, det)}
                                onMouseLeave={hideTip}
                                onClick={() => onPickDetachment(det)}
                                title="" /* тултип делаем кастомный */
                            >
                                <span className="det-chip-text">{detLabel(det)}</span>
                            </button>
                        ))}
                        {!detachments.length && (
                            <div className="muted">Отряды не найдены</div>
                        )}
                    </div>
                </section>

                {/* тултип */}
                {tipVisible && (
                    <div
                        ref={tipRef}
                        className="det-tip"
                        style={{ left: tipPos.x, top: tipPos.y }}
                    >
                        {tipContent}
                    </div>
                )}

                {/* Нижняя область: слева — методподдержка (только counselor/admin), справа — сетка детей */}
                <section className="teams-body two-cols">
                    {/* Методическая поддержка */}
                    {isCounselorOrAdmin && (
                        <aside className="card support-col">
                            <h3 className="section-title" style={{ marginBottom: 10 }}>Методическая поддержка</h3>

                            {/* Progress по этапам */}
                            <div className="stage-bar">
                                {STAGES.map((s, i) => {
                                    const done = i <= currentStageIndex;
                                    return (
                                        <button
                                            key={s.key}
                                            className={`stage-seg ${done ? "done" : ""}`}
                                            onClick={() => setStage(i)}
                                            title={s.label}
                                            disabled={stageChanging}
                                        >
                                            <span className="stage-label">{s.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tabs */}
                            <div className="tabs-row">
                                <TabBtn id="games"   active={activeTab} setActive={setActiveTab} label="Игры" />
                                <TabBtn id="fire"    active={activeTab} setActive={setActiveTab} label="Огоньки" />
                                <TabBtn id="exercises" active={activeTab} setActive={setActiveTab} label="Упражнения" />
                                <TabBtn id="phys"    active={activeTab} setActive={setActiveTab} label="Физиологические особенности" />
                            </div>

                            <div className="tab-pane">
                                {!activeDetachment && <div className="muted">Выберите отряд, чтобы увидеть материалы.</div>}
                                {activeDetachment && (
                                    <div className="muted">
                                        {/* Здесь можешь подгружать реальные методички по stage/tab из бэка */}
                                        Рекомендации для этапа: <b>{STAGES[currentStageIndex].label}</b>. Вкладка:{" "}
                                        <b>{tabLabel(activeTab)}</b>.
                                    </div>
                                )}
                            </div>

                            {/* Ассистент */}
                            <div className="assistant">
                                <label className="assistant-label">Вопрос ассистенту</label>
                                <textarea
                                    className="input assistant-input"
                                    rows={3}
                                    placeholder="Опиши ситуацию, задай вопрос..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                />
                                <div className="actions-end">
                                    <button className="btn-primary sm" onClick={ask} disabled={asking || !activeDetachment}>
                                        {asking ? "Думаю..." : "Спросить"}
                                    </button>
                                </div>
                                <div className="assistant-answer">
                                    {answer ? <div className="answer-bubble">{answer}</div> : <div className="muted">Ответ появится ниже.</div>}
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Сетка детей */}
                    <div className="card kids-col">
                        <div className="title-row" style={{ marginBottom: 10 }}>
                            <h3 className="section-title">Состав отряда</h3>
                            {activeDetachment && (
                                <div className="muted">
                                    {activeDetachment.name} • Этап: <b>{STAGES[currentStageIndex].label}</b>
                                </div>
                            )}
                        </div>

                        {!activeDetachment && <div className="muted">Выберите отряд сверху.</div>}

                        {activeDetachment && (
                            <>
                                {loadingKids ? (
                                    <div className="kids-grid">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div key={i} className="kid-pill skeleton shimmer" style={{ height: 56 }} />
                                        ))}
                                    </div>
                                ) : gridKids.length ? (
                                    <div className="kids-grid">
                                        {gridKids.map(k => (
                                            <div key={k.id} className={k.cls} title={k.full}>
                                                <span className="kid-name">{k.full}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="muted">Отряд пуст</div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function TabBtn({ id, active, setActive, label }) {
    const on = active === id || (id === "phys" && active === "physiology");
    return (
        <button
            className={`tab-btn ${on ? "active" : ""}`}
            onClick={() => setActive(id === "phys" ? "physiology" : id)}
        >
            {label}
        </button>
    );
}

function tabLabel(id) {
    switch (id) {
        case "games": return "Игры";
        case "fire": return "Огоньки";
        case "exercises": return "Упражнения";
        case "phys":
        case "physiology": return "Физиологические особенности";
        default: return id;
    }
}
