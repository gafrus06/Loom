package ru.funkids.campservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.impl.ChildApplicationServiceImpl;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@Slf4j
public class ChildApplicationController {

    private final ChildApplicationServiceImpl applicationService;

    // ─────────────────────────────────────────────────────────────────────────
    // КОДЫ ПРИГЛАШЕНИЯ
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Генерировать инвайт-код для конкретной смены.
     * URL: POST /api/applications/invite-codes/camps/{campId}/sessions/{sessionId}
     */
    @PostMapping("/invite-codes/camps/{campId}/sessions/{sessionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InviteCodeResponseDto> generateCode(
            @PathVariable UUID campId,
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.generateInviteCode(campId, sessionId, currentUser.getUserId()));
    }

    /** Все активные коды лагеря */
    @GetMapping("/invite-codes/camps/{campId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<InviteCodeResponseDto>> getCodes(@PathVariable UUID campId) {
        return ResponseEntity.ok(applicationService.getInviteCodes(campId));
    }

    /** Активные коды конкретной смены */
    @GetMapping("/invite-codes/camps/{campId}/sessions/{sessionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<InviteCodeResponseDto>> getCodesBySession(
            @PathVariable UUID campId,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(applicationService.getInviteCodesBySession(campId, sessionId));
    }

    /** Деактивировать код */
    @DeleteMapping("/invite-codes/{codeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateCode(@PathVariable UUID codeId) {
        applicationService.deactivateCode(codeId);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ИСПОЛЬЗОВАНИЕ КОДА РОДИТЕЛЕМ
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/invite-codes/use")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<IdResponseDto> useCode(
            @RequestBody UseInviteCodeDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        UUID campId = applicationService.useInviteCode(dto.code(), currentUser.getUserId());
        return ResponseEntity.ok(new IdResponseDto(campId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ЗАЯВКИ
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/camps/{campId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChildApplicationResponseDto> createApplication(
            @PathVariable UUID campId,
            @RequestBody ChildApplicationCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.createApplication(campId, currentUser.getUserId(), dto));
    }

    @GetMapping("/camps/{campId}/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChildApplicationResponseDto>> getMyApplications(
            @PathVariable UUID campId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(applicationService.getMyApplications(campId, currentUser.getUserId()));
    }

    @GetMapping("/camps/{campId}/pending")
    @PreAuthorize("hasRole('COUNSELOR') or hasRole('ADMIN')")
    public ResponseEntity<List<ChildApplicationResponseDto>> getPending(
            @PathVariable UUID campId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(applicationService.getPendingApplications(campId, search));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/{applicationId}/confirm")
    @PreAuthorize("hasRole('COUNSELOR') or hasRole('ADMIN')")
    public ResponseEntity<ChildApplicationResponseDto> confirm(
            @PathVariable UUID applicationId,
            @RequestBody ChildApplicationConfirmDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(
                applicationService.confirmApplication(
                        applicationId, dto.detachmentId(), currentUser.getUserId()));
    }

    @PostMapping("/{applicationId}/reject")
    @PreAuthorize("hasRole('COUNSELOR') or hasRole('ADMIN')")
    public ResponseEntity<ChildApplicationResponseDto> reject(
            @PathVariable UUID applicationId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(
                applicationService.rejectApplication(applicationId, currentUser.getUserId()));
    }
}