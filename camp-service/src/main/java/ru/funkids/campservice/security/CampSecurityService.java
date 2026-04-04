package ru.funkids.campservice.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.repository.CampMemberRepository;
import ru.funkids.campservice.repository.CampMemberSessionRepository;
import ru.funkids.campservice.repository.CounselorAssignmentRepository;
import ru.funkids.campservice.repository.DetachmentMembershipRepository;
import ru.funkids.campservice.repository.ParentLinkRepository;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampSecurityService {

    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final ParentLinkRepository parentLinkRepository;
    private final DetachmentMembershipRepository detachmentMembershipRepository;

    public boolean canManageCamp(UUID campId, UUID userId) {
        boolean result = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                campId, userId, CampRole.OWNER
        );
        log.debug("canManageCamp: campId={}, userId={}, result={}", campId, userId, result);
        return result;
    }

    public boolean canCreateDetachmentInSession(UUID sessionId, UUID userId) {
        boolean isOwner = campMemberRepository.existsByCampSessionIdAndUserIdAndRoleAndActiveTrue(
                sessionId, userId, CampRole.OWNER
        );
        if (isOwner) {
            return true;
        }
        return campMemberSessionRepository.findByCampMemberUserIdAndAssignmentStatusAndActiveTrue(userId, AssignmentStatus.ACCEPTED)
                .stream()
                .anyMatch(a -> a.getSession().getId().equals(sessionId));
    }

    public boolean canManageDetachment(UUID detachmentId, UUID userId) {
        boolean isOwner = campMemberRepository.existsByCampDetachmentIdAndUserIdAndRoleAndActiveTrue(
                detachmentId, userId, CampRole.OWNER
        );
        if (isOwner) {
            return true;
        }
        return counselorAssignmentRepository.existsByDetachmentIdAndUserIdAndActiveTrue(detachmentId, userId);
    }

    public boolean isParentOfChild(UUID childId, UUID userId) {
        boolean result = parentLinkRepository.existsByIdChildIdAndIdParentUserId(childId, userId);
        log.debug("isParentOfChild: childId={}, userId={}, result={}", childId, userId, result);
        return result;
    }

    public boolean canManageCalendar(UUID sessionId, UUID userId) {
        boolean admin = campMemberRepository.existsByCampSessionIdAndUserIdAndRoleAndActiveTrue(sessionId, userId, CampRole.OWNER);
        if (admin) return true;
        return campMemberSessionRepository.findByCampMemberUserIdAndAssignmentStatusAndActiveTrue(userId, AssignmentStatus.ACCEPTED)
                .stream()
                .anyMatch(a -> a.getSession().getId().equals(sessionId) && a.getSubRole() == StaffSubRole.SENIOR_COUNSELOR);
    }

    public boolean canParentViewSessionCalendar(UUID sessionId, UUID userId) {
        Set<UUID> childIds = parentLinkRepository.findByParentUserId(userId).stream()
                .map(link -> link.getId().getChildId())
                .collect(Collectors.toSet());
        if (childIds.isEmpty()) return false;
        return detachmentMembershipRepository.findActiveByChildIds(childIds).stream()
                .anyMatch(m -> m.getDetachment().getSession().getId().equals(sessionId));
    }

    public boolean canManageShiftTasks(UUID sessionId, UUID userId) {
        return canManageCalendar(sessionId, userId);
    }

    public boolean canViewSessionTasks(UUID sessionId, UUID userId) {
        boolean admin = campMemberRepository.existsByCampSessionIdAndUserIdAndRoleAndActiveTrue(sessionId, userId, CampRole.OWNER);
        if (admin) return true;
        return campMemberSessionRepository.findByCampMemberUserIdAndAssignmentStatusAndActiveTrue(userId, AssignmentStatus.ACCEPTED)
                .stream()
                .anyMatch(a -> a.getSession().getId().equals(sessionId));
    }

    public boolean canCompleteTask(ShiftTask task, UUID userId, UUID detachmentId) {
        if (!canViewSessionTasks(task.getSession().getId(), userId)) {
            return false;
        }
        if (task.getTaskType() == ShiftTaskType.GENERAL) {
            return true;
        }
        if (detachmentId == null || task.getDetachment() == null) {
            return false;
        }
        return task.getDetachment().getId().equals(detachmentId)
                && counselorAssignmentRepository.existsByDetachmentIdAndUserIdAndActiveTrue(detachmentId, userId);
    }
}
