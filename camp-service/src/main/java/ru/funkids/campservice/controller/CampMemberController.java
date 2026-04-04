package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.CampMemberService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/camp-members")
@RequiredArgsConstructor
public class CampMemberController {

    private final CampMemberService campMemberService;

    @PostMapping("/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampMemberResponseDto> assignCounselor(
            @Valid @RequestBody CampMemberAssignDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campMemberService.assignCounselor(dto, currentUser.getUserId()));
    }

    @PostMapping("/assignments/accept")
    @PreAuthorize("hasRole('COUNSELOR')")
    public ResponseEntity<SessionStaffAssignmentResponseDto> acceptAssignment(
            @Valid @RequestBody SessionAssignmentDecisionDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.acceptSessionAssignment(dto.getAssignmentId(), currentUser.getUserId()));
    }

    @PostMapping("/assignments/reject")
    @PreAuthorize("hasRole('COUNSELOR')")
    public ResponseEntity<SessionStaffAssignmentResponseDto> rejectAssignment(
            @Valid @RequestBody SessionAssignmentDecisionDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.rejectSessionAssignment(dto.getAssignmentId(), currentUser.getUserId()));
    }

    @GetMapping("/assignments/my")
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN')")
    public ResponseEntity<List<SessionStaffAssignmentResponseDto>> getMyAssignments(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.getMySessionAssignments(currentUser.getUserId()));
    }

    @GetMapping("/sessions/{sessionId}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<SessionStaffAssignmentResponseDto>> getAssignmentsBySession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.getSessionAssignments(sessionId, currentUser.getUserId()));
    }

    @DeleteMapping("/camps/{campId}/counselors/{userId}/sessions/{sessionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeFromSession(
            @PathVariable UUID campId,
            @PathVariable UUID userId,
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMemberService.removeFromSession(campId, userId, sessionId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/camps/{campId}/counselors/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeCounselor(
            @PathVariable UUID campId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMemberService.removeCounselor(campId, userId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/leave")
    @PreAuthorize("hasRole('COUNSELOR')")
    public ResponseEntity<Void> leaveCamp(@AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMemberService.leaveCamp(currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-camp")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<CampMemberResponseDto> getMyCamp(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        CampMemberResponseDto response = campMemberService.getMyCamp(currentUser.getUserId());
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }

    @GetMapping("/users/{userId}/camp")
    public ResponseEntity<CampMemberResponseDto> getUserCamp(@PathVariable UUID userId) {
        CampMemberResponseDto response = campMemberService.getMyCamp(userId);
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }

    @GetMapping("/camps/{campId}/counselors")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CampMemberResponseDto>> getCampCounselors(@PathVariable UUID campId) {
        return ResponseEntity.ok(campMemberService.getCampCounselors(campId));
    }

    @PatchMapping("/camps/{campId}/staff/{userId}/sub-role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampMemberResponseDto> updateStaffSubRole(
            @PathVariable UUID campId,
            @PathVariable UUID userId,
            @Valid @RequestBody CampStaffSubRoleUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.updateStaffSubRole(campId, userId, dto, currentUser.getUserId()));
    }

    @GetMapping("/check-assignment")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<Boolean> checkAssignment(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.isCounselorInAnyCamp(currentUser.getUserId()));
    }
}
