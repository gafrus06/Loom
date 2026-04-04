package ru.funkids.campservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.CampAnalyticsSummaryDto;
import ru.funkids.campservice.dto.ShiftAnalyticsSummaryDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.CampAnalyticsService;

import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class CampAnalyticsController {

    private final CampAnalyticsService campAnalyticsService;

    @GetMapping("/camp/{campId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<CampAnalyticsSummaryDto> getCampSummary(
            @PathVariable UUID campId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campAnalyticsService.getCampSummary(campId, currentUser.getUserId()));
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<ShiftAnalyticsSummaryDto> getShiftSummary(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campAnalyticsService.getShiftSummary(sessionId, currentUser.getUserId()));
    }
}
