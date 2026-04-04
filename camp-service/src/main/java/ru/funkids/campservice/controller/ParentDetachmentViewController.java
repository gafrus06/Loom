package ru.funkids.campservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.ParentDetachmentViewDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.ParentDetachmentViewService;

import java.util.UUID;

@RestController
@RequestMapping("/api/parent-detachments")
@RequiredArgsConstructor
public class ParentDetachmentViewController {

    private final ParentDetachmentViewService parentDetachmentViewService;

    @GetMapping("/{detachmentId}")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ParentDetachmentViewDto> getParentDetachmentView(
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(parentDetachmentViewService.getDetachmentView(detachmentId, currentUser.getUserId()));
    }
}
