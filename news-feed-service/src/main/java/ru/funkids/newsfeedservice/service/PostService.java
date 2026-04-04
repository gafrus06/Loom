package ru.funkids.newsfeedservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.newsfeedservice.client.CampServiceClient;
import ru.funkids.newsfeedservice.client.FileStorageClient;
import ru.funkids.newsfeedservice.client.UserServiceClient;
import ru.funkids.newsfeedservice.config.RedisConfig;
import ru.funkids.newsfeedservice.dto.client.CampDto;
import ru.funkids.newsfeedservice.dto.client.CampPostingAccessDto;
import ru.funkids.newsfeedservice.dto.client.DetachmentDto;
import ru.funkids.newsfeedservice.dto.client.DownloadUrlsRequest;
import ru.funkids.newsfeedservice.dto.client.UserProfileDto;
import ru.funkids.newsfeedservice.dto.request.CreatePostRequest;
import ru.funkids.newsfeedservice.dto.request.UpdatePostRequest;
import ru.funkids.newsfeedservice.dto.response.PageResponse;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.entity.PostMedia;
import ru.funkids.newsfeedservice.entity.PostModerationStatus;
import ru.funkids.newsfeedservice.exception.ForbiddenException;
import ru.funkids.newsfeedservice.exception.ResourceNotFoundException;
import ru.funkids.newsfeedservice.mapper.PostMapper;
import ru.funkids.newsfeedservice.repository.LikeRepository;
import ru.funkids.newsfeedservice.repository.PostRepository;
import ru.funkids.newsfeedservice.security.SecurityUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PostService {

    private final PostRepository postRepository;
    private final LikeRepository likeRepository;
    private final CampServiceClient campServiceClient;
    private final UserServiceClient userServiceClient;
    private final FileStorageClient fileStorageClient;
    private final PostMapper postMapper;

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse createPost(CreatePostRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        String userRole = SecurityUtils.getCurrentUserRole();

        if (!isAdminOrCounselor(userRole)) {
            throw new ForbiddenException("Only counselors and admins can create posts");
        }

        CampPostingAccessDto access = loadPostingAccess(request.getCampId());
        if (!access.isCampOwner() && !access.isAcceptedStaff()) {
            throw new ForbiddenException("You must be assigned to the camp to create posts");
        }

        Post post = postMapper.toEntity(request);
        post.setAuthorId(currentUserId);
        post.setModerationStatus(resolveInitialStatus(access, isAdmin(userRole)));

        Post savedPost = postRepository.save(post);
        attachUploadedMedia(savedPost, request.getImageFileIds(), "IMAGE");
        attachUploadedMedia(savedPost, request.getVideoFileIds(), "VIDEO");

        Post finalPost = postRepository.save(savedPost);
        log.info("Post created id={} by userId={}", finalPost.getId(), currentUserId);
        return buildSinglePostResponse(finalPost, currentUserId);
    }

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse updatePost(UUID postId, UpdatePostRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        String userRole = SecurityUtils.getCurrentUserRole();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        boolean authorEditing = post.getAuthorId().equals(currentUserId);
        CampPostingAccessDto access = null;

        if (!authorEditing && !isAdmin(userRole)) {
            access = campServiceClient.getPostingAccess(post.getCampId());
            if (!access.isCanModeratePosts()) {
                throw new ForbiddenException("You can only edit your own posts");
            }
        }

        postMapper.updateEntity(post, request);
        if (authorEditing && !isAdmin(userRole)) {
            if (access == null) {
                access = campServiceClient.getPostingAccess(post.getCampId());
            }
            post.setModerationStatus(resolveInitialStatus(access, false));
        }

        if (request.getMediaIdsToDelete() != null && !request.getMediaIdsToDelete().isEmpty()) {
            post.getMedia().removeIf(m -> request.getMediaIdsToDelete().contains(m.getId()));
        }

        attachUploadedMedia(post, request.getNewImageFileIds(), "IMAGE");
        attachUploadedMedia(post, request.getNewVideoFileIds(), "VIDEO");

        Post updated = postRepository.save(post);
        log.info("Post updated id={}", postId);
        return buildSinglePostResponse(updated, currentUserId);
    }

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public void deletePost(UUID postId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        String userRole = SecurityUtils.getCurrentUserRole();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        if (!post.getAuthorId().equals(currentUserId) && !isAdmin(userRole)) {
            throw new ForbiddenException("You can only delete your own posts");
        }

        likeRepository.deleteByPostId(postId);
        postRepository.delete(post);
        log.info("Post deleted id={}", postId);
    }

    @Cacheable(
            value = RedisConfig.CacheNames.POST,
            key = "#postId + ':' + T(ru.funkids.newsfeedservice.security.SecurityUtils).getCurrentUserId()"
    )
    @Transactional(readOnly = true)
    public PostResponse getPost(UUID postId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        Post post = postRepository.findWithMediaById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));
        return buildSinglePostResponse(post, currentUserId);
    }

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse togglePin(UUID postId, boolean pin) {
        if (!isAdmin(SecurityUtils.getCurrentUserRole())) {
            throw new ForbiddenException("Only admins can pin posts");
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        post.setPinned(pin);
        post.setPinnedOrder(pin ? (int) System.currentTimeMillis() : null);
        Post updated = postRepository.save(post);
        return buildSinglePostResponse(updated, SecurityUtils.getCurrentUserId());
    }

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse approvePost(UUID postId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        ensureCanModerate(post.getCampId());
        post.setModerationStatus(PostModerationStatus.PUBLISHED);
        return buildSinglePostResponse(postRepository.save(post), currentUserId);
    }

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse rejectPost(UUID postId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        ensureCanModerate(post.getCampId());
        post.setModerationStatus(PostModerationStatus.REJECTED);
        post.setPinned(false);
        post.setPinnedOrder(null);
        return buildSinglePostResponse(postRepository.save(post), currentUserId);
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> buildPageResponse(Page<Post> posts, UUID currentUserId) {
        if (posts.isEmpty()) {
            return new PageResponse<>(posts.map(p -> null));
        }

        List<Post> content = posts.getContent();
        Set<UUID> postIds = content.stream().map(Post::getId).collect(Collectors.toSet());
        Map<UUID, Long> likesCountMap = likeRepository.countMapByPostIds(postIds);
        Set<UUID> likedByUser = currentUserId != null
                ? likeRepository.findLikedPostIds(postIds, currentUserId)
                : Set.of();

        Map<UUID, UserProfileDto> authorMap = loadAuthors(content.stream().map(Post::getAuthorId).collect(Collectors.toSet()));
        Map<UUID, CampDto> campMap = loadCamps(content.stream().map(Post::getCampId).collect(Collectors.toSet()));
        Map<UUID, DetachmentDto> detachmentMap = loadDetachments(content.stream()
                .map(Post::getDetachmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));

        return new PageResponse<>(posts.map(post ->
                postMapper.toResponse(post, authorMap, campMap, detachmentMap, likesCountMap, likedByUser)));
    }

    private CampPostingAccessDto loadPostingAccess(UUID campId) {
        try {
            campServiceClient.getCamp(campId);
        } catch (Exception e) {
            throw new ResourceNotFoundException("Camp not found: " + campId);
        }
        return campServiceClient.getPostingAccess(campId);
    }

    private Map<UUID, UserProfileDto> loadAuthors(Set<UUID> authorIds) {
        Map<UUID, UserProfileDto> result = new HashMap<>();
        if (authorIds.isEmpty()) {
            return result;
        }

        try {
            userServiceClient.getUserProfiles(new ArrayList<>(authorIds))
                    .forEach(profile -> result.put(profile.getId(), profile));
        } catch (Exception e) {
            log.warn("Failed to load authors in bulk: {}", e.getMessage());
            return result;
        }

        Set<UUID> avatarFileIds = result.values().stream()
                .map(UserProfileDto::getAvatarFileId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (!avatarFileIds.isEmpty()) {
            try {
                DownloadUrlsRequest request = new DownloadUrlsRequest();
                request.setFileIds(new ArrayList<>(avatarFileIds));
                Map<UUID, String> avatarUrls = fileStorageClient.getDownloadUrls(request).getUrls();
                result.values().forEach(profile -> {
                    if (profile.getAvatarFileId() != null) {
                        String avatarUrl = avatarUrls.get(profile.getAvatarFileId());
                        if (avatarUrl != null) {
                            profile.setAvatarUrl(avatarUrl);
                        }
                    }
                });
            } catch (Exception e) {
                log.warn("Failed to load avatar URLs: {}", e.getMessage());
            }
        }

        return result;
    }

    private Map<UUID, CampDto> loadCamps(Set<UUID> campIds) {
        if (campIds.isEmpty()) {
            return Map.of();
        }
        try {
            return campServiceClient.getCamps(new ArrayList<>(campIds)).stream()
                    .collect(Collectors.toMap(CampDto::getId, Function.identity()));
        } catch (Exception e) {
            log.warn("Failed to load camps in bulk: {}", e.getMessage());
            return Map.of();
        }
    }

    private Map<UUID, DetachmentDto> loadDetachments(Set<UUID> detachmentIds) {
        if (detachmentIds.isEmpty()) {
            return Map.of();
        }
        try {
            return campServiceClient.getDetachments(new ArrayList<>(detachmentIds)).stream()
                    .collect(Collectors.toMap(DetachmentDto::getId, Function.identity()));
        } catch (Exception e) {
            log.warn("Failed to load detachments in bulk: {}", e.getMessage());
            return Map.of();
        }
    }

    private PostResponse buildSinglePostResponse(Post post, UUID currentUserId) {
        Set<UUID> postIds = Set.of(post.getId());
        Map<UUID, Long> likesCountMap = likeRepository.countMapByPostIds(postIds);
        Set<UUID> likedByUser = currentUserId != null
                ? likeRepository.findLikedPostIds(postIds, currentUserId)
                : Set.of();

        Map<UUID, UserProfileDto> authorMap = loadAuthors(Set.of(post.getAuthorId()));
        Map<UUID, CampDto> campMap = loadCamps(Set.of(post.getCampId()));
        Map<UUID, DetachmentDto> detachMap = post.getDetachmentId() != null
                ? loadDetachments(Set.of(post.getDetachmentId()))
                : Map.of();

        return postMapper.toResponse(post, authorMap, campMap, detachMap, likesCountMap, likedByUser);
    }

    private void attachUploadedMedia(Post post, List<UUID> fileIds, String mediaType) {
        if (fileIds == null || fileIds.isEmpty()) {
            return;
        }
        AtomicInteger order = new AtomicInteger(post.getMedia().size());
        for (UUID fileId : fileIds) {
            fileStorageClient.confirmUpload(fileId, post.getId().toString());
            post.addMedia(PostMedia.builder()
                    .mediaType(mediaType)
                    .sortOrder(order.getAndIncrement())
                    .fileId(fileId)
                    .durationSec(null)
                    .build());
        }
    }

    private PostModerationStatus resolveInitialStatus(CampPostingAccessDto access, boolean admin) {
        return (admin || access.isCanPostWithoutModeration())
                ? PostModerationStatus.PUBLISHED
                : PostModerationStatus.PENDING_REVIEW;
    }

    private void ensureCanModerate(UUID campId) {
        CampPostingAccessDto access = campServiceClient.getPostingAccess(campId);
        if (!access.isCanModeratePosts()) {
            throw new ForbiddenException("Only camp owner or senior counselor can moderate posts");
        }
    }

    private boolean isAdmin(String role) {
        return "ADMIN".equals(role) || "ROLE_ADMIN".equals(role);
    }

    private boolean isAdminOrCounselor(String role) {
        return isAdmin(role) || "COUNSELOR".equals(role) || "ROLE_COUNSELOR".equals(role);
    }
}
