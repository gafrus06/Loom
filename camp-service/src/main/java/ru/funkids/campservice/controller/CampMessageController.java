package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.CampMessageCreateDto;
import ru.funkids.campservice.dto.CampMessageResponseDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.CampMessageService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/camp-messages")
@RequiredArgsConstructor
public class CampMessageController {

    private final CampMessageService campMessageService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PARENT', 'COUNSELOR')")
    public ResponseEntity<CampMessageResponseDto> create(
            @Valid @RequestBody CampMessageCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campMessageService.create(dto, currentUser.getUserId()));
    }

    @GetMapping("/detachment/{detachmentId}")
    @PreAuthorize("hasAnyRole('PARENT', 'COUNSELOR', 'ADMIN')")
    public ResponseEntity<List<CampMessageResponseDto>> listByDetachment(
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMessageService.listByDetachment(detachmentId, currentUser.getUserId()));
    }

    @GetMapping("/inbox")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CampMessageResponseDto>> inbox(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMessageService.listInbox(currentUser.getUserId()));
    }

    @PostMapping("/{messageId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMessageService.markRead(messageId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}
