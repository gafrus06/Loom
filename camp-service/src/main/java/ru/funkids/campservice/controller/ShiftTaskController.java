package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.ShiftTaskCompletionResponseDto;
import ru.funkids.campservice.dto.ShiftTaskCompletionUpsertDto;
import ru.funkids.campservice.dto.ShiftTaskCreateDto;
import ru.funkids.campservice.dto.ShiftTaskResponseDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.ShiftTaskService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shift-tasks")
@RequiredArgsConstructor
public class ShiftTaskController {

    private final ShiftTaskService shiftTaskService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<ShiftTaskResponseDto> create(
            @Valid @RequestBody ShiftTaskCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftTaskService.create(dto, currentUser.getUserId()));
    }

    @GetMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<ShiftTaskResponseDto> getById(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftTaskService.getById(taskId, currentUser.getUserId()));
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<ShiftTaskResponseDto>> listBySession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftTaskService.listBySession(sessionId, currentUser.getUserId()));
    }

    @GetMapping("/session/{sessionId}/today")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<ShiftTaskResponseDto>> listForCurrentDay(
            @PathVariable UUID sessionId,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftTaskService.listForCurrentDay(
                sessionId,
                currentUser.getUserId(),
                date == null ? LocalDate.now() : date,
                detachmentId
        ));
    }

    @PostMapping("/completions")
    @PreAuthorize("hasRole('COUNSELOR')")
    public ResponseEntity<ShiftTaskCompletionResponseDto> upsertCompletion(
            @Valid @RequestBody ShiftTaskCompletionUpsertDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(shiftTaskService.upsertCompletion(dto, currentUser.getUserId()));
    }
}
