package ru.funkids.newsfeedservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.newsfeedservice.client.CampServiceClient;
import ru.funkids.newsfeedservice.dto.client.*;
import ru.funkids.newsfeedservice.dto.response.PageResponse;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.exception.ForbiddenException;
import ru.funkids.newsfeedservice.repository.PostRepository;
import ru.funkids.newsfeedservice.security.SecurityUtils;

import java.util.List;
import java.util.UUID;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FeedService {

    private final PostRepository    postRepository;
    private final PostService       postService;
    private final CampServiceClient campServiceClient;

    /**
     * filter = "all"     → ВСЕ посты приложения по дате, без фильтрации по лагерю
     * filter = "my-camp" → посты конкретного лагеря пользователя (закрепы сверху)
     */
    public PageResponse<PostResponse> getMyFeed(String filter, UUID requestedCampId, Pageable pageable) {
        UUID   currentUserId = SecurityUtils.getCurrentUserId();
        String userRole      = SecurityUtils.getCurrentUserRole();

        log.info("Feed request: userId={} role={} filter={} requestedCampId={}", currentUserId, userRole, filter, requestedCampId);

        Page<Post> posts;

        if ("my-camp".equals(filter)) {
            UUID campId;
            if (requestedCampId != null) {
                // Фронт передал конкретный лагерь (из селектора) — используем его
                campId = requestedCampId;
                log.info("my-camp: using requested campId={}", campId);
            } else {
                // Бэкенд сам определяет лагерь по ролям пользователя
                Set<String> allRoles = SecurityUtils.getCurrentUserRoles();
                campId = resolveCampIdByRoles(currentUserId, allRoles);
                log.info("my-camp: resolved campId={} for userId={} roles={}", campId, currentUserId, allRoles);
            }
            posts = campId != null
                    ? postRepository.findByCampId(campId, pageable)
                    : Page.empty(pageable);
        } else {
            // "all" — просто все посты системы по дате
            posts = postRepository.findAllByDateDesc(pageable);
        }

        return postService.buildPageResponse(posts, currentUserId);
    }

    public PageResponse<PostResponse> getCampArchive(UUID campId, Pageable pageable) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        return postService.buildPageResponse(
                postRepository.findByCampId(campId, pageable), currentUserId);
    }

    public PageResponse<PostResponse> getCampFeed(UUID campId, Pageable pageable) {
        if (!isAdmin(SecurityUtils.getCurrentUserRole())) {
            throw new ForbiddenException("Only admins can view camp feed");
        }
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        return postService.buildPageResponse(
                postRepository.findByCampId(campId, pageable), currentUserId);
    }

    // ─── РЕЗОЛЮЦИЯ ЛАГЕРЯ ────────────────────────────────────────────────────

    /**
     * Перебирает все роли пользователя по приоритету и возвращает первый найденный campId.
     * Порядок: ADMIN → COUNSELOR → PARENT
     * Это нужно когда у пользователя несколько ролей (например COUNSELOR + PARENT)
     * и по одной роли лагерь не нашёлся.
     */
    private UUID resolveCampIdByRoles(UUID userId, Set<String> roles) {
        // Пробуем в порядке приоритета
        for (String role : List.of("ADMIN", "ROLE_ADMIN", "COUNSELOR", "ROLE_COUNSELOR", "PARENT", "ROLE_PARENT")) {
            if (!roles.contains(role)) continue;
            UUID campId = resolveCampId(userId, role);
            if (campId != null) {
                log.info("resolveCampIdByRoles: found campId={} via role={}", campId, role);
                return campId;
            }
        }
        return null;
    }

    /**
     * Определяет campId пользователя для вкладки "Мой лагерь".
     * Админ — первый лагерь где он владелец (или первый доступный).
     * Вожатый — лагерь из активного назначения.
     * Родитель — лагерь ребёнка через членство.
     */
    private UUID resolveCampId(UUID userId, String role) {
        try {
            if (isAdmin(role)) {
                List<CampDto> camps = campServiceClient.getMyAccessibleCamps(userId);
                if (camps == null || camps.isEmpty()) return null;
                return camps.stream()
                        .filter(c -> userId.equals(c.getOwnerId()))
                        .map(CampDto::getId)
                        .findFirst()
                        .orElse(camps.get(0).getId());

            } else if (isCounselor(role)) {
                List<CounselorAssignmentDto> assignments = campServiceClient.getActiveAssignments(userId);
                if (assignments == null || assignments.isEmpty()) return null;

                CounselorAssignmentDto assignment = assignments.stream()
                        .filter(CounselorAssignmentDto::isActive)
                        .findFirst()
                        .orElse(assignments.get(0));

                DetachmentDto detachment = campServiceClient.getDetachment(assignment.getDetachmentId());
                return detachment != null ? detachment.getCampId() : null;

            } else if (isParent(role)) {
                List<ParentLinkDto> children = campServiceClient.getMyChildren(userId);
                if (children == null || children.isEmpty()) return null;

                UUID childId = children.get(0).getChildId();
                try {
                    MembershipDto m = campServiceClient.getActiveMembership(childId);
                    if (m != null) {
                        DetachmentDto d = campServiceClient.getDetachment(m.getDetachmentId());
                        return d != null ? d.getCampId() : null;
                    }
                } catch (Exception e) {
                    List<MembershipDto> memberships = campServiceClient.getChildMemberships(childId);
                    if (memberships != null && !memberships.isEmpty()) {
                        DetachmentDto d = campServiceClient.getDetachment(memberships.get(0).getDetachmentId());
                        return d != null ? d.getCampId() : null;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("resolveCampId failed userId={} role={}: {}", userId, role, e.getMessage());
        }
        return null;
    }

    private boolean isAdmin(String role)     { return "ADMIN".equals(role)     || "ROLE_ADMIN".equals(role); }
    private boolean isCounselor(String role) { return "COUNSELOR".equals(role) || "ROLE_COUNSELOR".equals(role); }
    private boolean isParent(String role)    { return "PARENT".equals(role)    || "ROLE_PARENT".equals(role); }
}