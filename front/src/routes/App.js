import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import RouteDecider from "./RouteDecider";
import RequireProfileComplete from "./RequireProfileComplete";
import ProtectedShell from "./ProtectedShell";

const Auth = lazy(() => import("../pages/Auth"));
const Home = lazy(() => import("../pages/Home"));
const Profile = lazy(() => import("../pages/Profile"));
const UserProfile = lazy(() => import("../pages/UserProfile"));
const UserList = lazy(() => import("../pages/UserList"));
const LoomSplash = lazy(() => import("../pages/LoomSplash"));
const Onboarding = lazy(() => import("../pages/Onboarding"));
const CampsList = lazy(() => import("../pages/CampsList"));
const SessionsList = lazy(() => import("../pages/SessionsList"));
const DetachmentsList = lazy(() => import("../pages/DetachmentsList"));
const DetachmentPage = lazy(() => import("../pages/DetachmentPage/DetachmentPage"));
const Statistics = lazy(() => import("../pages/Statistics"));
const SubscriptionPage = lazy(() => import("../pages/SubscriptionPage"));
const InboxPage = lazy(() => import("../pages/InboxPage"));
const CampSettingsPage = lazy(() => import("../pages/CampSettingsPage"));
const SeniorDashboardPage = lazy(() => import("../pages/SeniorDashboardPage"));
const PrivacyPolicyPage = lazy(() => import("../pages/ConsentDocuments").then((module) => ({ default: module.PrivacyPolicyPage })));
const UserPersonalDataConsentPage = lazy(() => import("../pages/ConsentDocuments").then((module) => ({ default: module.UserPersonalDataConsentPage })));
const ParentPersonalDataConsentPage = lazy(() => import("../pages/ConsentDocuments").then((module) => ({ default: module.ParentPersonalDataConsentPage })));
const ChildPersonalDataConsentPage = lazy(() => import("../pages/ConsentDocuments").then((module) => ({ default: module.ChildPersonalDataConsentPage })));
const ChildHealthDataConsentPage = lazy(() => import("../pages/ConsentDocuments").then((module) => ({ default: module.ChildHealthDataConsentPage })));
const PhotoVideoPublicationConsentPage = lazy(() => import("../pages/ConsentDocuments").then((module) => ({ default: module.PhotoVideoPublicationConsentPage })));

function RouteFallback() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                color: "#A9B3C7",
                background: "#0A0E14",
                fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif',
            }}
        >
            <div>Загрузка...</div>
        </div>
    );
}

export default function App() {
    return (
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/decide" element={<RouteDecider />} />

                <Route path="/splash" element={<LoomSplash />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/:mode" element={<Auth />} />
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="/register" element={<Navigate to="/auth/register" replace />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/consents/user-personal-data" element={<UserPersonalDataConsentPage />} />
                <Route path="/consents/parent-personal-data" element={<ParentPersonalDataConsentPage />} />
                <Route path="/consents/child-personal-data" element={<ChildPersonalDataConsentPage />} />
                <Route path="/consents/child-health-data" element={<ChildHealthDataConsentPage />} />
                <Route path="/consents/photo-video-publication" element={<PhotoVideoPublicationConsentPage />} />

                <Route
                    element={(
                        <RequireProfileComplete>
                            <ProtectedShell />
                        </RequireProfileComplete>
                    )}
                >
                    <Route path="/" element={<Home />} />
                    <Route path="/users" element={<UserList />} />
                    <Route path="/users/:id" element={<UserProfile />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/user/:id" element={<UserProfile />} />

                    <Route path="/camps" element={<CampsList />} />
                    <Route path="/camps/:campId/sessions" element={<SessionsList />} />
                    <Route path="/camps/:campId/sessions/:sessionId/detachments" element={<DetachmentsList />} />
                    <Route path="/camps/:campId/sessions/:sessionId" element={<Navigate to="detachments" replace />} />
                    <Route path="/camps/:campId/settings" element={<CampSettingsPage />} />
                    <Route path="/camps/:campId/sessions/:sessionId/dashboard" element={<SeniorDashboardPage />} />
                    <Route path="/detachments/:detachmentId" element={<DetachmentPage />} />
                    <Route path="/detachments" element={<Navigate to="/camps" replace />} />

                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/parent" element={<Navigate to="/camps" replace />} />
                    <Route path="/inbox" element={<InboxPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/decide" replace />} />
            </Routes>
        </Suspense>
    );
}
