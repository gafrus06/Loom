package ru.funkids.campservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.security.GatewayUserPrincipal;
import ru.funkids.campservice.service.impl.ChildServiceImpl;

import java.util.UUID;

@RestController
@RequestMapping("/api/children")
@RequiredArgsConstructor
@Slf4j
public class ChildController {

    private final ChildServiceImpl childService;

    // =========================================================================
    // Создание карточки ребёнка
    // Только вожатый отряда (LEAD/ASSISTANT) или ADMIN лагеря.
    // Родитель не может создавать карточки — только подтверждённая заявка.
    // =========================================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<ChildResponseDto> create(
            @Valid @RequestBody ChildCreateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(childService.create(dto, currentUser.getUserId()));
    }

    // =========================================================================
    // Просмотр ПОЛНОЙ карточки ребёнка
    //   - ADMIN: всегда
    //   - Вожатый: если является членом отряда этого ребёнка
    //   - Родитель: только своего ребёнка
    // =========================================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canViewFullChildCard(#id, principal.rawId)")
    public ResponseEntity<ChildResponseDto> get(
            @PathVariable UUID id,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        log.info("User {} requesting full child card {}", currentUser.getUserId(), id);
        return ResponseEntity.ok(childService.getWithAccessCheck(id, currentUser.getUserId()));
    }

    // =========================================================================
    // Просмотр КРАТКОЙ карточки (только имя + фамилия)
    // Используется родителем при просмотре списка детей отряда —
    // он видит имена, но не видит медицинские данные чужих детей.
    // =========================================================================

    @GetMapping("/{id}/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<ChildResponseDto> getSummary(@PathVariable UUID id) {
        return ResponseEntity.ok(childService.getSummary(id));
    }

    // =========================================================================
    // Обновление карточки вожатым / ADMIN-ом
    // Могут менять все поля, включая имя и дату рождения.
    // =========================================================================

    @PutMapping("/{id}/counselor")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canViewFullChildCard(#id, principal.rawId)")
    public ResponseEntity<ChildResponseDto> updateByCounselor(
            @PathVariable UUID id,
            @Valid @RequestBody ChildUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(childService.updateByStaff(id, dto, currentUser.getUserId()));
    }

    // =========================================================================
    // Обновление карточки родителем
    // Может менять: медицинские данные, аллергии, особые потребности,
    //               поведенческие заметки, город.
    // НЕ МОЖЕТ менять: имя, фамилию, дату рождения.
    // Права: только своего ребёнка.
    // =========================================================================

    @PutMapping("/{id}/parent")
    @PreAuthorize("hasRole('PARENT') " +
            "and @detachmentSecurityService.canParentUpdateChild(#id, principal.rawId)")
    public ResponseEntity<ChildResponseDto> updateByParent(
            @PathVariable UUID id,
            @Valid @RequestBody ChildUpdateDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(childService.updateByParent(id, dto, currentUser.getUserId()));
    }

    // =========================================================================
    // Удаление карточки (только ADMIN или вожатый отряда ребёнка)
    // =========================================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') " +
            "or @detachmentSecurityService.canViewFullChildCard(#id, principal.rawId)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        childService.delete(id);
        return ResponseEntity.noContent().build();
    }
}