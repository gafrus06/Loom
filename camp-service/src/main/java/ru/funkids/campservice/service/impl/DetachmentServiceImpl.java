package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.DetachmentService;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DetachmentServiceImpl implements DetachmentService {

    private final DetachmentRepository detachmentRepository;
    private final SessionRepository sessionRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final CampMemberRepository campMemberRepository;
    private final DetachmentSecurityService securityService;
    private final AuditEventService auditEventService;

    // =========================================================================
    // create — реализует DetachmentService.create
    // =========================================================================

    @Override
    public DetachmentResponseDto create(DetachmentCreateDto dto, UUID creatorId) {
        log.info("Creating detachment: {} for session: {} by user: {}",
                dto.getName(), dto.getSessionId(), creatorId);

        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + dto.getSessionId()));

        UUID campId = session.getCamp().getId();

        boolean isAdmin     = securityService.isCampAdmin(campId, creatorId);
        boolean isInSession = securityService.isCounselorInSession(dto.getSessionId(), campId, creatorId);

        if (!isAdmin && !isInSession) {
            throw new AccessDeniedException(
                    "Создавать отряд может только вожатый, назначенный на эту смену, или администратор лагеря.");
        }

        Detachment detachment = Detachment.builder()
                .name(dto.getName())
                .ageGroup(dto.getAgeGroup())
                .session(session)
                .creatorId(creatorId)
                .build();

        Detachment saved = detachmentRepository.save(detachment);

        // Создатель автоматически становится LEAD
        counselorAssignmentRepository.save(CounselorAssignment.builder()
                .detachment(saved)
                .userId(creatorId)
                .roleInDetachment(DetachmentRole.LEAD)
                .active(true)
                .build());

        auditEventService.log(campId, "DETACHMENT_CREATED",
                "Создан отряд «" + saved.getName() + "» в смене «" + session.getTitle() + "»",
                "DETACHMENT", saved.getId(), creatorId,
                Map.of("ageGroup", dto.getAgeGroup(), "sessionId", dto.getSessionId().toString()));

        log.info("Detachment created: {}", saved.getId());
        return mapToDto(saved);
    }

    // =========================================================================
    // get — реализует DetachmentService.get
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public DetachmentResponseDto get(UUID id) {
        return mapToDto(detachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + id)));
    }

    // =========================================================================
    // update — реализует DetachmentService.update
    // =========================================================================

    @Override
    public DetachmentResponseDto update(UUID id, DetachmentUpdateDto dto) {
        Detachment d = detachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + id));

        if (dto.getName()     != null) d.setName(dto.getName());
        if (dto.getAgeGroup() != null) d.setAgeGroup(dto.getAgeGroup());

        return mapToDto(detachmentRepository.save(d));
    }

    // =========================================================================
    // updateStage — реализует DetachmentService.updateStage
    // =========================================================================

    @Override
    public DetachmentResponseDto updateStage(UUID detachmentId, DetachmentStage stage, UUID userId) {
        if (stage == null) throw new IllegalArgumentException("Этап не может быть null");

        Detachment d = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + detachmentId));

        securityService.checkCanModifyDetachment(detachmentId, userId);

        DetachmentStage oldStage = d.getStage();
        d.setStage(stage);
        Detachment updated = detachmentRepository.save(d);

        UUID campId = d.getSession().getCamp().getId();

        auditEventService.log(campId, "DETACHMENT_STAGE_CHANGED",
                "Отряд «" + d.getName() + "» перешёл на этап: " + stageLabel(stage)
                        + " (был: " + stageLabel(oldStage) + ")",
                "DETACHMENT", detachmentId, userId,
                Map.of("oldStage", oldStage.name(), "newStage", stage.name()));

        log.info("Stage {} → {} for detachment {}", oldStage, stage, detachmentId);
        return mapToDto(updated);
    }

    // =========================================================================
    // delete — реализует DetachmentService.delete
    // =========================================================================

    @Override
    public void delete(UUID id) {
        detachmentRepository.deleteById(id);
    }

    // =========================================================================
    // listBySession — реализует DetachmentService.listBySession(UUID)
    // Без проверки прав — используется внутри и в тестах
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DetachmentResponseDto> listBySession(UUID sessionId) {
        return detachmentRepository.findBySessionId(sessionId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // listBySessionWithAccess — НЕ в интерфейсе
    // С проверкой прав: вожатый должен быть назначен на эту смену.
    // Родитель: возвращает только отряд своего ребёнка.
    // Вызывается из DetachmentController.getBySession
    // =========================================================================

    @Transactional(readOnly = true)
    public List<DetachmentResponseDto> listBySessionWithAccess(UUID sessionId, UUID userId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + sessionId));

        UUID campId = session.getCamp().getId();

        // ADMIN лагеря — все отряды
        if (securityService.isCampAdmin(campId, userId)) {
            return detachmentRepository.findBySessionId(sessionId).stream()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        // Вожатый назначен на эту смену — все отряды смены
        if (securityService.isCounselorInSession(sessionId, campId, userId)) {
            return detachmentRepository.findBySessionId(sessionId).stream()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        // Родитель — только отряд(ы) своих детей в этой смене
        if (securityService.isCurrentUserParent()) {
            return detachmentRepository.findBySessionId(sessionId).stream()
                    .filter(d -> securityService.isParentHasChildInDetachment(d.getId(), userId))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        throw new AccessDeniedException("Нет доступа к смене этого лагеря.");
    }

    // =========================================================================
    // listMyAccessibleDetachments — реализует DetachmentService.listMyAccessibleDetachments
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DetachmentWithRoleDto> listMyAccessibleDetachments(UUID userId) {
        log.info("listMyAccessibleDetachments for user: {}", userId);

        Map<UUID, DetachmentWithRoleDto> result = new LinkedHashMap<>();

        // Отряды, в которых пользователь назначен через CounselorAssignment
        detachmentRepository.findAssignedToCounselor(userId).forEach(d ->
                result.put(d.getId(), DetachmentWithRoleDto.builder()
                        .id(d.getId()).name(d.getName()).description(d.getAgeGroup())
                        .sessionId(d.getSession().getId()).sessionName(d.getSession().getTitle())
                        .campId(d.getSession().getCamp().getId()).campName(d.getSession().getCamp().getName())
                        .accessType("ASSIGNED_PARTNER")
                        .creator(false).assignedPartner(true).campOwner(false)
                        .build()));

        // Отряды лагерей, где пользователь — OWNER
        detachmentRepository.findDetachmentsOfOwnedCamps(userId).forEach(d -> {
            DetachmentWithRoleDto existing = result.get(d.getId());
            if (existing != null) {
                existing.setCampOwner(true);
                existing.setAccessType("ASSIGNED_AND_CAMP_OWNER");
            } else {
                result.put(d.getId(), DetachmentWithRoleDto.builder()
                        .id(d.getId()).name(d.getName()).description(d.getAgeGroup())
                        .sessionId(d.getSession().getId()).sessionName(d.getSession().getTitle())
                        .campId(d.getSession().getCamp().getId()).campName(d.getSession().getCamp().getName())
                        .accessType("CAMP_OWNER")
                        .creator(false).assignedPartner(false).campOwner(true)
                        .build());
            }
        });

        List<DetachmentWithRoleDto> list = new ArrayList<>(result.values());
        list.sort((a, b) -> {
            if (a.isAssignedPartner() != b.isAssignedPartner()) return a.isAssignedPartner() ? -1 : 1;
            if (a.isCampOwner()       != b.isCampOwner())       return a.isCampOwner()       ? -1 : 1;
            return a.getName().compareTo(b.getName());
        });
        return list;
    }

    // =========================================================================
    // addAssistant — НЕ в интерфейсе, вызывается из DetachmentController
    // =========================================================================

    public void addAssistant(UUID detachmentId, UUID assistantUserId, UUID actorId) {
        securityService.checkCanAddAssistant(detachmentId, actorId);

        Detachment d = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + detachmentId));

        UUID campId    = d.getSession().getCamp().getId();
        UUID sessionId = d.getSession().getId();

        if (!securityService.isCampAdmin(campId, assistantUserId)
                && !securityService.isCounselorInSession(sessionId, campId, assistantUserId)) {
            throw new IllegalArgumentException(
                    "Добавляемый вожатый не назначен на смену «" + d.getSession().getTitle() + "»");
        }

        if (securityService.isMemberOfDetachment(detachmentId, assistantUserId)) {
            throw new IllegalStateException("Этот вожатый уже является членом отряда");
        }

        counselorAssignmentRepository.save(CounselorAssignment.builder()
                .detachment(d).userId(assistantUserId)
                .roleInDetachment(DetachmentRole.ASSISTANT).active(true)
                .build());

        auditEventService.log(campId, "COUNSELOR_ADDED_TO_DETACHMENT",
                "В отряд «" + d.getName() + "» добавлен помощник",
                "DETACHMENT", detachmentId, actorId,
                Map.of("assistantUserId", assistantUserId.toString()));
    }

    // =========================================================================
    // removeCounselorFromDetachment — НЕ в интерфейсе, вызывается из DetachmentController
    // =========================================================================

    public void removeCounselorFromDetachment(UUID detachmentId, UUID targetUserId, UUID actorId) {
        securityService.checkCanRemoveCounselor(detachmentId, targetUserId, actorId);

        Detachment d = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + detachmentId));

        CounselorAssignment assignment = counselorAssignmentRepository
                .findByDetachmentIdAndUserIdAndActiveTrue(detachmentId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Вожатый не является членом этого отряда"));

        DetachmentRole removedRole = assignment.getRoleInDetachment();
        assignment.setActive(false);
        assignment.setRemovedAt(OffsetDateTime.now());
        counselorAssignmentRepository.save(assignment);

        auditEventService.log(d.getSession().getCamp().getId(),
                "COUNSELOR_REMOVED_FROM_DETACHMENT",
                roleLabel(removedRole) + " исключён из отряда «" + d.getName() + "»",
                "DETACHMENT", detachmentId, actorId,
                Map.of("removedUserId", targetUserId.toString(), "removedRole", removedRole.name()));
    }

    // =========================================================================
    // Вспомогательные
    // =========================================================================

    private String stageLabel(DetachmentStage stage) {
        return switch (stage) {
            case NEW            -> "Новый";
            case ORGANIZATIONAL -> "Организационный";
            case BUSINESS       -> "Деловой";
            case CONSTRUCTIVE   -> "Конструктивный";
            case FINAL          -> "Заключительный";
            case COMPLETED      -> "Завершён";
        };
    }

    private String roleLabel(DetachmentRole role) {
        return switch (role) {
            case LEAD      -> "Главный";
            case ASSISTANT -> "Помощник";
        };
    }

    private DetachmentResponseDto mapToDto(Detachment d) {
        return DetachmentResponseDto.builder()
                .id(d.getId())
                .sessionId(d.getSession().getId())
                .sessionName(d.getSession().getTitle())
                .campId(d.getSession().getCamp().getId())
                .campName(d.getSession().getCamp().getName())
                .name(d.getName())
                .ageGroup(d.getAgeGroup())
                .stage(d.getStage())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}