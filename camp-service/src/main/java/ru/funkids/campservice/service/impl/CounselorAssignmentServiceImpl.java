package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.CounselorAssignDto;
import ru.funkids.campservice.dto.CounselorAssignmentResponseDto;
import ru.funkids.campservice.dto.CounselorUnassignDto;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CampMemberRepository;
import ru.funkids.campservice.repository.CampMemberSessionRepository;
import ru.funkids.campservice.repository.CounselorAssignmentRepository;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CounselorAssignmentService;
import ru.funkids.campservice.security.DetachmentSecurityService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CounselorAssignmentServiceImpl implements CounselorAssignmentService {

    private final CounselorAssignmentRepository assignmentRepository;
    private final DetachmentRepository detachmentRepository;
    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final DetachmentSecurityService securityService;
    private final AuditEventService auditEventService;

    // =========================================================================
    // Назначить вожатого в отряд как ASSISTANT
    // =========================================================================

    @Override
    public CounselorAssignmentResponseDto assign(CounselorAssignDto dto, UUID actorUserId) {
        log.info("Assigning counselor {} to detachment {} by {}", dto.getUserId(), dto.getDetachmentId(), actorUserId);

        Detachment detachment = detachmentRepository.findById(dto.getDetachmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + dto.getDetachmentId()));

        UUID campId    = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();
        String campName = detachment.getSession().getCamp().getName();

        // Проверка прав: только LEAD этого отряда или ADMIN лагеря может добавлять ASSISTANT-а
        securityService.checkCanAddAssistant(dto.getDetachmentId(), actorUserId);

        // Добавляемый вожатый должен быть прикреплён к лагерю
        boolean isInCamp = campMemberRepository.existsByCampIdAndUserIdAndActiveTrue(campId, dto.getUserId());
        if (!isInCamp) {
            throw new IllegalArgumentException(
                    "Вожатый не прикреплён к лагерю «" + campName + "». " +
                            "Сначала назначьте его в лагерь через управление лагерем.");
        }

        // Добавляемый вожатый должен быть назначен на эту конкретную смену
        boolean isInSession = securityService.isCounselorInSession(sessionId, campId, dto.getUserId())
                || securityService.isCampAdmin(campId, dto.getUserId());
        if (!isInSession) {
            throw new IllegalArgumentException(
                    "Вожатый не назначен на смену «" + detachment.getSession().getTitle() + "». " +
                            "Попросите администратора лагеря добавить его в эту смену.");
        }

        // Нельзя добавить дважды
        if (assignmentRepository.existsByDetachmentIdAndUserIdAndActiveTrue(dto.getDetachmentId(), dto.getUserId())) {
            throw new IllegalArgumentException("Этот вожатый уже является членом отряда «" + detachment.getName() + "»");
        }

        // Роль из DTO — должна быть ASSISTANT (LEAD назначается только при создании отряда)
        DetachmentRole role = dto.getRoleInDetachment();
        if (role == DetachmentRole.LEAD) {
            // Защита: LEAD может быть только один и только через создание отряда
            boolean leadExists = !assignmentRepository
                    .findByDetachmentIdAndRoleInDetachmentAndActiveTrue(dto.getDetachmentId(), DetachmentRole.LEAD)
                    .isEmpty();
            if (leadExists) {
                throw new IllegalStateException(
                        "Отряд уже имеет Главного вожатого. Новых участников можно добавлять только как Помощника.");
            }
        }

        CounselorAssignment assignment = CounselorAssignment.builder()
                .detachment(detachment)
                .userId(dto.getUserId())
                .roleInDetachment(role)
                .active(true)
                .build();

        CounselorAssignment saved;
        try {
            saved = assignmentRepository.save(assignment);
        } catch (DataIntegrityViolationException ex) {
            return assignmentRepository.findByDetachmentIdAndUserIdAndActiveTrue(dto.getDetachmentId(), dto.getUserId())
                    .map(existing -> {
                        log.info("Concurrent duplicate counselor assignment resolved for detachment={} user={}",
                                dto.getDetachmentId(), dto.getUserId());
                        return mapToDto(existing);
                    })
                    .orElseThrow(() -> ex);
        }

        auditEventService.log(
                campId,
                "COUNSELOR_ADDED_TO_DETACHMENT",
                "В отряд «" + detachment.getName() + "» добавлен "
                        + roleLabel(role),
                "DETACHMENT",
                detachment.getId(),
                actorUserId,
                Map.of("addedUserId", dto.getUserId().toString(), "role", role.name())
        );

        log.info("CounselorAssignment created: {}", saved.getId());
        return mapToDto(saved);
    }

    // =========================================================================
    // Исключить вожатого из отряда
    // =========================================================================

    @Override
    public CounselorAssignmentResponseDto unassign(CounselorUnassignDto dto, UUID actorUserId) {
        log.info("Unassigning assignment {} by {}", dto.getAssignmentId(), actorUserId);

        CounselorAssignment assignment = assignmentRepository.findById(dto.getAssignmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Назначение не найдено: " + dto.getAssignmentId()));

        Detachment detachment = assignment.getDetachment();
        UUID campId = detachment.getSession().getCamp().getId();

        // Проверка прав: кто может исключить кого
        securityService.checkCanRemoveCounselor(
                detachment.getId(), assignment.getUserId(), actorUserId);

        if (!assignment.isActive()) {
            return mapToDto(assignment); // уже неактивен — idempotent
        }

        DetachmentRole removedRole = assignment.getRoleInDetachment();
        assignment.setActive(false);
        assignment.setRemovedAt(OffsetDateTime.now());
        CounselorAssignment updated = assignmentRepository.save(assignment);

        auditEventService.log(
                campId,
                "COUNSELOR_REMOVED_FROM_DETACHMENT",
                roleLabel(removedRole) + " исключён из отряда «" + detachment.getName() + "»",
                "DETACHMENT",
                detachment.getId(),
                actorUserId,
                Map.of("removedUserId", assignment.getUserId().toString(), "role", removedRole.name())
        );

        log.info("CounselorAssignment deactivated: {}", dto.getAssignmentId());
        return mapToDto(updated);
    }

    // =========================================================================
    // Чтение
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<CounselorAssignmentResponseDto> listActiveByDetachment(UUID detachmentId) {
        return assignmentRepository.findByDetachmentIdAndActiveTrue(detachmentId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CounselorAssignmentResponseDto> getActiveAssignmentsByUser(UUID userId) {
        return assignmentRepository.findByUserIdAndActiveTrue(userId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // Вспомогательные
    // =========================================================================

    private String roleLabel(DetachmentRole role) {
        return switch (role) {
            case LEAD      -> "Главный вожатый";
            case ASSISTANT -> "Помощник вожатого";
        };
    }

    private CounselorAssignmentResponseDto mapToDto(CounselorAssignment a) {
        Detachment d = a.getDetachment();
        return CounselorAssignmentResponseDto.builder()
                .id(a.getId())
                .detachmentId(d.getId())
                .detachmentName(d.getName())
                .sessionId(d.getSession().getId())
                .sessionName(d.getSession().getTitle())
                .campId(d.getSession().getCamp().getId())
                .campName(d.getSession().getCamp().getName())
                .userId(a.getUserId())
                .roleInDetachment(a.getRoleInDetachment())
                .active(a.isActive())
                .assignedAt(a.getAssignedAt())
                .build();
    }
}
