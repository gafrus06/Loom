import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth";
import { getUserProfile, updateUserProfile, startPhoneVerification, confirmPhoneVerification } from "../services/files";
import AvatarUpload from "../components/AvatarUpload";
import "./Onboarding.css";


const STEPS = [
    { key: "names", title: "Основные данные", required: true },
    { key: "phone", title: "Телефон", required: true },
    { key: "avatar", title: "Аватар (опционально)", required: false },
];

export default function Onboarding() {
    const navigate = useNavigate();
    const location = useLocation();

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    const [draft, setDraft] = useState({
        firstName: "",
        secondName: "",
        thirdName: "",
        phone: "",
        avatarFileId: null,
        avatarUrl: "",
    });

    const [phoneDigits, setPhoneDigits] = useState("");
    const [codeBoxes, setCodeBoxes] = useState(["", "", "", ""]);
    const codeRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
    const [smsRequested, setSmsRequested] = useState(false);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        const u = getCurrentUser();
        if (!u) {
            logout();
            navigate("/auth/login", { replace: true, state: { from: location } });
            return;
        }
        (async () => {
            try {
                setLoading(true);
                const p = await getUserProfile();
                setDraft({
                    firstName: p.firstName || "",
                    secondName: p.secondName || "",
                    thirdName: p.thirdName || "",
                    phone: p.phone || "",
                    avatarFileId: p.avatarFileId || null,
                    avatarUrl: p.avatarUrl || "",
                });
                const normalized = normalizeToTenDigits(p.phone || "");
                setPhoneDigits(normalized);
            } finally {
                setLoading(false);
            }
        })();
    }, [navigate, location]);

    const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

    const onChange = (e) => setDraft((d) => ({ ...d, [e.target.name]: e.target.value }));

    function normalizeToTenDigits(input) {
        const digits = String(input || "").replace(/\D/g, "");
        if (digits.length >= 11) {
            const d = digits.slice(-11);
            return d.startsWith("7") ? d.slice(1) : d.startsWith("8") ? d.slice(1) : d.slice(-10);
        }
        if (digits.length === 10) return digits;
        return digits.slice(-10);
    }

    const fullPhone = useMemo(() => (phoneDigits ? `+7${phoneDigits}` : ""), [phoneDigits]);

    const validateStep = () => {
        setError("");
        const s = STEPS[step].key;
        if (s === "names") {
            if (!draft.secondName.trim() || !draft.firstName.trim()) {
                setError("Заполните Имя и Фамилию.");
                return false;
            }
        }
        if (s === "phone") {
            if (phoneDigits.length !== 10) {
                setError("Введите номер в формате +7 и 10 цифр.");
                return false;
            }
            if (!verified) {
                setError("Подтвердите номер.");
                return false;
            }
        }
        return true;
    };

    const persistStep = async () => {
        setBusy(true);
        try {
            const payload = {
                firstName: draft.firstName || "",
                secondName: draft.secondName || "",
                thirdName: draft.thirdName || "",
                phone: fullPhone || "",
                avatarFileId: draft.avatarFileId ?? null,
            };
            await updateUserProfile(payload);
            return true;
        } catch {
            setError("Не удалось сохранить. Попробуйте ещё раз.");
            return false;
        } finally {
            setBusy(false);
        }
    };

    const next = async () => {
        setInfo("");
        if (!validateStep()) return;
        if (!(await persistStep())) return;
        if (step < STEPS.length - 1) {
            const nextKey = STEPS[step + 1].key;
            setStep((s) => s + 1);
            if (nextKey === "phone") {
                setSmsRequested(false);
                setVerified(false);
                setCodeBoxes(["", "", "", ""]);
            }
        } else {
            navigate("/splash", { replace: true });
        }
    };

    const back = () => {
        setError("");
        setInfo("");
        if (step > 0) setStep((s) => s - 1);
    };

    const skipOptional = () => {
        const current = STEPS[step];
        if (!current.required) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const onAvatarChange = (newUrl) => setDraft((d) => ({ ...d, avatarUrl: newUrl }));

    const handlePhoneDigits = (e) => {
        setVerified(false);
        setSmsRequested(false);
        setCodeBoxes(["", "", "", ""]);
        const onlyDigits = e.target.value.replace(/\D/g, "");
        setPhoneDigits(onlyDigits.slice(0, 10));
    };

    const requestSms = async () => {
        setError("");
        setInfo("");
        if (phoneDigits.length !== 10) {
            setError("Введите номер в формате +7 и 10 цифр.");
            return;
        }
        if (!(await persistStep())) return;
        setBusy(true);
        try {
            const res = await startPhoneVerification(fullPhone);
            if (res.ok) {
                setSmsRequested(true);
                setInfo("Код отправлен.");
                codeRefs[0].current?.focus();
            } else {
                setSmsRequested(true);
                setInfo("Сервис кода недоступен. Попробуйте позже.");
            }
        } catch {
            setSmsRequested(true);
            setInfo("Сервис кода недоступен. Попробуйте позже.");
        } finally {
            setBusy(false);
        }
    };

    const handleCodeChange = (idx, val) => {
        const d = val.replace(/\D/g, "").slice(0, 1);
        const next = [...codeBoxes];
        next[idx] = d;
        setCodeBoxes(next);
        if (d && idx < 3) codeRefs[idx + 1].current?.focus();
    };

    const handleCodeKeyDown = (idx, e) => {
        if (e.key === "Backspace" && !codeBoxes[idx] && idx > 0) {
            codeRefs[idx - 1].current?.focus();
        }
    };

    const handleCodePaste = (e) => {
        const data = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
        if (!data) return;
        const arr = ["", "", "", ""];
        for (let i = 0; i < data.length && i < 4; i++) arr[i] = data[i];
        setCodeBoxes(arr);
        const nextIndex = Math.min(data.length, 3);
        codeRefs[nextIndex].current?.focus();
        e.preventDefault();
    };

    const codeFilled = useMemo(() => codeBoxes.join("").length === 4, [codeBoxes]);

    const submitCode = async () => {
        setError("");
        setInfo("");
        const code = codeBoxes.join("");
        if (code.length !== 4) {
            setError("Введите 4 цифры кода.");
            return;
        }
        setBusy(true);
        try {
            const res = await confirmPhoneVerification(fullPhone, code);
            if (res.ok && (res.verified ?? true)) {
                setVerified(true);
                setSmsRequested(false);
                setCodeBoxes(["", "", "", ""]);
                setInfo("Номер подтверждён");
            } else {
                setVerified(false);
                setError("Код не подтверждён.");
            }
        } catch {
            setVerified(false);
            setError("Подтверждение недоступно.");
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="ob-shell">
                <div className="ob-card">
                    <div className="ob-title">Заполнение профиля</div>
                    <div className="muted">Загрузка...</div>
                </div>
            </div>
        );
    }

    const current = STEPS[step];
    const isLastStep = step === STEPS.length - 1;
    const showSeparateSkip = !isLastStep && !current.required;
    const primaryActionLabel = isLastStep ? (current.required ? "Готово" : "Пропустить") : "Далее";

    return (
        <div className="ob-shell">
            <div className="ob-card">
                <div className="ob-title">Заполнение профиля: {current.title}</div>
                <div className="ob-progress">
                    <div className="ob-progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="ob-steps">
                    {STEPS.map((st, i) => (
                        <div key={st.key} className={`ob-step ${i === step ? "active" : i < step ? "done" : ""}`}>
                            <span className="dot" />
                            <span className="label">{st.title}</span>
                        </div>
                    ))}
                </div>

                <div className="ob-body">
                    {current.key === "names" && (
                        <div className="grid grid-2">
                            <div className="field">
                                <label>Фамилия *</label>
                                <input className="input" name="secondName" value={draft.secondName} onChange={onChange} placeholder="Иванов" />
                            </div>
                            <div className="field">
                                <label>Имя *</label>
                                <input className="input" name="firstName" value={draft.firstName} onChange={onChange} placeholder="Иван" />
                            </div>
                            <div className="field col-2">
                                <label>Отчество (опционально)</label>
                                <input className="input" name="thirdName" value={draft.thirdName} onChange={onChange} placeholder="Иванович" />
                            </div>
                        </div>
                    )}

                    {current.key === "phone" && (
                        <div className="grid grid-2">
                            <div className="field col-2">
                                <label>Телефон *</label>
                                <div className="input-with-action" style={{ gap: 8, paddingLeft: 12 }}>
                                    <span style={{ whiteSpace: "nowrap", opacity: 0.9, fontWeight: 700 }}>+7</span>
                                    <input
                                        className="input"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="__________"
                                        value={phoneDigits}
                                        onChange={handlePhoneDigits}
                                        maxLength={10}
                                        style={{ border: 0, background: "transparent" }}
                                        disabled={verified}
                                    />
                                </div>

                            </div>

                            <div className="field col-2">
                                {!verified && !smsRequested && (
                                    <button className="btn-primary" type="button" onClick={requestSms} disabled={busy || phoneDigits.length !== 10}>
                                        {busy ? "Отправляем..." : "Отправить код"}
                                    </button>
                                )}

                                {!verified && smsRequested && (
                                    <>
                                        <label>Код подтверждения</label>
                                        <div className="code-boxes" onPaste={handleCodePaste} style={{ display: "flex", gap: 10 }}>
                                            {codeRefs.map((ref, i) => (
                                                <input
                                                    key={i}
                                                    ref={ref}
                                                    className="input"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={codeBoxes[i]}
                                                    onChange={(e) => handleCodeChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                                    maxLength={1}
                                                    style={{ width: 56, textAlign: "center", fontSize: 20 }}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid" style={{ marginTop: 10 }}>
                                            <button className="btn-primary" type="button" onClick={submitCode} disabled={busy || !codeFilled}>
                                                {busy ? "Проверяем..." : "Проверить код"}
                                            </button>
                                            <button
                                                className="btn-ghost sm"
                                                type="button"
                                                onClick={() => {
                                                    setSmsRequested(false);
                                                    setVerified(false);
                                                    setCodeBoxes(["", "", "", ""]);
                                                }}
                                                style={{ width: "auto" }}
                                            >
                                                Изменить номер
                                            </button>
                                        </div>
                                        <div className="muted" style={{ marginTop: 8 }}>Введите 4 цифры кода и нажмите «Проверить код».</div>
                                    </>
                                )}

                                {verified && (
                                    <div className="grid" style={{ marginTop: 10 }}>
                                        <button
                                            className="btn-ghost sm"
                                            type="button"
                                            onClick={() => {
                                                setVerified(false);
                                                setSmsRequested(false);
                                            }}
                                            style={{ width: "auto" }}
                                        >
                                            Изменить номер
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {current.key === "avatar" && (
                        <div className="field col-2">
                            <label>Аватар (опционально)</label>
                            <AvatarUpload currentAvatarUrl={draft.avatarUrl || "/user.png"} onAvatarChange={onAvatarChange} />
                        </div>
                    )}
                </div>

                {(error || info) && <div className={`ob-msg ${error ? "error" : "info"}`}>{error || info}</div>}

                <div className="ob-actions">
                    <button className="btn-ghost" type="button" onClick={back} disabled={step === 0 || busy}>
                        Назад
                    </button>
                    {showSeparateSkip && (
                        <button className="btn-ghost" type="button" onClick={skipOptional} disabled={busy}>
                            Пропустить
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        type="button"
                        onClick={next}
                        disabled={busy || (current.key === "phone" && !verified)}
                    >
                        {primaryActionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
