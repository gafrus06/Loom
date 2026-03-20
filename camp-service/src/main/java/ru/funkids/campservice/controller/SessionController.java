package ru.funkids.campservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.SessionService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionController {

    private final SessionService sessionService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessionResponseDto> create(@Validated @RequestBody SessionCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.create(dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<SessionResponseDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(sessionService.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessionResponseDto> update(
            @PathVariable UUID id,
            @Validated @RequestBody SessionUpdateDto dto) {
        return ResponseEntity.ok(sessionService.update(id, dto));
    }

    @GetMapping("/camp/{campId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<List<SessionResponseDto>> getByCamp(@PathVariable UUID campId) {
        return ResponseEntity.ok(sessionService.listByCamp(campId));
    }

    @GetMapping("/my-accessible")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<SessionWithRoleDto>> getMyAccessibleSessions(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        log.info("User {} requesting accessible sessions", currentUser.getUserId());
        return ResponseEntity.ok(sessionService.listMyAccessibleSessions(currentUser.getUserId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sessionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}