import { Routes, Route, Navigate } from "react-router-dom";

import Auth from "./components/Auth";
import Home from "./components/Home";
import Profile from "./components/Profile";
import UserProfile from "./components/UserProfile";
import UserList from "./components/UserList";
import LoomSplash from "./components/LoomSplash";
import Onboarding from "./components/Onboarding";
import RouteDecider from "./components/RouteDecider";
import RequireProfileComplete from "./components/RequireProfileComplete";
import ProtectedShell from "./components/ProtectedShell";

import CampsList from "./components/CampsList";
import SessionsList from "./components/SessionsList";
import DetachmentsList from "./components/DetachmentsList";
import DetachmentPage from "./components/DetachmentPage";
import Statistics from "./components/Statistics";
import SubscriptionPage from "./components/SubscriptionPage";

export default function App() {
    return (
        <Routes>
            <Route path="/decide" element={<RouteDecider />} />

            <Route path="/splash" element={<LoomSplash />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/:mode" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/register" element={<Navigate to="/auth/register" replace />} />

            <Route
                element={
                    <RequireProfileComplete>
                        <ProtectedShell />
                    </RequireProfileComplete>
                }
            >
                <Route path="/" element={<Home />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/user/:id" element={<UserProfile />} />

                <Route path="/camps" element={<CampsList />} />
                <Route path="/camps/:campId/sessions" element={<SessionsList />} />
                <Route path="/camps/:campId/sessions/:sessionId/detachments" element={<DetachmentsList />} />
                <Route path="/detachments/:detachmentId" element={<DetachmentPage />} />
                <Route path="/detachments" element={<Navigate to="/camps" replace />} />

                <Route path="/statistics" element={<Statistics />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/decide" replace />} />
        </Routes>
    );
}