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
import java.util.Optional;
import java.util.UUID;

/**
 * Централизованный сервис проверки прав доступа к отрядам и детям.
 *
 * Роли в системе:
 *   ADMIN     — владелец лагеря (CampRole.OWNER). Полный доступ ко всему в своём лагере.
 *   LEAD      — главный вожатый отряда (DetachmentRole.LEAD). Создаётся при создании отряда.
 *   ASSISTANT — помощник вожатого (DetachmentRole.ASSISTANT). Добавляется LEAD-ом или ADMIN-ом.
 *   PARENT    — родитель. Видит только свой отряд и карточки своих детей.
 *
 * Правила доступа к отряду:
 *   Изменение отряда (этап, добавление ребёнка):
 *     ADMIN лагеря — да
 *     LEAD или ASSISTANT этого отряда — да
 *     Вожатый из другого отряда — видит, но не изменяет
 *     Родитель — нет
 *
 *   Исключение из отряда:
 *     ADMIN — может исключить кого угодно (LEAD и ASSISTANT)
 *     LEAD  — может исключить только ASSISTANT-а
 *     ASSISTANT — не может исключать никого
 *
 *   Просмотр отрядов смены:
 *     ADMIN — все отряды всех смен лагеря
 *     Вожатый — все отряды своей смены (read-only для чужих)
 *     Родитель — только свой отряд
 *
 *   Карточка ребёнка (полные данные):
 *     ADMIN, LEAD, ASSISTANT отряда — полный доступ
 *     Родитель — только карточки своих детей
 *     Остальные — только имя + фамилия
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

    // =========================================================================
    // Вспомогательные методы — роль текущего пользователя из SecurityContext
    // =========================================================================

    private boolean isCurrentUserAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        return authorities.stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    public boolean isCurrentUserParent() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> "ROLE_PARENT".equals(a.getAuthority()));
    }

    // =========================================================================
    // 1. Является ли пользователь ADMIN-ом данного лагеря
    // =========================================================================

    public boolean isCampAdmin(UUID campId, UUID userId) {
        return campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                campId, userId, CampRole.OWNER);
    }

    // =========================================================================
    // 2. Имеет ли вожатый доступ к данной смене
    //    (назначен на неё ADMIN-ом через CampMemberSession)
    // =========================================================================

    public boolean isCounselorInSession(UUID sessionId, UUID campId, UUID userId) {
        // ADMIN проверяется отдельно
        return campMemberSessionRepository.existsBySessionIdAndUserIdAndCampId(
                sessionId, userId, campId);
    }

    // =========================================================================
    // 3. Роль вожатого в конкретном отряде
    // =========================================================================

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
        return counselorAssignmentRepository
                .existsByDetachmentIdAndUserIdAndActiveTrue(detachmentId, userId);
    }

    // =========================================================================
    // 4. Может ли пользователь ИЗМЕНЯТЬ отряд
    //    (менять этап, добавлять/убирать ребёнка, редактировать данные)
    // =========================================================================

    public boolean canModifyDetachment(UUID detachmentId, UUID userId) {
        log.debug("canModifyDetachment: detachment={} user={}", detachmentId, userId);

        // ADMIN из JWT
        if (isCurrentUserAdmin()) {
            // Дополнительно проверяем, что это ADMIN именно этого лагеря
            Detachment detachment = detachmentRepository.findById(detachmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
            UUID campId = detachment.getSession().getCamp().getId();
            return isCampAdmin(campId, userId);
        }

        // LEAD или ASSISTANT этого отряда
        return isMemberOfDetachment(detachmentId, userId);
    }

    public void checkCanModifyDetachment(UUID detachmentId, UUID userId) {
        if (!canModifyDetachment(detachmentId, userId)) {
            throw new AccessDeniedException(
                    "Нет прав на изменение отряда. Требуется быть вожатым этого отряда или администратором лагеря.");
        }
    }

    // =========================================================================
    // 5. Может ли пользователь ВИДЕТЬ отряд (read-only)
    //    Вожатый видит все отряды своей смены
    // =========================================================================

    public boolean canViewDetachment(UUID detachmentId, UUID userId) {
        log.debug("canViewDetachment: detachment={} user={}", detachmentId, userId);

        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));

        UUID campId    = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();

        // ADMIN лагеря
        if (isCurrentUserAdmin() && isCampAdmin(campId, userId)) return true;

        // Вожатый назначен на эту смену
        if (isCounselorInSession(sessionId, campId, userId)) return true;

        // Родитель — только если его ребёнок в этом отряде
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

    // =========================================================================
    // 6. Может ли актор ИСКЛЮЧИТЬ вожатого из отряда
    // =========================================================================

    /**
     * @param detachmentId  отряд
     * @param targetUserId  кого исключают
     * @param actorId       кто исключает
     */
    public boolean canRemoveCounselor(UUID detachmentId, UUID targetUserId, UUID actorId) {
        log.debug("canRemoveCounselor: detachment={} target={} actor={}", detachmentId, targetUserId, actorId);

        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
        UUID campId = detachment.getSession().getCamp().getId();

        // ADMIN лагеря может исключить кого угодно
        if (isCurrentUserAdmin() && isCampAdmin(campId, actorId)) return true;

        // Узнаём роль того, кого исключают
        Optional<DetachmentRole> targetRole = getCounselorRoleInDetachment(detachmentId, targetUserId);
        if (targetRole.isEmpty()) return false; // цель не является вожатым этого отряда

        // Узнаём роль актора
        Optional<DetachmentRole> actorRole = getCounselorRoleInDetachment(detachmentId, actorId);
        if (actorRole.isEmpty()) return false; // актор не является вожатым этого отряда

        if (actorRole.get() == DetachmentRole.LEAD) {
            // LEAD может исключить только ASSISTANT-а, но не другого LEAD-а
            return targetRole.get() == DetachmentRole.ASSISTANT;
        }

        // ASSISTANT не может исключать никого
        return false;
    }

    public void checkCanRemoveCounselor(UUID detachmentId, UUID targetUserId, UUID actorId) {
        if (!canRemoveCounselor(detachmentId, targetUserId, actorId)) {
            throw new AccessDeniedException(
                    "Недостаточно прав для исключения вожатого из отряда.");
        }
    }

    // =========================================================================
    // 7. Может ли пользователь ДОБАВИТЬ помощника в отряд
    // =========================================================================

    public boolean canAddAssistant(UUID detachmentId, UUID actorId) {
        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));
        UUID campId = detachment.getSession().getCamp().getId();

        if (isCurrentUserAdmin() && isCampAdmin(campId, actorId)) return true;
        return isLeadOfDetachment(detachmentId, actorId);
    }

    public void checkCanAddAssistant(UUID detachmentId, UUID actorId) {
        if (!canAddAssistant(detachmentId, actorId)) {
            throw new AccessDeniedException(
                    "Добавлять помощников может только Главный вожатый или администратор лагеря.");
        }
    }

    // =========================================================================
    // 8. Полный доступ к карточке ребёнка
    //    ADMIN, LEAD, ASSISTANT — полный доступ
    //    Родитель — только своего ребёнка
    //    Остальные — только имя/фамилия (через отдельный метод сервиса)
    // =========================================================================

    public boolean canViewFullChildCard(UUID childId, UUID requesterId) {
        log.debug("canViewFullChildCard: child={} requester={}", childId, requesterId);

        // Проверяем, в каком отряде ребёнок
        Optional<DetachmentMembership> membership = detachmentMembershipRepository
                .findActiveMembershipByChildId(childId);

        if (membership.isPresent()) {
            UUID detachmentId = membership.get().getDetachment().getId();

            // ADMIN или вожатый отряда
            if (isCurrentUserAdmin()) {
                UUID campId = membership.get().getDetachment().getSession().getCamp().getId();
                if (isCampAdmin(campId, requesterId)) return true;
            }
            if (isMemberOfDetachment(detachmentId, requesterId)) return true;
        }

        // Родитель может смотреть только своего ребёнка
        if (isCurrentUserParent()) {
            return parentLinkRepository.existsByIdChildIdAndIdParentUserId(childId, requesterId);
        }

        return false;
    }

    public void checkCanViewFullChildCard(UUID childId, UUID requesterId) {
        if (!canViewFullChildCard(childId, requesterId)) {
            throw new AccessDeniedException(
                    "Доступ к полной карточке ребёнка запрещён. " +
                            "Родители могут просматривать только карточки своих детей.");
        }
    }

    // =========================================================================
    // 9. Может ли родитель ИЗМЕНЯТЬ карточку ребёнка
    // =========================================================================

    public boolean canParentUpdateChild(UUID childId, UUID parentUserId) {
        return parentLinkRepository.existsByIdChildIdAndIdParentUserId(childId, parentUserId);
    }

    public void checkCanParentUpdateChild(UUID childId, UUID parentUserId) {
        if (!canParentUpdateChild(childId, parentUserId)) {
            throw new AccessDeniedException("Вы можете редактировать только карточки своих детей.");
        }
    }

    // =========================================================================
    // Вспомогательный: есть ли у родителя ребёнок в данном отряде
    // =========================================================================

    public boolean isParentHasChildInDetachment(UUID detachmentId, UUID parentUserId) {
        // Находим всех детей родителя
        return parentLinkRepository.findByParentUserId(parentUserId).stream()
                .map(link -> link.getId().getChildId())
                .anyMatch(childId ->
                        detachmentMembershipRepository
                                .existsByDetachmentIdAndChildIdAndLeftAtIsNull(detachmentId, childId)
                );
    }

    // =========================================================================
    // Обратная совместимость — старые методы оставляем, делегируем к новым
    // =========================================================================

    /** @deprecated Используй canModifyDetachment или canViewDetachment */
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