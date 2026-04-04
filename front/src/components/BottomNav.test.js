import React from "react";
import { act, screen } from "@testing-library/react";
import BottomNav from "./BottomNav";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import { saveTokens } from "../services/auth";
import { syncSessionStore } from "../state/sessionStore";

jest.mock("react-router-dom", () => ({
    NavLink: ({ children, to }) => <a href={to}>{typeof children === "function" ? children({ isActive: false }) : children}</a>,
}), { virtual: true });

jest.mock("../hooks/useCurrentUserProfile", () => ({
    useCurrentUserProfile: () => ({
        data: { avatarUrl: "/avatar.png" },
    }),
}));

function createToken(payload) {
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    const body = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    return `${header}.${body}.`;
}

describe("BottomNav", () => {
    beforeEach(() => {
        localStorage.clear();
        act(() => {
            syncSessionStore();
        });
    });

    it("reactively updates role-sensitive navigation after token refresh", async () => {
        const userToken = createToken({
            id: "user-1",
            sub: "user@example.com",
            roles: ["ROLE_USER"],
            tv: 1,
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        const adminToken = createToken({
            id: "user-1",
            sub: "user@example.com",
            roles: ["ROLE_USER", "ROLE_ADMIN"],
            tv: 2,
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        act(() => {
            saveTokens(userToken);
        });

        renderWithProviders(<BottomNav />);
        expect(screen.queryByText("Статистика")).not.toBeInTheDocument();

        await act(async () => {
            saveTokens(adminToken);
        });

        expect(await screen.findByText("Статистика")).toBeInTheDocument();
    });
});
