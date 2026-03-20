package ru.funkids.campservice.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.funkids.campservice.entity.CampRole;
import ru.funkids.campservice.repository.CampMemberRepository;
import ru.funkids.campservice.repository.CounselorAssignmentRepository;
import ru.funkids.campservice.repository.ParentLinkRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampSecurityService {

    private final CampMemberRepository campMemberRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final ParentLinkRepository parentLinkRepository;

    /**
     * Может ли пользователь управлять лагерем (создавать смены, назначать вожатых)
     */
    public boolean canManageCamp(UUID campId, UUID userId) {
        boolean result = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                campId, userId, CampRole.OWNER
        );
        log.debug("canManageCamp: campId={}, userId={}, result={}", campId, userId, result);
        return result;
    }

    /**
     * Может ли пользователь создать отряд в смене
     * ADMIN (OWNER лагеря) или COUNSELOR (прикрепленный к лагерю) могут создавать отряды
     */
    public boolean canCreateDetachmentInSession(UUID sessionId, UUID userId) {
        // Проверка 1: OWNER лагеря (ADMIN)
        boolean isOwner = campMemberRepository.existsByCampSessionIdAndUserIdAndRoleAndActiveTrue(
                sessionId, userId, CampRole.OWNER
        );

        if (isOwner) {
            log.debug("canCreateDetachmentInSession: sessionId={}, userId={}, result=true (OWNER)", sessionId, userId);
            return true;
        }

        // Проверка 2: COUNSELOR прикреплен к ЭТОМУ лагерю
        boolean isCounselor = campMemberRepository.existsByCampSessionIdAndUserIdAndRoleAndActiveTrue(
                sessionId, userId, CampRole.COUNSELOR
        );

        log.debug("canCreateDetachmentInSession: sessionId={}, userId={}, result={} (COUNSELOR)",
                sessionId, userId, isCounselor);
        return isCounselor;
    }

    /**
     * Может ли пользователь работать с отрядом (создавать детей, задавать вопросы AI)
     */
    public boolean canManageDetachment(UUID detachmentId, UUID userId) {
        // Проверка 1: ADMIN владелец лагеря
        boolean isOwner = campMemberRepository.existsByCampDetachmentIdAndUserIdAndRoleAndActiveTrue(
                detachmentId, userId, CampRole.OWNER
        );

        if (isOwner) {
            log.debug("canManageDetachment: detachmentId={}, userId={}, result=true (OWNER)", detachmentId, userId);
            return true;
        }

        // Проверка 2: вожатый назначен на отряд
        boolean isCounselor = counselorAssignmentRepository.existsByDetachmentIdAndUserIdAndActiveTrue(
                detachmentId, userId
        );

        log.debug("canManageDetachment: detachmentId={}, userId={}, result={} (COUNSELOR)",
                detachmentId, userId, isCounselor);
        return isCounselor;
    }

    /**
     * Является ли пользователь родителем ребенка
     */
    public boolean isParentOfChild(UUID childId, UUID userId) {
        boolean result = parentLinkRepository.existsByIdChildIdAndIdParentUserId(childId, userId);
        log.debug("isParentOfChild: childId={}, userId={}, result={}", childId, userId, result);
        return result;
    }
}