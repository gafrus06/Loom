package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.CampSettingsResponseDto;
import ru.funkids.campservice.dto.CampSettingsUpsertDto;
import ru.funkids.campservice.dto.CampPostingAccessDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.CampSettingsService;

import java.util.UUID;

@RestController
@RequestMapping("/api/camp-settings")
@RequiredArgsConstructor
public class CampSettingsController {

    private final CampSettingsService campSettingsService;

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampSettingsResponseDto> upsert(
            @Valid @RequestBody CampSettingsUpsertDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campSettingsService.upsert(dto, currentUser.getUserId()));
    }

    @GetMapping("/camp/{campId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<CampSettingsResponseDto> getByCamp(@PathVariable UUID campId) {
        return ResponseEntity.ok(campSettingsService.getByCampId(campId));
    }

    @GetMapping("/camp/{campId}/posting-access")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<CampPostingAccessDto> getPostingAccess(
            @PathVariable UUID campId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campSettingsService.getPostingAccess(campId, currentUser.getUserId()));
    }
}
