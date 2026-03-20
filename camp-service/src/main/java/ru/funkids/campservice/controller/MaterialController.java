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
import ru.funkids.campservice.service.MaterialService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/detachments")
@RequiredArgsConstructor
@Slf4j
public class MaterialController {

    private final MaterialService materialService;

    @GetMapping("/{detachmentId}/methodology/games")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<List<MaterialWithUsageDto>> getGames(
            @PathVariable UUID detachmentId,
            @RequestParam String stage,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        log.info("User {} getting games for detachment {}, stage {}", currentUser.getUserId(), detachmentId, stage);
        return ResponseEntity.ok(materialService.getGamesWithUsage(detachmentId, stage));
    }

    @GetMapping("/{detachmentId}/methodology/campfires")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<List<MaterialWithUsageDto>> getCampfires(
            @PathVariable UUID detachmentId,
            @RequestParam String stage,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        log.info("User {} getting campfires for detachment {}, stage {}", currentUser.getUserId(), detachmentId, stage);
        return ResponseEntity.ok(materialService.getCampfiresWithUsage(detachmentId, stage));
    }

    @GetMapping("/{detachmentId}/methodology/exercises")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<List<MaterialWithUsageDto>> getExercises(
            @PathVariable UUID detachmentId,
            @RequestParam String stage,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        log.info("User {} getting exercises for detachment {}, stage {}", currentUser.getUserId(), detachmentId, stage);
        return ResponseEntity.ok(materialService.getExercisesWithUsage(detachmentId, stage));
    }

    @GetMapping("/methodology/physiological/{ageGroup}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<List<MaterialDto>> getPhysiologicalFeatures(@PathVariable String ageGroup) {
        return ResponseEntity.ok(materialService.getPhysiologicalFeatures(ageGroup));
    }

    @PostMapping("/{detachmentId}/methodology/usage")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<MaterialUsageDto> markAsUsed(
            @PathVariable UUID detachmentId,
            @Validated @RequestBody MarkAsUsedDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        log.info("User {} marking material as used in detachment {}", currentUser.getUserId(), detachmentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                materialService.markAsUsed(detachmentId, dto.getMaterialId(), dto.getMaterialType(),
                        dto.getStage(), currentUser.getUserId(), dto.getNotes()));
    }

    @GetMapping("/{detachmentId}/methodology/usage/history")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<List<MaterialUsageDto>> getUsageHistory(
            @PathVariable UUID detachmentId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(materialService.getUsageHistory(detachmentId));
    }

    @GetMapping("/{detachmentId}/methodology/recommended")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<List<MaterialRecommendationDto>> getRecommended(
            @PathVariable UUID detachmentId,
            @RequestParam String stage,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(materialService.getRecommendedForStage(detachmentId, stage));
    }

    @PostMapping("/{detachmentId}/methodology/favorites")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<Void> addToFavorites(
            @PathVariable UUID detachmentId,
            @Validated @RequestBody FavoriteDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        materialService.addToFavorites(detachmentId, dto.getMaterialId(), dto.getMaterialType(), currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{detachmentId}/methodology/favorites/{type}/{materialId}")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<Void> removeFromFavorites(
            @PathVariable UUID detachmentId,
            @PathVariable String type,
            @PathVariable UUID materialId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        materialService.removeFromFavorites(detachmentId, materialId, type);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{detachmentId}/methodology/favorites/{type}")
    @PreAuthorize("hasRole('ADMIN') or @detachmentSecurityService.hasAccessToDetachment(#detachmentId, principal.rawId)")
    public ResponseEntity<List<MaterialDto>> getFavorites(
            @PathVariable UUID detachmentId,
            @PathVariable String type,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(materialService.getFavorites(detachmentId, type));
    }

    @PostMapping("/methodology/materials")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MaterialDto> createMaterial(
            @Validated @RequestBody MaterialDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(materialService.createMaterial(dto, currentUser.getUserId()));
    }

    @PutMapping("/methodology/materials/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MaterialDto> updateMaterial(
            @PathVariable UUID id,
            @Validated @RequestBody MaterialDto dto) {
        return ResponseEntity.ok(materialService.updateMaterial(id, dto));
    }

    @DeleteMapping("/methodology/materials/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMaterial(@PathVariable UUID id) {
        materialService.deleteMaterial(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/methodology/materials/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MaterialDto> getMaterial(@PathVariable UUID id) {
        return ResponseEntity.ok(materialService.getMaterial(id));
    }

    @GetMapping("/methodology/materials")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MaterialDto>> getAllMaterials(
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(materialService.getAllMaterials(type));
    }
}