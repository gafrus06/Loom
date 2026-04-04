import React from "react";
import { screen, waitFor } from "@testing-library/react";
import Post from "./Post";
import { renderWithProviders } from "../test-utils/renderWithProviders";

jest.mock("react-router-dom", () => ({
    useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock("./AnimatedText", () => ({
    __esModule: true,
    default: ({ text }) => <>{text}</>,
}));

jest.mock("./PostContentRenderer", () => ({
    __esModule: true,
    default: ({ content }) => <div>{content}</div>,
}));

jest.mock("./EditRichPostModal", () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock("../hooks/usePostMediaUrls", () => ({
    usePostMediaUrls: () => ({
        data: {
            "file-1": "https://cdn.example.com/image-1.jpg",
            "file-2": "https://cdn.example.com/video-1.mp4",
        },
        isLoading: false,
    }),
}));

jest.mock("../services/auth", () => ({
    getCurrentUser: () => ({
        id: "author-1",
        roles: ["ROLE_ADMIN"],
    }),
}));

jest.mock("../services/news", () => ({
    togglePin: jest.fn(),
    deletePost: jest.fn(),
    getMediaUrlsBatch: jest.fn(),
}));

jest.mock("./AppModalProvider", () => ({
    useAppModal: () => ({
        confirm: jest.fn(async () => true),
        showError: jest.fn(),
    }),
}));

const post = {
    id: "post-1",
    title: "Тестовый пост",
    content: "Контент",
    contentJson: null,
    createdAt: new Date().toISOString(),
    author: {
        id: "author-1",
        firstName: "Иван",
        lastName: "Иванов",
        avatarUrl: null,
    },
    media: [
        { fileId: "file-1", type: "IMAGE" },
        { fileId: "file-2", type: "VIDEO" },
    ],
    stats: { likesCount: 1 },
    userInteraction: { liked: false },
};

describe("Post media loading", () => {
    it("renders post content with resolved media URLs", async () => {
        renderWithProviders(<Post post={post} onUpdate={jest.fn()} onDelete={jest.fn()} onLike={jest.fn()} />);

        expect(screen.getAllByText("Тестовый пост").length).toBeGreaterThan(0);
        await waitFor(() => {
            expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
        });
    });
});
