import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import { renderWithProviders } from "../test-utils/renderWithProviders";

const mockUpdateUserProfile = jest.fn();
const mockUpdateParentProfile = jest.fn();
const mockUpdateCounselorProfile = jest.fn();
const mockProfileData = {
    id: "user-1",
    email: "user@example.com",
    firstName: "Анна",
    secondName: "Иванова",
    thirdName: "Сергеевна",
    phone: "+79990001122",
    avatarUrl: "/avatar.png",
    parent: {
        emergencyContactName: "Мария Иванова",
        emergencyContactPhone: "+79990002233",
        address: "Тестовая улица, 1",
        notes: "Без аллергий",
    },
    counselor: {
        specialization: "Творческие смены",
        experienceYears: 3,
        bio: "Люблю работать с детьми",
        educationDocumentIds: "",
        telegram: "@anna",
        shiftPreference: "Лето",
    },
};

jest.mock("react-router-dom", () => ({
    useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock("../services/auth", () => ({
    logout: jest.fn(() => Promise.resolve()),
}));

jest.mock("../services/files", () => ({
    updateUserProfile: (...args) => mockUpdateUserProfile(...args),
    updateParentProfile: (...args) => mockUpdateParentProfile(...args),
    updateCounselorProfile: (...args) => mockUpdateCounselorProfile(...args),
}));

jest.mock("../state/sessionStore", () => ({
    useSession: () => ({
        isAuthenticated: true,
        user: {
            id: "user-1",
            roles: ["ROLE_USER", "ROLE_PARENT", "ROLE_COUNSELOR"],
        },
    }),
}));

jest.mock("../hooks/useCurrentUserProfile", () => ({
    useCurrentUserProfile: () => ({
        data: mockProfileData,
        isLoading: false,
        isError: false,
    }),
}));

jest.mock("../layouts/Sidebar", () => () => <div data-testid="sidebar" />);
jest.mock("../components/AvatarUpload", () => () => <div data-testid="avatar-upload" />);
jest.mock("../components/EducationDocsUpload", () => () => <div data-testid="education-docs-upload" />);
jest.mock("../components/CampMembershipWidget", () => () => <div data-testid="camp-membership-widget" />);

describe("Profile page", () => {
    beforeEach(() => {
        mockUpdateUserProfile.mockReset();
        mockUpdateParentProfile.mockReset();
        mockUpdateCounselorProfile.mockReset();
    });

    it("normalizes phone and saves the main profile without losing role-specific sections", async () => {
        mockUpdateUserProfile.mockResolvedValue({
            ...mockProfileData,
            phone: "+79991112233",
        });

        renderWithProviders(<Profile />);

        expect(await screen.findByText("Данные родителя")).toBeInTheDocument();
        expect(screen.getByText("Данные вожатого")).toBeInTheDocument();
        expect(screen.getByTestId("camp-membership-widget")).toBeInTheDocument();

        fireEvent.click(screen.getByTitle("Редактировать"));

        const [phoneInput] = screen.getAllByPlaceholderText("+7 999 000-00-00");
        fireEvent.change(phoneInput, { target: { value: "+7 (999) 111-22-33" } });
        fireEvent.click(screen.getByText("Сохранить"));

        await waitFor(() => {
            expect(mockUpdateUserProfile).toHaveBeenCalledWith(
                expect.objectContaining({ phone: "+79991112233" })
            );
        });
    });
});
