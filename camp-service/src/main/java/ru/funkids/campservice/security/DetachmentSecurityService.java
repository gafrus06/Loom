package ru.funkids.campservice.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.repository.*;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Новая модель безопасности по отрядам.
 *
 * Источники прав:
 * 1) ADMIN лагеря (CampRole.OWNER)
 * 2) Подроли смены через CampMemberSession:
 *    - COUNSELOR
 *    - SENIOR_COUNSELOR
 *    - MEDICAL_WORKER
 * 3) Назначение вожатого в конкретный отряд через CounselorAssignment
 * 4) Родитель через ParentLink и активное membership ребёнка
 *
 * Старые методы по LEAD/ASSISTANT сохранены для обратной совместимости,
 * но основной доступ теперь строится через смену и подтверждённое назначение.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DetachmentSecurityService {

    private final DetachmentRepository detachmentRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final ParentLinkRepository parentLinkRepository;
    private final DetachmentMembershipRepository detachmentMembershipRepository;

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        return authorities.stream().anyMatch(a -> role.equals(a.getAuthority()));
    }

    private boolean isCurrentUserAdmin() {
        return hasRole("ROLE_ADMIN") || hasRole("ROLE_SUPER_ADMIN");
    }

    public boolean isCurrentUserParent() {
        return hasRole("ROLE_PARENT");
    }

    public boolean isCurrentUserCounselor() {
        return hasRole("ROLE_COUNSELOR");
    }

    public boolean isCampAdmin(UUID campId, UUID userId) {
        return campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(campId, userId, CampRole.OWNER);
    }

    public boolean isAcceptedStaffInSession(UUID sessionId, UUID campId, UUID userId) {
        return campMemberSessionRepository.existsAcceptedBySessionIdAndUserIdAndCampId(sessionId, userId, campId);
    }

    public boolean isAcceptedStaffWithSubRoleInSession(UUID sessionId, UUID campId, UUID userId, StaffSubRole subRole) {
        return campMemberSessionRepository.existsAcceptedBySessionIdAndUserIdAndCampIdAndSubRole(sessionId, userId, campId, subRole);
    }

    /**
     * Оставляем название метода ради совместимости со старыми сервисами.
     */
    public boolean isCounselorInSession(UUID sessionId, UUID campId, UUID userId) {
        return isAcceptedStaffInSession(sessionId, campId, userId);
    }

    public Optional<DetachmentRole> getCounselorRoleInDetachment(UUID detachmentId, UUID userId) {
        return counselorAssignmentRepository
                .findByDetachmentIdAndUserIdAndActiveTrue(detachmentId, userId)
                .map(CounselorAssignment::getRoleInDetachment);
    }

    public boolean isLeadOfDetachment(UUID detachmentId, UUID userId) {
        return getCounselorRoleInDetachment(detachmentId, userId)
                .map(role -> role == DetachmentRole.LEAD)
                .orElse(false);
    }

    public boolean isAssistantOfDetachment(UUID detachmentId, UUID userId) {
        return getCounselorRoleInDetachment(detachmentId, userId)
                .map(role -> role == DetachmentRole.ASSISTANT)
                .orElse(false);
    }

    public boolean isMemberOfDetachment(UUID detachmentId, UUID userId) {
        return counselorAssignmentRepository.existsByDetachmentIdAndUserIdAndActiveTrue(detachmentId, userId);
    }

    public boolean isSeniorCounselorForDetachment(UUID detachmentId, UUID userId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
        return isAcceptedStaffWithSubRoleInSession(
                detachment.getSession().getId(),
                detachment.getSession().getCamp().getId(),
                userId,
                StaffSubRole.SENIOR_COUNSELOR
        );
    }

    public boolean isMedicalWorkerForDetachment(UUID detachmentId, UUID userId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
        return isAcceptedStaffWithSubRoleInSession(
                detachment.getSession().getId(),
                detachment.getSession().getCamp().getId(),
                userId,
                StaffSubRole.MEDICAL_WORKER
        );
    }

    public boolean canModifyDetachment(UUID detachmentId, UUID userId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));

        UUID campId = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();

        if (isCurrentUserAdmin() && isCampAdmin(campId, userId)) {
            return true;
        }

        if (isAcceptedStaffWithSubRoleInSession(sessionId, campId, userId, StaffSubRole.SENIOR_COUNSELOR)) {
            return true;
        }

        return isMemberOfDetachment(detachmentId, userId);
    }

    public void checkCanModifyDetachment(UUID detachmentId, UUID userId) {
        if (!canModifyDetachment(detachmentId, userId)) {
            throw new AccessDeniedException("Нет прав на изменение отряда.");
        }
    }

    public boolean canViewDetachment(UUID detachmentId, UUID userId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));

        UUID campId = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();

        if (isCurrentUserAdmin() && isCampAdmin(campId, userId)) {
            return true;
        }

        if (isAcceptedStaffInSession(sessionId, campId, userId)) {
            return true;
        }

        if (isCurrentUserParent()) {
            return isParentHasChildInDetachment(detachmentId, userId);
        }

        return false;
    }

    public void checkCanViewDetachment(UUID detachmentId, UUID userId) {
        if (!canViewDetachment(detachmentId, userId)) {
            throw new AccessDeniedException("Нет доступа к отряду.");
        }
    }

    public boolean canRemoveCounselor(UUID detachmentId, UUID targetUserId, UUID actorId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
        UUID campId = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();

        if (isCurrentUserAdmin() && isCampAdmin(campId, actorId)) return true;
        if (isAcceptedStaffWithSubRoleInSession(sessionId, campId, actorId, StaffSubRole.SENIOR_COUNSELOR)) return true;

        Optional<DetachmentRole> targetRole = getCounselorRoleInDetachment(detachmentId, targetUserId);
        if (targetRole.isEmpty()) return false;

        Optional<DetachmentRole> actorRole = getCounselorRoleInDetachment(detachmentId, actorId);
        if (actorRole.isEmpty()) return false;

        if (actorRole.get() == DetachmentRole.LEAD) {
            return targetRole.get() == DetachmentRole.ASSISTANT;
        }
        return false;
    }

    public void checkCanRemoveCounselor(UUID detachmentId, UUID targetUserId, UUID actorId) {
        if (!canRemoveCounselor(detachmentId, targetUserId, actorId)) {
            throw new AccessDeniedException("Недостаточно прав для исключения вожатого из отряда.");
        }
    }

    public boolean canAddAssistant(UUID detachmentId, UUID actorId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
        UUID campId = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();

        if (isCurrentUserAdmin() && isCampAdmin(campId, actorId)) return true;
        if (isAcceptedStaffWithSubRoleInSession(sessionId, campId, actorId, StaffSubRole.SENIOR_COUNSELOR)) return true;
        return isLeadOfDetachment(detachmentId, actorId);
    }

    public void checkCanAddAssistant(UUID detachmentId, UUID actorId) {
        if (!canAddAssistant(detachmentId, actorId)) {
            throw new AccessDeniedException("Добавлять помощников может LEAD, старший вожатый или администратор лагеря.");
        }
    }

    public boolean canViewFullChildCard(UUID childId, UUID requesterId) {
        Optional<DetachmentMembership> membership = detachmentMembershipRepository.findActiveMembershipByChildId(childId);

        if (membership.isPresent()) {
            UUID detachmentId = membership.get().getDetachment().getId();
            UUID campId = membership.get().getDetachment().getSession().getCamp().getId();
            UUID sessionId = membership.get().getDetachment().getSession().getId();

            if (isCurrentUserAdmin() && isCampAdmin(campId, requesterId)) {
                return true;
            }
            if (isAcceptedStaffWithSubRoleInSession(sessionId, campId, requesterId, StaffSubRole.MEDICAL_WORKER)) {
                return true;
            }
            if (isAcceptedStaffWithSubRoleInSession(sessionId, campId, requesterId, StaffSubRole.SENIOR_COUNSELOR)) {
                return true;
            }
            if (isMemberOfDetachment(detachmentId, requesterId)) {
                return true;
            }
        }

        if (isCurrentUserParent()) {
            return parentLinkRepository.existsByIdChildIdAndIdParentUserId(childId, requesterId);
        }

        return false;
    }

    public void checkCanViewFullChildCard(UUID childId, UUID requesterId) {
        if (!canViewFullChildCard(childId, requesterId)) {
            throw new AccessDeniedException("Доступ к полной карточке ребёнка запрещён.");
        }
    }

    public boolean canParentUpdateChild(UUID childId, UUID parentUserId) {
        return parentLinkRepository.existsByIdChildIdAndIdParentUserId(childId, parentUserId);
    }

    public void checkCanParentUpdateChild(UUID childId, UUID parentUserId) {
        if (!canParentUpdateChild(childId, parentUserId)) {
            throw new AccessDeniedException("Вы можете редактировать только карточки своих детей.");
        }
    }

    public boolean isParentHasChildInDetachment(UUID detachmentId, UUID parentUserId) {
        Set<UUID> childIds = parentLinkRepository.findByParentUserId(parentUserId).stream()
                .map(link -> link.getId().getChildId())
                .collect(Collectors.toSet());
        if (childIds.isEmpty()) {
            return false;
        }
        return detachmentMembershipRepository.findActiveByChildIds(childIds).stream()
                .anyMatch(m -> m.getDetachment().getId().equals(detachmentId));
    }

    public List<UUID> findParentChildIdsInDetachment(UUID detachmentId, UUID parentUserId) {
        Set<UUID> childIds = parentLinkRepository.findByParentUserId(parentUserId).stream()
                .map(link -> link.getId().getChildId())
                .collect(Collectors.toSet());
        if (childIds.isEmpty()) {
            return List.of();
        }
        return detachmentMembershipRepository.findActiveByChildIds(childIds).stream()
                .filter(m -> m.getDetachment().getId().equals(detachmentId))
                .map(m -> m.getChild().getId())
                .toList();
    }

    /** @deprecated Используй canViewDetachment */
    @Deprecated
    public boolean hasAccessToDetachment(UUID detachmentId, UUID userId) {
        return canViewDetachment(detachmentId, userId);
    }

    /** @deprecated */
    @Deprecated
    public void checkAccessToDetachment(UUID detachmentId, UUID userId) {
        checkCanViewDetachment(detachmentId, userId);
    }

    /** @deprecated Используй canViewFullChildCard */
    @Deprecated
    public boolean hasAccessToChildDetachment(UUID childId, UUID userId) {
        return canViewFullChildCard(childId, userId);
    }

    /** @deprecated */
    @Deprecated
    public void checkAccessToChildDetachment(UUID childId, UUID userId) {
        checkCanViewFullChildCard(childId, userId);
    }
}
