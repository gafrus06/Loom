package ru.fun.userservice.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.fun.userservice.dto.CounselorProfileDto;
import ru.fun.userservice.dto.EditCounselorProfileRequest;
import ru.fun.userservice.dto.UserProfileResponse;
import ru.fun.userservice.dto.file.UploadUrlResponse;
import ru.fun.userservice.security.GatewayUserPrincipal;
import ru.fun.userservice.service.CounselorProfileService;
import ru.fun.userservice.service.UserProfileFacade;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/profile/counselor")
@PreAuthorize("hasAuthority('ROLE_COUNSELOR')")
public class CounselorProfileController {

    private final CounselorProfileService counselorProfileService;
    private final UserProfileFacade userProfileFacade;

    @PutMapping
    public ResponseEntity<UserProfileResponse> updateCounselor(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestBody EditCounselorProfileRequest req
    ) {
        counselorProfileService.upsert(currentUser.getUserId(), req);
        return ResponseEntity.ok(
                userProfileFacade.getCurrentUserProfile(
                        currentUser.getUserId(),
                        UserProfileController.extractRoles(currentUser)
                )
        );
    }

    @PostMapping("/education-doc/upload-url")
    public ResponseEntity<UploadUrlResponse> generateEducationDocUploadUrl(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestParam String filename,
            @RequestParam String contentType
    ) {
        return ResponseEntity.ok(
                userProfileFacade.generateEducationDocUploadUrl(currentUser.getUserId(), filename, contentType)
        );
    }

    @PostMapping("/education-doc/confirm")
    public ResponseEntity<CounselorProfileDto> confirmEducationDocUpload(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestParam UUID fileId
    ) {
        return ResponseEntity.ok(
                counselorProfileService.addEducationDocument(currentUser.getUserId(), fileId)
        );
    }

    @DeleteMapping("/education-doc/{fileId}")
    public ResponseEntity<CounselorProfileDto> removeEducationDoc(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @PathVariable UUID fileId
    ) {
        return ResponseEntity.ok(
                counselorProfileService.removeEducationDocument(currentUser.getUserId(), fileId)
        );
    }
}