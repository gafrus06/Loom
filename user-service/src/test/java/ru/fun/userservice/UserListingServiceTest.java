package ru.fun.userservice;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import ru.fun.userservice.dto.UserProfilePageResponse;
import ru.fun.userservice.dto.UserProfileResponse;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.AdminProfileRepository;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;
import ru.fun.userservice.service.UserListingService;
import ru.fun.userservice.service.UserProfileFacade;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserListingServiceTest {

    @Mock private UserProfileRepository userProfileRepository;
    @Mock private ParentProfileRepository parentProfileRepository;
    @Mock private CounselorProfileRepository counselorProfileRepository;
    @Mock private AdminProfileRepository adminProfileRepository;
    @Mock private UserProfileFacade userProfileFacade;

    @InjectMocks
    private UserListingService userListingService;

    @Test
    void listUsersUsesResolvedAuthRolesForFilteringAndResponse() {
        UUID userId = UUID.randomUUID();
        UserProfile user = UserProfile.builder()
                .id(userId)
                .email("counselor@example.com")
                .firstName("Ivan")
                .build();

        when(userProfileRepository.findAll(PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(user), PageRequest.of(0, 10), 1));
        when(parentProfileRepository.findAllByUserProfileIdIn(Set.of(userId))).thenReturn(List.of());
        when(counselorProfileRepository.findAllByUserProfileIdIn(Set.of(userId))).thenReturn(List.of());
        when(adminProfileRepository.findAllByUserProfileIdIn(Set.of(userId))).thenReturn(List.of());
        when(userProfileFacade.resolveRolesForUsers(List.of(userId)))
                .thenReturn(Map.of(userId, List.of("ROLE_COUNSELOR")));
        when(userProfileFacade.resolveAvatarUrls(List.of(user))).thenReturn(Map.of());
        when(userProfileFacade.buildResponseForListing(eq(user), eq(null), eq(null), eq(null), eq(null), eq(List.of("ROLE_COUNSELOR"))))
                .thenReturn(UserProfileResponse.builder()
                        .id(userId.toString())
                        .email(user.getEmail())
                        .roles(List.of("ROLE_COUNSELOR"))
                        .build());

        UserProfilePageResponse response = userListingService.listUsers(0, 10, "COUNSELOR");

        assertThat(response.getUsers()).hasSize(1);
        assertThat(response.getUsers().getFirst().getRoles()).containsExactly("ROLE_COUNSELOR");
        verify(userProfileFacade).buildResponseForListing(eq(user), eq(null), eq(null), eq(null), eq(null), eq(List.of("ROLE_COUNSELOR")));
    }

    @Test
    void listUsersExcludesUserWhenResolvedRolesDoNotMatchFilter() {
        UUID userId = UUID.randomUUID();
        UserProfile user = UserProfile.builder()
                .id(userId)
                .email("plain@example.com")
                .build();

        when(userProfileRepository.findAll(PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(user), PageRequest.of(0, 10), 1));
        when(parentProfileRepository.findAllByUserProfileIdIn(any())).thenReturn(List.of());
        when(counselorProfileRepository.findAllByUserProfileIdIn(any())).thenReturn(List.of());
        when(adminProfileRepository.findAllByUserProfileIdIn(any())).thenReturn(List.of());
        when(userProfileFacade.resolveRolesForUsers(List.of(userId)))
                .thenReturn(Map.of(userId, List.of("ROLE_USER")));

        UserProfilePageResponse response = userListingService.listUsers(0, 10, "COUNSELOR");

        assertThat(response.getUsers()).isEmpty();
    }
}
