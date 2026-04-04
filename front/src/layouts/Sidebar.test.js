import React from "react";
import { screen } from "@testing-library/react";
import Sidebar from "./Sidebar";
import { renderWithProviders } from "../test-utils/renderWithProviders";

jest.mock("react-router-dom", () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useLocation: () => ({ pathname: "/" }),
    useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock("../state/sessionStore", () => ({
    useSession: () => ({
        isAuthenticated: true,
        user: {
            id: "user-1",
            roles: ["ROLE_ADMIN"],
        },
    }),
}));

jest.mock("../hooks/useCurrentUserProfile", () => ({
    useCurrentUserProfile: () => ({
        data: {
            firstName: "Анна",
            avatarUrl: "/avatar.png",
        },
    }),
}));

jest.mock("../hooks/useUnreadNotificationsCount", () => ({
    useUnreadNotificationsCount: () => ({
        data: 7,
    }),
}));

describe("Sidebar", () => {
    it("shows reactive profile data and unread notifications badge", () => {
        renderWithProviders(<Sidebar />);

        expect(screen.getByText("Анна")).toBeInTheDocument();
        expect(screen.getByText("Уведомления")).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument();
        expect(screen.getByText("Аналитика")).toBeInTheDocument();
    });
});
