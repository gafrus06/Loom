package ru.funkids.campservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.AuditEventResponseDto;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.AuditEventService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditEventService auditEventService;

    // =========================================================================
    // Лента событий конкретного лагеря
    // Основной endpoint для аналитики — возвращает человекочитаемые описания.
    // Доступен: ADMIN лагеря и вожатые этого лагеря.
    // =========================================================================

    @GetMapping("/camps/{campId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public List<AuditEventResponseDto> byCamp(
            @PathVariable UUID campId,
            @RequestParam(defaultValue = "50") int limit) {
        return auditEventService.recentByCamp(campId, Math.min(limit, 200));
    }

    // =========================================================================
    // Фильтр по коду действия в лагере
    // Примеры action: DETACHMENT_STAGE_CHANGED, COUNSELOR_ASSIGNED, SESSION_CREATED
    // =========================================================================

    @GetMapping("/camps/{campId}/action/{action}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public List<AuditEventResponseDto> byCampAndAction(
            @PathVariable UUID campId,
            @PathVariable String action,
            @RequestParam(defaultValue = "50") int limit) {
        return auditEventService.recentByCampAndAction(campId, action, Math.min(limit, 200));
    }

    // =========================================================================
    // История событий конкретной сущности (drill-down)
    // Пример: история изменений отряда X, история ребёнка Y
    // =========================================================================

    @GetMapping("/entity")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public List<AuditEventResponseDto> byEntity(
            @RequestParam String entityType,
            @RequestParam UUID entityId,
            @RequestParam(defaultValue = "50") int limit) {
        return auditEventService.recentByEntity(entityType, entityId, Math.min(limit, 100));
    }

    // =========================================================================
    // Мои действия (для любого авторизованного пользователя — история своих действий)
    // =========================================================================

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public List<AuditEventResponseDto> myActions(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestParam(defaultValue = "50") int limit) {
        return auditEventService.recentByActor(currentUser.getUserId(), Math.min(limit, 100));
    }
}