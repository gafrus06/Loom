import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import HomeNewsFeed from "./HomeNewsFeed";
import { renderWithProviders } from "../test-utils/renderWithProviders";

const mockUseNewsFeed = jest.fn();

global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
};

jest.mock("../state/sessionStore", () => ({
    useSession: () => ({
        isAuthenticated: true,
        user: {
            id: "admin-1",
            roles: ["ROLE_ADMIN"],
        },
    }),
}));

jest.mock("../hooks/useNews", () => ({
    useNewsFeed: (...args) => mockUseNewsFeed(...args),
}));

jest.mock("../services/campSettings", () => ({
    getCampSettings: jest.fn(async () => ({ calendarEnabled: true, calendarVisibleForParents: true })),
}));

jest.mock("../services/calendarEvents", () => ({
    getCalendarEventsBySession: jest.fn(async () => []),
}));

jest.mock("./Post", () => () => <div data-testid="post-card" />);
jest.mock("./CreatePostModal", () => ({ isOpen, campId, sessionId, detachmentId }) =>
    isOpen ? <div data-testid="create-post-modal">{`${campId}:${sessionId}:${detachmentId}`}</div> : null
);

describe("HomeNewsFeed", () => {
    beforeEach(() => {
        localStorage.clear();
        mockUseNewsFeed.mockImplementation((campId, sessionId, initialFilter, detachmentId) => {
            const ReactActual = require("react");
            const [filter, setFilter] = ReactActual.useState(initialFilter);

            return {
                posts: [],
                loading: false,
                error: null,
                filter,
                setFilter,
                hasMore: false,
                totalElements: 0,
                refresh: jest.fn(),
                updatePost: jest.fn(),
                removePost: jest.fn(),
                toggleLike: jest.fn(),
                loadMore: jest.fn(),
                campId,
                sessionId,
                detachmentId,
            };
        });
    });

    it("switches feed context by selected camp and keeps direct post creation context in sync", async () => {
        localStorage.setItem("homeNewsFeedFilter", "my-camp");

        const contexts = [
            {
                campId: "camp-1",
                campName: "Лагерь Альфа",
                sessionId: "session-1",
                detachmentId: "detachment-1",
            },
            {
                campId: "camp-2",
                campName: "Лагерь Бета",
                sessionId: "session-2",
                detachmentId: "detachment-2",
            },
        ];

        renderWithProviders(
            <HomeNewsFeed contexts={contexts} initialContext={contexts[0]} />
        );

        await waitFor(() => {
            expect(mockUseNewsFeed).toHaveBeenLastCalledWith("camp-1", "session-1", "my-camp", "detachment-1");
        });

        fireEvent.click(screen.getByText("Лагерь Альфа"));
        fireEvent.click(screen.getByText("Лагерь Бета"));

        await waitFor(() => {
            expect(mockUseNewsFeed).toHaveBeenLastCalledWith("camp-2", "session-2", "my-camp", "detachment-2");
        });

        fireEvent.click(screen.getByText("Новый пост"));
        expect(screen.getByTestId("create-post-modal")).toHaveTextContent("camp-2:session-2:detachment-2");
    });
});
