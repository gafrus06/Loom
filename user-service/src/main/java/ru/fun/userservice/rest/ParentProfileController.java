package ru.fun.userservice.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.fun.userservice.dto.EditParentProfileRequest;
import ru.fun.userservice.dto.UserProfileResponse;
import ru.fun.userservice.security.GatewayUserPrincipal;
import ru.fun.userservice.service.ParentProfileService;
import ru.fun.userservice.service.UserProfileFacade;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/profile/parent")
@PreAuthorize("hasAuthority('ROLE_PARENT')")
public class ParentProfileController {

    private final ParentProfileService parentProfileService;
    private final UserProfileFacade userProfileFacade;

    @PutMapping
    public ResponseEntity<UserProfileResponse> updateParent(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestBody EditParentProfileRequest req
    ) {
        parentProfileService.upsert(currentUser.getUserId(), req);
        return ResponseEntity.ok(
                userProfileFacade.getCurrentUserProfile(
                        currentUser.getUserId(),
                        UserProfileController.extractRoles(currentUser)
                )
        );
    }
}