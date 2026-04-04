package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.CalendarEventCreateDto;
import ru.funkids.campservice.dto.CalendarEventResponseDto;
import ru.funkids.campservice.dto.CalendarEventUpdateDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.CalendarEventService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/calendar-events")
@RequiredArgsConstructor
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<CalendarEventResponseDto> create(
            @Valid @RequestBody CalendarEventCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(calendarEventService.create(dto, currentUser.getUserId()));
    }

    @PutMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<CalendarEventResponseDto> update(
            @PathVariable UUID eventId,
            @RequestBody CalendarEventUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(calendarEventService.update(eventId, dto, currentUser.getUserId()));
    }

    @DeleteMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<Void> delete(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        calendarEventService.delete(eventId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<List<CalendarEventResponseDto>> listBySession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(calendarEventService.listBySession(sessionId, currentUser.getUserId()));
    }
}
