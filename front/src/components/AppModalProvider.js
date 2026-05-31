import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AccessDeniedModal from "./AccessDeniedModal";
import SuccessModal from "./SuccessModal";
import ConfirmModal from "./ConfirmModal";

const AppModalContext = createContext(null);

export function AppModalProvider({ children }) {
    const [errorState, setErrorState] = useState({ open: false, title: "", message: "" });
    const [successState, setSuccessState] = useState({ open: false, title: "", message: "" });
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Подтвердить",
        cancelLabel: "Отмена",
        danger: true,
    });

    const confirmResolverRef = useRef(null);
    const apiRef = useRef(null);

    const closeError = useCallback(() => {
        setErrorState({ open: false, title: "", message: "" });
    }, []);

    const closeSuccess = useCallback(() => {
        setSuccessState({ open: false, title: "", message: "" });
    }, []);

    const showError = useCallback((title, message) => {
        if (message === undefined) {
            setErrorState({ open: true, title: "Ошибка", message: title || "Что-то пошло не так" });
            return;
        }
        setErrorState({ open: true, title: title || "Ошибка", message: message || "Что-то пошло не так" });
    }, []);

    const showSuccess = useCallback((title, message) => {
        if (message === undefined) {
            setSuccessState({ open: true, title: "Успешно", message: title || "Действие выполнено" });
            return;
        }
        setSuccessState({ open: true, title: title || "Успешно", message: message || "Действие выполнено" });
    }, []);

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            confirmResolverRef.current = resolve;
            setConfirmState({
                open: true,
                title: options.title || "Подтвердите действие",
                message: options.message || "",
                confirmLabel: options.confirmLabel || "Подтвердить",
                cancelLabel: options.cancelLabel || "Отмена",
                danger: options.danger !== false,
            });
        });
    }, []);

    const closeConfirm = useCallback((result) => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        if (confirmResolverRef.current) {
            confirmResolverRef.current(result);
            confirmResolverRef.current = null;
        }
    }, []);

    const value = useMemo(() => ({
        showError,
        showSuccess,
        confirm,
    }), [showError, showSuccess, confirm]);

    useEffect(() => {
        apiRef.current = value;
    }, [value]);

    useEffect(() => {
        const originalAlert = window.alert;
        window.alert = (message) => {
            const text = typeof message === "string" ? message : String(message ?? "");
            apiRef.current?.showError("Сообщение", text || "Что-то произошло");
        };

        return () => {
            window.alert = originalAlert;
        };
    }, []);

    return (
        <AppModalContext.Provider value={value}>
            {children}

            <AccessDeniedModal
                isOpen={errorState.open}
                onClose={closeError}
                title={errorState.title}
                message={errorState.message}
            />

            <SuccessModal
                isOpen={successState.open}
                onClose={closeSuccess}
                title={successState.title}
                message={successState.message}
            />

            <ConfirmModal
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel={confirmState.confirmLabel}
                cancelLabel={confirmState.cancelLabel}
                danger={confirmState.danger}
                onConfirm={() => closeConfirm(true)}
                onCancel={() => closeConfirm(false)}
            />
        </AppModalContext.Provider>
    );
}

export function useAppModal() {
    const ctx = useContext(AppModalContext);
    if (!ctx) {
        throw new Error("useAppModal must be used inside AppModalProvider");
    }
    return ctx;
}