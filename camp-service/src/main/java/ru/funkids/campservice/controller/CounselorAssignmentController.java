package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.CounselorAssignmentService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/counselor-assignments")
@RequiredArgsConstructor
public class CounselorAssignmentController {

    private final CounselorAssignmentService assignmentService;

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_COUNSELOR')")
    @PostMapping
    public CounselorAssignmentResponseDto assign(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestBody @Valid CounselorAssignDto dto) {
        return assignmentService.assign(dto, currentUser.getUserId());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_COUNSELOR')")
    @PostMapping("/unassign")
    public CounselorAssignmentResponseDto unassign(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestBody @Valid CounselorUnassignDto dto) {
        return assignmentService.unassign(dto, currentUser.getUserId());
    }

    @GetMapping("/by-detachment")
    public List<CounselorAssignmentResponseDto> listActive(@RequestParam UUID detachmentId) {
        return assignmentService.listActiveByDetachment(detachmentId);
    }

    @GetMapping("/my-active")
    @PreAuthorize("hasAnyAuthority('ROLE_COUNSELOR', 'ROLE_ADMIN')")
    public List<CounselorAssignmentResponseDto> getMyActiveAssignments(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return assignmentService.getActiveAssignmentsByUser(currentUser.getUserId());
    }
}