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
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.DetachmentService;
import ru.funkids.campservice.service.impl.DetachmentServiceImpl;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/detachments")
@RequiredArgsConstructor
@Slf4j
public class DetachmentController {

    private final DetachmentService detachmentService;
    private final DetachmentServiceImpl detachmentServiceImpl;
    private final DetachmentSecurityService detachmentSecurityService;

    // -------------------------------------------------------------------------
    // Создание отряда
    // Вожатый назначен на смену ИЛИ ADMIN — проверяется внутри сервиса
    // -------------------------------------------------------------------------

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<DetachmentResponseDto> create(
            @Validated @RequestBody DetachmentCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(detachmentService.create(dto, currentUser.getUserId()));
    }

    // -------------------------------------------------------------------------
    // Просмотр одного отряда
    // ADMIN: всегда. Вожатый: если назначен на смену. Родитель: если его ребёнок в отряде.
    // -------------------------------------------------------------------------

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canViewDetachment(#id, principal.rawId)")
    public ResponseEntity<DetachmentResponseDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(detachmentService.get(id));
    }

    // -------------------------------------------------------------------------
    // Список всех отрядов смены
    // ADMIN: всегда. Вожатый: только своей смены. Родитель: только свой отряд.
    // Фильтрация по роли происходит внутри listBySessionWithAccess.
    // -------------------------------------------------------------------------

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<List<DetachmentResponseDto>> getBySession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(
                detachmentServiceImpl.listBySessionWithAccess(sessionId, currentUser.getUserId()));
    }

    // -------------------------------------------------------------------------
    // Изменение этапа отряда
    // Только LEAD/ASSISTANT этого отряда или ADMIN лагеря.
    // -------------------------------------------------------------------------

    @PutMapping("/{id}/stage")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canModifyDetachment(#id, principal.rawId)")
    public ResponseEntity<DetachmentResponseDto> updateStage(
            @PathVariable UUID id,
            @Validated @RequestBody DetachmentStageUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(
                detachmentService.updateStage(id, dto.getStage(), currentUser.getUserId()));
    }

    // -------------------------------------------------------------------------
    // Редактирование имени / возрастной группы отряда
    // -------------------------------------------------------------------------

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canModifyDetachment(#id, principal.rawId)")
    public ResponseEntity<DetachmentResponseDto> update(
            @PathVariable UUID id,
            @Validated @RequestBody DetachmentUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(detachmentService.update(id, dto));
    }

    // -------------------------------------------------------------------------
    // Добавление помощника в отряд
    // LEAD отряда или ADMIN лагеря
    // -------------------------------------------------------------------------

    @PostMapping("/{id}/assistants")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canAddAssistant(#id, principal.rawId)")
    public ResponseEntity<Void> addAssistant(
            @PathVariable UUID id,
            @RequestParam UUID counselorUserId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        detachmentServiceImpl.addAssistant(id, counselorUserId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Исключение вожатого из отряда
    // ADMIN: любого. LEAD: только ASSISTANT. ASSISTANT: никого.
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}/counselors/{targetUserId}")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canRemoveCounselor(#id, #targetUserId, principal.rawId)")
    public ResponseEntity<Void> removeCounselor(
            @PathVariable UUID id,
            @PathVariable UUID targetUserId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        detachmentServiceImpl.removeCounselorFromDetachment(id, targetUserId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Мои доступные отряды
    // -------------------------------------------------------------------------

    @GetMapping("/my-accessible")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<List<DetachmentWithRoleDto>> getMyAccessibleDetachments(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(
                detachmentService.listMyAccessibleDetachments(currentUser.getUserId()));
    }

    // -------------------------------------------------------------------------
    // Удаление отряда — только ADMIN
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        detachmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}