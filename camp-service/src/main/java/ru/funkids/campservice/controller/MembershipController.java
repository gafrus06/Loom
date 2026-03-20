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
import ru.funkids.campservice.service.MembershipService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/memberships")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipService membershipService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (hasRole('COUNSELOR') and @campSecurityService.canManageDetachment(#dto.detachmentId, principal.rawId))")
    public ResponseEntity<MembershipResponseDto> add(
            @Valid @RequestBody MembershipAddDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(membershipService.add(dto, currentUser.getUserId()));
    }

    @PostMapping("/close")
    @PreAuthorize("hasRole('ADMIN') or hasRole('COUNSELOR')")
    public ResponseEntity<MembershipResponseDto> close(
            @Valid @RequestBody MembershipCloseDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(membershipService.close(dto, currentUser.getUserId()));
    }

    @GetMapping("/detachment/{detachmentId}")
    public ResponseEntity<List<MembershipResponseDto>> listByDetachment(@PathVariable UUID detachmentId) {
        return ResponseEntity.ok(membershipService.listByDetachment(detachmentId));
    }

    @GetMapping("/child/{childId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR') or " +
            "(hasRole('PARENT') and @campSecurityService.isParentOfChild(#childId, principal.rawId))")
    public ResponseEntity<List<MembershipResponseDto>> listByChild(@PathVariable UUID childId) {
        return ResponseEntity.ok(membershipService.listByChild(childId));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR') or " +
            "(hasRole('PARENT') and @campSecurityService.isParentOfChild(#childId, principal.rawId))")
    public ResponseEntity<MembershipResponseDto> getActiveMembership(@RequestParam UUID childId) {
        MembershipResponseDto membership = membershipService.getActiveMembership(childId);
        return membership == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(membership);
    }
}