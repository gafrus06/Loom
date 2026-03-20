package ru.fun.userservice.rest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.fun.userservice.dto.*;
import ru.fun.userservice.dto.file.UploadUrlResponse;
import ru.fun.userservice.security.GatewayUserPrincipal;
import ru.fun.userservice.service.ProfileCompletionService;
import ru.fun.userservice.service.UserListingService;
import ru.fun.userservice.service.UserProfileFacade;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Общие эндпоинты профиля: чтение, обновление базовых данных, аватар, статус заполненности.
 * Телефонная верификация — PhoneVerificationController.
 * Роль-специфичные профили — CounselorProfileController, ParentProfileController.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileFacade userProfileFacade;
    private final UserListingService userListingService;
    private final ProfileCompletionService profileCompletionService;

    @GetMapping("/all")
    public UserProfilePageResponse listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String role
    ) {
        return userListingService.listUsers(page, size, role);
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> profile(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser
    ) {
        return ResponseEntity.ok(
                userProfileFacade.getCurrentUserProfile(currentUser.getUserId(), extractRoles(currentUser))
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @Valid @RequestBody EditUserProfileRequest updated
    ) {
        return ResponseEntity.ok(
                userProfileFacade.updateCurrentUserProfile(currentUser.getUserId(), updated, extractRoles(currentUser))
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable UUID id) {
        return ResponseEntity.ok(userProfileFacade.getUserProfileById(id));
    }

    @PostMapping("/profile/avatar/upload-url")
    public ResponseEntity<UploadUrlResponse> generateAvatarUploadUrl(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestParam String filename,
            @RequestParam String contentType
    ) {
        return ResponseEntity.ok(
                userProfileFacade.generateAvatarUploadUrl(currentUser.getUserId(), filename, contentType)
        );
    }

    @PostMapping("/profile/avatar/confirm")
    public ResponseEntity<Void> confirmAvatarUpload(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestParam UUID fileId
    ) {
        userProfileFacade.confirmAvatarUpload(currentUser.getUserId(), fileId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/profile/completion-status")
    public ResponseEntity<ProfileCompletionStatusResponse> completionStatus(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser
    ) {
        return ResponseEntity.ok(profileCompletionService.getStatus(currentUser.getUserId()));
    }

    // ── helpers ──────────────────────────────────────────────────────

    static List<String> extractRoles(GatewayUserPrincipal user) {
        return user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
    }
}