package ru.funkids.newsfeedservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.newsfeedservice.client.CampServiceClient;
import ru.funkids.newsfeedservice.dto.client.CampDto;
import ru.funkids.newsfeedservice.dto.client.CampPostingAccessDto;
import ru.funkids.newsfeedservice.dto.client.CounselorAssignmentDto;
import ru.funkids.newsfeedservice.dto.client.DetachmentDto;
import ru.funkids.newsfeedservice.dto.client.MembershipDto;
import ru.funkids.newsfeedservice.dto.client.ParentLinkDto;
import ru.funkids.newsfeedservice.dto.response.PageResponse;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.entity.PostModerationStatus;
import ru.funkids.newsfeedservice.exception.ForbiddenException;
import ru.funkids.newsfeedservice.repository.PostRepository;
import ru.funkids.newsfeedservice.security.SecurityUtils;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FeedService {

    private final PostRepository postRepository;
    private final PostService postService;
    private final CampServiceClient campServiceClient;

    public PageResponse<PostResponse> getMyFeed(String filter, UUID requestedCampId, Pageable pageable) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        String userRole = SecurityUtils.getCurrentUserRole();

        log.info("Feed request: userId={} role={} filter={} requestedCampId={}", currentUserId, userRole, filter, requestedCampId);

        Page<Post> posts;
        if ("my-camp".equals(filter)) {
            UUID campId = requestedCampId != null
                    ? requestedCampId
                    : resolveCampIdByRoles(currentUserId, SecurityUtils.getCurrentUserRoles());
            posts = campId != null
                    ? postRepository.findPublishedByCampId(campId, pageable)
                    : Page.empty(pageable);
        } else {
            posts = postRepository.findAllPublishedByDateDesc(pageable);
        }

        return postService.buildPageResponse(posts, currentUserId);
    }

    public PageResponse<PostResponse> getCampArchive(UUID campId, Pageable pageable) {
        return postService.buildPageResponse(
                postRepository.findPublishedByCampId(campId, pageable),
                SecurityUtils.getCurrentUserId()
        );
    }

    public PageResponse<PostResponse> getCampFeed(UUID campId, Pageable pageable) {
        if (!isAdmin(SecurityUtils.getCurrentUserRole())) {
            throw new ForbiddenException("Only admins can view camp feed");
        }
        return postService.buildPageResponse(
                postRepository.findPublishedByCampId(campId, pageable),
                SecurityUtils.getCurrentUserId()
        );
    }

    public PageResponse<PostResponse> getPendingModerationFeed(UUID campId, Pageable pageable) {
        CampPostingAccessDto access = campServiceClient.getPostingAccess(campId);
        if (!access.isCanModeratePosts()) {
            throw new ForbiddenException("Only camp owner or senior counselor can moderate posts");
        }
        return postService.buildPageResponse(
                postRepository.findByCampIdAndModerationStatus(campId, PostModerationStatus.PENDING_REVIEW, pageable),
                SecurityUtils.getCurrentUserId()
        );
    }

    private UUID resolveCampIdByRoles(UUID userId, Set<String> roles) {
        for (String role : List.of("ADMIN", "ROLE_ADMIN", "COUNSELOR", "ROLE_COUNSELOR", "PARENT", "ROLE_PARENT")) {
            if (!roles.contains(role)) {
                continue;
            }
            UUID campId = resolveCampId(userId, role);
            if (campId != null) {
                return campId;
            }
        }
        return null;
    }

    private UUID resolveCampId(UUID userId, String role) {
        try {
            if (isAdmin(role)) {
                List<CampDto> camps = campServiceClient.getMyAccessibleCamps(userId);
                if (camps == null || camps.isEmpty()) {
                    return null;
                }
                return camps.stream()
                        .filter(camp -> userId.equals(camp.getOwnerId()))
                        .map(CampDto::getId)
                        .findFirst()
                        .orElse(camps.get(0).getId());
            }

            if (isCounselor(role)) {
                List<CounselorAssignmentDto> assignments = campServiceClient.getActiveAssignments(userId);
                if (assignments == null || assignments.isEmpty()) {
                    return null;
                }

                CounselorAssignmentDto assignment = assignments.stream()
                        .filter(CounselorAssignmentDto::isActive)
                        .findFirst()
                        .orElse(assignments.get(0));
                DetachmentDto detachment = campServiceClient.getDetachment(assignment.getDetachmentId());
                return detachment != null ? detachment.getCampId() : null;
            }

            if (isParent(role)) {
                List<ParentLinkDto> children = campServiceClient.getMyChildren(userId);
                if (children == null || children.isEmpty()) {
                    return null;
                }

                UUID childId = children.get(0).getChildId();
                try {
                    MembershipDto activeMembership = campServiceClient.getActiveMembership(childId);
                    if (activeMembership != null) {
                        DetachmentDto detachment = campServiceClient.getDetachment(activeMembership.getDetachmentId());
                        return detachment != null ? detachment.getCampId() : null;
                    }
                } catch (Exception ignored) {
                    List<MembershipDto> memberships = campServiceClient.getChildMemberships(childId);
                    if (memberships != null && !memberships.isEmpty()) {
                        DetachmentDto detachment = campServiceClient.getDetachment(memberships.get(0).getDetachmentId());
                        return detachment != null ? detachment.getCampId() : null;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("resolveCampId failed userId={} role={}: {}", userId, role, e.getMessage());
        }

        return null;
    }

    private boolean isAdmin(String role) {
        return "ADMIN".equals(role) || "ROLE_ADMIN".equals(role);
    }

    private boolean isCounselor(String role) {
        return "COUNSELOR".equals(role) || "ROLE_COUNSELOR".equals(role);
    }

    private boolean isParent(String role) {
        return "PARENT".equals(role) || "ROLE_PARENT".equals(role);
    }
}
