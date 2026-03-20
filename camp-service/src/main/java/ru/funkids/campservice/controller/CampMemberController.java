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
import ru.funkids.campservice.service.CampMemberService;
import ru.funkids.campservice.service.impl.CampMemberServiceImpl;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/camp-members")
@RequiredArgsConstructor
public class CampMemberController {

    private final CampMemberService campMemberService;
    private final CampMemberServiceImpl campMemberServiceImpl;

    // =========================================================================
    // Назначить вожатого в лагерь и привязать к сменам
    // Body: { campId, userId, sessionIds: [uuid, uuid] }
    // =========================================================================

    @PostMapping("/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampMemberResponseDto> assignCounselor(
            @Valid @RequestBody CampMemberAssignDto dto,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campMemberService.assignCounselor(dto, currentUser.getUserId()));
    }

    // =========================================================================
    // Отозвать доступ вожатого к конкретной смене
    // (вожатый остаётся в лагере, теряет только эту смену)
    // =========================================================================

    @DeleteMapping("/camps/{campId}/counselors/{userId}/sessions/{sessionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeFromSession(
            @PathVariable UUID campId,
            @PathVariable UUID userId,
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMemberServiceImpl.removeFromSession(campId, userId, sessionId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // Полностью исключить вожатого из лагеря (все смены + все отряды)
    // =========================================================================

    @DeleteMapping("/camps/{campId}/counselors/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeCounselor(
            @PathVariable UUID campId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMemberService.removeCounselor(campId, userId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // Вожатый сам покидает лагерь
    // =========================================================================

    @PostMapping("/leave")
    @PreAuthorize("hasRole('COUNSELOR')")
    public ResponseEntity<Void> leaveCamp(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        campMemberService.leaveCamp(currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // Получить свой лагерь и смены (для вожатого)
    // =========================================================================

    @GetMapping("/my-camp")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<CampMemberResponseDto> getMyCamp(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        CampMemberResponseDto response = campMemberService.getMyCamp(currentUser.getUserId());
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }

    // =========================================================================
    // Внутренний запрос (inter-service): получить членство пользователя
    // =========================================================================

    @GetMapping("/users/{userId}/camp")
    public ResponseEntity<CampMemberResponseDto> getUserCamp(@PathVariable UUID userId) {
        CampMemberResponseDto response = campMemberService.getMyCamp(userId);
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }

    // =========================================================================
    // Список вожатых лагеря (для ADMIN)
    // =========================================================================

    @GetMapping("/camps/{campId}/counselors")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CampMemberResponseDto>> getCampCounselors(@PathVariable UUID campId) {
        return ResponseEntity.ok(campMemberService.getCampCounselors(campId));
    }

    // =========================================================================
    // Проверка: вожатый прикреплён хоть к одному лагерю?
    // =========================================================================

    @GetMapping("/check-assignment")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<Boolean> checkAssignment(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(campMemberService.isCounselorInAnyCamp(currentUser.getUserId()));
    }
}