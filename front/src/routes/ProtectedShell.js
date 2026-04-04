import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import "./ProtectedShell.css";

export default function ProtectedShell() {
    return (
        <>
            <Outlet />
            <BottomNav />
        </>
    );
}
