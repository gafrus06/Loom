package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.SeniorCounselorNoticeCreateDto;
import ru.funkids.campservice.dto.SeniorCounselorNoticeResponseDto;
import ru.funkids.campservice.dto.SeniorCounselorNoticeUpdateDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.SeniorCounselorNoticeService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/senior-notices")
@RequiredArgsConstructor
public class SeniorCounselorNoticeController {

    private final SeniorCounselorNoticeService seniorCounselorNoticeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<SeniorCounselorNoticeResponseDto> create(
            @Valid @RequestBody SeniorCounselorNoticeCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(seniorCounselorNoticeService.create(dto, currentUser.getUserId()));
    }

    @PutMapping("/{noticeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<SeniorCounselorNoticeResponseDto> update(
            @PathVariable UUID noticeId,
            @Valid @RequestBody SeniorCounselorNoticeUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(seniorCounselorNoticeService.update(noticeId, dto, currentUser.getUserId()));
    }

    @DeleteMapping("/{noticeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<Void> deactivate(
            @PathVariable UUID noticeId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        seniorCounselorNoticeService.deactivate(noticeId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<SeniorCounselorNoticeResponseDto>> listForSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(seniorCounselorNoticeService.listForSession(sessionId, currentUser.getUserId()));
    }

    @GetMapping("/session/{sessionId}/detachment/{detachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<SeniorCounselorNoticeResponseDto>> listForDetachment(
            @PathVariable UUID sessionId,
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(seniorCounselorNoticeService.listForDetachment(sessionId, detachmentId, currentUser.getUserId()));
    }
}
