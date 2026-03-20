import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import "../styles/mobile.css"; // стили из шага 3

export default function ProtectedShell() {
    return (
        <>
            <Outlet />
            <BottomNav /> {/* на десктопе скрыто CSS-ом */}
        </>
    );
}
