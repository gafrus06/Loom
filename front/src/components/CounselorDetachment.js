import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import {
    fetchDetachmentsBySession, fetchMemberships, fetchChild, changeDetachmentStage, fetchCamps, fetchSessionsByCamp, askMethodAssistant
} from "../api/camps";
import "../styles/teams.css";

/** Этапы */
const STAGES = [
    { key: "NEW", label: "Новый" },
    { key: "ORGANIZATIONAL", label: "Орг." },
    { key: "BUSINESS", label: "Деловой" },
    { key: "CONSTRUCTIVE", label: "Конструктивный" },
    { key: "FINAL", label: "Заключительный" },
    { key: "COMPLETED", label: "Завершён" }
];

export default function CounselorDetachment() {
    const { detachmentId } = useParams();

    const [det, setDet] = useState(null);
    const [session, setSession] = useState(null);
    const [campName, setCampName] = useState("");

    const [kids, setKids] = useState([]);
    const [loadingKids, setLoadingKids] = useState(false);

    const [stageChanging, setStageChanging] = useState(false);
    const [activeTab, setActiveTab] = useState("games");
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [asking, setAsking] = useState(false);

    // мини-загрузка карточки отряда через список отрядов выбранной смены (хак, пока нет /api/detachments/{id})
    // Лучше сделай на бэке GET /api/detachments/{id}
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                // предположим, что detachmentId нам известен, но нам надо получить его sessionId
                // В реальности — вызови /api/detachments/{id}. Здесь — упрощение:
                // сделаем «поиск» через все лагеря/смены
                const camps = await fetchCamps();
                for (const c of camps) {
                    const sessions = await fetchSessionsByCamp(c.id);
                    for (const s of sessions) {
                        const dets = await fetchDetachmentsBySession(s.id);
                        const found = dets.find(d => d.id === detachmentId);
                        if (found) {
                            if (!alive) return;
                            setDet(found);
                            setSession(s);
                            setCampName(c.name);
                            return;
                        }
                    }
                }
            } catch (e) { console.error(e); }
        })();
        return () => { alive = false; };
    }, [detachmentId]);

    useEffect(() => {
        if (!det) return;
        setLoadingKids(true);
        (async () => {
            try {
                const memberships = await fetchMemberships(det.id);
                const kidsActive = [];
                for (const m of (memberships || []).filter(m => m.active)) {
                    try {
                        const k = await fetchChild(m.childId);
                        kidsActive.push(k);
                    } catch { /* ignore */ }
                }
                setKids(kidsActive);
            } finally {
                setLoadingKids(false);
            }
        })();
    }, [det]);

    const stageIndex = useMemo(() => {
        if (!det) return 0;
        const idx = STAGES.findIndex(s => s.key === det.stage);
        return idx >= 0 ? idx : 0;
    }, [det]);

    const setStage = async (idx) => {
        if (!det) return;
        const newStage = STAGES[idx]?.key;
        if (!newStage || newStage === det.stage) return;
        setStageChanging(true);
        try {
            const updated = await changeDetachmentStage(det.id, newStage);
            setDet(updated);
        } catch (e) {
            alert(e?.message || "Не удалось сменить этап");
        } finally {
            setStageChanging(false);
        }
    };

    const ask = async () => {
        if (!question.trim() || !det) return;
        setAsking(true);
        try {
            const r = await askMethodAssistant(det.id, question.trim());
            setAnswer(r?.answer || "Нет ответа");
        } finally {
            setAsking(false);
        }
    };

    const gridKids = kids.map(k => {
        const g = String(k.gender || "").toLowerCase();
        const cls = g === "female" ? "kid-pill female" : g === "male" ? "kid-pill male" : "kid-pill";
        const full = `${k.lastName || ""} ${k.firstName || ""}`.trim() || "—";
        return { id: k.id, full, cls };
    });

    return (
        <div className="layout">
            <Sidebar />
            <main className="main">
                <section className="card" style={{ marginBottom: 16 }}>
                    <div className="title-row">
                        <h3 className="section-title">Методическая поддержка</h3>
                        {det && session && (
                            <div className="muted">
                                {det.name} • {campName} • {session.startDate} — {session.endDate}
                            </div>
                        )}
                    </div>
                </section>

                <section className="two-cols">
                    <aside className="card" style={{ alignSelf: "start" }}>
                        {/* Бар этапа */}
                        <div className="stage-bar">
                            {STAGES.map((s, i) => {
                                const done = i <= stageIndex;
                                return (
                                    <button key={s.key} className={`stage-seg ${done ? "done" : ""}`} onClick={()=>setStage(i)} disabled={stageChanging}>
                                        <span className="stage-label">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Вкладки */}
                        <div className="tabs-row">
                            {["games","fire","exercises","physiology"].map(id => (
                                <button key={id} className={`tab-btn ${activeTab===id?"active":""}`} onClick={()=>setActiveTab(id)}>
                                    {id==="games"?"Игры":id==="fire"?"Огоньки":id==="exercises"?"Упражнения":"Физиологические особенности"}
                                </button>
                            ))}
                        </div>

                        <div className="tab-pane">
                            {!det ? (
                                <div className="muted">Загрузка данных отряда...</div>
                            ) : (
                                <div className="muted">
                                    Материалы для этапа <b>{STAGES[stageIndex].label}</b>, вкладка <b>{
                                    activeTab==="games"?"Игры":activeTab==="fire"?"Огоньки":activeTab==="exercises"?"Упражнения":"Физиология"}</b>. Подключи реальный источник.
                                </div>
                            )}
                        </div>

                        {/* Ассистент */}
                        <div className="assistant" style={{ marginTop: 10 }}>
                            <label className="assistant-label">Вопрос ассистенту</label>
                            <textarea className="input" rows={3} placeholder="Опиши ситуацию, задай вопрос..." value={question} onChange={(e)=>setQuestion(e.target.value)} />
                            <div className="actions-end">
                                <button className="btn-primary sm" onClick={ask} disabled={asking || !det}>
                                    {asking ? "Думаю..." : "Спросить"}
                                </button>
                            </div>
                            <div className="assistant-answer">
                                {answer ? <div className="answer-bubble">{answer}</div> : <div className="muted">Ответ появится ниже.</div>}
                            </div>
                        </div>
                    </aside>

                    <div className="card">
                        <div className="title-row" style={{ marginBottom: 10 }}>
                            <h3 className="section-title">Состав отряда</h3>
                            {det && <div className="muted">Этап: <b>{STAGES[stageIndex].label}</b></div>}
                        </div>

                        {!det && <div className="muted">Загрузка...</div>}
                        {det && (
                            loadingKids ? (
                                <div className="kids-grid">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="kid-pill skeleton shimmer" style={{ height: 56 }} />
                                    ))}
                                </div>
                            ) : kids.length ? (
                                <div className="kids-grid">
                                    {gridKids.map(k => <div key={k.id} className={k.cls}><span className="kid-name">{k.full}</span></div>)}
                                </div>
                            ) : (
                                <div className="muted">Отряд пуст</div>
                            )
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
