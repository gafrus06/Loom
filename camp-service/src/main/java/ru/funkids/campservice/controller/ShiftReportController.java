package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.DetachmentDailyReportCreateDto;
import ru.funkids.campservice.dto.DetachmentDailyReportResponseDto;
import ru.funkids.campservice.dto.ShiftReportTemplateCreateDto;
import ru.funkids.campservice.dto.ShiftReportTemplateResponseDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.ShiftReportService;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ShiftReportController {

    private final ShiftReportService shiftReportService;

    @PostMapping("/shift-report-templates/camps/{campId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<ShiftReportTemplateResponseDto> createTemplate(
            @PathVariable UUID campId,
            @Valid @RequestBody ShiftReportTemplateCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftReportService.createTemplate(campId, dto, currentUser.getUserId()));
    }

    @GetMapping("/shift-report-templates/camps/{campId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<ShiftReportTemplateResponseDto>> listTemplates(
            @PathVariable UUID campId,
            @RequestParam(required = false) UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftReportService.listTemplates(campId, sessionId, currentUser.getUserId()));
    }

    @PutMapping("/shift-report-templates/{templateId}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<ShiftReportTemplateResponseDto> deactivateTemplate(
            @PathVariable UUID templateId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftReportService.deactivateTemplate(templateId, currentUser.getUserId()));
    }

    @PostMapping("/detachment-daily-reports/detachments/{detachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<DetachmentDailyReportResponseDto> upsertDailyReport(
            @PathVariable UUID detachmentId,
            @Valid @RequestBody DetachmentDailyReportCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftReportService.upsertDailyReport(detachmentId, dto, currentUser.getUserId()));
    }

    @GetMapping("/detachment-daily-reports/detachments/{detachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<DetachmentDailyReportResponseDto>> listDetachmentReports(
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftReportService.listDetachmentReports(detachmentId, currentUser.getUserId()));
    }

    @GetMapping("/detachment-daily-reports/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<DetachmentDailyReportResponseDto>> listSessionReports(
            @PathVariable UUID sessionId,
            @RequestParam UUID campId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftReportService.listSessionReports(campId, sessionId, currentUser.getUserId()));
    }
}
