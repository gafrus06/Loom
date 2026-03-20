package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.ParentLinkService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/parent-links")
@RequiredArgsConstructor
public class ParentLinkController {

    private final ParentLinkService parentLinkService;

    @PostMapping
    @PreAuthorize("hasRole('COUNSELOR') or hasRole('ADMIN')")
    public ResponseEntity<ParentLinkResponseDto> link(@Valid @RequestBody ParentLinkCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(parentLinkService.link(dto));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('COUNSELOR') or hasRole('ADMIN')")
    public ResponseEntity<Void> unlink(
            @RequestParam UUID childId,
            @RequestParam UUID parentUserId) {
        parentLinkService.unlink(childId, parentUserId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-child/{childId}")
    public ResponseEntity<List<ParentLinkResponseDto>> listByChild(@PathVariable UUID childId) {
        return ResponseEntity.ok(parentLinkService.listByChild(childId));
    }

    @GetMapping("/by-parent")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<List<ParentLinkResponseDto>> listByParent(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(parentLinkService.listByParent(currentUser.getUserId()));
    }
}