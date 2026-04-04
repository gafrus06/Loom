package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.AllergyStatDto;
import ru.funkids.campservice.dto.CampAnalyticsSummaryDto;
import ru.funkids.campservice.dto.ShiftAnalyticsSummaryDto;
import ru.funkids.campservice.entity.ApplicationStatus;
import ru.funkids.campservice.entity.AssignmentStatus;
import ru.funkids.campservice.entity.Child;
import ru.funkids.campservice.entity.DetachmentMembership;
import ru.funkids.campservice.entity.Session;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.security.CampSecurityService;
import ru.funkids.campservice.service.CampAnalyticsService;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampAnalyticsServiceImpl implements CampAnalyticsService {

    private final CampRepository campRepository;
    private final SessionRepository sessionRepository;
    private final DetachmentRepository detachmentRepository;
    private final DetachmentMembershipRepository detachmentMembershipRepository;
    private final ChildApplicationRepository childApplicationRepository;
    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final ShiftTaskRepository shiftTaskRepository;
    private final ShiftTaskCompletionRepository shiftTaskCompletionRepository;
    private final DetachmentDailyReportRepository detachmentDailyReportRepository;
    private final CampSecurityService campSecurityService;

    @Override
    public CampAnalyticsSummaryDto getCampSummary(UUID campId, UUID actorUserId) {
        if (!campSecurityService.canManageCamp(campId, actorUserId)) {
            throw new AccessDeniedException("Нет доступа к аналитике лагеря");
        }
        var camp = campRepository.findById(campId)
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + campId));

        List<Session> sessions = camp.getSessions();
        Set<UUID> sessionIds = sessions.stream().map(Session::getId).collect(Collectors.toSet());
        List<UUID> detachmentIds = detachmentRepository.findBySession_Camp_Id(campId).stream().map(d -> d.getId()).toList();

        List<DetachmentMembership> memberships = detachmentIds.isEmpty() ? List.of() : detachmentMembershipRepository.findByDetachmentIdIn(detachmentIds);
        List<Child> children = memberships.stream().map(DetachmentMembership::getChild).distinct().toList();

        return CampAnalyticsSummaryDto.builder()
                .campId(campId)
                .totalSessions(sessions.size())
                .totalDetachments(detachmentIds.size())
                .totalChildren(children.size())
                .totalCounselors(campMemberRepository.findByCampIdAndActiveTrue(campId).stream().filter(cm -> cm.getRole().name().equals("COUNSELOR")).count())
                .pendingApplications(childApplicationRepository.countByCampIdAndStatus(campId, ApplicationStatus.PENDING))
                .acceptedApplications(childApplicationRepository.countByCampIdAndStatus(campId, ApplicationStatus.CONFIRMED))
                .reportsCount(sessionIds.isEmpty() ? 0 : detachmentDailyReportRepository.countBySessionIdIn(sessionIds))
                .totalTasks(sessionIds.isEmpty() ? 0 : shiftTaskRepository.countBySessionIdIn(sessionIds))
                .completedTasks(sessionIds.isEmpty() ? 0 : shiftTaskCompletionRepository.countByTaskSessionIdInAndCompletedTrue(sessionIds))
                .allergyStats(buildAllergyStats(children))
                .build();
    }

    @Override
    public ShiftAnalyticsSummaryDto getShiftSummary(UUID sessionId, UUID actorUserId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + sessionId));
        if (!campSecurityService.canViewSessionTasks(sessionId, actorUserId)) {
            throw new AccessDeniedException("Нет доступа к аналитике смены");
        }

        List<UUID> detachmentIds = detachmentRepository.findBySessionId(sessionId).stream().map(d -> d.getId()).toList();
        List<DetachmentMembership> memberships = detachmentIds.isEmpty() ? List.of() : detachmentMembershipRepository.findByDetachmentIdIn(detachmentIds);
        List<Child> children = memberships.stream().map(DetachmentMembership::getChild).distinct().toList();

        return ShiftAnalyticsSummaryDto.builder()
                .sessionId(sessionId)
                .sessionTitle(session.getTitle())
                .totalDetachments(detachmentIds.size())
                .totalChildren(children.size())
                .acceptedAssignments(campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(sessionId, AssignmentStatus.ACCEPTED).size())
                .pendingAssignments(campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(sessionId, AssignmentStatus.PENDING).size())
                .reportsCount(detachmentDailyReportRepository.countBySessionId(sessionId))
                .totalTasks(shiftTaskRepository.countBySessionId(sessionId))
                .completedTasks(shiftTaskCompletionRepository.countByTaskSessionIdAndCompletedTrue(sessionId))
                .allergyStats(buildAllergyStats(children))
                .build();
    }

    private List<AllergyStatDto> buildAllergyStats(List<Child> children) {
        Map<String, Long> allergyMap = new LinkedHashMap<>();
        for (Child child : children) {
            if (child.getAllergies() == null || child.getAllergies().isBlank()) continue;
            String[] parts = child.getAllergies().split(",");
            for (String part : parts) {
                String normalized = part.trim();
                if (normalized.isEmpty()) continue;
                allergyMap.merge(normalized, 1L, Long::sum);
            }
        }
        return allergyMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> AllergyStatDto.builder().allergy(e.getKey()).count(e.getValue()).build())
                .toList();
    }
}
