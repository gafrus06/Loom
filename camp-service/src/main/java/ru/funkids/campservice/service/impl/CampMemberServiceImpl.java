package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.CampMemberAssignDto;
import ru.funkids.campservice.dto.CampMemberResponseDto;
import ru.funkids.campservice.dto.CampStaffSubRoleUpdateDto;
import ru.funkids.campservice.dto.SessionStaffAssignmentResponseDto;
import ru.funkids.campservice.entity.AssignmentStatus;
import ru.funkids.campservice.entity.Camp;
import ru.funkids.campservice.entity.CampMember;
import ru.funkids.campservice.entity.CampMemberSession;
import ru.funkids.campservice.entity.CampRole;
import ru.funkids.campservice.entity.Session;
import ru.funkids.campservice.entity.StaffSubRole;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CampMemberRepository;
import ru.funkids.campservice.repository.CampMemberSessionRepository;
import ru.funkids.campservice.repository.CampRepository;
import ru.funkids.campservice.repository.CounselorAssignmentRepository;
import ru.funkids.campservice.repository.SessionRepository;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CampMemberService;
import ru.funkids.campservice.service.CampNotificationService;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CampMemberServiceImpl implements CampMemberService {

    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final CampRepository campRepository;
    private final SessionRepository sessionRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final AuditEventService auditEventService;
    private final CampNotificationService campNotificationService;

    @Override
    public CampMemberResponseDto assignCounselor(CampMemberAssignDto dto, UUID adminId) {
        log.info("Assigning staff {} to camp {} sessions {} as {} by admin {}",
                dto.getUserId(), dto.getCampId(), dto.getSessionIds(), dto.getSubRole(), adminId);

        Camp camp = requireCampOwner(dto.getCampId(), adminId,
                "Только владелец лагеря может назначать сотрудников");

        CampMember campMember = findOrCreateCampMember(camp, dto.getUserId());
        boolean wasCampMemberActive = campMember.isActive();
        List<SessionStaffAssignmentResponseDto> createdAssignments = new ArrayList<>();

        for (UUID sessionId : dto.getSessionIds()) {
            Session session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + sessionId));

            if (!session.getCamp().getId().equals(dto.getCampId())) {
                throw new IllegalArgumentException("Смена " + sessionId + " не относится к лагерю " + dto.getCampId());
            }

            CampMemberSession cms = campMemberSessionRepository
                    .findByCampMemberIdAndSessionId(campMember.getId(), sessionId)
                    .orElse(null);

            AssignmentStatus targetStatus = dto.getSubRole() == StaffSubRole.COUNSELOR
                    ? AssignmentStatus.PENDING
                    : AssignmentStatus.ACCEPTED;

            if (cms == null) {
                cms = CampMemberSession.builder()
                        .campMember(campMember)
                        .session(session)
                        .subRole(dto.getSubRole())
                        .assignmentStatus(targetStatus)
                        .assignedByUserId(adminId)
                        .active(true)
                        .build();
            } else {
                cms.setSubRole(dto.getSubRole());
                cms.setAssignmentStatus(targetStatus);
                cms.setAssignedByUserId(adminId);
                cms.setAutoDetachedAt(null);
                cms.setRespondedAt(dto.getSubRole() == StaffSubRole.COUNSELOR ? null : OffsetDateTime.now());
                cms.setActive(true);
            }

            CampMemberSession saved;
            try {
                saved = campMemberSessionRepository.save(cms);
            } catch (DataIntegrityViolationException ex) {
                saved = campMemberSessionRepository.findByCampMemberIdAndSessionId(campMember.getId(), sessionId)
                        .orElseThrow(() -> ex);
            }
            createdAssignments.add(mapSessionAssignment(saved));
            sendAssignmentNotification(camp, session, saved, dto.getUserId());

            auditEventService.log(
                    dto.getCampId(),
                    "STAFF_ASSIGNED_TO_SESSION",
                    "Сотрудник назначен на смену «" + session.getTitle() + "» с подролью " + dto.getSubRole(),
                    "SESSION",
                    session.getId(),
                    adminId,
                    Map.of(
                            "userId", dto.getUserId().toString(),
                            "subRole", dto.getSubRole().name(),
                            "assignmentStatus", targetStatus.name()
                    )
            );
        }

        if (!wasCampMemberActive && dto.getSubRole() != StaffSubRole.COUNSELOR) {
            campMember.setActive(true);
            campMember.setRemovedAt(null);
            campMemberRepository.save(campMember);
        }

        return mapCampMember(campMember, createdAssignments);
    }

    @Override
    public SessionStaffAssignmentResponseDto acceptSessionAssignment(UUID assignmentId, UUID userId) {
        CampMemberSession cms = campMemberSessionRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Назначение на смену не найдено: " + assignmentId));

        if (!cms.getCampMember().getUserId().equals(userId)) {
            throw new IllegalStateException("Можно подтверждать только свои назначения");
        }
        if (cms.getSubRole() != StaffSubRole.COUNSELOR) {
            throw new IllegalStateException("Подтверждение требуется только обычным вожатым");
        }
        if (cms.getAssignmentStatus() == AssignmentStatus.AUTO_DETACHED) {
            throw new IllegalStateException("Назначение уже автоматически завершено");
        }
        if (cms.getAssignmentStatus() != AssignmentStatus.PENDING || !cms.isActive()) {
            throw new IllegalStateException("Назначение уже обработано");
        }

        cms.setAssignmentStatus(AssignmentStatus.ACCEPTED);
        cms.setRespondedAt(OffsetDateTime.now());
        cms.setActive(true);

        CampMember campMember = cms.getCampMember();
        if (!campMember.isActive()) {
            campMember.setActive(true);
            campMember.setRemovedAt(null);
            campMemberRepository.save(campMember);
        }

        CampMemberSession saved = campMemberSessionRepository.save(cms);
        auditEventService.log(
                cms.getSession().getCamp().getId(),
                "SESSION_ASSIGNMENT_ACCEPTED",
                "Сотрудник подтвердил назначение на смену «" + cms.getSession().getTitle() + "»",
                "SESSION",
                cms.getSession().getId(),
                userId,
                Map.of("assignmentId", assignmentId.toString())
        );
        return mapSessionAssignment(saved);
    }

    @Override
    public SessionStaffAssignmentResponseDto rejectSessionAssignment(UUID assignmentId, UUID userId) {
        CampMemberSession cms = campMemberSessionRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Назначение на смену не найдено: " + assignmentId));

        if (!cms.getCampMember().getUserId().equals(userId)) {
            throw new IllegalStateException("Можно отклонять только свои назначения");
        }
        if (cms.getSubRole() != StaffSubRole.COUNSELOR) {
            throw new IllegalStateException("Отклонение доступно только обычным вожатым");
        }
        if (cms.getAssignmentStatus() != AssignmentStatus.PENDING || !cms.isActive()) {
            throw new IllegalStateException("Назначение уже обработано");
        }

        cms.setAssignmentStatus(AssignmentStatus.REJECTED);
        cms.setRespondedAt(OffsetDateTime.now());
        cms.setActive(false);

        CampMemberSession saved = campMemberSessionRepository.save(cms);
        auditEventService.log(
                cms.getSession().getCamp().getId(),
                "SESSION_ASSIGNMENT_REJECTED",
                "Сотрудник отклонил назначение на смену «" + cms.getSession().getTitle() + "»",
                "SESSION",
                cms.getSession().getId(),
                userId,
                Map.of("assignmentId", assignmentId.toString())
        );
        return mapSessionAssignment(saved);
    }

    @Override
    public void leaveCamp(UUID userId) {
        List<CampMember> memberships = campMemberRepository.findByUserIdAndActiveTrue(userId);
        for (CampMember member : memberships) {
            if (member.getRole() == CampRole.COUNSELOR) {
                deactivateCampMember(member, userId, true);
            }
        }
    }

    @Override
    public void removeCounselor(UUID campId, UUID userId, UUID adminId) {
        requireCampOwner(campId, adminId,
                "Выгонять вожатого из лагеря может только админ, который создал этот лагерь");

        CampMember member = campMemberRepository.findByCampIdAndUserIdAndActiveTrue(campId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Сотрудник лагеря не найден"));

        if (member.getRole() != CampRole.COUNSELOR) {
            throw new IllegalStateException("Удалять через этот метод можно только вожатых");
        }

        deactivateCampMember(member, adminId, false);
    }

    @Override
    public void removeFromSession(UUID campId, UUID userId, UUID sessionId, UUID adminId) {
        requireCampOwner(campId, adminId,
                "Снимать вожатого со смены может только админ, который создал этот лагерь");

        CampMember member = campMemberRepository.findByCampIdAndUserIdAndActiveTrue(campId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Сотрудник лагеря не найден"));

        CampMemberSession cms = campMemberSessionRepository.findByCampMemberIdAndSessionId(member.getId(), sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Привязка к смене не найдена"));

        cms.setActive(false);
        cms.setAssignmentStatus(AssignmentStatus.REJECTED);
        cms.setRespondedAt(OffsetDateTime.now());
        campMemberSessionRepository.save(cms);

        counselorAssignmentRepository.findByUserIdAndDetachment_Session_IdAndActiveTrue(userId, sessionId)
                .forEach(a -> {
                    a.setActive(false);
                    a.setRemovedAt(OffsetDateTime.now());
                    counselorAssignmentRepository.save(a);
                });

        auditEventService.log(
                campId,
                "STAFF_REMOVED_FROM_SESSION",
                "Сотрудник снят со смены",
                "SESSION",
                sessionId,
                adminId,
                Map.of("userId", userId.toString())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CampMemberResponseDto getMyCamp(UUID userId) {
        return campMemberRepository.findByUserIdAndActiveTrue(userId).stream()
                .findFirst()
                .map(member -> mapCampMember(member, mapAssignments(member.getSessions())))
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampMemberResponseDto> getCampCounselors(UUID campId) {
        return campMemberRepository.findByCampIdAndActiveTrue(campId).stream()
                .filter(m -> m.getRole() == CampRole.COUNSELOR)
                .map(member -> mapCampMember(member, mapAssignments(member.getSessions())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionStaffAssignmentResponseDto> getMySessionAssignments(UUID userId) {
        return campMemberSessionRepository.findByCampMemberUserIdAndActiveTrue(userId).stream()
                .map(this::mapSessionAssignment)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionStaffAssignmentResponseDto> getSessionAssignments(UUID sessionId, UUID requesterId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + sessionId));

        boolean canView = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                session.getCamp().getId(), requesterId, CampRole.OWNER)
                || campMemberSessionRepository.existsAcceptedBySessionIdAndUserIdAndCampIdAndSubRole(
                        sessionId, requesterId, session.getCamp().getId(), StaffSubRole.SENIOR_COUNSELOR);

        if (!canView) {
            throw new IllegalStateException("Нет прав на просмотр назначений этой смены");
        }

        return campMemberSessionRepository.findBySessionId(sessionId).stream()
                .map(this::mapSessionAssignment)
                .toList();
    }

    @Override
    public CampMemberResponseDto updateStaffSubRole(UUID campId, UUID userId, CampStaffSubRoleUpdateDto dto, UUID adminId) {
        Camp camp = requireCampOwner(campId, adminId,
                "Менять подроли сотрудников может только админ, который создал этот лагерь");

        CampMember member = campMemberRepository.findByCampIdAndUserIdAndActiveTrue(campId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Сотрудник лагеря не найден"));

        if (member.getRole() != CampRole.COUNSELOR) {
            throw new IllegalStateException("Подроль можно назначать только сотрудникам-вожатым");
        }

        List<CampMemberSession> activeAssignments = campMemberSessionRepository.findByCampMemberIdAndActiveTrue(member.getId()).stream()
                .filter(cms -> cms.getAssignmentStatus() == AssignmentStatus.ACCEPTED)
                .toList();

        if (activeAssignments.isEmpty()) {
            throw new IllegalStateException("У сотрудника нет активных назначений в этом лагере");
        }

        for (CampMemberSession assignment : activeAssignments) {
            assignment.setSubRole(dto.getSubRole());
            assignment.setRespondedAt(OffsetDateTime.now());
            campMemberSessionRepository.save(assignment);
        }

        if (dto.getSubRole() == StaffSubRole.SENIOR_COUNSELOR || dto.getSubRole() == StaffSubRole.MEDICAL_WORKER) {
            sendSubRoleNotification(camp, member.getUserId(), dto.getSubRole(), adminId);
        }

        auditEventService.log(
                campId,
                "STAFF_SUBROLE_UPDATED",
                "Сотруднику обновили подроль на " + dto.getSubRole(),
                "CAMP_MEMBER",
                member.getId(),
                adminId,
                Map.of(
                        "userId", userId.toString(),
                        "subRole", dto.getSubRole().name()
                )
        );

        return mapCampMember(member, mapAssignments(member.getSessions()));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCounselorInAnyCamp(UUID userId) {
        return campMemberRepository.findByUserIdAndActiveTrue(userId).stream()
                .anyMatch(m -> m.getRole() == CampRole.COUNSELOR);
    }

    public void autoDetachExpiredAssignments() {
        List<CampMemberSession> expired = campMemberSessionRepository.findAcceptedExpiredAssignments(java.time.LocalDate.now());
        for (CampMemberSession cms : expired) {
            cms.setAssignmentStatus(AssignmentStatus.AUTO_DETACHED);
            cms.setActive(false);
            cms.setAutoDetachedAt(OffsetDateTime.now());
            campMemberSessionRepository.save(cms);

            UUID userId = cms.getCampMember().getUserId();
            UUID sessionId = cms.getSession().getId();
            counselorAssignmentRepository.findByUserIdAndDetachment_Session_IdAndActiveTrue(userId, sessionId)
                    .forEach(a -> {
                        a.setActive(false);
                        a.setRemovedAt(OffsetDateTime.now());
                        counselorAssignmentRepository.save(a);
                    });

            auditEventService.log(
                    cms.getSession().getCamp().getId(),
                    "SESSION_ASSIGNMENT_AUTO_DETACHED",
                    "Сотрудник автоматически снят с завершённой смены «" + cms.getSession().getTitle() + "»",
                    "SESSION",
                    sessionId,
                    cms.getAssignedByUserId(),
                    Map.of("userId", userId.toString())
            );
        }
    }

    private CampMember findOrCreateCampMember(Camp camp, UUID userId) {
        List<CampMember> existing = campMemberRepository.findByCampIdAndUserId(camp.getId(), userId);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        try {
            return campMemberRepository.save(CampMember.builder()
                    .camp(camp)
                    .userId(userId)
                    .role(CampRole.COUNSELOR)
                    .active(false)
                    .build());
        } catch (DataIntegrityViolationException ex) {
            return campMemberRepository.findByCampIdAndUserId(camp.getId(), userId).stream()
                    .findFirst()
                    .orElseThrow(() -> ex);
        }
    }

    private Camp requireCampOwner(UUID campId, UUID adminId, String accessDeniedMessage) {
        Camp camp = campRepository.findById(campId)
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + campId));

        boolean isOwner = camp.getOwnerId().equals(adminId)
                || campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(campId, adminId, CampRole.OWNER);

        if (!isOwner) {
            throw new IllegalStateException(accessDeniedMessage);
        }

        return camp;
    }

    private void sendAssignmentNotification(Camp camp, Session session, CampMemberSession assignment, UUID targetUserId) {
        if (assignment.getSubRole() != StaffSubRole.COUNSELOR
                || assignment.getAssignmentStatus() != AssignmentStatus.PENDING) {
            return;
        }

        String sessionTitle = session.getTitle() == null || session.getTitle().isBlank()
                ? "Смена"
                : session.getTitle();

        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("assignmentId", assignment.getId().toString());
        metadata.put("campId", camp.getId().toString());
        metadata.put("campName", camp.getName());
        metadata.put("sessionId", session.getId().toString());
        metadata.put("sessionTitle", sessionTitle);
        metadata.put("subRole", assignment.getSubRole().name());
        metadata.put("assignedByUserId", assignment.getAssignedByUserId().toString());
        metadata.put("decisionRequired", Boolean.TRUE.toString());

        campNotificationService.notifyUser(
                targetUserId,
                "CAMP_JOB_INVITATION",
                "Приглашение на работу в лагере",
                "Вас пригласили в лагерь «" + camp.getName() + "» на смену «" + sessionTitle + "». Примите или отклоните приглашение.",
                "SESSION_ASSIGNMENT",
                assignment.getId(),
                metadata
        );
    }

    private void sendSubRoleNotification(Camp camp, UUID targetUserId, StaffSubRole subRole, UUID assignedByUserId) {
        String subRoleTitle = subRole == StaffSubRole.SENIOR_COUNSELOR
                ? "старшим вожатым"
                : "медработником";

        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("campId", camp.getId().toString());
        metadata.put("campName", camp.getName());
        metadata.put("subRole", subRole.name());
        metadata.put("assignedByUserId", assignedByUserId.toString());

        campNotificationService.notifyUser(
                targetUserId,
                "CAMP_STAFF_SUBROLE_ASSIGNED",
                "Вам назначили новую роль в лагере",
                "В лагере «" + camp.getName() + "» вас назначили " + subRoleTitle + ".",
                "CAMP_STAFF_SUBROLE",
                camp.getId(),
                metadata
        );
    }

    private void deactivateCampMember(CampMember member, UUID actorUserId, boolean selfLeave) {
        member.setActive(false);
        member.setRemovedAt(OffsetDateTime.now());
        campMemberRepository.save(member);

        member.getSessions().forEach(cms -> {
            cms.setActive(false);
            if (cms.getAssignmentStatus() == AssignmentStatus.ACCEPTED || cms.getAssignmentStatus() == AssignmentStatus.PENDING) {
                cms.setAssignmentStatus(AssignmentStatus.REJECTED);
            }
            cms.setRespondedAt(OffsetDateTime.now());
            campMemberSessionRepository.save(cms);
        });

        counselorAssignmentRepository.findByUserIdAndDetachment_Session_Camp_IdAndActiveTrue(member.getUserId(), member.getCamp().getId())
                .forEach(a -> {
                    a.setActive(false);
                    a.setRemovedAt(OffsetDateTime.now());
                    counselorAssignmentRepository.save(a);
                });

        auditEventService.log(
                member.getCamp().getId(),
                selfLeave ? "COUNSELOR_LEFT_CAMP" : "COUNSELOR_REMOVED_FROM_CAMP",
                selfLeave ? "Вожатый покинул лагерь" : "Вожатый исключён из лагеря",
                "CAMP_MEMBER",
                member.getId(),
                actorUserId,
                Map.of("userId", member.getUserId().toString())
        );
    }

    private CampMemberResponseDto mapCampMember(CampMember member, List<SessionStaffAssignmentResponseDto> assignments) {
        return CampMemberResponseDto.builder()
                .id(member.getId())
                .campId(member.getCamp().getId())
                .campName(member.getCamp().getName())
                .userId(member.getUserId())
                .role(member.getRole())
                .active(member.isActive())
                .sessionIds(assignments.stream().map(SessionStaffAssignmentResponseDto::getSessionId).toList())
                .sessionAssignments(assignments)
                .build();
    }

    private List<SessionStaffAssignmentResponseDto> mapAssignments(List<CampMemberSession> sessions) {
        return sessions.stream().map(this::mapSessionAssignment).collect(Collectors.toList());
    }

    private SessionStaffAssignmentResponseDto mapSessionAssignment(CampMemberSession cms) {
        return SessionStaffAssignmentResponseDto.builder()
                .id(cms.getId())
                .userId(cms.getCampMember().getUserId())
                .sessionId(cms.getSession().getId())
                .sessionTitle(cms.getSession().getTitle())
                .subRole(cms.getSubRole())
                .assignmentStatus(cms.getAssignmentStatus())
                .assignedByUserId(cms.getAssignedByUserId())
                .assignedAt(cms.getAssignedAt())
                .respondedAt(cms.getRespondedAt())
                .autoDetachedAt(cms.getAutoDetachedAt())
                .active(cms.isActive())
                .build();
    }
}
