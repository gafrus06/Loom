package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.DetachmentJournalResponseDto;
import ru.funkids.campservice.dto.DetachmentJournalUpsertDto;
import ru.funkids.campservice.dto.ParentDetachmentJournalResponseDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.DetachmentJournalService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/detachment-journals")
@RequiredArgsConstructor
public class DetachmentJournalController {

    private final DetachmentJournalService detachmentJournalService;

    @PostMapping("/detachments/{detachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<DetachmentJournalResponseDto> upsert(
            @PathVariable UUID detachmentId,
            @Valid @RequestBody DetachmentJournalUpsertDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(detachmentJournalService.upsert(detachmentId, dto, currentUser.getUserId()));
    }

    @GetMapping("/detachments/{detachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<DetachmentJournalResponseDto>> listInternal(
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(detachmentJournalService.listInternal(detachmentId, currentUser.getUserId()));
    }

    @GetMapping("/detachments/{detachmentId}/by-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<DetachmentJournalResponseDto> getInternalByDate(
            @PathVariable UUID detachmentId,
            @RequestParam LocalDate date,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(detachmentJournalService.getInternal(detachmentId, date, currentUser.getUserId()));
    }

    @GetMapping("/detachments/{detachmentId}/parent-view")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<List<ParentDetachmentJournalResponseDto>> listParentView(
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(detachmentJournalService.listParentView(detachmentId, currentUser.getUserId()));
    }

    @GetMapping("/detachments/{detachmentId}/parent-view/by-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<ParentDetachmentJournalResponseDto> getParentViewByDate(
            @PathVariable UUID detachmentId,
            @RequestParam LocalDate date,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(detachmentJournalService.getParentView(detachmentId, date, currentUser.getUserId()));
    }
}
