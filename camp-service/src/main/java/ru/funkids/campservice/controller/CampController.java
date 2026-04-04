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
import ru.funkids.campservice.service.CampService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/camps")
@RequiredArgsConstructor
@Slf4j
public class CampController {

    private final CampService campService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampResponseDto> create(
            @Validated @RequestBody CampCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campService.create(dto, currentUser.getUserId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CampResponseDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(campService.get(id));
    }

    @PostMapping("/bulk")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CampResponseDto>> bulkGet(@RequestBody List<UUID> campIds) {
        return ResponseEntity.ok(campIds.stream().map(campService::get).toList());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampResponseDto> update(
            @PathVariable UUID id,
            @Validated @RequestBody CampUpdateDto dto) {
        return ResponseEntity.ok(campService.update(id, dto));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CampResponseDto>> getMyCamps(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campService.listByOwner(currentUser.getUserId()));
    }

    @GetMapping("/my-accessible")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CampWithRoleDto>> getMyAccessibleCamps(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        boolean isParent = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_PARENT"));
        log.info("User {} requesting accessible camps, isParent: {}", currentUser.getUserId(), isParent);
        return ResponseEntity.ok(campService.listMyAccessibleCamps(currentUser.getUserId(), isParent));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CampResponseDto>> getAll() {
        return ResponseEntity.ok(campService.listAll());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        campService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
