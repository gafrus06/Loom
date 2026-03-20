import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { fetchMyParentLinks, fetchChild } from "../api/camps";
import "../styles/teams.css";

export default function ParentChildren() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const links = await fetchMyParentLinks(); // [{childId, relation, ...}]
                const out = [];
                for (const l of links || []) {
                    try {
                        const kid = await fetchChild(l.childId);
                        out.push({ ...kid, relation: l.relation });
                    } catch { /* ignore broken */ }
                }
                if (alive) setItems(out);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const grid = items.map(k => {
        const g = String(k.gender || "").toLowerCase();
        const cls = g === "female" ? "kid-pill female" : g === "male" ? "kid-pill male" : "kid-pill";
        const full = `${k.lastName || ""} ${k.firstName || ""}`.trim() || "—";
        return { id: k.id, full, cls, relation: k.relation || "" };
    });

    return (
        <div className="layout">
            <Sidebar />
            <main className="main">
                <section className="card">
                    <div className="title-row" style={{ marginBottom: 10 }}>
                        <h3 className="section-title">Мои дети</h3>
                    </div>

                    {loading ? (
                        <div className="kids-grid">
                            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="kid-pill skeleton shimmer" style={{ height: 56 }} />)}
                        </div>
                    ) : grid.length ? (
                        <div className="kids-grid">
                            {grid.map(k => (
                                <div key={k.id} className={k.cls} title={k.relation ? `Связь: ${k.relation}` : ""}>
                                    <span className="kid-name">{k.full}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="muted">Пока нет привязанных детей.</div>
                    )}
                </section>
            </main>
        </div>
    );
}
