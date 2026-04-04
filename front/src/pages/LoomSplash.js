import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LoomSplash.css";

export default function LoomSplash() {
    const navigate = useNavigate();

    useEffect(() => {
        const t = setTimeout(() => { navigate("/", { replace: true }); }, 5000);
        return () => clearTimeout(t);
    }, [navigate]);

    return (
        <div className="splash-screen">
            <h1 className="splash-logo">
                <span className="letter">L</span>
                <span className="letter">o</span>
                <span className="letter">o</span>
                <span className="letter">m</span>
            </h1>
        </div>
    );
}
